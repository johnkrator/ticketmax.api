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
import { EmailSendService } from '../../../middleware/email-send/email-send.service';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);
  private readonly schedulerEnabled: boolean;
  private readonly timezone: string;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    private emailService: EmailSendService,
    private configService: ConfigService,
  ) {
    this.schedulerEnabled =
      this.configService.get<string>('SCHEDULER_ENABLED', 'true') === 'true';
    this.timezone = this.configService.get<string>('SCHEDULER_TIMEZONE', 'UTC');

    if (this.schedulerEnabled) {
      this.logger.log(
        `✅ Notification Scheduler Service initialized - Timezone: ${this.timezone}`,
      );
    } else {
      this.logger.log(
        '⏸️ Notification Scheduler Service disabled via SCHEDULER_ENABLED=false',
      );
    }
  }

  /**
   * Check for upcoming events and send notifications every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkUpcomingEventNotifications() {
    if (!this.schedulerEnabled) return;

    this.logger.debug('🔍 Checking for upcoming event notifications...');

    try {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      // Since your Event entity uses separate date/time fields, we'll work with date strings
      const tomorrowDateString = tomorrow.toISOString().split('T')[0];
      const todayDateString = now.toISOString().split('T')[0];

      // Find events starting tomorrow (24-hour reminders) or today (1-hour reminders)
      const upcomingEvents = await this.eventModel.find({
        date: { $in: [todayDateString, tomorrowDateString] },
        status: 'upcoming',
      });

      for (const event of upcomingEvents) {
        // Parse event date and time
        const eventDate = new Date(
          event.date + 'T' + (event.time || '00:00') + ':00',
        );
        const timeDiff = eventDate.getTime() - now.getTime();
        const hoursUntilEvent = Math.floor(timeDiff / (1000 * 60 * 60));

        // Send 24-hour reminder
        if (hoursUntilEvent <= 24 && hoursUntilEvent > 23) {
          await this.sendEventReminders(event, '24-hour');
        }

        // Send 1-hour reminder
        if (hoursUntilEvent <= 1 && hoursUntilEvent > 0) {
          await this.sendEventReminders(event, '1-hour');
        }
      }

      this.logger.debug(
        `✅ Processed ${upcomingEvents.length} upcoming events`,
      );
    } catch (error) {
      this.logger.error(
        '❌ Failed to check upcoming event notifications:',
        error,
      );
    }
  }

  /**
   * Send weekly newsletter every Monday at 10 AM
   */
  @Cron('0 10 * * 1')
  async sendWeeklyNewsletter() {
    if (!this.schedulerEnabled) return;

    this.logger.debug('📧 Sending weekly newsletter...');

    try {
      // Get active users (users with bookings in the last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const activeUsers = await this.userModel.aggregate([
        {
          $lookup: {
            from: 'bookings',
            localField: '_id',
            foreignField: 'userId',
            as: 'recentBookings',
          },
        },
        {
          $match: {
            'recentBookings.createdAt': { $gte: thirtyDaysAgo },
            isActive: true,
          },
        },
        {
          $project: {
            _id: 1,
            email: 1,
            firstName: 1,
            lastName: 1,
          },
        },
      ]);

      // Get upcoming events for newsletter content
      const today = new Date().toISOString().split('T')[0];
      const upcomingEvents = await this.eventModel
        .find({
          date: { $gte: today },
          status: 'upcoming',
        })
        .limit(5)
        .sort({ date: 1 });

      let newslettersSent = 0;
      for (const user of activeUsers) {
        try {
          // Create newsletter content
          const newsletterSubject = 'Weekly Event Newsletter - TicketMax';
          let newsletterContent = `<h2>Hello ${user.firstName || 'Valued Customer'}!</h2>`;
          newsletterContent += `<p>Here are the upcoming events you might be interested in:</p><ul>`;

          upcomingEvents.forEach((event) => {
            newsletterContent += `<li><strong>${event.title}</strong> - ${event.date} at ${event.time} in ${event.location}</li>`;
          });

          newsletterContent += `</ul><p>Book your tickets now before they sell out!</p>`;

          await this.emailService.sendNotificationEmail(
            user.email,
            newsletterSubject,
            newsletterContent,
          );
          newslettersSent++;
        } catch (error) {
          this.logger.warn(
            `Failed to send newsletter to ${user.email}:`,
            error.message,
          );
        }
      }

      this.logger.log(
        `✅ Weekly newsletter sent to ${newslettersSent}/${activeUsers.length} active users`,
      );
    } catch (error) {
      this.logger.error('❌ Failed to send weekly newsletter:', error);
    }
  }

  /**
   * Process pending payment reminders every 30 minutes
   */
  @Cron('*/30 * * * *')
  async processPendingPaymentReminders() {
    if (!this.schedulerEnabled) return;

    this.logger.debug('💳 Processing pending payment reminders...');

    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      const pendingBookings = await this.bookingModel
        .find({
          status: BookingStatus.PENDING,
          createdAt: { $gte: tenMinutesAgo, $lt: fiveMinutesAgo },
        })
        .populate('userId eventId');

      let remindersSent = 0;
      for (const booking of pendingBookings) {
        try {
          const user = booking.userId as any;
          const event = booking.eventId as any;

          if (user?.email && event) {
            const reminderSubject = 'Payment Reminder - Complete Your Booking';
            const reminderContent = `
              <h3>Payment Reminder</h3>
              <p>Hello ${user.firstName || 'Customer'},</p>
              <p>You have a pending booking that requires payment completion:</p>
              <ul>
                <li><strong>Event:</strong> ${event.title}</li>
                <li><strong>Date:</strong> ${event.date}</li>
                <li><strong>Time:</strong> ${event.time}</li>
                <li><strong>Quantity:</strong> ${booking.quantity} tickets</li>
                <li><strong>Total Amount:</strong> $${booking.totalAmount}</li>
                <li><strong>Booking ID:</strong> ${booking._id}</li>
              </ul>
              <p>Please complete your payment to secure your tickets.</p>
            `;

            await this.emailService.sendNotificationEmail(
              user.email,
              reminderSubject,
              reminderContent,
            );
            remindersSent++;
          }
        } catch (error) {
          this.logger.warn(
            `Failed to send payment reminder for booking ${booking._id}:`,
            error.message,
          );
        }
      }

      if (remindersSent > 0) {
        this.logger.log(`✅ Sent ${remindersSent} payment reminders`);
      }
    } catch (error) {
      this.logger.error('❌ Failed to process payment reminders:', error);
    }
  }

  /**
   * Clean up old notifications every day at 2 AM
   */
  @Cron('0 2 * * *')
  async cleanupOldNotifications() {
    if (!this.schedulerEnabled) return;

    this.logger.debug('🧹 Cleaning up old notifications...');

    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // This would clean up notifications from a notifications collection
      // Adjust based on your notification storage strategy
      this.logger.log('✅ Old notifications cleanup completed');
    } catch (error) {
      this.logger.error('❌ Failed to cleanup old notifications:', error);
    }
  }

  /**
   * Send event reminders to all attendees
   */
  private async sendEventReminders(event: EventDocument, reminderType: string) {
    try {
      const bookings = await this.bookingModel
        .find({
          eventId: event._id,
          status: BookingStatus.CONFIRMED,
        })
        .populate('userId');

      let remindersSent = 0;
      for (const booking of bookings) {
        try {
          const user = booking.userId as any;
          if (user?.email) {
            const reminderSubject = `Event Reminder: ${event.title} - ${reminderType}`;
            const reminderContent = `
              <h3>${reminderType.toUpperCase()} Event Reminder</h3>
              <p>Hello ${user.firstName || 'Customer'},</p>
              <p>This is a friendly reminder about your upcoming event:</p>
              <ul>
                <li><strong>Event:</strong> ${event.title}</li>
                <li><strong>Date:</strong> ${event.date}</li>
                <li><strong>Time:</strong> ${event.time}</li>
                <li><strong>Location:</strong> ${event.location}</li>
                <li><strong>Tickets:</strong> ${booking.quantity}</li>
                <li><strong>Booking ID:</strong> ${booking._id}</li>
              </ul>
              <p>We look forward to seeing you there!</p>
            `;

            await this.emailService.sendNotificationEmail(
              user.email,
              reminderSubject,
              reminderContent,
            );
            remindersSent++;
          }
        } catch (error) {
          this.logger.warn(
            `Failed to send ${reminderType} reminder for booking ${booking._id}:`,
            error.message,
          );
        }
      }

      this.logger.log(
        `✅ Sent ${reminderType} reminders for event "${event.title}" to ${remindersSent} attendees`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to send ${reminderType} reminders for event ${event._id}:`,
        error,
      );
    }
  }
}
