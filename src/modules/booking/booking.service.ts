import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateBookingDto } from './dto/create-booking.dto';
import { FilterBookingDto } from './dto/filter-booking.dto';
import {
  Booking,
  BookingDocument,
  BookingStatus,
} from './entities/booking.entity';
import { Event, EventDocument } from '../event/entities/event.entity';
import { User, UserDocument } from '../user/entities/user.entity';

@Injectable()
export class BookingService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async create(
    createBookingDto: CreateBookingDto,
    userId: string,
  ): Promise<Booking> {
    try {
      // Validate event exists and has available tickets
      const event = await this.eventModel.findById(createBookingDto.eventId);
      if (!event) {
        throw new NotFoundException('Event not found');
      }

      // Check if event is still active and not in the past
      const eventDate = new Date(event.date);
      const now = new Date();
      if (eventDate < now) {
        throw new BadRequestException('Cannot book tickets for past events');
      }

      if (event.status !== 'active') {
        throw new BadRequestException('Event is not available for booking');
      }

      // Check ticket availability
      const availableTickets = event.totalTickets - event.ticketsSold;
      if (availableTickets < createBookingDto.quantity) {
        throw new BadRequestException(
          `Only ${availableTickets} tickets available. Requested: ${createBookingDto.quantity}`,
        );
      }

      // Calculate total amount (assuming price is per ticket)
      const ticketPrice = parseFloat(event.price);
      const totalAmount = ticketPrice * createBookingDto.quantity;

      // Generate unique booking reference
      const bookingReference = this.generateBookingReference();

      // Create booking
      const booking = new this.bookingModel({
        userId: new Types.ObjectId(userId),
        eventId: new Types.ObjectId(createBookingDto.eventId),
        quantity: createBookingDto.quantity,
        totalAmount,
        customerEmail: createBookingDto.customerEmail,
        customerName: createBookingDto.customerName,
        customerPhone: createBookingDto.customerPhone,
        ticketType: createBookingDto.ticketType || 'general',
        bookingReference,
        status: BookingStatus.PENDING,
        metadata: {
          specialRequests: createBookingDto.specialRequests,
          source: 'web',
        },
      });

      const savedBooking = await booking.save();

      // Update event ticket count (reserve tickets)
      await this.eventModel.findByIdAndUpdate(createBookingDto.eventId, {
        $inc: { ticketsSold: createBookingDto.quantity },
      });

      return savedBooking;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to create booking: ' + error.message,
      );
    }
  }

  async findUserBookings(
    userId: string,
    filterDto: FilterBookingDto,
  ): Promise<{
    bookings: Booking[];
    total: number;
    page: number;
    pages: number;
  }> {
    const page = parseInt(filterDto.page || '1') || 1;
    const limit = parseInt(filterDto.limit || '10') || 10;
    const skip = (page - 1) * limit;

    // Build query
    const query: any = { userId: new Types.ObjectId(userId) };

    if (filterDto.status) {
      query.status = filterDto.status;
    }

    if (filterDto.startDate || filterDto.endDate) {
      query.createdAt = {};
      if (filterDto.startDate) {
        query.createdAt.$gte = new Date(filterDto.startDate);
      }
      if (filterDto.endDate) {
        query.createdAt.$lte = new Date(filterDto.endDate);
      }
    }

    // Add search functionality if search term provided
    if (filterDto.search) {
      const events = await this.eventModel
        .find({
          $or: [
            { title: { $regex: filterDto.search, $options: 'i' } },
            { location: { $regex: filterDto.search, $options: 'i' } },
          ],
        })
        .select('_id');

      const eventIds = events.map((event) => event._id);
      query.eventId = { $in: eventIds };
    }

    // Execute query with population
    const bookingsQuery = this.bookingModel
      .find(query)
      .populate({
        path: 'eventId',
        select: 'title description date time location category image',
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const [bookings, total] = await Promise.all([
      bookingsQuery.exec(),
      this.bookingModel.countDocuments(query),
    ]);

    return {
      bookings,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async findById(id: string, userId?: string): Promise<Booking> {
    const booking = await this.bookingModel
      .findById(id)
      .populate({
        path: 'eventId',
        select: 'title description date time location category image',
      })
      .populate({
        path: 'paymentId',
      });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // If userId is provided, ensure user owns the booking
    if (userId && booking.userId.toString() !== userId) {
      throw new ForbiddenException('Access denied to this booking');
    }

    return booking;
  }

  async confirmBooking(id: string): Promise<Booking> {
    const booking = await this.bookingModel.findById(id);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Only pending bookings can be confirmed');
    }

    // Generate QR code for the booking
    const qrCodeData = this.generateQRCode(booking);

    return (await this.bookingModel
      .findByIdAndUpdate(
        id,
        {
          status: BookingStatus.CONFIRMED,
          confirmedAt: new Date(),
          qrCode: qrCodeData,
        },
        { new: true },
      )
      .populate({
        path: 'eventId',
        select: 'title description date time location category image',
      })
      .exec()) as Booking;
  }

  async cancelBooking(id: string, userId: string): Promise<Booking> {
    const booking = await this.bookingModel.findById(id);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId.toString() !== userId) {
      throw new ForbiddenException('Access denied to this booking');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      // Check if event is more than 24 hours away
      const event = await this.eventModel.findById(booking.eventId);
      if (event) {
        const eventDate = new Date(event.date);
        const now = new Date();
        const timeDiff = eventDate.getTime() - now.getTime();
        const hoursDiff = timeDiff / (1000 * 3600);

        if (hoursDiff < 24) {
          throw new BadRequestException(
            'Cannot cancel confirmed booking less than 24 hours before event',
          );
        }
      }
    }

    // Release tickets back to event
    await this.eventModel.findByIdAndUpdate(booking.eventId, {
      $inc: { ticketsSold: -booking.quantity },
    });

    return (await this.bookingModel
      .findByIdAndUpdate(
        id,
        {
          status: BookingStatus.CANCELLED,
          cancelledAt: new Date(),
        },
        { new: true },
      )
      .populate({
        path: 'eventId',
        select: 'title description date time location category image',
      })
      .exec()) as Booking;
  }

  async getBookingStats(userId: string): Promise<any> {
    const stats = await this.bookingModel.aggregate([
      { $match: { userId: new Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
        },
      },
    ]);

    const totalBookings = await this.bookingModel.countDocuments({
      userId: new Types.ObjectId(userId),
    });
    const totalSpent = await this.bookingModel.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          status: BookingStatus.CONFIRMED,
        },
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    return {
      totalBookings,
      totalSpent: totalSpent[0]?.total || 0,
      byStatus: stats.reduce((acc, stat) => {
        acc[stat._id] = { count: stat.count, amount: stat.totalAmount };
        return acc;
      }, {}),
    };
  }

  private generateBookingReference(): string {
    const prefix = 'TM';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  private generateQRCode(booking: Booking): string {
    const qrData = {
      bookingId: booking._id,
      bookingReference: booking.bookingReference,
      eventId: booking.eventId,
      quantity: booking.quantity,
      customerName: booking.customerName,
      generatedAt: new Date().toISOString(),
    };

    // For now, return a simple base64 encoded string
    // In production; you would use a proper QR code library
    return Buffer.from(JSON.stringify(qrData)).toString('base64');
  }
}
