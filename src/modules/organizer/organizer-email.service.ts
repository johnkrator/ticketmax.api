import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class OrganizerEmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendOnboardingStartedEmail(
    email: string,
    organizerName: string,
  ): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Welcome to TicketVerse - Organizer Application Started',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6B46C1;">Welcome to TicketVerse!</h1>
          <p>Dear ${organizerName},</p>
          <p>Thank you for starting your organizer application with TicketVerse. Your journey to creating amazing events begins now!</p>
          
          <h3>What's Next?</h3>
          <ul>
            <li>Complete all 6 steps of the onboarding process</li>
            <li>Upload your verification documents</li>
            <li>Provide banking information for payments</li>
            <li>Share your event organizing experience</li>
          </ul>
          
          <p>Once you complete the application, our team will review it within 2-3 business days.</p>
          
          <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Need Help?</strong></p>
            <p>Contact our support team at support@ticketverse.com if you have any questions.</p>
          </div>
          
          <p>Best regards,<br>The TicketVerse Team</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendApplicationSubmittedEmail(
    email: string,
    organizerName: string,
  ): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'TicketVerse - Organizer Application Submitted',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6B46C1;">Application Submitted Successfully!</h1>
          <p>Dear ${organizerName},</p>
          <p>Congratulations! You have successfully submitted your organizer application to TicketVerse.</p>
          
          <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0;">
            <h3 style="margin: 0; color: #1E40AF;">What Happens Next?</h3>
            <ol style="margin: 10px 0;">
              <li>Our verification team will review your application</li>
              <li>We'll verify your documents and information</li>
              <li>You'll receive an approval/rejection email within 2-3 business days</li>
            </ol>
          </div>
          
          <p>During the review process, please ensure:</p>
          <ul>
            <li>Your phone number is accessible</li>
            <li>You check your email regularly</li>
            <li>All provided information is accurate</li>
          </ul>
          
          <p>Thank you for choosing TicketVerse!</p>
          <p>Best regards,<br>The TicketVerse Team</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendApprovalEmail(email: string, organizerName: string): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: email,
      subject:
        '🎉 Congratulations! Your TicketVerse Organizer Application is Approved',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #059669;">🎉 Welcome to TicketVerse!</h1>
          <p>Dear ${organizerName},</p>
          <p>Fantastic news! Your organizer application has been <strong>approved</strong>.</p>
          
          <div style="background-color: #ECFDF5; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0;">
            <h3 style="margin: 0; color: #065F46;">You can now:</h3>
            <ul style="margin: 10px 0;">
              <li>Create and publish events</li>
              <li>Manage ticket sales</li>
              <li>Access your organizer dashboard</li>
              <li>Receive payments from ticket sales</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/organizer/dashboard" 
               style="background-color: #6B46C1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Access Your Dashboard
            </a>
          </div>
          
          <p>Ready to create your first event? Our platform makes it easy to:</p>
          <ul>
            <li>Set up event details and ticketing</li>
            <li>Customize your event page</li>
            <li>Track sales and attendees</li>
            <li>Manage check-ins on event day</li>
          </ul>
          
          <p>Welcome to the TicketVerse family!</p>
          <p>Best regards,<br>The TicketVerse Team</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendRejectionEmail(
    email: string,
    organizerName: string,
    reason: string,
  ): Promise<void> {
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'TicketVerse - Organizer Application Update',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #DC2626;">Application Update Required</h1>
          <p>Dear ${organizerName},</p>
          <p>Thank you for your interest in becoming a TicketVerse organizer. After reviewing your application, we need some additional information before we can proceed.</p>
          
          <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 15px; margin: 20px 0;">
            <h3 style="margin: 0; color: #991B1B;">Reason for Review:</h3>
            <p style="margin: 10px 0;">${reason}</p>
          </div>
          
          <h3>Next Steps:</h3>
          <ol>
            <li>Review the feedback above</li>
            <li>Update your application with the required information</li>
            <li>Resubmit your application for review</li>
          </ol>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/organizer/onboarding" 
               style="background-color: #6B46C1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Update Application
            </a>
          </div>
          
          <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          
          <p>Best regards,<br>The TicketVerse Team</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendAdminNotificationEmail(
    organizerEmail: string,
    organizerName: string,
  ): Promise<void> {
    const adminEmails = ['admin@ticketverse.com']; // Add admin emails here

    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: adminEmails,
      subject: 'New Organizer Application Submitted - Review Required',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6B46C1;">New Organizer Application</h1>
          <p>A new organizer application has been submitted and requires review.</p>
          
          <div style="background-color: #F3F4F6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Application Details:</h3>
            <p><strong>Name:</strong> ${organizerName}</p>
            <p><strong>Email:</strong> ${organizerEmail}</p>
            <p><strong>Submitted:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/admin/organizers/pending" 
               style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Review Application
            </a>
          </div>
          
          <p>Please review the application within 2-3 business days.</p>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }
}
