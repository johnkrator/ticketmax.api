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
import { EmailSendService } from '../../../middleware/email-send/email-send.service';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    private emailService: EmailSendService,
  ) {}

  /**
   * Send a weekly newsletter to active users every Monday at 10 AM
   */
  @Cron('0 10 * * 1')
  async sendWeeklyNewsletter() {
    this.logger.log('Sending weekly newsletter...');

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
            emailVerified: true,
            newsletterSubscribed: { $ne: false },
          },
        },
      ]);

      // Get upcoming events for newsletter content
      const upcomingEvents = await this.eventModel
        .find({
          date: { $gte: new Date() },
          archived: { $ne: true },
        })
        .sort({ date: 1 })
        .limit(5);

      for (const user of activeUsers) {
        await this.emailService.sendNotificationEmail(
          user.email,
          'TicketMax Weekly - Discover Amazing Events!',
          `
            <h2>🎉 Your Weekly Event Digest</h2>
            <p>Hi ${user.firstName || 'there'}!</p>
            <p>Here are some exciting events coming up this week:</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              ${upcomingEvents
                .map(
                  (event) => `
                <div style="margin-bottom: 15px; padding: 10px; border-left: 4px solid #007bff;">
                  <h4>${event.title}</h4>
                  <p>📅 ${new Date(event.date).toLocaleDateString()}</p>
                  <p>📍 ${event.location}</p>
                  <p>🎫 Starting from $${event.price}</p>
                </div>
              `,
                )
                .join('')}
            </div>
            
            <p><a href="${process.env.FRONTEND_URL}/events" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Browse All Events</a></p>
            
            <hr style="margin: 30px 0;">
            <p style="font-size: 12px; color: #666;">
              You're receiving this because you're subscribed to our newsletter. 
              <a href="${process.env.FRONTEND_URL}/unsubscribe?email=${user.email}">Unsubscribe</a>
            </p>
          `,
        );
      }

      this.logger.log(
        `Sent weekly newsletter to ${activeUsers.length} active users`,
      );
    } catch (error) {
      this.logger.error('Error sending weekly newsletter:', error);
    }
  }

  /**
   * Send promotional notifications for events with low bookings
   */
  @Cron('0 14 * * *') // Daily at 2 PM
  async sendPromotionalNotifications() {
    this.logger.log('Sending promotional notifications...');

    try {
      const oneWeekFromNow = new Date();
      oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

      // Find events happening within a week with low booking rates
      const events = await this.eventModel.find({
        date: {
          $gte: new Date(),
          $lte: oneWeekFromNow,
        },
        archived: { $ne: true },
      });

      for (const event of events) {
        const totalBookings = await this.bookingModel.countDocuments({
          eventId: event._id,
          status: BookingStatus.CONFIRMED,
        });

        const bookingRate = totalBookings / event.totalTickets;

        // If booking rate is less than 30%, send promotional notifications
        if (bookingRate < 0.3) {
          // Get users who might be interested (based on location or past bookings)
          const interestedUsers = await this.userModel
            .find({
              emailVerified: true,
              promotionalEmails: { $ne: false },
              // Add more sophisticated targeting logic here
            })
            .limit(100);

          for (const user of interestedUsers) {
            await this.emailService.sendNotificationEmail(
              user.email,
              `Last Chance: ${event.title} - Limited Tickets!`,
              `
                <h2>⚡ Don't Miss Out!</h2>
                <p>Hi ${user.firstName || 'there'}!</p>
                <p>There are still tickets available for this amazing event:</p>
                
                <div style="background: linear-gradient(135deg, #ff6b6b, #ff8e53); color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3>${event.title}</h3>
                  <p>📅 ${new Date(event.date).toLocaleDateString()}</p>
                  <p>📍 ${event.location}</p>
                  <p>🎫 Only ${event.availableTickets} tickets left!</p>
                  <p style="font-size: 24px; font-weight: bold;">From $${event.price}</p>
                </div>
                
                <p><a href="${process.env.FRONTEND_URL}/events/${event._id}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Book Now!</a></p>
                
                <p><em>This event is filling up fast. Book your tickets now to avoid disappointment!</em></p>
              `,
            );
          }

          this.logger.log(
            `Sent promotional notifications for event: ${event.title} (${interestedUsers.length} users)`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Error sending promotional notifications:', error);
    }
  }

  /**
   * Send birthday wishes and special offers to users
   */
  @Cron('0 9 * * *') // Daily at 9 AM
  async sendBirthdayWishes() {
    this.logger.log('Sending birthday wishes...');

    try {
      const today = new Date();
      const todayString = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      // Find users whose birthday is today
      const birthdayUsers = await this.userModel.find({
        dateOfBirth: { $exists: true },
        emailVerified: true,
        $expr: {
          $eq: [
            { $dateToString: { format: '%m-%d', date: '$dateOfBirth' } },
            todayString,
          ],
        },
      });

      for (const user of birthdayUsers) {
        await this.emailService.sendNotificationEmail(
          user.email,
          `🎂 Happy Birthday, ${user.firstName}!`,
          `
            <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 30px; border-radius: 15px; text-align: center;">
              <h1>🎉 Happy Birthday! 🎂</h1>
              <h2>Dear ${user.firstName},</h2>
              <p style="font-size: 18px;">We hope your special day is filled with happiness and wonderful surprises!</p>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>🎁 Birthday Special Offer</h3>
              <p>As our birthday gift to you, enjoy <strong>25% OFF</strong> your next event booking!</p>
              <p><strong>Use code: BIRTHDAY25</strong></p>
              <p style="font-size: 12px; color: #856404;">Valid for 30 days from today</p>
            </div>
            
            <p><a href="${process.env.FRONTEND_URL}/events" style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Browse Events</a></p>
            
            <p>Have a fantastic day!</p>
            <p><em>The TicketMax Team</em></p>
          `,
        );
      }

      this.logger.log(`Sent birthday wishes to ${birthdayUsers.length} users`);
    } catch (error) {
      this.logger.error('Error sending birthday wishes:', error);
    }
  }

  /**
   * Send follow-up emails after events
   */
  @Cron('0 12 * * *') // Daily at noon
  async sendEventFollowUps() {
    this.logger.log('Sending event follow-up emails...');

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date(yesterday);
      today.setDate(today.getDate() + 1);

      // Find events that happened yesterday
      const recentEvents = await this.eventModel.find({
        date: {
          $gte: yesterday,
          $lt: today,
        },
        status: 'completed',
      });

      for (const event of recentEvents) {
        // Find all attendees who haven't received follow-up
        const attendees = await this.bookingModel
          .find({
            eventId: event._id,
            status: BookingStatus.CONFIRMED,
            followUpSent: { $ne: true },
          })
          .populate('userId');

        for (const booking of attendees) {
          const user = booking.userId as any;
          if (user && user.email) {
            await this.emailService.sendNotificationEmail(
              user.email,
              `Thank you for attending: ${event.title}`,
              `
                <h2>Thank You for Attending! 🙏</h2>
                <p>Hi ${user.firstName || 'there'},</p>
                <p>We hope you had an amazing time at <strong>${event.title}</strong>!</p>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3>How was your experience?</h3>
                  <p>Your feedback helps us improve future events.</p>
                  <p><a href="${process.env.FRONTEND_URL}/feedback?event=${event._id}&booking=${booking._id}" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Leave Feedback</a></p>
                </div>
                
                <h3>🎉 More Events Coming Up!</h3>
                <p>Don't miss out on upcoming events. Browse our latest offerings:</p>
                <p><a href="${process.env.FRONTEND_URL}/events" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Browse Events</a></p>
                
                <p>Thank you for choosing TicketMax!</p>
              `,
            );

            // Mark follow-up as sent
            await this.bookingModel.findByIdAndUpdate(booking._id, {
              followUpSent: true,
              followUpSentAt: new Date(),
            });
          }
        }

        this.logger.log(
          `Sent follow-up emails for event: ${event.title} (${attendees.length} attendees)`,
        );
      }
    } catch (error) {
      this.logger.error('Error sending event follow-ups:', error);
    }
  }

  /**
   * Send re-engagement emails to inactive users
   */
  @Cron('0 15 * * 2') // Tuesday at 3 PM
  async sendReEngagementEmails() {
    this.logger.log('Sending re-engagement emails...');

    try {
      const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      // Find users who haven't made a booking in 3 months
      const inactiveUsers = await this.userModel.aggregate([
        {
          $lookup: {
            from: 'bookings',
            localField: '_id',
            foreignField: 'userId',
            as: 'bookings',
          },
        },
        {
          $match: {
            emailVerified: true,
            reengagementSent: { $ne: true },
            $or: [
              { 'bookings.createdAt': { $lt: threeMonthsAgo } },
              { bookings: { $size: 0 } },
            ],
          },
        },
        { $limit: 50 }, // Limit to prevent overwhelming email services
      ]);

      for (const user of inactiveUsers) {
        await this.emailService.sendNotificationEmail(
          user.email,
          `We Miss You! Come Back for Exclusive Events 🎭`,
          `
            <h2>We Miss You! 💙</h2>
            <p>Hi ${user.firstName || 'there'},</p>
            <p>It's been a while since we've seen you at TicketMax. We have some exciting new events you might love!</p>
            
            <div style="background: linear-gradient(135deg, #ff9a9e, #fecfef); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <h3>🎁 Welcome Back Offer</h3>
              <p style="font-size: 18px; margin: 10px 0;"><strong>20% OFF</strong> your next booking!</p>
              <p><strong>Code: WELCOME20</strong></p>
              <p style="font-size: 12px;">Valid for 14 days</p>
            </div>
            
            <h3>🌟 What's New?</h3>
            <ul>
              <li>New event categories added</li>
              <li>Improved mobile experience</li>
              <li>Instant booking confirmations</li>
              <li>Exclusive member benefits</li>
            </ul>
            
            <p><a href="${process.env.FRONTEND_URL}/events?utm_source=reengagement" style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Discover Events</a></p>
            
            <p>We'd love to have you back!</p>
          `,
        );

        // Mark re-engagement email as sent
        await this.userModel.findByIdAndUpdate(user._id, {
          reengagementSent: true,
          reengagementSentAt: new Date(),
        });
      }

      this.logger.log(
        `Sent re-engagement emails to ${inactiveUsers.length} inactive users`,
      );
    } catch (error) {
      this.logger.error('Error sending re-engagement emails:', error);
    }
  }

  /**
   * Send monthly analytics to organizers
   */
  @Cron('0 8 1 * *') // First day of month at 8 AM
  async sendOrganizerAnalytics() {
    this.logger.log('Sending monthly analytics to organizers...');

    try {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      lastMonth.setDate(1);
      lastMonth.setHours(0, 0, 0, 0);

      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      // Get organizers who had events last month
      const organizers = await this.userModel.find({
        role: 'organizer',
        emailVerified: true,
      });

      for (const organizer of organizers) {
        // Get organizer's events and bookings for last month
        const events = await this.eventModel.find({
          organizerId: organizer._id,
          createdAt: { $gte: lastMonth, $lt: thisMonth },
        });

        if (events.length > 0) {
          const eventIds = events.map((e) => e._id);

          const analytics = await this.bookingModel.aggregate([
            {
              $match: {
                eventId: { $in: eventIds },
                status: BookingStatus.CONFIRMED,
              },
            },
            {
              $group: {
                _id: null,
                totalBookings: { $sum: 1 },
                totalRevenue: { $sum: '$totalAmount' },
                totalTickets: { $sum: '$quantity' },
              },
            },
          ]);

          const stats = analytics[0] || {
            totalBookings: 0,
            totalRevenue: 0,
            totalTickets: 0,
          };

          await this.emailService.sendNotificationEmail(
            organizer.email,
            `Monthly Analytics Report - ${lastMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
            `
              <h2>📊 Your Monthly Performance Report</h2>
              <p>Hi ${organizer.firstName || 'there'},</p>
              <p>Here's how your events performed last month:</p>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Key Metrics</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 20px;">
                  <div style="background: white; padding: 15px; border-radius: 5px; text-align: center; flex: 1; min-width: 150px;">
                    <h4>Events Created</h4>
                    <p style="font-size: 24px; font-weight: bold; color: #007bff;">${events.length}</p>
                  </div>
                  <div style="background: white; padding: 15px; border-radius: 5px; text-align: center; flex: 1; min-width: 150px;">
                    <h4>Total Bookings</h4>
                    <p style="font-size: 24px; font-weight: bold; color: #28a745;">${stats.totalBookings}</p>
                  </div>
                  <div style="background: white; padding: 15px; border-radius: 5px; text-align: center; flex: 1; min-width: 150px;">
                    <h4>Revenue</h4>
                    <p style="font-size: 24px; font-weight: bold; color: #ffc107;">$${stats.totalRevenue}</p>
                  </div>
                </div>
              </div>
              
              <p><a href="${process.env.FRONTEND_URL}/organizer/dashboard" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Full Dashboard</a></p>
              
              <p>Keep up the great work!</p>
            `,
          );
        }
      }

      this.logger.log(
        `Sent monthly analytics to ${organizers.length} organizers`,
      );
    } catch (error) {
      this.logger.error('Error sending organizer analytics:', error);
    }
  }
}
