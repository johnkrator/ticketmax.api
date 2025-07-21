import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Observable, interval, map, Subject, BehaviorSubject } from 'rxjs';
import { MessageEvent } from '@nestjs/common';
import { Event, EventDocument } from '../event/entities/event.entity';
import {
  Booking,
  BookingDocument,
  BookingStatus,
} from '../booking/entities/booking.entity';
import { User, UserDocument } from '../user/entities/user.entity';
import {
  DashboardStatsDto,
  DashboardFiltersDto,
  UserTicketDto,
  UserEventDto,
  AnalyticsDto,
} from './dto/dashboard.dto';

interface CachedStats {
  [userId: string]: {
    data: DashboardStatsDto;
    lastUpdated: Date;
  };
}

@Injectable()
export class DashboardService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DashboardService.name);
  private readonly statsCache: CachedStats = {};
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly statsSubject = new Subject<{
    userId: string;
    stats: DashboardStatsDto;
  }>();
  private cacheRefreshInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  onModuleInit() {
    // Start cache refresh interval when module initializes
    this.startCacheRefreshInterval();
    this.logger.log(
      'Dashboard service initialized with cache refresh interval',
    );
  }

  onModuleDestroy() {
    // Clean up interval when module is destroyed
    if (this.cacheRefreshInterval) {
      clearInterval(this.cacheRefreshInterval);
      this.cacheRefreshInterval = null;
    }
    this.logger.log(
      'Dashboard service destroyed, cache refresh interval cleared',
    );
  }

  private startCacheRefreshInterval() {
    // Refresh cache every 5 minutes
    this.cacheRefreshInterval = setInterval(
      () => {
        this.refreshActiveUserStats();
      },
      5 * 60 * 1000,
    );
  }

  // Scheduled task to refresh cache for active users
  private async refreshActiveUserStats() {
    this.logger.log('Refreshing stats cache for active users');

    const activeUserIds = Object.keys(this.statsCache);
    for (const userId of activeUserIds) {
      try {
        const freshStats = await this.calculateDashboardStats(userId, {});
        this.updateStatsCache(userId, freshStats);
        this.statsSubject.next({ userId, stats: freshStats });
      } catch (error) {
        this.logger.error(`Failed to refresh stats for user ${userId}:`, error);
      }
    }
  }

  async getDashboardStats(
    userId: string,
    filters: DashboardFiltersDto,
  ): Promise<DashboardStatsDto> {
    // Check cache first
    const cached = this.statsCache[userId];
    if (cached && Date.now() - cached.lastUpdated.getTime() < this.CACHE_TTL) {
      this.logger.debug(`Returning cached stats for user ${userId}`);
      return cached.data;
    }

    // Calculate fresh stats
    const stats = await this.calculateDashboardStats(userId, filters);

    // Update cache
    this.updateStatsCache(userId, stats);

    return stats;
  }

  private async calculateDashboardStats(
    userId: string,
    filters: DashboardFiltersDto,
  ): Promise<DashboardStatsDto> {
    const dateFilter = this.buildDateFilter(filters);

    try {
      // Parallel execution for better performance
      const [
        userTicketsCount,
        userEventsCount,
        salesAggregation,
        upcomingEventsCount,
        recentBookingsCount,
      ] = await Promise.all([
        // User tickets count
        this.bookingModel.countDocuments({
          userId,
          ...dateFilter,
        }),

        // User events count
        this.eventModel.countDocuments({
          organizerId: userId,
          ...dateFilter,
        }),

        // Sales aggregation with error handling
        this.bookingModel
          .aggregate([
            {
              $lookup: {
                from: 'events',
                localField: 'eventId',
                foreignField: '_id',
                as: 'event',
              },
            },
            {
              $match: {
                'event.organizerId': userId,
                status: BookingStatus.CONFIRMED,
                ...dateFilter,
              },
            },
            {
              $group: {
                _id: null,
                totalTicketsSold: { $sum: '$quantity' },
                totalRevenue: { $sum: '$totalAmount' },
                averageOrderValue: { $avg: '$totalAmount' },
                totalOrders: { $sum: 1 },
              },
            },
          ])
          .exec(),

        // Upcoming events
        this.eventModel.countDocuments({
          organizerId: userId,
          date: { $gte: new Date().toISOString().split('T')[0] },
        }),

        // Recent bookings (last 7 days)
        this.bookingModel.countDocuments({
          userId,
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        }),
      ]);

      const salesData = salesAggregation[0] || {
        totalTicketsSold: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        totalOrders: 0,
      };

      return {
        myTickets: userTicketsCount,
        myEvents: userEventsCount,
        ticketsSold: salesData.totalTicketsSold,
        revenue: salesData.totalRevenue,
        upcomingEvents: upcomingEventsCount,
        recentBookings: recentBookingsCount,
        averageOrderValue: salesData.averageOrderValue,
        totalOrders: salesData.totalOrders,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Error calculating dashboard stats for user ${userId}:`,
        error,
      );
      throw new Error('Failed to calculate dashboard statistics');
    }
  }

  private updateStatsCache(userId: string, stats: DashboardStatsDto): void {
    this.statsCache[userId] = {
      data: stats,
      lastUpdated: new Date(),
    };
  }

  async getUserTickets(
    userId: string,
    page: number,
    limit: number,
    status?: string,
  ) {
    const skip = (page - 1) * limit;
    const filter: any = { userId };

    if (status) {
      filter.status = status;
    }

    try {
      const [tickets, total] = await Promise.all([
        this.bookingModel
          .find(filter)
          .populate({
            path: 'eventId',
            select: 'title date location image category time description',
            populate: {
              path: 'organizerId',
              select:
                'businessInformation.businessName personalInformation.firstName personalInformation.lastName',
            },
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.bookingModel.countDocuments(filter),
      ]);

      const formattedTickets: UserTicketDto[] = tickets.map((ticket: any) => {
        const event = ticket.eventId;
        const organizer = event?.organizerId;

        return {
          id: ticket._id.toString(),
          eventTitle: event?.title || 'Unknown Event',
          date: event?.date || '',
          time: event?.time || '',
          location: event?.location || '',
          category: event?.category || '',
          description: event?.description || '',
          ticketType: ticket.ticketType || 'general',
          quantity: ticket.quantity,
          status: ticket.status,
          ticketNumber:
            ticket.bookingReference ||
            `TK-${ticket._id.toString().slice(-8).toUpperCase()}`,
          totalAmount: ticket.totalAmount,
          eventImage: event?.image,
          customerName: ticket.customerName,
          customerEmail: ticket.customerEmail,
          customerPhone: ticket.customerPhone,
          bookingDate: ticket.createdAt,
          confirmedAt: ticket.confirmedAt,
          organizerName:
            organizer?.businessInformation?.businessName ||
            `${organizer?.personalInformation?.firstName || ''} ${organizer?.personalInformation?.lastName || ''}`.trim() ||
            'Unknown Organizer',
          qrData: JSON.stringify({
            ticketNumber: ticket.bookingReference,
            eventTitle: event?.title,
            ticketType: ticket.ticketType,
            date: event?.date,
            time: event?.time,
            location: event?.location,
            userId: ticket.userId,
            bookingId: ticket._id,
            customerName: ticket.customerName,
            quantity: ticket.quantity,
            timestamp: ticket.createdAt,
            verificationHash: this.generateVerificationHash(
              ticket._id,
              ticket.userId,
            ),
          }),
        };
      });

      return {
        tickets: formattedTickets,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        summary: {
          totalAmount: formattedTickets.reduce(
            (sum, ticket) => sum + ticket.totalAmount,
            0,
          ),
          totalTickets: formattedTickets.reduce(
            (sum, ticket) => sum + ticket.quantity,
            0,
          ),
          confirmedTickets: formattedTickets.filter(
            (t) => t.status === 'confirmed',
          ).length,
          pendingTickets: formattedTickets.filter((t) => t.status === 'pending')
            .length,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error fetching user tickets for user ${userId}:`,
        error,
      );
      throw new Error('Failed to fetch user tickets');
    }
  }

  async getUserEvents(
    userId: string,
    page: number,
    limit: number,
    status?: string,
  ) {
    const skip = (page - 1) * limit;
    const filter: any = { organizerId: userId };

    // Enhanced status filtering
    if (status === 'active') {
      filter.date = { $gte: new Date().toISOString().split('T')[0] };
      filter.status = { $ne: 'cancelled' };
    } else if (status === 'past') {
      filter.date = { $lt: new Date().toISOString().split('T')[0] };
    } else if (status === 'draft') {
      filter.status = 'draft';
    } else if (status === 'cancelled') {
      filter.status = 'cancelled';
    }

    try {
      const [events, total] = await Promise.all([
        this.eventModel
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
          .exec(),
        this.eventModel.countDocuments(filter),
      ]);

      // Get comprehensive booking stats for each event
      const eventsWithStats = await Promise.all(
        events.map(async (event) => {
          const [bookingStats, recentBookings, attendeeStats] =
            await Promise.all([
              // Revenue and ticket stats
              this.bookingModel
                .aggregate([
                  {
                    $match: {
                      eventId: event._id,
                      status: BookingStatus.CONFIRMED,
                    },
                  },
                  {
                    $group: {
                      _id: null,
                      ticketsSold: { $sum: '$quantity' },
                      revenue: { $sum: '$totalAmount' },
                      totalBookings: { $sum: 1 },
                      averageOrderValue: { $avg: '$totalAmount' },
                    },
                  },
                ])
                .exec(),

              // Recent bookings (last 7 days)
              this.bookingModel.countDocuments({
                eventId: event._id,
                status: BookingStatus.CONFIRMED,
                createdAt: {
                  $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                },
              }),

              // Unique attendees
              this.bookingModel.distinct('userId', {
                eventId: event._id,
                status: BookingStatus.CONFIRMED,
              }),
            ]);

          const stats = bookingStats[0] || {
            ticketsSold: 0,
            revenue: 0,
            totalBookings: 0,
            averageOrderValue: 0,
          };

          const eventDate = new Date(event.date);
          const now = new Date();
          const isUpcoming = eventDate >= now;
          const isPast = eventDate < now;

          return {
            id: event._id.toString(),
            title: event.title,
            description: event.description,
            date: event.date,
            time: event.time,
            location: event.location,
            category: event.category,
            ticketsSold: stats.ticketsSold,
            totalTickets: event.totalTickets,
            revenue: stats.revenue,
            totalBookings: stats.totalBookings,
            uniqueAttendees: attendeeStats.length,
            recentBookings,
            averageOrderValue: stats.averageOrderValue,
            status:
              event.status === 'cancelled'
                ? 'cancelled'
                : event.status === 'draft'
                  ? 'draft'
                  : isUpcoming
                    ? 'active'
                    : 'past',
            image: event.image,
            price: event.price,
            featured: event.featured,
            createdAt: event.createdAt,
            updatedAt: event.updatedAt,
            salesProgress:
              event.totalTickets > 0
                ? (stats.ticketsSold / event.totalTickets) * 100
                : 0,
            daysUntilEvent: isUpcoming
              ? Math.ceil(
                  (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
                )
              : 0,
          } as UserEventDto;
        }),
      );

      return {
        events: eventsWithStats,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        summary: {
          totalRevenue: eventsWithStats.reduce(
            (sum, event) => sum + event.revenue,
            0,
          ),
          totalTicketsSold: eventsWithStats.reduce(
            (sum, event) => sum + event.ticketsSold,
            0,
          ),
          averageTicketsSold:
            eventsWithStats.length > 0
              ? eventsWithStats.reduce(
                  (sum, event) => sum + event.ticketsSold,
                  0,
                ) / eventsWithStats.length
              : 0,
          upcomingEvents: eventsWithStats.filter((e) => e.status === 'active')
            .length,
          pastEvents: eventsWithStats.filter((e) => e.status === 'past').length,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error fetching user events for user ${userId}:`,
        error,
      );
      throw new Error('Failed to fetch user events');
    }
  }

  async getAnalytics(
    userId: string,
    filters: DashboardFiltersDto,
  ): Promise<AnalyticsDto> {
    const dateFilter = this.buildDateFilter(filters);

    try {
      // Enhanced analytics with more comprehensive data
      const [revenueByMonth, topEvents, salesTrends, categoryPerformance] =
        await Promise.all([
          // Monthly revenue breakdown
          this.bookingModel
            .aggregate([
              {
                $lookup: {
                  from: 'events',
                  localField: 'eventId',
                  foreignField: '_id',
                  as: 'event',
                },
              },
              {
                $match: {
                  'event.organizerId': userId,
                  status: BookingStatus.CONFIRMED,
                  ...dateFilter,
                },
              },
              {
                $group: {
                  _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                  },
                  revenue: { $sum: '$totalAmount' },
                  tickets: { $sum: '$quantity' },
                  orders: { $sum: 1 },
                  averageOrderValue: { $avg: '$totalAmount' },
                },
              },
              { $sort: { '_id.year': 1, '_id.month': 1 } },
            ])
            .exec(),

          // Top performing events
          this.bookingModel
            .aggregate([
              {
                $lookup: {
                  from: 'events',
                  localField: 'eventId',
                  foreignField: '_id',
                  as: 'event',
                },
              },
              {
                $match: {
                  'event.organizerId': userId,
                  status: BookingStatus.CONFIRMED,
                  ...dateFilter,
                },
              },
              {
                $group: {
                  _id: '$eventId',
                  eventTitle: { $first: { $arrayElemAt: ['$event.title', 0] } },
                  eventCategory: {
                    $first: { $arrayElemAt: ['$event.category', 0] },
                  },
                  eventDate: { $first: { $arrayElemAt: ['$event.date', 0] } },
                  totalRevenue: { $sum: '$totalAmount' },
                  totalTickets: { $sum: '$quantity' },
                  totalOrders: { $sum: 1 },
                  averageOrderValue: { $avg: '$totalAmount' },
                },
              },
              { $sort: { totalRevenue: -1 } },
              { $limit: 10 },
            ])
            .exec(),

          // Sales trends (daily for last 30 days)
          this.bookingModel
            .aggregate([
              {
                $lookup: {
                  from: 'events',
                  localField: 'eventId',
                  foreignField: '_id',
                  as: 'event',
                },
              },
              {
                $match: {
                  'event.organizerId': userId,
                  status: BookingStatus.CONFIRMED,
                  createdAt: {
                    $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                  },
                },
              },
              {
                $group: {
                  _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' },
                  },
                  revenue: { $sum: '$totalAmount' },
                  tickets: { $sum: '$quantity' },
                  orders: { $sum: 1 },
                },
              },
              { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
            ])
            .exec(),

          // Category performance
          this.bookingModel
            .aggregate([
              {
                $lookup: {
                  from: 'events',
                  localField: 'eventId',
                  foreignField: '_id',
                  as: 'event',
                },
              },
              {
                $match: {
                  'event.organizerId': userId,
                  status: BookingStatus.CONFIRMED,
                  ...dateFilter,
                },
              },
              {
                $group: {
                  _id: { $arrayElemAt: ['$event.category', 0] },
                  revenue: { $sum: '$totalAmount' },
                  tickets: { $sum: '$quantity' },
                  events: { $addToSet: '$eventId' },
                },
              },
              {
                $project: {
                  category: '$_id',
                  revenue: 1,
                  tickets: 1,
                  eventCount: { $size: '$events' },
                },
              },
              { $sort: { revenue: -1 } },
            ])
            .exec(),
        ]);

      return {
        revenueByMonth: revenueByMonth.map((item) => ({
          month: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
          revenue: item.revenue,
          tickets: item.tickets,
          orders: item.orders,
          averageOrderValue: item.averageOrderValue,
        })),
        topEvents: topEvents.map((event) => ({
          eventTitle: event.eventTitle || 'Unknown Event',
          eventCategory: event.eventCategory || 'Uncategorized',
          eventDate: event.eventDate,
          revenue: event.totalRevenue,
          tickets: event.totalTickets,
          orders: event.totalOrders,
          averageOrderValue: event.averageOrderValue,
        })),
        salesTrends: salesTrends.map((trend) => ({
          date: `${trend._id.year}-${trend._id.month.toString().padStart(2, '0')}-${trend._id.day.toString().padStart(2, '0')}`,
          revenue: trend.revenue,
          tickets: trend.tickets,
          orders: trend.orders,
        })),
        categoryPerformance: categoryPerformance.map((cat) => ({
          category: cat.category || 'Uncategorized',
          revenue: cat.revenue,
          tickets: cat.tickets,
          eventCount: cat.eventCount,
        })),
      };
    } catch (error) {
      this.logger.error(`Error fetching analytics for user ${userId}:`, error);
      throw new Error('Failed to fetch analytics data');
    }
  }

  getStatsStream(userId: string): Observable<MessageEvent> {
    // Create user-specific observable
    return new Observable((observer) => {
      // Send initial stats
      this.getDashboardStats(userId, {}).then((stats) => {
        observer.next({
          data: JSON.stringify(stats),
          type: 'stats-update',
        } as MessageEvent);
      });

      // Subscribe to stats updates for this user
      const subscription = this.statsSubject
        .asObservable()
        .pipe(
          map(({ userId: updateUserId, stats }) => {
            if (updateUserId === userId) {
              return {
                data: JSON.stringify(stats),
                type: 'stats-update',
              } as MessageEvent;
            }
            return null;
          }),
        )
        .subscribe((event) => {
          if (event) {
            observer.next(event);
          }
        });

      // Cleanup on disconnect
      return () => {
        subscription.unsubscribe();
        // Remove from cache after 10 minutes of inactivity
        setTimeout(
          () => {
            delete this.statsCache[userId];
          },
          10 * 60 * 1000,
        );
      };
    });
  }

  async getRecentActivities(userId: string, limit: number) {
    try {
      // Get comprehensive recent activities
      const [recentBookings, recentEvents, recentCancellations] =
        await Promise.all([
          // Recent bookings made by user
          this.bookingModel
            .find({ userId })
            .populate('eventId', 'title category date')
            .sort({ createdAt: -1 })
            .limit(Math.floor(limit / 2))
            .lean()
            .exec(),

          // Recent events created by user
          this.eventModel
            .find({ organizerId: userId })
            .sort({ createdAt: -1 })
            .limit(Math.floor(limit / 3))
            .lean()
            .exec(),

          // Recent cancellations
          this.bookingModel
            .find({
              userId,
              status: BookingStatus.CANCELLED,
              cancelledAt: {
                $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              },
            })
            .populate('eventId', 'title')
            .sort({ cancelledAt: -1 })
            .limit(Math.floor(limit / 6))
            .lean()
            .exec(),
        ]);

      const activities = [
        ...recentBookings.map((booking: any) => ({
          id: booking._id.toString(),
          type: 'booking',
          title: `Purchased ${booking.quantity} ticket(s)`,
          description: `for ${booking.eventId?.title || 'Unknown Event'}`,
          timestamp: booking.createdAt,
          status: booking.status,
          metadata: {
            amount: booking.totalAmount,
            ticketType: booking.ticketType,
            eventCategory: booking.eventId?.category,
          },
        })),
        ...recentEvents.map((event: any) => ({
          id: event._id.toString(),
          type: 'event',
          title: 'Created new event',
          description: event.title,
          timestamp: event.createdAt,
          status: event.status || 'active',
          metadata: {
            category: event.category,
            totalTickets: event.totalTickets,
            price: event.price,
          },
        })),
        ...recentCancellations.map((cancellation: any) => ({
          id: cancellation._id.toString(),
          type: 'cancellation',
          title: 'Cancelled booking',
          description: `for ${cancellation.eventId?.title || 'Unknown Event'}`,
          timestamp: cancellation.cancelledAt || cancellation.updatedAt,
          status: 'cancelled',
          metadata: {
            refundAmount: cancellation.totalAmount,
            quantity: cancellation.quantity,
          },
        })),
      ];

      return activities
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )
        .slice(0, limit);
    } catch (error) {
      this.logger.error(
        `Error fetching recent activities for user ${userId}:`,
        error,
      );
      throw new Error('Failed to fetch recent activities');
    }
  }

  private generateVerificationHash(bookingId: string, userId: string): string {
    // Simple verification hash for QR code security
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(
        `${bookingId}-${userId}-${process.env.JWT_SECRET || 'default-secret'}`,
      )
      .digest('hex')
      .substring(0, 16);
  }

  private buildDateFilter(filters: DashboardFiltersDto): any {
    const dateFilter: any = {};

    if (filters.startDate && filters.endDate) {
      dateFilter.createdAt = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    } else if (filters.period) {
      const now = new Date();
      let startDate: Date;

      switch (filters.period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          return dateFilter;
      }

      dateFilter.createdAt = { $gte: startDate };
    }

    return dateFilter;
  }

  // Invalidate cache when data changes
  async invalidateUserCache(userId: string): Promise<void> {
    delete this.statsCache[userId];
    this.logger.debug(`Cache invalidated for user ${userId}`);
  }

  // Bulk cache invalidation for performance
  async invalidateCacheForUsers(userIds: string[]): Promise<void> {
    userIds.forEach((userId) => {
      delete this.statsCache[userId];
    });
    this.logger.debug(`Cache invalidated for ${userIds.length} users`);
  }

  // Health check for real-time connections
  async getConnectionHealth(): Promise<{
    activeConnections: number;
    cacheSize: number;
  }> {
    return {
      activeConnections: this.statsSubject.observers.length,
      cacheSize: Object.keys(this.statsCache).length,
    };
  }
}
