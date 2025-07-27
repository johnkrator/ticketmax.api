import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Payment,
  PaymentDocument,
  PaymentStatus,
} from '../../payment/entities/payment.entity';
import {
  Booking,
  BookingDocument,
  BookingStatus,
} from '../../booking/entities/booking.entity';
import { Event, EventDocument } from '../../event/entities/event.entity';
import { EmailSendService } from '../../../middleware/email-send/email-send.service';

@Injectable()
export class PaymentCleanupService {
  private readonly logger = new Logger(PaymentCleanupService.name);

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    private emailService: EmailSendService,
  ) {}

  /**
   * Clean up abandoned payments every 10 minutes
   * Marks payments as abandoned if they've been pending for more than 15 minutes
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async cleanupAbandonedPayments() {
    this.logger.log('Starting abandoned payments cleanup...');

    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

      // Find pending payments older than 15 minutes
      const abandonedPayments = await this.paymentModel
        .find({
          status: PaymentStatus.PENDING,
          createdAt: { $lt: fifteenMinutesAgo },
        })
        .populate('bookingId');

      for (const payment of abandonedPayments) {
        // Mark payment as abandoned
        await this.paymentModel.findByIdAndUpdate(payment._id, {
          status: PaymentStatus.ABANDONED,
          abandonedAt: new Date(),
          abandondReason: 'Payment timeout - exceeded 15 minutes',
        });

        // Cancel associated booking and release tickets
        const booking = payment.bookingId as any;
        if (booking) {
          await this.bookingModel.findByIdAndUpdate(booking._id, {
            status: BookingStatus.CANCELLED,
            cancelledAt: new Date(),
            cancellationReason: 'Payment abandoned - timeout exceeded',
          });

          // Release tickets back to event inventory
          await this.eventModel.findByIdAndUpdate(booking.eventId, {
            $inc: { availableTickets: booking.quantity },
          });

          this.logger.log(
            `Released ${booking.quantity} tickets for abandoned payment ${payment._id}`,
          );
        }

        this.logger.log(`Marked payment ${payment._id} as abandoned`);
      }

      this.logger.log(
        `Processed ${abandonedPayments.length} abandoned payments`,
      );
    } catch (error) {
      this.logger.error('Error cleaning up abandoned payments:', error);
    }
  }

  /**
   * Handle payment timeouts every 5 minutes
   * Process payments that have exceeded gateway timeout limits
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handlePaymentTimeouts() {
    this.logger.log('Checking for payment timeouts...');

    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      // Find payments that have been pending too long (since there's no PROCESSING status)
      const timedOutPayments = await this.paymentModel
        .find({
          status: PaymentStatus.PENDING,
          createdAt: { $lt: tenMinutesAgo },
        })
        .populate({
          path: 'bookingId',
          populate: {
            path: 'userId eventId',
          },
        });

      for (const payment of timedOutPayments) {
        // Mark payment as failed due to timeout
        await this.paymentModel.findByIdAndUpdate(payment._id, {
          status: PaymentStatus.FAILED,
          failureReason: 'Payment gateway timeout',
          failedAt: new Date(),
        });

        const booking = payment.bookingId as any;
        if (booking) {
          // Cancel the booking
          await this.bookingModel.findByIdAndUpdate(booking._id, {
            status: BookingStatus.CANCELLED,
            cancelledAt: new Date(),
            cancellationReason: 'Payment gateway timeout',
          });

          // Release tickets
          await this.eventModel.findByIdAndUpdate(booking.eventId._id, {
            $inc: { availableTickets: booking.quantity },
          });

          // Notify user about payment failure
          if (booking.userId?.email) {
            await this.emailService.sendNotificationEmail(
              booking.userId.email,
              'Payment Failed - Booking Cancelled',
              `
                <h3>Payment Processing Failed</h3>
                <p>We're sorry, but your payment for "${booking.eventId?.title}" could not be processed due to a timeout.</p>
                <p>Your booking has been cancelled and the tickets have been released.</p>
                <p><strong>Booking ID:</strong> ${booking._id}</p>
                <p><strong>Amount:</strong> $${payment.amount}</p>
                <p>You can try booking again if tickets are still available.</p>
                <p>If you were charged, the amount will be refunded within 3-5 business days.</p>
              `,
            );
          }
        }

        this.logger.log(`Processed timeout for payment ${payment._id}`);
      }

      this.logger.log(`Processed ${timedOutPayments.length} payment timeouts`);
    } catch (error) {
      this.logger.error('Error handling payment timeouts:', error);
    }
  }

  /**
   * Clean up old failed payments weekly
   * Remove failed payment records older than 30 days
   */
  @Cron('0 1 * * 0') // Sunday at 1 AM
  async cleanupOldFailedPayments() {
    this.logger.log('Cleaning up old failed payments...');

    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const result = await this.paymentModel.deleteMany({
        status: { $in: [PaymentStatus.FAILED, PaymentStatus.ABANDONED] },
        createdAt: { $lt: thirtyDaysAgo },
      });

      this.logger.log(
        `Deleted ${result.deletedCount} old failed/abandoned payments`,
      );
    } catch (error) {
      this.logger.error('Error cleaning up old failed payments:', error);
    }
  }

  /**
   * Generate payment analytics daily at midnight
   */
  @Cron('0 0 * * *')
  async generatePaymentAnalytics() {
    this.logger.log('Generating daily payment analytics...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [successful, failed, abandoned, pending, totalRevenue] =
        await Promise.all([
          this.paymentModel.countDocuments({
            status: PaymentStatus.SUCCESS,
            createdAt: { $gte: today, $lt: tomorrow },
          }),
          this.paymentModel.countDocuments({
            status: PaymentStatus.FAILED,
            createdAt: { $gte: today, $lt: tomorrow },
          }),
          this.paymentModel.countDocuments({
            status: PaymentStatus.ABANDONED,
            createdAt: { $gte: today, $lt: tomorrow },
          }),
          this.paymentModel.countDocuments({
            status: PaymentStatus.PENDING,
            createdAt: { $gte: today, $lt: tomorrow },
          }),
          this.paymentModel.aggregate([
            {
              $match: {
                status: PaymentStatus.SUCCESS,
                createdAt: { $gte: today, $lt: tomorrow },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$amount' },
              },
            },
          ]),
        ]);

      const revenue = totalRevenue.length > 0 ? totalRevenue[0].total : 0;
      const total = successful + failed + abandoned + pending;
      const successRate =
        total > 0 ? ((successful / total) * 100).toFixed(2) : 0;

      this.logger.log(`Daily Payment Analytics:
        - Total Transactions: ${total}
        - Successful: ${successful} (${successRate}%)
        - Failed: ${failed}
        - Abandoned: ${abandoned}
        - Still Pending: ${pending}
        - Total Revenue: $${revenue}
      `);
    } catch (error) {
      this.logger.error('Error generating payment analytics:', error);
    }
  }
}
