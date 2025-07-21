import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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

      // Log successful verification
      this.logger.log(`Ticket verified successfully: ${booking._id}`);

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
      this.logger.error('Error verifying ticket:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      return {
        isValid: false,
        error: 'Failed to verify ticket',
        verifiedAt: new Date(),
      };
    }
  }

  async verifyTicketByNumber(
    ticketNumber: string,
  ): Promise<TicketVerificationResult> {
    try {
      const booking = await this.bookingModel
        .findOne({ bookingReference: ticketNumber })
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

      const event = booking.eventId as any;

      return {
        isValid:
          booking.status === BookingStatus.CONFIRMED &&
          event?.status !== 'cancelled',
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
        error:
          booking.status !== BookingStatus.CONFIRMED
            ? `Ticket is ${booking.status}`
            : event?.status === 'cancelled'
              ? 'Event has been cancelled'
              : undefined,
        verifiedAt: new Date(),
      };
    } catch (error) {
      this.logger.error('Error verifying ticket by number:', error);
      return {
        isValid: false,
        error: 'Failed to verify ticket',
        verifiedAt: new Date(),
      };
    }
  }

  private generateVerificationHash(bookingId: string, userId: string): string {
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(
        `${bookingId}-${userId}-${process.env.JWT_SECRET || 'default-secret'}`,
      )
      .digest('hex')
      .substring(0, 16);
  }

  // Get verification statistics for organizers
  async getVerificationStats(
    organizerId: string,
    eventId?: string,
  ): Promise<{
    totalVerifications: number;
    todayVerifications: number;
    eventBreakdown: Array<{
      eventId: string;
      eventTitle: string;
      verifications: number;
    }>;
  }> {
    try {
      // This would require a separate verification log table in a real implementation
      // For now, we'll return mock data structure
      return {
        totalVerifications: 0,
        todayVerifications: 0,
        eventBreakdown: [],
      };
    } catch (error) {
      this.logger.error('Error fetching verification stats:', error);
      throw new Error('Failed to fetch verification statistics');
    }
  }
}
