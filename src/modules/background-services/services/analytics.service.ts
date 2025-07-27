import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../user/entities/user.entity';
import { Event, EventDocument } from '../../event/entities/event.entity';
import {
  Booking,
  BookingDocument,
  BookingStatus,
} from '../../booking/entities/booking.entity';
import {
  Payment,
  PaymentDocument,
  PaymentStatus,
} from '../../payment/entities/payment.entity';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
  ) {}

  /**
   * Generate a comprehensive daily analytics report
   */
  @Cron('0 23 * * *') // Daily at 11 PM
  async generateDailyAnalytics() {
    this.logger.log('Generating daily analytics report...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // User Analytics
      const [newUsers, totalUsers, activeUsers] = await Promise.all([
        this.userModel.countDocuments({
          createdAt: { $gte: today, $lt: tomorrow },
        }),
        this.userModel.countDocuments(),
        this.userModel.countDocuments({
          lastLoginAt: { $gte: today, $lt: tomorrow },
        }),
      ]);

      // Event Analytics
      const [newEvents, totalEvents, liveEvents] = await Promise.all([
        this.eventModel.countDocuments({
          createdAt: { $gte: today, $lt: tomorrow },
        }),
        this.eventModel.countDocuments({ archived: { $ne: true } }),
        this.eventModel.countDocuments({
          status: 'live',
        }),
      ]);

      // Booking Analytics
      const bookingStats = await this.bookingModel.aggregate([
        {
          $match: {
            createdAt: { $gte: today, $lt: tomorrow },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
            totalTickets: { $sum: '$quantity' },
          },
        },
      ]);

      // Payment Analytics
      const paymentStats = await this.paymentModel.aggregate([
        {
          $match: {
            createdAt: { $gte: today, $lt: tomorrow },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
          },
        },
      ]);

      // Top performing events today
      const topEvents = await this.bookingModel.aggregate([
        {
          $match: {
            createdAt: { $gte: today, $lt: tomorrow },
            status: BookingStatus.CONFIRMED,
          },
        },
        {
          $group: {
            _id: '$eventId',
            bookings: { $sum: 1 },
            revenue: { $sum: '$totalAmount' },
            tickets: { $sum: '$quantity' },
          },
        },
        {
          $lookup: {
            from: 'events',
            localField: '_id',
            foreignField: '_id',
            as: 'event',
          },
        },
        {
          $sort: { revenue: -1 },
        },
        {
          $limit: 5,
        },
      ]);

      // Calculate conversion rates
      const totalBookings = bookingStats.reduce(
        (sum, stat) => sum + stat.count,
        0,
      );
      const confirmedBookings =
        bookingStats.find((stat) => stat._id === BookingStatus.CONFIRMED)
          ?.count || 0;
      const conversionRate =
        totalBookings > 0
          ? ((confirmedBookings / totalBookings) * 100).toFixed(2)
          : 0;

      // Calculate total revenue
      const totalRevenue = bookingStats
        .filter((stat) => stat._id === BookingStatus.CONFIRMED)
        .reduce((sum, stat) => sum + stat.totalAmount, 0);

      this.logger.log(`
        📊 DAILY ANALYTICS REPORT - ${today.toDateString()}
        ════════════════════════════════════════════════
        
        👥 USER METRICS:
           • New Users: ${newUsers}
           • Total Users: ${totalUsers}
           • Active Today: ${activeUsers}
        
        🎭 EVENT METRICS:
           • New Events: ${newEvents}
           • Total Active Events: ${totalEvents}
           • Live Events: ${liveEvents}
        
        🎫 BOOKING METRICS:
           • Total Bookings: ${totalBookings}
           • Confirmed: ${confirmedBookings}
           • Conversion Rate: ${conversionRate}%
           • Total Revenue: $${totalRevenue}
        
        💳 PAYMENT METRICS:
   ${paymentStats.map((stat) => `• ${stat._id}: ${stat.count} ($${stat.totalAmount})`).join('\n   ')}

        🏆 TOP PERFORMING EVENTS:
   ${topEvents
     .map(
       (event, index) =>
         `${index + 1}. ${event.event[0]?.title || 'Unknown'} - $${event.revenue} (${event.bookings} bookings)`,
     )
     .join('\n   ')}
      `);
    } catch (error) {
      this.logger.error('Error generating daily analytics:', error);
    }
  }

  /**
   * Generate a comprehensive weekly business report
   */
  @Cron('0 9 * * 1') // Monday at 9 AM
  async generateWeeklyBusinessReport() {
    this.logger.log('Generating weekly business report...');

    try {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // User growth metrics
      const userGrowth = await this.userModel.aggregate([
        {
          $match: {
            createdAt: { $gte: oneWeekAgo },
          },
        },
        {
          $group: {
            _id: {
              $dayOfWeek: '$createdAt',
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      // Revenue trends
      const revenueTrends = await this.bookingModel.aggregate([
        {
          $match: {
            createdAt: { $gte: oneWeekAgo },
            status: BookingStatus.CONFIRMED,
          },
        },
        {
          $group: {
            _id: {
              $dayOfWeek: '$createdAt',
            },
            revenue: { $sum: '$totalAmount' },
            bookings: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      // Event performance
      const eventPerformance = await this.eventModel.aggregate([
        {
          $match: {
            createdAt: { $gte: oneWeekAgo },
          },
        },
        {
          $lookup: {
            from: 'bookings',
            localField: '_id',
            foreignField: 'eventId',
            as: 'bookings',
          },
        },
        {
          $project: {
            title: 1,
            totalTickets: 1,
            availableTickets: 1,
            bookingsCount: { $size: '$bookings' },
            soldTickets: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: '$bookings',
                      as: 'booking',
                      cond: {
                        $eq: ['$$booking.status', BookingStatus.CONFIRMED],
                      },
                    },
                  },
                  as: 'confirmedBooking',
                  in: '$$confirmedBooking.quantity',
                },
              },
            },
          },
        },
        {
          $addFields: {
            selloutPercentage: {
              $multiply: [{ $divide: ['$soldTickets', '$totalTickets'] }, 100],
            },
          },
        },
        {
          $sort: { selloutPercentage: -1 },
        },
      ]);

      // Payment success rates
      const paymentMetrics = await this.paymentModel.aggregate([
        {
          $match: {
            createdAt: { $gte: oneWeekAgo },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
          },
        },
      ]);

      const totalPayments = paymentMetrics.reduce(
        (sum, metric) => sum + metric.count,
        0,
      );
      const successfulPayments =
        paymentMetrics.find((m) => m._id === PaymentStatus.SUCCESS)?.count || 0;
      const paymentSuccessRate =
        totalPayments > 0
          ? ((successfulPayments / totalPayments) * 100).toFixed(2)
          : 0;

      // Customer insights
      const customerInsights = await this.userModel.aggregate([
        {
          $lookup: {
            from: 'bookings',
            localField: '_id',
            foreignField: 'userId',
            as: 'bookings',
          },
        },
        {
          $project: {
            totalBookings: { $size: '$bookings' },
            totalSpent: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: '$bookings',
                      as: 'booking',
                      cond: {
                        $eq: ['$$booking.status', BookingStatus.CONFIRMED],
                      },
                    },
                  },
                  as: 'confirmedBooking',
                  in: '$$confirmedBooking.totalAmount',
                },
              },
            },
          },
        },
        {
          $group: {
            _id: null,
            avgBookingsPerUser: { $avg: '$totalBookings' },
            avgSpentPerUser: { $avg: '$totalSpent' },
            totalCustomers: { $sum: 1 },
          },
        },
      ]);

      const insights = customerInsights[0] || {
        avgBookingsPerUser: 0,
        avgSpentPerUser: 0,
        totalCustomers: 0,
      };

      this.logger.log(`
      📈 WEEKLY BUSINESS REPORT
      ═══════════════════════════════════════
      
      📊 USER GROWTH:
   ${userGrowth.map((day) => `Day ${day._id}: ${day.count} new users`).join('\n   ')}

      💰 REVENUE TRENDS:
   ${revenueTrends.map((day) => `Day ${day._id}: $${day.revenue} (${day.bookings} bookings)`).join('\n   ')}

      🎭 TOP PERFORMING EVENTS:
   ${eventPerformance
     .slice(0, 5)
     .map(
       (event, index) =>
         `${index + 1}. ${event.title} - ${event.selloutPercentage.toFixed(1)}% sold out`,
     )
     .join('\n   ')}

      💳 PAYMENT METRICS:
         • Success Rate: ${paymentSuccessRate}%
         • Total Transactions: ${totalPayments}
      
      👥 CUSTOMER INSIGHTS:
         • Average Bookings per User: ${insights.avgBookingsPerUser.toFixed(2)}
         • Average Spent per User: $${insights.avgSpentPerUser.toFixed(2)}
         • Total Active Customers: ${insights.totalCustomers}
      `);
    } catch (error) {
      this.logger.error('Error generating weekly business report:', error);
    }
  }

  /**
   * Generate monthly executive summary
   */
  @Cron('0 8 1 * *') // First day of the month at 8 AM
  async generateMonthlyExecutiveSummary() {
    this.logger.log('Generating monthly executive summary...');

    try {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      lastMonth.setDate(1);
      lastMonth.setHours(0, 0, 0, 0);

      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      // Key performance indicators
      const [monthlyRevenue, monthlyBookings, monthlyUsers, monthlyEvents] =
        await Promise.all([
          this.bookingModel.aggregate([
            {
              $match: {
                createdAt: { $gte: lastMonth, $lt: thisMonth },
                status: BookingStatus.CONFIRMED,
              },
            },
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: '$totalAmount' },
                totalBookings: { $sum: 1 },
                totalTickets: { $sum: '$quantity' },
              },
            },
          ]),
          this.bookingModel.countDocuments({
            createdAt: { $gte: lastMonth, $lt: thisMonth },
          }),
          this.userModel.countDocuments({
            createdAt: { $gte: lastMonth, $lt: thisMonth },
          }),
          this.eventModel.countDocuments({
            createdAt: { $gte: lastMonth, $lt: thisMonth },
          }),
        ]);

      // Month-over-month growth
      const previousMonth = new Date(lastMonth);
      previousMonth.setMonth(previousMonth.getMonth() - 1);

      const [prevRevenue, prevBookings, prevUsers] = await Promise.all([
        this.bookingModel.aggregate([
          {
            $match: {
              createdAt: { $gte: previousMonth, $lt: lastMonth },
              status: BookingStatus.CONFIRMED,
            },
          },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$totalAmount' },
            },
          },
        ]),
        this.bookingModel.countDocuments({
          createdAt: { $gte: previousMonth, $lt: lastMonth },
        }),
        this.userModel.countDocuments({
          createdAt: { $gte: previousMonth, $lt: lastMonth },
        }),
      ]);

      const currentRevenue = monthlyRevenue[0]?.totalRevenue || 0;
      const previousRevenue = prevRevenue[0]?.totalRevenue || 0;
      const revenueGrowth =
        previousRevenue > 0
          ? (
              ((currentRevenue - previousRevenue) / previousRevenue) *
              100
            ).toFixed(2)
          : '0';

      const bookingGrowth =
        prevBookings > 0
          ? (((monthlyBookings - prevBookings) / prevBookings) * 100).toFixed(2)
          : '0';

      const userGrowth =
        prevUsers > 0
          ? (((monthlyUsers - prevUsers) / prevUsers) * 100).toFixed(2)
          : '0';

      // Market insights
      const categoryPerformance = await this.eventModel.aggregate([
        {
          $match: {
            createdAt: { $gte: lastMonth, $lt: thisMonth },
          },
        },
        {
          $group: {
            _id: '$category',
            eventCount: { $sum: 1 },
            avgPrice: { $avg: '$price' },
          },
        },
        {
          $sort: { eventCount: -1 },
        },
      ]);

      const revenueGrowthNum = parseFloat(revenueGrowth);
      const bookingGrowthNum = parseFloat(bookingGrowth);
      const userGrowthNum = parseFloat(userGrowth);

      this.logger.log(`
        🎯 MONTHLY EXECUTIVE SUMMARY
        ═════════════════════════════════════════
        
        📊 KEY PERFORMANCE INDICATORS:
           • Total Revenue: $${currentRevenue} (${revenueGrowthNum > 0 ? '+' : ''}${revenueGrowth}% MoM)
           • Total Bookings: ${monthlyBookings} (${bookingGrowthNum > 0 ? '+' : ''}${bookingGrowth}% MoM)
           • New Users: ${monthlyUsers} (${userGrowthNum > 0 ? '+' : ''}${userGrowth}% MoM)
           • New Events: ${monthlyEvents}
        
        📈 GROWTH METRICS:
           • Revenue Growth: ${revenueGrowth}%
           • User Acquisition Growth: ${userGrowth}%
           • Booking Volume Growth: ${bookingGrowth}%
        
        🎭 MARKET INSIGHTS:
   ${categoryPerformance
     .map(
       (cat, index) =>
         `${index + 1}. ${cat._id}: ${cat.eventCount} events (avg $${cat.avgPrice.toFixed(2)})`,
     )
     .join('\n   ')}

        🎯 RECOMMENDATIONS:
           • Focus on high-performing categories
           • Optimize conversion funnel
           • Enhance user retention strategies
           • Expand successful event categories
      `);
    } catch (error) {
      this.logger.error('Error generating monthly executive summary:', error);
    }
  }

  /**
   * Real-time performance monitoring
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async monitorRealTimePerformance() {
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      // Monitor recent activity
      const [recentBookings, recentPayments, activeUsers] = await Promise.all([
        this.bookingModel.countDocuments({
          createdAt: { $gte: thirtyMinutesAgo },
        }),
        this.paymentModel.countDocuments({
          createdAt: { $gte: thirtyMinutesAgo },
        }),
        this.userModel.countDocuments({
          lastActivityAt: { $gte: thirtyMinutesAgo },
        }),
      ]);

      // Alert on unusual activity
      if (recentBookings > 100) {
        this.logger.warn(
          `High booking activity detected: ${recentBookings} bookings in last 30 minutes`,
        );
      }

      if (recentPayments > 100) {
        this.logger.warn(
          `High payment activity detected: ${recentPayments} payments in last 30 minutes`,
        );
      }

      this.logger.debug(
        `Real-time metrics: ${recentBookings} bookings, ${recentPayments} payments, ${activeUsers} active users`,
      );
    } catch (error) {
      this.logger.error('Error monitoring real-time performance:', error);
    }
  }
}
