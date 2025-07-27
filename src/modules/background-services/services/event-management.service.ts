import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Event, EventDocument } from '../../event/entities/event.entity';
import {
  Booking,
  BookingDocument,
  BookingStatus,
} from '../../booking/entities/booking.entity';
import { EmailSendService } from '../../../middleware/email-send/email-send.service';

@Injectable()
export class EventManagementService {
  private readonly logger = new Logger(EventManagementService.name);
  private readonly schedulerEnabled: boolean;

  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    private emailService: EmailSendService,
    private configService: ConfigService,
  ) {
    this.schedulerEnabled =
      this.configService.get<string>('SCHEDULER_ENABLED', 'true') === 'true';

    if (this.schedulerEnabled) {
      this.logger.log('✅ Event Management Service initialized');
    } else {
      this.logger.log(
        '⏸️ Event Management Service disabled via SCHEDULER_ENABLED=false',
      );
    }
  }

  /**
   * Check and update event statuses every 15 minutes
   */
  @Cron('*/15 * * * *')
  async updateEventStatuses() {
    if (!this.schedulerEnabled) return;

    this.logger.debug('🔍 Checking event statuses...');

    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);

      let updatedCount = 0;

      // Since your Event entity uses separate date/time fields, we need to handle this differently
      // Mark events as completed if their date has passed
      const eventsToComplete = await this.eventModel.updateMany(
        {
          date: { $lt: today },
          status: { $in: ['upcoming', 'ongoing'] },
        },
        {
          $set: { status: 'completed' },
        },
      );
      updatedCount += eventsToComplete.modifiedCount;

      // Cancel events with no bookings 24 hours before start
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const tomorrowDateString = tomorrow.toISOString().split('T')[0];

      const eventsToCheck = await this.eventModel.find({
        date: tomorrowDateString,
        status: 'upcoming',
      });

      for (const event of eventsToCheck) {
        const bookingCount = await this.bookingModel.countDocuments({
          eventId: event._id,
          status: { $in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] },
        });

        if (bookingCount === 0) {
          await this.eventModel.findByIdAndUpdate(event._id, {
            status: 'cancelled',
            cancellationReason: 'No bookings received',
          });
          updatedCount++;

          this.logger.warn(
            `❌ Cancelled event "${event.title}" due to no bookings`,
          );
        }
      }

      if (updatedCount > 0) {
        this.logger.log(`✅ Updated status for ${updatedCount} events`);
      }
    } catch (error) {
      this.logger.error('❌ Failed to update event statuses:', error);
    }
  }

  /**
   * Archive old events every day at 4 AM
   */
  @Cron('0 4 * * *')
  async archiveOldEvents() {
    if (!this.schedulerEnabled) return;

    this.logger.debug('📦 Archiving old events...');

    try {
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      const oneYearAgoDateString = oneYearAgo.toISOString().split('T')[0];

      const result = await this.eventModel.updateMany(
        {
          date: { $lt: oneYearAgoDateString },
          status: { $in: ['completed', 'cancelled'] },
          archived: { $ne: true },
        },
        {
          $set: { archived: true, archivedAt: new Date() },
        },
      );

      if (result.modifiedCount > 0) {
        this.logger.log(`✅ Archived ${result.modifiedCount} old events`);
      }
    } catch (error) {
      this.logger.error('❌ Failed to archive old events:', error);
    }
  }

  /**
   * Send event capacity alerts every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkEventCapacityAlerts() {
    if (!this.schedulerEnabled) return;

    this.logger.debug('📊 Checking event capacity alerts...');

    try {
      const today = new Date().toISOString().split('T')[0];

      const upcomingEvents = await this.eventModel.find({
        status: 'upcoming',
        date: { $gte: today },
      });

      let alertsSent = 0;

      for (const event of upcomingEvents) {
        // Calculate sold tickets from available vs total
        const soldTickets =
          event.totalTickets - (event.availableTickets || event.totalTickets);
        const capacityPercentage = (soldTickets / event.totalTickets) * 100;

        // Alert at 80% and 95% capacity
        // Since we don't have capacity alert fields in the entity, we'll track in memory for this session
        if (capacityPercentage >= 80) {
          await this.sendCapacityAlert(event, 80, capacityPercentage);
          alertsSent++;
        } else if (capacityPercentage >= 95) {
          await this.sendCapacityAlert(event, 95, capacityPercentage);
          alertsSent++;
        }
      }

      if (alertsSent > 0) {
        this.logger.log(`✅ Sent ${alertsSent} capacity alerts`);
      }
    } catch (error) {
      this.logger.error('❌ Failed to check capacity alerts:', error);
    }
  }

  /**
   * Generate daily event metrics every day at midnight
   */
  @Cron('0 0 * * *')
  async generateDailyEventMetrics() {
    if (!this.schedulerEnabled) return;

    this.logger.debug('📈 Generating daily event metrics...');

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date(yesterday);
      today.setDate(today.getDate() + 1);

      // Count events by status
      const eventStats = await this.eventModel.aggregate([
        {
          $match: {
            createdAt: { $gte: yesterday, $lt: today },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      // Count bookings for yesterday's events
      const bookingStats = await this.bookingModel.aggregate([
        {
          $match: {
            createdAt: { $gte: yesterday, $lt: today },
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

      this.logger.log(`📊 Daily Metrics for ${yesterday.toDateString()}:`);

      // Log event metrics
      const totalEvents = eventStats.reduce((sum, stat) => sum + stat.count, 0);
      this.logger.log(`   Events Created: ${totalEvents}`);
      eventStats.forEach((stat) => {
        this.logger.log(`     ${stat._id}: ${stat.count}`);
      });

      // Log booking metrics
      const totalBookings = bookingStats.reduce(
        (sum, stat) => sum + stat.count,
        0,
      );
      const totalRevenue = bookingStats.reduce(
        (sum, stat) => sum + (stat.totalRevenue || 0),
        0,
      );
      this.logger.log(
        `   Bookings: ${totalBookings}, Revenue: $${totalRevenue.toFixed(2)}`,
      );
    } catch (error) {
      this.logger.error('❌ Failed to generate daily event metrics:', error);
    }
  }

  /**
   * Send capacity alert emails
   */
  private async sendCapacityAlert(
    event: EventDocument,
    threshold: number,
    currentPercentage: number,
  ) {
    try {
      const alertSubject = `Capacity Alert: ${event.title} is ${Math.round(currentPercentage)}% full`;
      const alertMessage = `
        Event: ${event.title}
        Date: ${event.date}
        Time: ${event.time}
        Location: ${event.location}
        Capacity: ${Math.round(currentPercentage)}% full
        Available Tickets: ${event.availableTickets || 0}
        Total Tickets: ${event.totalTickets}
      `;

      // For now, we'll log the alert since we don't have admin email addresses
      this.logger.log(
        `🚨 Sent ${threshold}% capacity alert for event "${event.title}" (${Math.round(currentPercentage)}% full)`,
      );

      // You could send this to administrators or organizers if you have their email addresses
      // await this.emailService.sendNotificationEmail(adminEmail, alertSubject, alertMessage);
    } catch (error) {
      this.logger.error(
        `Failed to send capacity alert for event ${event._id}:`,
        error,
      );
    }
  }
}
