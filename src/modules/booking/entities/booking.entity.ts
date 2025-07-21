import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document, Types } from 'mongoose';
import { BaseEntity } from '../../base-entity';

export type BookingDocument = Booking & Document;

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum TicketType {
  GENERAL = 'general',
  VIP = 'vip',
  PREMIUM = 'premium',
  EARLY_BIRD = 'early_bird',
}

@Schema({ timestamps: true })
export class Booking extends BaseEntity {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  @ApiProperty({ description: 'User who made the booking' })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Event', required: true })
  @ApiProperty({ description: 'Event being booked' })
  eventId: Types.ObjectId;

  @Prop({ required: true })
  @ApiProperty({ description: 'Number of tickets booked' })
  quantity: number;

  @Prop({ required: true })
  @ApiProperty({ description: 'Total amount paid' })
  totalAmount: number;

  @Prop({
    enum: Object.values(BookingStatus),
    default: BookingStatus.PENDING,
  })
  @ApiProperty({ enum: BookingStatus, description: 'Booking status' })
  status: BookingStatus;

  @Prop({
    enum: Object.values(TicketType),
    default: TicketType.GENERAL,
  })
  @ApiProperty({ enum: TicketType, description: 'Type of ticket' })
  ticketType: TicketType;

  @Prop({ required: true, trim: true })
  @ApiProperty({ description: 'Customer email' })
  customerEmail: string;

  @Prop({ required: true, trim: true })
  @ApiProperty({ description: 'Customer full name' })
  customerName: string;

  @Prop({ trim: true })
  @ApiProperty({ description: 'Customer phone number', required: false })
  customerPhone?: string;

  @Prop({ unique: true })
  @ApiProperty({ description: 'Unique booking reference' })
  bookingReference: string;

  @Prop()
  @ApiProperty({
    description: 'QR code for ticket verification',
    required: false,
  })
  qrCode?: string;

  @Prop({ type: Types.ObjectId, ref: 'Payment' })
  @ApiProperty({ description: 'Associated payment record', required: false })
  paymentId?: Types.ObjectId;

  @Prop({ type: Date })
  @ApiProperty({
    description: 'Date when booking was confirmed',
    required: false,
  })
  confirmedAt?: Date;

  @Prop({ type: Date })
  @ApiProperty({
    description: 'Date when booking was cancelled',
    required: false,
  })
  cancelledAt?: Date;

  @Prop({ type: Object })
  @ApiProperty({ description: 'Additional booking metadata', required: false })
  metadata?: {
    source?: string;
    notes?: string;
    specialRequests?: string;
  };

  // Virtual fields for computed properties
  @ApiProperty({ description: 'Booking total in formatted currency' })
  get formattedTotal(): string {
    return `₦${this.totalAmount.toFixed(2)}`;
  }

  @ApiProperty({ description: 'Booking duration in hours until event' })
  get timeToEvent(): number {
    // This would need an event date to calculate properly
    // Implementation depends on populated event data
    return 0;
  }

  @ApiProperty({ description: 'Is booking cancellable' })
  get isCancellable(): boolean {
    return (
      this.status === BookingStatus.PENDING ||
      (this.status === BookingStatus.CONFIRMED &&
        // Add 24-hour cancellation logic here
        true)
    );
  }
}

export const BookingSchema = SchemaFactory.createForClass(Booking);

// Add virtual fields
BookingSchema.virtual('formattedTotal').get(function () {
  return `₦${this.totalAmount.toFixed(2)}`;
});

BookingSchema.virtual('isCancellable').get(function () {
  return (
    this.status === BookingStatus.PENDING ||
    this.status === BookingStatus.CONFIRMED
  );
});

// Middleware to maintain relationship integrity
BookingSchema.pre('save', async function (next) {
  if (this.isNew) {
    // Add booking to the user's booking array
    await this.model('User').findByIdAndUpdate(this.userId, {
      $addToSet: { bookings: this._id },
    });

    // Add booking to the event's booking array
    await this.model('Event').findByIdAndUpdate(this.eventId, {
      $addToSet: { bookings: this._id },
    });
  }
  next();
});

BookingSchema.pre(
  'deleteOne',
  { document: true, query: false },
  async function (next) {
    // Remove booking from the user's booking array
    await this.model('User').findByIdAndUpdate(this.userId, {
      $pull: { bookings: this._id },
    });

    // Remove booking from the event's booking array
    await this.model('Event').findByIdAndUpdate(this.eventId, {
      $pull: { bookings: this._id },
    });
    next();
  },
);

// Add indexes for better query performance
BookingSchema.index({ userId: 1, createdAt: -1 });
BookingSchema.index({ eventId: 1 });
BookingSchema.index({ bookingReference: 1 }, { unique: true });
BookingSchema.index({ status: 1 });
