import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentCleanupService } from './services/payment-cleanup.service';
import { EventManagementService } from './services/event-management.service';
import { BookingCleanupService } from './services/booking-cleanup.service';
import { NotificationSchedulerService } from './services/notification-scheduler.service';
import { DataCleanupService } from './services/data-cleanup.service';
import { AnalyticsService } from './services/analytics.service';
import { BackgroundJobsController } from './background-jobs.controller';

// Import entities from other modules
import { Payment, PaymentSchema } from '../payment/entities/payment.entity';
import { Booking, BookingSchema } from '../booking/entities/booking.entity';
import { Event, EventSchema } from '../event/entities/event.entity';
import { User, UserSchema } from '../user/entities/user.entity';

// Import services from other modules
import { EmailSendModule } from '../../middleware/email-send/email-send.module';
import { SmsSendModule } from '../../middleware/sms-send/sms-send.module';
import { NotificationModule } from '../../middleware/notification/notification.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: Event.name, schema: EventSchema },
      { name: User.name, schema: UserSchema },
    ]),
    EmailSendModule,
    SmsSendModule,
    NotificationModule,
  ],
  controllers: [BackgroundJobsController],
  providers: [
    PaymentCleanupService,
    EventManagementService,
    BookingCleanupService,
    NotificationSchedulerService,
    DataCleanupService,
    AnalyticsService,
  ],
  exports: [
    PaymentCleanupService,
    EventManagementService,
    BookingCleanupService,
    NotificationSchedulerService,
    DataCleanupService,
    AnalyticsService,
  ],
})
export class BackgroundServicesModule {}
