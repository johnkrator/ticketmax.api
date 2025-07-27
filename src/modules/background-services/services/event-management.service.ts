import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from '../../event/entities/event.entity';
import {
  Booking,
  BookingDocument,
  BookingStatus,
} from '../../booking/entities/booking.entity';
import { User, UserDocument } from '../../user/entities/user.entity';
import { EmailSendService } from '../../../middleware/email-send/email-send.service';

@Injectable()
export class EventManagementService {
  private readonly logger = new Logger(EventManagementService.name);

  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private emailService: EmailSendService,
  ) {}

  /**
   * Archive past events every day at 2 AM
   */
  @Cron('0 2 * * *')
  async archivePastEvents() {
    this.logger.log('Starting past events archival...');

    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Find events that ended 7 days ago or earlier
      const pastEvents = await this.eventModel.find({
        date: { $lt: sevenDaysAgo },
        archived: { $ne: true },
      });

      for (const event of pastEvents) {
        await this.eventModel.findByIdAndUpdate(event._id, {
          archived: true,
          archivedAt: new Date(),
        });

        this.logger.log(`Archived event: ${event.title} (${event._id})`);
      }

      this.logger.log(`Archived ${pastEvents.length} past events`);
    } catch (error) {
      this.logger.error('Error archiving past events:', error);
    }
  }

  /**
   * Send event reminders - 24 hours before event
   */
  @Cron('0 9 * * *') // Daily at 9 AM
  async sendEventReminders() {
    this.logger.log('Sending event reminders...');

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      // Find events happening tomorrow
      const upcomingEvents = await this.eventModel.find({
        date: {
          $gte: tomorrow,
          $lt: dayAfterTomorrow,
        },
        archived: { $ne: true },
      });

      for (const event of upcomingEvents) {
        // Find all confirmed bookings for this event that haven't received reminders
        const bookings = await this.bookingModel
          .find({
            eventId: event._id,
            status: BookingStatus.CONFIRMED,
            reminderSent: { $ne: true },
          })
          .populate('userId');

        for (const booking of bookings) {
          const user = booking.userId as any;
          if (user && user.email) {
            await this.emailService.sendNotificationEmail(
              user.email,
              `Tomorrow: ${event.title}`,
              `
                <h2>Event Reminder - Tomorrow!</h2>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3>${event.title}</h3>
                  <p><strong>📅 Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
                  <p><strong>🕐 Time:</strong> ${new Date(event.date).toLocaleTimeString()}</p>
                  <p><strong>📍 Location:</strong> ${event.location}</p>
                  <p><strong>🎫 Tickets:</strong> ${booking.quantity}</p>
                  <p><strong>📧 Booking ID:</strong> ${booking._id}</p>
                </div>
                <p><strong>Important:</strong> Please arrive 30 minutes early and bring a valid ID.</p>
                <p>We're excited to see you there!</p>
              `,
            );

            // Mark reminder as sent
            await this.bookingModel.findByIdAndUpdate(booking._id, {
              reminderSent: true,
              reminderSentAt: new Date(),
            });
          }
        }

        this.logger.log(
          `Sent reminders for event: ${event.title} (${bookings.length} attendees)`,
        );
      }

      this.logger.log(
        `Processed reminders for ${upcomingEvents.length} upcoming events`,
      );
    } catch (error) {
      this.logger.error('Error sending event reminders:', error);
    }
  }

  /**
   * Send early bird reminders - 7 days before event
   */
  @Cron('0 10 * * *') // Daily at 10 AM
  async sendEarlyBirdReminders() {
    this.logger.log('Sending early bird reminders...');

    try {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(0, 0, 0, 0);

      const weekAfter = new Date(nextWeek);
      weekAfter.setDate(weekAfter.getDate() + 1);

      // Find events happening in 7 days
      const upcomingEvents = await this.eventModel.find({
        date: {
          $gte: nextWeek,
          $lt: weekAfter,
        },
        archived: { $ne: true },
      });

      for (const event of upcomingEvents) {
        const bookings = await this.bookingModel
          .find({
            eventId: event._id,
            status: BookingStatus.CONFIRMED,
            earlyReminderSent: { $ne: true },
          })
          .populate('userId');

        for (const booking of bookings) {
          const user = booking.userId as any;
          if (user && user.email) {
            await this.emailService.sendNotificationEmail(
              user.email,
              `One Week to Go: ${event.title}`,
              `
                <h2>Event Coming Up - One Week Away!</h2>
                <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3>${event.title}</h3>
                  <p><strong>📅 Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
                  <p><strong>🕐 Time:</strong> ${new Date(event.date).toLocaleTimeString()}</p>
                  <p><strong>📍 Location:</strong> ${event.location}</p>
                  <p><strong>🎫 Your Tickets:</strong> ${booking.quantity}</p>
                </div>
                <p>Just a friendly reminder that your event is coming up next week!</p>
                <p>Start planning your day and we'll send you another reminder 24 hours before the event.</p>
                <p><strong>Questions?</strong> Contact our support team anytime.</p>
              `,
            );

            // Mark early reminder as sent
            await this.bookingModel.findByIdAndUpdate(booking._id, {
              earlyReminderSent: true,
              earlyReminderSentAt: new Date(),
            });
          }
        }

        this.logger.log(
          `Sent early reminders for event: ${event.title} (${bookings.length} attendees)`,
        );
      }

      this.logger.log(
        `Processed early reminders for ${upcomingEvents.length} upcoming events`,
      );
    } catch (error) {
      this.logger.error('Error sending early bird reminders:', error);
    }
  }

  /**
   * Update event status based on dates
   */
  @Cron(CronExpression.EVERY_HOUR)
  async updateEventStatuses() {
    this.logger.log('Updating event statuses...');

    try {
      const now = new Date();

      // Mark events as "live" if they're happening now
      const liveEvents = await this.eventModel.updateMany(
        {
          date: { $lte: now },
          status: { $ne: 'completed' },
          archived: { $ne: true },
        },
        {
          status: 'live',
          updatedAt: now,
        },
      );

      // Mark events as "completed" if they ended (assuming 4-hour duration)
      const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
      const completedEvents = await this.eventModel.updateMany(
        {
          date: { $lt: fourHoursAgo },
          status: { $ne: 'completed' },
          archived: { $ne: true },
        },
        {
          status: 'completed',
          completedAt: now,
        },
      );

      this.logger.log(
        `Updated ${liveEvents.modifiedCount} events to live status`,
      );
      this.logger.log(
        `Updated ${completedEvents.modifiedCount} events to completed status`,
      );
    } catch (error) {
      this.logger.error('Error updating event statuses:', error);
    }
  }

  /**
   * Generate event analytics reports weekly
   */
  @Cron('0 8 * * 1') // Monday at 8 AM
  async generateEventAnalytics() {
    this.logger.log('Generating weekly event analytics...');

    try {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Events created this week
      const newEvents = await this.eventModel.countDocuments({
        createdAt: { $gte: oneWeekAgo },
      });

      // Events that happened this week
      const completedEvents = await this.eventModel.countDocuments({
        date: { $gte: oneWeekAgo },
        status: 'completed',
      });

      // Total bookings for events this week
      const eventBookings = await this.bookingModel.aggregate([
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
            'event.date': { $gte: oneWeekAgo },
            status: BookingStatus.CONFIRMED,
          },
        },
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            totalTickets: { $sum: '$quantity' },
            totalRevenue: { $sum: '$totalAmount' },
          },
        },
      ]);

      const stats = eventBookings[0] || {
        totalBookings: 0,
        totalTickets: 0,
        totalRevenue: 0,
      };

      this.logger.log(`Weekly Event Analytics:
        - New Events Created: ${newEvents}
        - Events Completed: ${completedEvents}
        - Total Bookings: ${stats.totalBookings}
        - Total Tickets Sold: ${stats.totalTickets}
        - Total Revenue: $${stats.totalRevenue}
      `);
    } catch (error) {
      this.logger.error('Error generating event analytics:', error);
    }
  }
}
