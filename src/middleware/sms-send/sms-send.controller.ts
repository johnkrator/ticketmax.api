import { Controller } from '@nestjs/common';
import { SmsSendService } from './sms-send.service';

@Controller('sms-send')
export class SmsSendController {
  constructor(private readonly smsSendService: SmsSendService) {}
}
