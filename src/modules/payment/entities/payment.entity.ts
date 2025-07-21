import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document, Types } from 'mongoose';
import { BaseEntity } from '../../base-entity';

export type PaymentDocument = Payment & Document;

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  ABANDONED = 'abandoned',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  USSD = 'ussd',
  QR = 'qr',
  MOBILE_MONEY = 'mobile_money',
}

@Schema({ timestamps: true })
export class Payment extends BaseEntity {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  @ApiProperty({ description: 'User who made the payment' })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Booking', required: true })
  @ApiProperty({ description: 'Associated booking' })
  bookingId: Types.ObjectId;

  @Prop({ required: true })
  @ApiProperty({
    description: 'Payment amount in smallest currency unit (kobo for NGN)',
  })
  amount: number;

  @Prop({ required: true, default: 'NGN' })
  @ApiProperty({ description: 'Payment currency', default: 'NGN' })
  currency: string;

  @Prop({
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING,
  })
  @ApiProperty({ enum: PaymentStatus, description: 'Payment status' })
  status: PaymentStatus;

  @Prop({
    enum: Object.values(PaymentMethod),
  })
  @ApiProperty({ enum: PaymentMethod, description: 'Payment method used' })
  paymentMethod?: PaymentMethod;

  @Prop({ required: true, unique: true })
  @ApiProperty({ description: 'Paystack transaction reference' })
  paystackReference: string;

  @Prop()
  @ApiProperty({ description: 'Paystack transaction ID', required: false })
  paystackTransactionId?: string;

  @Prop()
  @ApiProperty({
    description: 'Paystack authorization code for future charges',
    required: false,
  })
  authorizationCode?: string;

  @Prop({ required: true, trim: true })
  @ApiProperty({ description: 'Customer email' })
  customerEmail: string;

  @Prop({ required: true, trim: true })
  @ApiProperty({ description: 'Customer name' })
  customerName: string;

  @Prop({ trim: true })
  @ApiProperty({ description: 'Customer phone', required: false })
  customerPhone?: string;

  @Prop({ type: Date })
  @ApiProperty({
    description: 'Date when payment was completed',
    required: false,
  })
  paidAt?: Date;

  @Prop()
  @ApiProperty({ description: 'Payment gateway fees', required: false })
  gatewayFees?: number;

  @Prop()
  @ApiProperty({
    description: 'Failure reason if payment failed',
    required: false,
  })
  failureReason?: string;

  @Prop({ type: Object })
  @ApiProperty({ description: 'Raw Paystack webhook data', required: false })
  paystackData?: any;

  @Prop({ type: Object })
  @ApiProperty({ description: 'Additional payment metadata', required: false })
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    source?: string;
  };
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

// Add virtual fields
PaymentSchema.virtual('formattedAmount').get(function () {
  return `₦${(this.amount / 100).toFixed(2)}`;
});

PaymentSchema.virtual('isSuccessful').get(function () {
  return this.status === PaymentStatus.SUCCESS;
});

PaymentSchema.virtual('isPending').get(function () {
  return this.status === PaymentStatus.PENDING;
});

PaymentSchema.virtual('processingTime').get(function () {
  if (this.paidAt && this.createdAt) {
    return Math.floor(
      (this.paidAt.getTime() - this.createdAt.getTime()) / (1000 * 60),
    );
  }
  return 0;
});

// Middleware to maintain relationship integrity
PaymentSchema.pre('save', async function (next) {
  if (this.isNew) {
    // Add payment to the user's payment array
    await this.model('User').findByIdAndUpdate(this.userId, {
      $addToSet: { payments: this._id },
    });

    // Update booking with payment reference
    await this.model('Booking').findByIdAndUpdate(this.bookingId, {
      paymentId: this._id,
    });
  }
  next();
});

PaymentSchema.pre(
  'deleteOne',
  { document: true, query: false },
  async function (next) {
    // Remove payment from the user's payment array
    await this.model('User').findByIdAndUpdate(this.userId, {
      $pull: { payments: this._id },
    });

    // Remove payment reference from booking
    await this.model('Booking').findByIdAndUpdate(this.bookingId, {
      $unset: { paymentId: 1 },
    });
    next();
  },
);

// Add indexes for better query performance
PaymentSchema.index({ userId: 1, createdAt: -1 });
PaymentSchema.index({ paystackReference: 1 }, { unique: true });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ bookingId: 1 });
