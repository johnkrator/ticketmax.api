import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailSendService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: this.configService.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  async sendVerificationEmail(email: string, token: string, firstName: string) {
    const subject = 'Verify Your Email Address';
    const html = `
      <h2>Welcome ${firstName}!</h2>
      <p>Please verify your email address using the code below:</p>
      <div style="font-size: 24px; font-weight: bold; padding: 20px; background-color: #f5f5f5; text-align: center;">
        ${token}
      </div>
      <p>This code will expire in 10 minutes.</p>
    `;

    return this.sendEmail(email, subject, html);
  }

  async sendPasswordResetEmail(
    email: string,
    token: string,
    firstName: string,
  ) {
    const subject = 'Password Reset Request';
    const html = `
      <h2>Hello ${firstName}</h2>
      <p>You requested a password reset. Use the code below to reset your password:</p>
      <div style="font-size: 24px; font-weight: bold; padding: 20px; background-color: #f5f5f5; text-align: center;">
        ${token}
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    return this.sendEmail(email, subject, html);
  }

  private async sendEmail(to: string, subject: string, html: string) {
    const mailOptions = {
      from: this.configService.get('SMTP_FROM'),
      to,
      subject,
      html,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }
}
