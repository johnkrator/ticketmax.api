import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { ConfigModule } from '@nestjs/config';
import { EmailSendService } from '../email-send/email-send.service';
import { SmsSendService } from '../sms-send/sms-send.service';

@Module({
  imports: [ConfigModule],
  controllers: [NotificationController],
  providers: [NotificationService, EmailSendService, SmsSendService],
  exports: [EmailSendService, SmsSendService],
})
export class NotificationModule {}
