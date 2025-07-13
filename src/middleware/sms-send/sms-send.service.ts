import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

@Injectable()
export class SmsSendService {
  private twilioClient: Twilio;

  constructor(private configService: ConfigService) {
    this.twilioClient = new Twilio(
      this.configService.get('TWILIO_ACCOUNT_SID'),
      this.configService.get('TWILIO_AUTH_TOKEN'),
    );
  }

  async sendVerificationSms(phoneNumber: string, token: string) {
    const message = `Your verification code is: ${token}. This code will expire in 10 minutes.`;
    return this.sendSms(phoneNumber, message);
  }

  async sendPasswordResetSms(phoneNumber: string, token: string) {
    const message = `Your password reset code is: ${token}. This code will expire in 10 minutes.`;
    return this.sendSms(phoneNumber, message);
  }

  private async sendSms(to: string, body: string) {
    try {
      const message = await this.twilioClient.messages.create({
        body,
        from: this.configService.get('TWILIO_PHONE_NUMBER'),
        to,
      });

      return { success: true, messageId: message.sid };
    } catch (error) {
      console.error('SMS sending failed:', error);
      return { success: false, error: error.message };
    }
  }
}
