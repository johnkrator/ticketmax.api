import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

import { NotificationSchedulerService } from './services/notification-scheduler.service';
import { BookingCleanupService } from './services/booking-cleanup.service';
import { EventManagementService } from './services/event-management.service';
import { PaymentCleanupService } from './services/payment-cleanup.service';
import { DataCleanupService } from './services/data-cleanup.service';
import { AnalyticsService } from './services/analytics.service';

import { User, UserSchema } from '../user/entities/user.entity';
import { Event, EventSchema } from '../event/entities/event.entity';
import { Booking, BookingSchema } from '../booking/entities/booking.entity';
import { EmailSendModule } from '../../middleware/email-send/email-send.module';
import { NotificationModule } from '../../middleware/notification/notification.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Event.name, schema: EventSchema },
      { name: Booking.name, schema: BookingSchema },
    ]),
    EmailSendModule,
    NotificationModule,
  ],
  providers: [
    NotificationSchedulerService,
    BookingCleanupService,
    EventManagementService,
    PaymentCleanupService,
    DataCleanupService,
    AnalyticsService,
  ],
  exports: [
    NotificationSchedulerService,
    BookingCleanupService,
    EventManagementService,
    PaymentCleanupService,
    DataCleanupService,
    AnalyticsService,
  ],
})
export class BackgroundServicesModule {}
