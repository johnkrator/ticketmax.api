import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Booking,
  BookingDocument,
  BookingStatus,
} from '../../booking/entities/booking.entity';
import { Event, EventDocument } from '../../event/entities/event.entity';
import { User, UserDocument } from '../../user/entities/user.entity';
import { EmailSendService } from '../../../middleware/email-send/email-send.service';

@Injectable()
export class BookingCleanupService {
  private readonly logger = new Logger(BookingCleanupService.name);

  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private emailService: EmailSendService,
  ) {}

  /**
   * Cancel expired bookings every 5 minutes
   * Cancels bookings that have been pending for more than 10 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async cancelExpiredBookings() {
    this.logger.log('Starting expired bookings cleanup...');

    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      const expiredBookings = await this.bookingModel
        .find({
          status: BookingStatus.PENDING,
          createdAt: { $lt: tenMinutesAgo },
        })
        .populate('eventId userId');

      for (const booking of expiredBookings) {
        // Cancel the booking
        await this.bookingModel.findByIdAndUpdate(booking._id, {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: 'Expired - Payment not completed in time',
        });

        // Release tickets back to event inventory
        const event = booking.eventId as any;
        if (event) {
          await this.eventModel.findByIdAndUpdate(event._id, {
            $inc: { availableTickets: booking.quantity },
          });
        }

        // Notify user about cancellation
        const user = booking.userId as any;
        if (user && user.email) {
          await this.emailService.sendNotificationEmail(
            user.email,
            'Booking Cancelled - Payment Timeout',
            `
              <h3>Booking Canceled</h3>
              <p>Your booking for "${event?.title}" has been canceled due to payment timeout.</p>
              <p>The tickets have been released back to inventory and are available for other customers.</p>
              <p>You can try booking again if tickets are still available.</p>
              <p><strong>Booking ID:</strong> ${booking._id}</p>
              <p><strong>Quantity:</strong> ${booking.quantity} tickets</p>
            `,
          );
        }

        this.logger.log(
          `Cancelled expired booking ${booking._id} for event ${event?.title}`,
        );
      }

      this.logger.log(`Cancelled ${expiredBookings.length} expired bookings`);
    } catch (error) {
      this.logger.error('Error cancelling expired bookings:', error);
    }
  }

  /**
   * Process refund requests every 2 hours
   */
  @Cron(CronExpression.EVERY_2_HOURS)
  async processRefundRequests() {
    this.logger.log('Processing refund requests...');

    try {
      const refundRequests = await this.bookingModel
        .find({
          status: BookingStatus.CANCELLED,
          refundRequested: true,
          refundProcessed: { $ne: true },
        })
        .populate('eventId userId');

      for (const booking of refundRequests) {
        const event = booking.eventId as any;
        const user = booking.userId as any;

        // Check if the event is more than 24 hours away (refund policy)
        const eventDate = new Date(event.date);
        const now = new Date();
        const hoursUntilEvent =
          (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilEvent >= 24) {
          // Process full refund
          await this.bookingModel.findByIdAndUpdate(booking._id, {
            refundProcessed: true,
            refundAmount: booking.totalAmount,
            refundProcessedAt: new Date(),
          });

          // Send confirmation email
          if (user && user.email) {
            await this.emailService.sendNotificationEmail(
              user.email,
              'Refund Processed',
              `
                <h3>Refund Processed</h3>
                <p>Your refund for booking "${event?.title}" has been processed.</p>
                <p><strong>Refund Amount:</strong> $${booking.totalAmount}</p>
                <p><strong>Processing Time:</strong> 3–5 business days</p>
                <p><strong>Booking ID:</strong> ${booking._id}</p>
              `,
            );
          }

          this.logger.log(
            `Processed refund for booking ${booking._id} - Amount: $${booking.totalAmount}`,
          );
        } else if (hoursUntilEvent >= 0) {
          // Less than 24 hours - partial refund (50%)
          const refundAmount = booking.totalAmount * 0.5;

          await this.bookingModel.findByIdAndUpdate(booking._id, {
            refundProcessed: true,
            refundAmount: refundAmount,
            refundProcessedAt: new Date(),
          });

          if (user && user.email) {
            await this.emailService.sendNotificationEmail(
              user.email,
              'Partial Refund Processed',
              `
                <h3>Partial Refund Processed</h3>
                <p>Your partial refund for booking "${event?.title}" has been processed.</p>
                <p><strong>Original Amount:</strong> $${booking.totalAmount}</p>
                <p><strong>Refund Amount:</strong> $${refundAmount} (50% due to late cancellation)</p>
                <p><strong>Processing Time:</strong> 3-5 business days</p>
                <p><strong>Booking ID:</strong> ${booking._id}</p>
              `,
            );
          }

          this.logger.log(
            `Processed partial refund for booking ${booking._id} - Amount: $${refundAmount}`,
          );
        } else {
          // Event has passed - no refund
          await this.bookingModel.findByIdAndUpdate(booking._id, {
            refundProcessed: true,
            refundAmount: 0,
            refundProcessedAt: new Date(),
            refundDenied: true,
            refundDenialReason: 'Event has already occurred',
          });

          if (user && user.email) {
            await this.emailService.sendNotificationEmail(
              user.email,
              'Refund Request Denied',
              `
                <h3>Refund Request Denied</h3>
                <p>Unfortunately, your refund request for "${event?.title}" cannot be processed as the event has already occurred.</p>
                <p><strong>Booking ID:</strong> ${booking._id}</p>
                <p>Please contact support if you have any questions.</p>
              `,
            );
          }

          this.logger.log(
            `Denied refund for booking ${booking._id} - Event has passed`,
          );
        }
      }

      this.logger.log(`Processed ${refundRequests.length} refund requests`);
    } catch (error) {
      this.logger.error('Error processing refund requests:', error);
    }
  }

  /**
   * Send booking confirmations for completed payments every 10 minutes
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async sendPendingBookingConfirmations() {
    this.logger.log('Sending pending booking confirmations...');

    try {
      // Find confirmed bookings that haven't sent confirmation emails
      const pendingConfirmations = await this.bookingModel
        .find({
          status: BookingStatus.CONFIRMED,
          confirmationEmailSent: { $ne: true },
        })
        .populate('eventId userId');

      for (const booking of pendingConfirmations) {
        const event = booking.eventId as any;
        const user = booking.userId as any;

        if (user && user.email && event) {
          await this.emailService.sendNotificationEmail(
            user.email,
            `Booking Confirmed - ${event.title}`,
            `
              <h3>Booking Confirmed!</h3>
              <p>Your booking for "${event.title}" has been confirmed.</p>
              
              <h4>Event Details:</h4>
              <p><strong>Date:</strong> ${event.date}</p>
              <p><strong>Time:</strong> ${event.time}</p>
              <p><strong>Location:</strong> ${event.location}</p>
              
              <h4>Booking Details:</h4>
              <p><strong>Booking ID:</strong> ${booking._id}</p>
              <p><strong>Tickets:</strong> ${booking.quantity}</p>
              <p><strong>Total Amount:</strong> ₦${(booking.totalAmount / 100).toFixed(2)}</p>
              
              <p>Please bring this confirmation email or your booking ID to the event.</p>
              <p>We look forward to seeing you there!</p>
            `,
          );

          // Mark the confirmation email as sent
          await this.bookingModel.findByIdAndUpdate(booking._id, {
            confirmationEmailSent: true,
            confirmationEmailSentAt: new Date(),
          });

          this.logger.log(`Sent confirmation email for booking ${booking._id}`);
        }
      }

      this.logger.log(
        `Sent ${pendingConfirmations.length} booking confirmations`,
      );
    } catch (error) {
      this.logger.error('Error sending booking confirmations:', error);
    }
  }

  /**
   * Generate a weekly booking report every Sunday at 8 PM
   */
  @Cron('0 20 * * 0')
  async generateWeeklyBookingReport() {
    this.logger.log('Generating weekly booking report...');

    try {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const weeklyStats = await this.bookingModel.aggregate([
        {
          $match: {
            createdAt: { $gte: oneWeekAgo },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
            totalTickets: { $sum: '$quantity' },
          },
        },
      ]);

      const eventStats = await this.bookingModel.aggregate([
        {
          $match: {
            createdAt: { $gte: oneWeekAgo },
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
          $limit: 10,
        },
      ]);

      this.logger.log('Weekly booking report:');
      this.logger.log('Overall stats:', JSON.stringify(weeklyStats, null, 2));
      this.logger.log(
        'Top performing events:',
        JSON.stringify(eventStats, null, 2),
      );
    } catch (error) {
      this.logger.error('Error generating weekly booking report:', error);
    }
  }

  /**
   * Clean up old canceled bookings daily at 2 AM
   * Removes canceled bookings older than 30 days
   */
  @Cron('0 2 * * *')
  async cleanupOldCancelledBookings() {
    this.logger.log('Starting cleanup of old cancelled bookings...');

    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const result = await this.bookingModel.deleteMany({
        status: BookingStatus.CANCELLED,
        cancelledAt: { $lt: thirtyDaysAgo },
      });

      this.logger.log(`Deleted ${result.deletedCount} old cancelled bookings`);
    } catch (error) {
      this.logger.error('Error cleaning up old cancelled bookings:', error);
    }
  }

  /**
   * Send reminder emails for upcoming events - runs daily at 9 AM
   */
  @Cron('0 9 * * *')
  async sendEventReminders() {
    this.logger.log('Sending event reminders...');

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      // Find confirmed bookings for events happening tomorrow
      const upcomingBookings = await this.bookingModel
        .find({
          status: BookingStatus.CONFIRMED,
          reminderSent: { $ne: true },
        })
        .populate({
          path: 'eventId',
          match: {
            date: {
              $gte: tomorrow,
              $lt: dayAfterTomorrow,
            },
          },
        })
        .populate('userId');

      // Filter out bookings where the event didn't match the date criteria
      const validBookings = upcomingBookings.filter(
        (booking) => booking.eventId,
      );

      for (const booking of validBookings) {
        const event = booking.eventId as any;
        const user = booking.userId as any;

        if (user && user.email) {
          await this.emailService.sendNotificationEmail(
            user.email,
            `Reminder: ${event.title} is Tomorrow!`,
            `
              <h3>Event Reminder</h3>
              <p>This is a friendly reminder that your event is tomorrow!</p>
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
                <h4>${event.title}</h4>
                <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${new Date(event.date).toLocaleTimeString()}</p>
                <p><strong>Location:</strong> ${event.location}</p>
                <p><strong>Tickets:</strong> ${booking.quantity}</p>
                <p><strong>Booking ID:</strong> ${booking._id}</p>
              </div>
              <p>Please arrive 30 minutes early and bring a valid ID.</p>
              <p>We look forward to seeing you there!</p>
            `,
          );

          // Mark reminder as sent
          await this.bookingModel.findByIdAndUpdate(booking._id, {
            reminderSent: true,
            reminderSentAt: new Date(),
          });

          this.logger.log(
            `Sent reminder for booking ${booking._id} - Event: ${event.title}`,
          );
        }
      }

      this.logger.log(`Sent ${validBookings.length} event reminders`);
    } catch (error) {
      this.logger.error('Error sending event reminders:', error);
    }
  }

  /**
   * Archive completed events weekly on Sundays at 3 AM
   */
  @Cron('0 3 * * 0')
  async archiveCompletedEvents() {
    this.logger.log('Archiving completed events...');

    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const completedEvents = await this.eventModel.find({
        date: { $lt: sevenDaysAgo },
        archived: { $ne: true },
      });

      for (const event of completedEvents) {
        await this.eventModel.findByIdAndUpdate(event._id, {
          archived: true,
          archivedAt: new Date(),
        });
      }

      this.logger.log(`Archived ${completedEvents.length} completed events`);
    } catch (error) {
      this.logger.error('Error archiving completed events:', error);
    }
  }

  /**
   * Generate daily booking reports at 11 PM
   */
  @Cron('0 23 * * *')
  async generateDailyReport() {
    this.logger.log('Generating daily booking report...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [
        totalBookings,
        confirmedBookings,
        cancelledBookings,
        pendingBookings,
        totalRevenue,
      ] = await Promise.all([
        this.bookingModel.countDocuments({
          createdAt: { $gte: today, $lt: tomorrow },
        }),
        this.bookingModel.countDocuments({
          createdAt: { $gte: today, $lt: tomorrow },
          status: BookingStatus.CONFIRMED,
        }),
        this.bookingModel.countDocuments({
          createdAt: { $gte: today, $lt: tomorrow },
          status: BookingStatus.CANCELLED,
        }),
        this.bookingModel.countDocuments({
          createdAt: { $gte: today, $lt: tomorrow },
          status: BookingStatus.PENDING,
        }),
        this.bookingModel.aggregate([
          {
            $match: {
              createdAt: { $gte: today, $lt: tomorrow },
              status: BookingStatus.CONFIRMED,
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$totalAmount' },
            },
          },
        ]),
      ]);

      const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;

      this.logger.log(
        `Daily Report - Total: ${totalBookings}, Confirmed: ${confirmedBookings}, Cancelled: ${cancelledBookings}, Pending: ${pendingBookings}, Revenue: $${revenue}`,
      );
    } catch (error) {
      this.logger.error('Error generating daily report:', error);
    }
  }
}
