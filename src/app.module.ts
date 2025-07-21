import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/user/user.module';
import { EventModule } from './modules/event/event.module';
import { OrganizerModule } from './modules/organizer/organizer.module';
import { AdminSeedModule } from './modules/admin-seed/admin-seed.module';
import { BookingModule } from './modules/booking/booking.module';
import { PaymentModule } from './modules/payment/payment.module';
import { EmailSendModule } from './middleware/email-send/email-send.module';
import { SmsSendModule } from './middleware/sms-send/sms-send.module';
import { NotificationModule } from './middleware/notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/ticketmax',
    ),
    UserModule,
    EventModule,
    OrganizerModule,
    AdminSeedModule,
    BookingModule,
    PaymentModule,
    EmailSendModule,
    SmsSendModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
