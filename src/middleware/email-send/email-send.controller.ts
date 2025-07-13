import { Controller } from '@nestjs/common';
import { EmailSendService } from './email-send.service';

@Controller('email-send')
export class EmailSendController {
  constructor(private readonly emailSendService: EmailSendService) {}
}
