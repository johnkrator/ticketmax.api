import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Booking,
  BookingDocument,
  BookingStatus,
} from '../booking/entities/booking.entity';
import { Event, EventDocument } from '../event/entities/event.entity';

export interface TicketVerificationResult {
  isValid: boolean;
  ticket?: {
    id: string;
    eventTitle: string;
    customerName: string;
    ticketType: string;
    quantity: number;
    status: string;
    eventDate: string;
    eventLocation: string;
  };
  error?: string;
  verifiedAt: Date;
}

@Injectable()
export class TicketVerificationService {
  private readonly logger = new Logger(TicketVerificationService.name);

  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
  ) {}

  async verifyTicketByQR(qrData: string): Promise<TicketVerificationResult> {
    try {
      // Parse QR data
      const ticketInfo = JSON.parse(qrData);

      if (!ticketInfo.bookingId || !ticketInfo.verificationHash) {
        throw new BadRequestException('Invalid QR code format');
      }

      // Find the booking
      const booking = await this.bookingModel
        .findById(ticketInfo.bookingId)
        .populate('eventId', 'title date location status')
        .lean()
        .exec();

      if (!booking) {
        return {
          isValid: false,
          error: 'Ticket not found',
          verifiedAt: new Date(),
        };
      }

      // Verify the hash
      const expectedHash = this.generateVerificationHash(
        booking._id.toString(),
        booking.userId.toString(),
      );

      if (ticketInfo.verificationHash !== expectedHash) {
        this.logger.warn(
          `Invalid verification hash for booking ${booking._id}`,
        );
        return {
          isValid: false,
          error: 'Invalid ticket verification',
          verifiedAt: new Date(),
        };
      }

      // Check if ticket is valid for use
      if (booking.status !== BookingStatus.CONFIRMED) {
        return {
          isValid: false,
          error: `Ticket is ${booking.status}`,
          verifiedAt: new Date(),
        };
      }

      const event = booking.eventId as any;

      // Check if event is cancelled
      if (event?.status === 'cancelled') {
        return {
          isValid: false,
          error: 'Event has been cancelled',
          verifiedAt: new Date(),
        };
      }

      return {
        isValid: true,
        ticket: {
          id: booking._id.toString(),
          eventTitle: event?.title || 'Unknown Event',
          customerName: booking.customerName,
          ticketType: booking.ticketType,
          quantity: booking.quantity,
          status: booking.status,
          eventDate: event?.date || '',
          eventLocation: event?.location || '',
        },
        verifiedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Error verifying ticket by QR:', error);
      return {
        isValid: false,
        error: 'Ticket verification failed',
        verifiedAt: new Date(),
      };
    }
  }

  /**
   * Verify ticket by ID and optional QR data
   * @param ticketId - Booking ID to verify
   * @param qrData - Optional QR code data for additional verification
   * @returns Ticket verification result
   */
  async verifyTicket(
    ticketId: string,
    qrData?: string,
  ): Promise<TicketVerificationResult> {
    try {
      // If QR data is provided, use QR verification
      if (qrData) {
        return await this.verifyTicketByQR(qrData);
      }

      // Otherwise verify by ticket ID
      const booking = await this.bookingModel
        .findById(ticketId)
        .populate('eventId', 'title date location status')
        .lean()
        .exec();

      if (!booking) {
        return {
          isValid: false,
          error: 'Ticket not found',
          verifiedAt: new Date(),
        };
      }

      // Check if ticket is valid for use
      if (booking.status !== BookingStatus.CONFIRMED) {
        return {
          isValid: false,
          error: `Ticket is ${booking.status}`,
          verifiedAt: new Date(),
        };
      }

      const event = booking.eventId as any;

      return {
        isValid: true,
        ticket: {
          id: booking._id.toString(),
          eventTitle: event?.title || 'Unknown Event',
          customerName: booking.customerName,
          ticketType: booking.ticketType,
          quantity: booking.quantity,
          status: booking.status,
          eventDate: event?.date || '',
          eventLocation: event?.location || '',
        },
        verifiedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error verifying ticket ${ticketId}:`, error);
      return {
        isValid: false,
        error: 'Ticket verification failed',
        verifiedAt: new Date(),
      };
    }
  }

  /**
   * Check in a ticket at the event
   * @param ticketId - Booking ID to check in
   * @param userId - User ID performing the check-in
   * @returns Check-in result
   */
  async checkInTicket(
    ticketId: string,
    userId: string,
  ): Promise<{ success: boolean; checkedInAt: Date; attendeeInfo: any }> {
    try {
      const booking = await this.bookingModel
        .findById(ticketId)
        .populate('eventId', 'title date location organizerId')
        .exec();

      if (!booking) {
        throw new NotFoundException('Ticket not found');
      }

      const event = booking.eventId as any;

      // Check if user has permission to check in this ticket
      if (
        event.organizerId.toString() !== userId &&
        booking.userId.toString() !== userId
      ) {
        throw new BadRequestException('Unauthorized to check in this ticket');
      }

      // Check if ticket is confirmed
      if (booking.status !== BookingStatus.CONFIRMED) {
        throw new BadRequestException(
          `Cannot check in ${booking.status} ticket`,
        );
      }

      // Update booking with check-in information
      booking.checkedInAt = new Date();
      booking.checkedInBy = new Types.ObjectId(userId);
      await booking.save();

      this.logger.log(`Ticket ${ticketId} checked in successfully`);

      return {
        success: true,
        checkedInAt: booking.checkedInAt,
        attendeeInfo: {
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          ticketType: booking.ticketType,
          quantity: booking.quantity,
          eventTitle: event.title,
        },
      };
    } catch (error) {
      this.logger.error(`Error checking in ticket ${ticketId}:`, error);
      throw error;
    }
  }

  /**
   * Generate PDF ticket for download
   * @param ticketId - Booking ID
   * @param userId - User ID requesting the download
   * @returns PDF buffer
   */
  async generateTicketPDF(ticketId: string, userId: string): Promise<Buffer> {
    try {
      const booking = await this.bookingModel
        .findById(ticketId)
        .populate(
          'eventId',
          'title date location time description image organizerId',
        )
        .populate(
          'userId',
          'personalInformation.firstName personalInformation.lastName',
        )
        .lean()
        .exec();

      if (!booking) {
        throw new NotFoundException('Ticket not found');
      }

      // Check if user has permission to download this ticket
      if (booking.userId.toString() !== userId) {
        const event = booking.eventId as any;
        if (event.organizerId.toString() !== userId) {
          throw new BadRequestException('Unauthorized to download this ticket');
        }
      }

      // Generate QR code data
      const qrData = JSON.stringify({
        ticketNumber: booking.bookingReference,
        bookingId: booking._id,
        verificationHash: this.generateVerificationHash(
          booking._id.toString(),
          booking.userId.toString(),
        ),
      });

      // Simple PDF generation (in production, use a proper PDF library like PDFKit)
      const pdfContent = this.generatePDFContent(booking, qrData);
      return Buffer.from(pdfContent, 'utf8');
    } catch (error) {
      this.logger.error(`Error generating PDF for ticket ${ticketId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel a ticket and process refund
   * @param ticketId - Booking ID to cancel
   * @param userId - User ID requesting cancellation
   * @returns Cancellation result
   */
  async cancelTicket(
    ticketId: string,
    userId: string,
  ): Promise<{
    success: boolean;
    refundAmount: number;
    refundStatus: string;
    cancellationFee: number;
  }> {
    try {
      const booking = await this.bookingModel
        .findById(ticketId)
        .populate('eventId', 'date time')
        .exec();

      if (!booking) {
        throw new NotFoundException('Ticket not found');
      }

      // Check if user owns this ticket
      if (booking.userId.toString() !== userId) {
        throw new BadRequestException('Unauthorized to cancel this ticket');
      }

      // Check if ticket can be cancelled
      if (booking.status !== BookingStatus.CONFIRMED) {
        throw new BadRequestException(`Cannot cancel ${booking.status} ticket`);
      }

      const event = booking.eventId as any;
      const eventDate = new Date(event.date);
      const now = new Date();
      const hoursUntilEvent =
        (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Check if cancellation is allowed (24 hours before event)
      if (hoursUntilEvent < 24) {
        throw new BadRequestException(
          'Cannot cancel ticket less than 24 hours before event',
        );
      }

      // Calculate refund amount and fees
      const cancellationFee = Math.min(booking.totalAmount * 0.1, 50); // 10% fee, max $50
      const refundAmount = booking.totalAmount - cancellationFee;

      // Update booking status
      booking.status = BookingStatus.CANCELLED;
      booking.cancelledAt = new Date();
      booking.cancelledBy = new Types.ObjectId(userId);
      booking.refundAmount = refundAmount;
      booking.cancellationFee = cancellationFee;
      await booking.save();

      // In production, integrate with payment processor for actual refund
      this.logger.log(
        `Ticket ${ticketId} cancelled, refund amount: ${refundAmount}`,
      );

      return {
        success: true,
        refundAmount,
        refundStatus: 'processed',
        cancellationFee,
      };
    } catch (error) {
      this.logger.error(`Error cancelling ticket ${ticketId}:`, error);
      throw error;
    }
  }

  private generateVerificationHash(bookingId: string, userId: string): string {
    const crypto = require('crypto');
    const data = `${bookingId}-${userId}-${process.env.JWT_SECRET}`;
    return crypto.createHash('sha256').update(data).digest('hex').slice(0, 16);
  }

  private generatePDFContent(booking: any, qrData: string): string {
    const event = booking.eventId;
    const user = booking.userId;

    // Simple text-based ticket (in production, use proper PDF generation)
    return `
      ======================== TICKET ========================

      Event: ${event?.title || 'Unknown Event'}
      Date: ${event?.date || 'TBD'}
      Time: ${event?.time || 'TBD'}
      Location: ${event?.location || 'TBD'}

      Ticket Details:
      Type: ${booking.ticketType}
      Quantity: ${booking.quantity}
      Reference: ${booking.bookingReference}

      Customer: ${booking.customerName}
      Email: ${booking.customerEmail}

      QR Code Data: ${qrData}

      =====================================================
    `;
  }
}
