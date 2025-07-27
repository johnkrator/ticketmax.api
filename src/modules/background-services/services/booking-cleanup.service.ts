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
import { Event, EventDocument } from '../../event/entities/event.entity';
import { User, UserDocument } from '../../user/entities/user.entity';
import { EmailSendService } from '../../../middleware/email-send/email-send.service';

@Injectable()
export class BookingCleanupService {
  private readonly logger = new Logger(BookingCleanupService.name);
  private readonly schedulerEnabled: boolean;
  private readonly bookingTimeoutMinutes: number;

  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private emailService: EmailSendService,
    private configService: ConfigService,
  ) {
    this.schedulerEnabled =
      this.configService.get<string>('SCHEDULER_ENABLED', 'true') === 'true';
    this.bookingTimeoutMinutes = parseInt(
      this.configService.get<string>('BOOKING_TIMEOUT_MINUTES', '10'),
    );

    if (this.schedulerEnabled) {
      this.logger.log(
        `✅ Booking Cleanup Service initialized - Timeout: ${this.bookingTimeoutMinutes} minutes`,
      );
    } else {
      this.logger.log(
        '⏸️ Booking Cleanup Service disabled via SCHEDULER_ENABLED=false',
      );
    }
  }

  /**
   * Cancel expired bookings every 2 minutes
   * Cancels bookings that have been pending for more than configured timeout
   */
  @Cron('*/2 * * * *')
  async cancelExpiredBookings() {
    if (!this.schedulerEnabled) return;

    this.logger.debug('🔍 Checking for expired bookings...');

    try {
      const timeoutMs = this.bookingTimeoutMinutes * 60 * 1000;
      const cutoffTime = new Date(Date.now() - timeoutMs);

      const expiredBookings = await this.bookingModel
        .find({
          status: BookingStatus.PENDING,
          createdAt: { $lt: cutoffTime },
        })
        .populate('eventId userId');

      let cancelledCount = 0;
      let ticketsReleased = 0;

      for (const booking of expiredBookings) {
        try {
          // Cancel the booking
          await this.bookingModel.findByIdAndUpdate(booking._id, {
            status: BookingStatus.CANCELLED,
            cancelledAt: new Date(),
            cancellationReason: `Expired - Payment not completed within ${this.bookingTimeoutMinutes} minutes`,
          });

          // Release tickets back to event inventory
          if (booking.eventId) {
            await this.eventModel.findByIdAndUpdate(booking.eventId._id, {
              $inc: { availableTickets: booking.quantity },
            });
            ticketsReleased += booking.quantity;
          }

          // Send cancellation notification
          const populatedBooking = booking.populated('userId')
            ? booking
            : await booking.populate('userId');
          if (
            populatedBooking.userId &&
            (populatedBooking.userId as any).email
          ) {
            try {
              await this.emailService.sendNotificationEmail(
                (populatedBooking.userId as any).email,
                'Booking Cancelled - Payment Timeout',
                `Your booking has been cancelled due to payment timeout. Booking ID: ${booking._id}`,
              );
            } catch (emailError) {
              this.logger.warn(
                `Failed to send cancellation email for booking ${booking._id}:`,
                emailError.message,
              );
            }
          }

          cancelledCount++;
        } catch (error) {
          this.logger.error(`Failed to cancel booking ${booking._id}:`, error);
        }
      }

      if (cancelledCount > 0) {
        this.logger.log(
          `✅ Cancelled ${cancelledCount} expired bookings, released ${ticketsReleased} tickets`,
        );
      }
    } catch (error) {
      this.logger.error('❌ Failed to process expired bookings:', error);
    }
  }

  /**
   * Archive old completed bookings every day at 3 AM
   */
  @Cron('0 3 * * *')
  async archiveOldBookings() {
    if (!this.schedulerEnabled) return;

    this.logger.debug('📦 Archiving old completed bookings...');

    try {
      const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);

      const result = await this.bookingModel.updateMany(
        {
          status: { $in: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED] },
          updatedAt: { $lt: sixMonthsAgo },
          archived: { $ne: true },
        },
        {
          $set: { archived: true, archivedAt: new Date() },
        },
      );

      if (result.modifiedCount > 0) {
        this.logger.log(`✅ Archived ${result.modifiedCount} old bookings`);
      }
    } catch (error) {
      this.logger.error('❌ Failed to archive old bookings:', error);
    }
  }

  /**
   * Send booking completion reminders for past events every day at 9 AM
   */
  @Cron('0 9 * * *')
  async processBookingCompletions() {
    if (!this.schedulerEnabled) return;

    this.logger.debug('✅ Processing booking completions for past events...');

    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Find confirmed bookings for events that ended in the last 24 hours
      // Since your Event entity uses separate date/time fields, we'll check by date
      const yesterday = new Date(oneDayAgo);
      const yesterdayDateString = yesterday.toISOString().split('T')[0];

      const bookingsToComplete = await this.bookingModel
        .find({
          status: BookingStatus.CONFIRMED,
        })
        .populate({
          path: 'eventId',
          match: {
            date: yesterdayDateString,
          },
        })
        .populate('userId');

      // Filter out bookings where event wasn't populated (didn't match criteria)
      const validBookings = bookingsToComplete.filter(
        (booking) => booking.eventId,
      );

      let completedCount = 0;
      for (const booking of validBookings) {
        try {
          // Mark booking as completed
          await this.bookingModel.findByIdAndUpdate(booking._id, {
            status: BookingStatus.CONFIRMED, // Keep as confirmed since there's no COMPLETED status
            completedAt: new Date(),
          });

          // Send post-event feedback email
          const populatedBooking = booking.populated('userId')
            ? booking
            : await booking.populate('userId');
          if (
            populatedBooking.userId &&
            (populatedBooking.userId as any).email
          ) {
            try {
              await this.emailService.sendNotificationEmail(
                (populatedBooking.userId as any).email,
                'Event Feedback Request',
                `Thank you for attending the event! We'd love to hear your feedback. Booking ID: ${booking._id}`,
              );
            } catch (emailError) {
              this.logger.warn(
                `Failed to send feedback email for booking ${booking._id}:`,
                emailError.message,
              );
            }
          }

          completedCount++;
        } catch (error) {
          this.logger.error(
            `Failed to complete booking ${booking._id}:`,
            error,
          );
        }
      }

      if (completedCount > 0) {
        this.logger.log(
          `✅ Processed ${completedCount} bookings for past events`,
        );
      }
    } catch (error) {
      this.logger.error('❌ Failed to process booking completions:', error);
    }
  }

  /**
   * Generate booking reports every Sunday at 11 PM
   */
  @Cron('0 23 * * 0')
  async generateWeeklyBookingReport() {
    if (!this.schedulerEnabled) return;

    this.logger.debug('📊 Generating weekly booking report...');

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
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
          },
        },
      ]);

      const totalBookings = weeklyStats.reduce(
        (sum, stat) => sum + stat.count,
        0,
      );
      const totalRevenue = weeklyStats.reduce(
        (sum, stat) => sum + (stat.totalAmount || 0),
        0,
      );

      this.logger.log(
        `📊 Weekly Report: ${totalBookings} bookings, $${totalRevenue.toFixed(
          2,
        )} revenue`,
      );

      // Log breakdown by status
      weeklyStats.forEach((stat) => {
        this.logger.log(
          `   ${stat._id}: ${stat.count} bookings, $${(
            stat.totalAmount || 0
          ).toFixed(2)}`,
        );
      });
    } catch (error) {
      this.logger.error('❌ Failed to generate weekly booking report:', error);
    }
  }
}
