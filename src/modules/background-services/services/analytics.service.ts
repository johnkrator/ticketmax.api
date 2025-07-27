import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { User, UserDocument } from '../../user/entities/user.entity';
import { Event, EventDocument } from '../../event/entities/event.entity';
import {
  Booking,
  BookingDocument,
  BookingStatus,
} from '../../booking/entities/booking.entity';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly schedulerEnabled: boolean;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    private configService: ConfigService,
  ) {
    this.schedulerEnabled =
      this.configService.get<string>('SCHEDULER_ENABLED', 'true') === 'true';

    if (this.schedulerEnabled) {
      this.logger.log('✅ Analytics Service initialized');
    } else {
      this.logger.log(
        '⏸️ Analytics Service disabled via SCHEDULER_ENABLED=false',
      );
    }
  }

  /**
   * Generate hourly analytics every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async generateHourlyAnalytics() {
    if (!this.schedulerEnabled) return;

    this.logger.debug('📊 Generating hourly analytics...');

    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const now = new Date();

      // Count new registrations in the last hour
      const newUsers = await this.userModel.countDocuments({
        createdAt: { $gte: oneHourAgo, $lt: now },
      });

      // Count new bookings in the last hour
      const newBookings = await this.bookingModel.countDocuments({
        createdAt: { $gte: oneHourAgo, $lt: now },
      });

      // Calculate revenue in the last hour
      const hourlyRevenue = await this.bookingModel.aggregate([
        {
          $match: {
            createdAt: { $gte: oneHourAgo, $lt: now },
            status: BookingStatus.CONFIRMED,
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
          },
        },
      ]);

      const revenue = hourlyRevenue[0]?.totalRevenue || 0;

      if (newUsers > 0 || newBookings > 0 || revenue > 0) {
        this.logger.log(
          `📈 Hourly Stats: ${newUsers} new users, ${newBookings} bookings, $${revenue.toFixed(2)} revenue`,
        );
      }
    } catch (error) {
      this.logger.error('❌ Failed to generate hourly analytics:', error);
    }
  }

  /**
   * Generate daily comprehensive analytics every day at midnight
   */
  @Cron('0 0 * * *')
  async generateDailyAnalytics() {
    if (!this.schedulerEnabled) return;

    this.logger.debug('📊 Generating daily analytics...');

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date(yesterday);
      today.setDate(today.getDate() + 1);

      // User analytics
      const userStats = await this.generateUserAnalytics(yesterday, today);

      // Event analytics
      const eventStats = await this.generateEventAnalytics(yesterday, today);

      // Booking analytics
      const bookingStats = await this.generateBookingAnalytics(
        yesterday,
        today,
      );

      this.logger.log(`📊 Daily Analytics for ${yesterday.toDateString()}:`);
      this.logger.log(
        `   Users: ${userStats.newUsers} new, ${userStats.activeUsers} active`,
      );
      this.logger.log(
        `   Events: ${eventStats.newEvents} created, ${eventStats.totalCapacity} total capacity`,
      );
      this.logger.log(
        `   Bookings: ${bookingStats.totalBookings} total, $${bookingStats.totalRevenue.toFixed(2)} revenue`,
      );
      this.logger.log(`   Conversion Rate: ${bookingStats.conversionRate}%`);
    } catch (error) {
      this.logger.error('❌ Failed to generate daily analytics:', error);
    }
  }

  /**
   * Generate weekly performance report every Monday at 7 AM
   */
  @Cron('0 7 * * 1')
  async generateWeeklyPerformanceReport() {
    if (!this.schedulerEnabled) return;

    this.logger.debug('📊 Generating weekly performance report...');

    try {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const now = new Date();

      // Weekly user growth
      const weeklyUsers = await this.userModel.countDocuments({
        createdAt: { $gte: oneWeekAgo, $lt: now },
      });

      // Weekly booking performance
      const weeklyBookings = await this.bookingModel.aggregate([
        {
          $match: {
            createdAt: { $gte: oneWeekAgo, $lt: now },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
          },
        },
      ]);

      // Popular events this week
      const popularEvents = await this.bookingModel.aggregate([
        {
          $match: {
            createdAt: { $gte: oneWeekAgo, $lt: now },
            status: BookingStatus.CONFIRMED,
          },
        },
        {
          $group: {
            _id: '$eventId',
            bookingCount: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
          },
        },
        {
          $sort: { bookingCount: -1 },
        },
        {
          $limit: 5,
        },
        {
          $lookup: {
            from: 'events',
            localField: '_id',
            foreignField: '_id',
            as: 'event',
          },
        },
      ]);

      this.logger.log(`📊 Weekly Performance Report:`);
      this.logger.log(`   New Users: ${weeklyUsers}`);

      const totalWeeklyRevenue = weeklyBookings.reduce(
        (sum, booking) => sum + (booking.totalRevenue || 0),
        0,
      );
      this.logger.log(`   Total Revenue: $${totalWeeklyRevenue.toFixed(2)}`);

      this.logger.log(`   Top Events:`);
      popularEvents.forEach((event, index) => {
        const eventTitle = event.event[0]?.title || 'Unknown Event';
        this.logger.log(
          `     ${index + 1}. ${eventTitle}: ${event.bookingCount} bookings, $${event.totalRevenue.toFixed(2)}`,
        );
      });
    } catch (error) {
      this.logger.error(
        '❌ Failed to generate weekly performance report:',
        error,
      );
    }
  }

  /**
   * Generate monthly business insights on the 1st of each month at 8 AM
   */
  @Cron('0 8 1 * *')
  async generateMonthlyBusinessInsights() {
    if (!this.schedulerEnabled) return;

    this.logger.debug('📊 Generating monthly business insights...');

    try {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      lastMonth.setDate(1);
      lastMonth.setHours(0, 0, 0, 0);

      const thisMonth = new Date(lastMonth);
      thisMonth.setMonth(thisMonth.getMonth() + 1);

      // Monthly growth metrics
      const monthlyMetrics = await this.generateMonthlyMetrics(
        lastMonth,
        thisMonth,
      );

      this.logger.log(
        `📊 Monthly Business Insights for ${lastMonth.toLocaleDateString(
          'en-US',
          {
            month: 'long',
            year: 'numeric',
          },
        )}:`,
      );
      this.logger.log(`   User Growth: ${monthlyMetrics.userGrowth}%`);
      this.logger.log(`   Revenue Growth: ${monthlyMetrics.revenueGrowth}%`);
      this.logger.log(
        `   Average Order Value: $${monthlyMetrics.averageOrderValue.toFixed(2)}`,
      );
      this.logger.log(
        `   Customer Retention Rate: ${monthlyMetrics.retentionRate}%`,
      );
    } catch (error) {
      this.logger.error(
        '❌ Failed to generate monthly business insights:',
        error,
      );
    }
  }

  private async generateUserAnalytics(startDate: Date, endDate: Date) {
    const newUsers = await this.userModel.countDocuments({
      createdAt: { $gte: startDate, $lt: endDate },
    });

    const activeUsers = await this.userModel.countDocuments({
      lastLoginAt: { $gte: startDate, $lt: endDate },
    });

    return { newUsers, activeUsers };
  }

  private async generateEventAnalytics(startDate: Date, endDate: Date) {
    const newEvents = await this.eventModel.countDocuments({
      createdAt: { $gte: startDate, $lt: endDate },
    });

    const totalCapacityResult = await this.eventModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalCapacity: { $sum: '$totalTickets' },
        },
      },
    ]);

    const totalCapacity = totalCapacityResult[0]?.totalCapacity || 0;

    return { newEvents, totalCapacity };
  }

  private async generateBookingAnalytics(startDate: Date, endDate: Date) {
    const bookingStats = await this.bookingModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
        },
      },
    ]);

    const totalBookings = bookingStats.reduce(
      (sum, stat) => sum + stat.count,
      0,
    );
    const totalRevenue = bookingStats.reduce(
      (sum, stat) => sum + (stat.totalRevenue || 0),
      0,
    );
    const confirmedBookings =
      bookingStats.find((stat) => stat._id === BookingStatus.CONFIRMED)
        ?.count || 0;
    const conversionRate =
      totalBookings > 0
        ? ((confirmedBookings / totalBookings) * 100).toFixed(2)
        : '0.00';

    return { totalBookings, totalRevenue, conversionRate };
  }

  private async generateMonthlyMetrics(startDate: Date, endDate: Date) {
    // Implementation for monthly metrics calculation
    // This would include complex calculations for growth rates, retention, etc.

    return {
      userGrowth: 0,
      revenueGrowth: 0,
      averageOrderValue: 0,
      retentionRate: 0,
    };
  }
}
