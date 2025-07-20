import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailSendService {
  private readonly logger = new Logger(EmailSendService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpHost = this.configService.get('SMTP_HOST');
    const smtpPort = this.configService.get('SMTP_PORT', 587);
    const smtpSecure = this.configService.get('SMTP_SECURE') === 'true';
    const smtpUser = this.configService.get('SMTP_USER');
    const smtpPass = this.configService.get('SMTP_PASS');

    // Log configuration (without sensitive data)
    this.logger.log(
      `Initializing email transporter with host: ${smtpHost}, port: ${smtpPort}, secure: ${smtpSecure}`,
    );

    if (!smtpHost || !smtpUser || !smtpPass) {
      this.logger.error(
        'Missing required SMTP configuration. Please check your environment variables.',
      );
      this.logger.error(`SMTP_HOST: ${smtpHost ? 'Set' : 'Missing'}`);
      this.logger.error(`SMTP_USER: ${smtpUser ? 'Set' : 'Missing'}`);
      this.logger.error(`SMTP_PASS: ${smtpPass ? 'Set' : 'Missing'}`);
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort as string),
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      // Add additional options for better deliverability
      connectionTimeout: 60000, // 60 seconds
      greetingTimeout: 30000, // 30 seconds
      socketTimeout: 60000, // 60 seconds
    });

    // Verify transporter configuration
    this.verifyConnection();
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      this.logger.log('Email transporter verified successfully');
    } catch (error) {
      this.logger.error(
        'Email transporter verification failed:',
        error.message,
      );
      this.logger.error('Full error:', error);
    }
  }

  async sendVerificationEmail(email: string, token: string, firstName: string) {
    const subject = 'Verify Your Email Address - TicketProMax';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2c3e50;">Welcome to TicketProMax, ${firstName}!</h2>
          <p>Thank you for registering with TicketProMax. Please verify your email address using the code below:</p>
          
          <div style="background-color: #f8f9fa; border: 2px solid #e9ecef; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <h3 style="margin: 0; color: #495057;">Verification Code</h3>
            <div style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 3px; margin: 10px 0;">
              ${token}
            </div>
          </div>
          
          <p><strong>Important:</strong> This code will expire in 10 minutes for security reasons.</p>
          <p>If you didn't create an account with TicketProMax, please ignore this email.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #6c757d;">
            This is an automated message from TicketProMax. Please do not reply to this email.
          </p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(email, subject, html, 'verification');
  }

  async sendPasswordResetEmail(
    email: string,
    token: string,
    firstName: string,
  ) {
    const subject = 'Password Reset Request - TicketProMax';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc3545;">Password Reset Request</h2>
          <p>Hello ${firstName},</p>
          <p>You requested a password reset for your TicketProMax account. Use the code below to reset your password:</p>
          
          <div style="background-color: #fff3cd; border: 2px solid #ffeaa7; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <h3 style="margin: 0; color: #856404;">Reset Code</h3>
            <div style="font-size: 32px; font-weight: bold; color: #dc3545; letter-spacing: 3px; margin: 10px 0;">
              ${token}
            </div>
          </div>
          
          <p><strong>Important:</strong> This code will expire in 10 minutes for security reasons.</p>
          <p>If you didn't request this password reset, please ignore this email and your password will remain unchanged.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #6c757d;">
            This is an automated message from TicketProMax. Please do not reply to this email.
          </p>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(email, subject, html, 'password_reset');
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    type: string = 'general',
  ) {
    const fromEmail = this.configService.get('SMTP_FROM');

    if (!fromEmail) {
      this.logger.error('SMTP_FROM environment variable is not set');
      return { success: false, error: 'Email sender not configured' };
    }

    const mailOptions = {
      from: `"TicketProMax" <${fromEmail}>`,
      to,
      subject,
      html,
      // Add headers for better deliverability
      headers: {
        'X-Mailer': 'TicketProMax',
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        Importance: 'High',
      },
    };

    this.logger.log(`Attempting to send ${type} email to: ${to}`);

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(
        `Email sent successfully to ${to}. Message ID: ${info.messageId}`,
      );
      this.logger.log(`Email info:`, {
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
      });

      return {
        success: true,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send ${type} email to ${to}:`,
        error.message,
      );
      this.logger.error('Full email error:', error);

      // Log specific error types
      if (error.code) {
        this.logger.error(`Error code: ${error.code}`);
      }
      if (error.response) {
        this.logger.error(`SMTP Response: ${error.response}`);
      }

      return { success: false, error: error.message };
    }
  }

  // Method to test email configuration
  async testEmailConfiguration(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('Email configuration test passed');
      return true;
    } catch (error) {
      this.logger.error('Email configuration test failed:', error.message);
      return false;
    }
  }
}
