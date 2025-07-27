import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  Booking,
  BookingDocument,
  BookingStatus,
} from '../../booking/entities/booking.entity';

@Injectable()
export class PaymentCleanupService {
  private readonly logger = new Logger(PaymentCleanupService.name);
  private readonly schedulerEnabled: boolean;

  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    private configService: ConfigService,
  ) {
    this.schedulerEnabled =
      this.configService.get<string>('SCHEDULER_ENABLED', 'true') === 'true';

    if (this.schedulerEnabled) {
      this.logger.log('✅ Payment Cleanup Service initialized');
    } else {
      this.logger.log(
        '⏸️ Payment Cleanup Service disabled via SCHEDULER_ENABLED=false',
      );
    }
  }

  /**
   * Clean up failed payment records every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupFailedPayments() {
    if (!this.schedulerEnabled) return;

    this.logger.debug('💳 Cleaning up failed payment records...');

    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Since there's no PAYMENT_FAILED status in your BookingStatus enum,
      // we'll clean up cancelled bookings that are payment-related
      const result = await this.bookingModel.updateMany(
        {
          status: BookingStatus.CANCELLED,
          updatedAt: { $lt: twentyFourHoursAgo },
          cancellationReason: { $regex: /payment|timeout/i },
          paymentCleanupCompleted: { $ne: true },
        },
        {
          $set: {
            paymentCleanupCompleted: true,
            cleanedUpAt: new Date(),
          },
        },
      );

      if (result.modifiedCount > 0) {
        this.logger.log(
          `✅ Cleaned up ${result.modifiedCount} failed payment records`,
        );
      }
    } catch (error) {
      this.logger.error('❌ Failed to clean up failed payments:', error);
    }
  }

  /**
   * Generate payment analytics every day at 1 AM
   */
  @Cron('0 1 * * *')
  async generatePaymentAnalytics() {
    if (!this.schedulerEnabled) return;

    this.logger.debug('📊 Generating payment analytics...');

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date(yesterday);
      today.setDate(today.getDate() + 1);

      const paymentStats = await this.bookingModel.aggregate([
        {
          $match: {
            createdAt: { $gte: yesterday, $lt: today },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
            avgAmount: { $avg: '$totalAmount' },
          },
        },
      ]);

      this.logger.log(`💰 Payment Analytics for ${yesterday.toDateString()}:`);

      paymentStats.forEach((stat) => {
        this.logger.log(
          `   ${stat._id}: ${stat.count} transactions, $${(
            stat.totalAmount || 0
          ).toFixed(2)} total, $${(stat.avgAmount || 0).toFixed(2)} avg`,
        );
      });

      // Calculate success rate
      const totalTransactions = paymentStats.reduce(
        (sum, stat) => sum + stat.count,
        0,
      );
      const successfulTransactions =
        paymentStats.find((stat) => stat._id === BookingStatus.CONFIRMED)
          ?.count || 0;
      const successRate =
        totalTransactions > 0
          ? ((successfulTransactions / totalTransactions) * 100).toFixed(2)
          : '0.00';

      this.logger.log(
        `   Success Rate: ${successRate}% (${successfulTransactions}/${totalTransactions})`,
      );
    } catch (error) {
      this.logger.error('❌ Failed to generate payment analytics:', error);
    }
  }

  /**
   * Monitor pending payments and send alerts every 15 minutes
   */
  @Cron('*/15 * * * *')
  async monitorPendingPayments() {
    if (!this.schedulerEnabled) return;

    this.logger.debug('⏰ Monitoring pending payments...');

    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

      // Count pending payments in different time windows
      const recentPending = await this.bookingModel.countDocuments({
        status: BookingStatus.PENDING,
        createdAt: { $gte: fiveMinutesAgo },
      });

      const oldPending = await this.bookingModel.countDocuments({
        status: BookingStatus.PENDING,
        createdAt: { $lt: fifteenMinutesAgo },
      });

      if (recentPending > 0 || oldPending > 0) {
        this.logger.log(
          `💳 Payment Status: ${recentPending} recent pending, ${oldPending} old pending`,
        );
      }

      // Alert if there are too many old pending payments
      if (oldPending > 10) {
        this.logger.warn(
          `⚠️ High number of old pending payments: ${oldPending}`,
        );
      }
    } catch (error) {
      this.logger.error('❌ Failed to monitor pending payments:', error);
    }
  }

  /**
   * Generate weekly payment report every Sunday at midnight
   */
  @Cron('0 0 * * 0')
  async generateWeeklyPaymentReport() {
    if (!this.schedulerEnabled) return;

    this.logger.debug('📊 Generating weekly payment report...');

    try {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const now = new Date();

      const weeklyStats = await this.bookingModel.aggregate([
        {
          $match: {
            createdAt: { $gte: oneWeekAgo, $lte: now },
          },
        },
        {
          $group: {
            _id: {
              status: '$status',
              day: { $dayOfWeek: '$createdAt' },
            },
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
          },
        },
        {
          $sort: { '_id.day': 1, '_id.status': 1 },
        },
      ]);

      this.logger.log('📊 Weekly Payment Report:');

      const summary = {};
      weeklyStats.forEach((stat) => {
        const status = stat._id.status;
        if (!summary[status]) {
          summary[status] = { count: 0, total: 0 };
        }
        summary[status].count += stat.count;
        summary[status].total += stat.totalAmount || 0;
      });

      Object.keys(summary).forEach((status) => {
        const data = summary[status];
        this.logger.log(
          `   ${status}: ${data.count} payments, $${data.total.toFixed(2)} total`,
        );
      });
    } catch (error) {
      this.logger.error('❌ Failed to generate weekly payment report:', error);
    }
  }
}
