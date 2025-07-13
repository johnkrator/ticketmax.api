import { Module } from '@nestjs/common';
import { EmailSendService } from './email-send.service';
import { EmailSendController } from './email-send.controller';

@Module({
  controllers: [EmailSendController],
  providers: [EmailSendService],
})
export class EmailSendModule {}
