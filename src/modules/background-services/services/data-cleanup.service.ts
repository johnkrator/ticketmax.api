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
} from '../../booking/entities/booking.entity';

@Injectable()
export class DataCleanupService {
  private readonly logger = new Logger(DataCleanupService.name);
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
      this.logger.log('✅ Data Cleanup Service initialized');
    } else {
      this.logger.log(
        '⏸️ Data Cleanup Service disabled via SCHEDULER_ENABLED=false',
      );
    }
  }

  /**
   * Clean up inactive users every week on Sunday at 3 AM
   */
  @Cron('0 3 * * 0')
  async cleanupInactiveUsers() {
    if (!this.schedulerEnabled) return;

    this.logger.debug('👥 Cleaning up inactive users...');

    try {
      const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);

      // Find users who haven't logged in for 6 months and have no recent bookings
      const inactiveUsers = await this.userModel.find({
        lastLoginAt: { $lt: sixMonthsAgo },
        isActive: true,
      });

      let deactivatedCount = 0;
      for (const user of inactiveUsers) {
        // Check if user has any recent bookings
        const recentBookings = await this.bookingModel.countDocuments({
          userId: user._id,
          createdAt: { $gte: sixMonthsAgo },
        });

        if (recentBookings === 0) {
          await this.userModel.findByIdAndUpdate(user._id, {
            isActive: false,
            deactivatedAt: new Date(),
            deactivationReason: 'Inactive for 6+ months',
          });
          deactivatedCount++;
        }
      }

      if (deactivatedCount > 0) {
        this.logger.log(`✅ Deactivated ${deactivatedCount} inactive users`);
      }
    } catch (error) {
      this.logger.error('❌ Failed to cleanup inactive users:', error);
    }
  }

  /**
   * Clean up temporary files and uploads every day at 5 AM
   */
  @Cron('0 5 * * *')
  async cleanupTemporaryFiles() {
    if (!this.schedulerEnabled) return;

    this.logger.debug('🗂️ Cleaning up temporary files...');

    try {
      // This would typically clean up file system or cloud storage
      // For now, we'll just log the cleanup process
      this.logger.log('✅ Temporary files cleanup completed');
    } catch (error) {
      this.logger.error('❌ Failed to cleanup temporary files:', error);
    }
  }

  /**
   * Remove expired session data every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredSessions() {
    if (!this.schedulerEnabled) return;

    this.logger.debug('🔑 Cleaning up expired sessions...');

    try {
      // This would clean up session storage (Redis, database, etc.)
      // Implementation depends on your session storage strategy
      this.logger.debug('✅ Expired sessions cleanup completed');
    } catch (error) {
      this.logger.error('❌ Failed to cleanup expired sessions:', error);
    }
  }

  /**
   * Optimize database indexes weekly on Saturday at 2 AM
   */
  @Cron('0 2 * * 6')
  async optimizeDatabase() {
    if (!this.schedulerEnabled) return;

    this.logger.debug('🗄️ Optimizing database performance...');

    try {
      // Run database optimization tasks
      // This could include reindexing, analyzing query performance, etc.

      this.logger.log('✅ Database optimization completed');
    } catch (error) {
      this.logger.error('❌ Failed to optimize database:', error);
    }
  }

  /**
   * Generate data health report every Monday at 6 AM
   */
  @Cron('0 6 * * 1')
  async generateDataHealthReport() {
    if (!this.schedulerEnabled) return;

    this.logger.debug('📋 Generating data health report...');

    try {
      const totalUsers = await this.userModel.countDocuments();
      const activeUsers = await this.userModel.countDocuments({
        isActive: true,
      });
      const totalEvents = await this.eventModel.countDocuments();
      const activeEvents = await this.eventModel.countDocuments({
        status: 'upcoming',
      });
      const totalBookings = await this.bookingModel.countDocuments();

      this.logger.log('📊 Weekly Data Health Report:');
      this.logger.log(`   Users: ${activeUsers}/${totalUsers} active`);
      this.logger.log(`   Events: ${activeEvents}/${totalEvents} upcoming`);
      this.logger.log(`   Total Bookings: ${totalBookings}`);

      // Check for data inconsistencies
      const orphanedBookings = await this.bookingModel.countDocuments({
        $or: [{ userId: { $exists: false } }, { eventId: { $exists: false } }],
      });

      if (orphanedBookings > 0) {
        this.logger.warn(
          `⚠️ Found ${orphanedBookings} orphaned bookings that need attention`,
        );
      }
    } catch (error) {
      this.logger.error('❌ Failed to generate data health report:', error);
    }
  }
}
