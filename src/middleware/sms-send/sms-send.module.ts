import { Module } from '@nestjs/common';
import { SmsSendService } from './sms-send.service';
import { SmsSendController } from './sms-send.controller';

@Module({
  controllers: [SmsSendController],
  providers: [SmsSendService],
})
export class SmsSendModule {}
