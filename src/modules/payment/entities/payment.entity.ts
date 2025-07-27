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
  BANK = 'bank',
}

export enum PaymentGateway {
  PAYSTACK = 'paystack',
  FLUTTERWAVE = 'flutterwave',
}

@Schema({ timestamps: true })
export class Payment extends BaseEntity {
  @Prop({ type: String, ref: 'User', required: true })
  @ApiProperty({ description: 'User who made the payment' })
  userId: string;

  @Prop({ type: String, ref: 'Booking', required: true })
  @ApiProperty({ description: 'Associated booking' })
  bookingId: string;

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
    enum: Object.values(PaymentGateway),
    required: true,
  })
  @ApiProperty({ enum: PaymentGateway, description: 'Payment gateway used' })
  gateway: PaymentGateway;

  // Paystack specific fields
  @Prop({ required: false })
  @ApiProperty({
    description: 'Paystack transaction reference',
    required: false,
  })
  paystackReference?: string;

  @Prop({ required: false })
  @ApiProperty({ description: 'Paystack transaction ID', required: false })
  paystackTransactionId?: string;

  @Prop({ type: Object, required: false })
  @ApiProperty({ description: 'Raw Paystack response data', required: false })
  paystackData?: any;

  // Flutterwave specific fields
  @Prop({ required: false })
  @ApiProperty({
    description: 'Flutterwave transaction reference',
    required: false,
  })
  flutterwaveReference?: string;

  @Prop({ required: false })
  @ApiProperty({ description: 'Flutterwave transaction ID', required: false })
  flutterwaveTransactionId?: string;

  @Prop({ type: Object, required: false })
  @ApiProperty({
    description: 'Raw Flutterwave response data',
    required: false,
  })
  flutterwaveData?: any;

  // Common fields for both gateways
  @Prop({ required: true })
  @ApiProperty({ description: 'Customer email address' })
  customerEmail: string;

  @Prop({ required: true })
  @ApiProperty({ description: 'Customer full name' })
  customerName: string;

  @Prop({ required: false })
  @ApiProperty({ description: 'Customer phone number', required: false })
  customerPhone?: string;

  @Prop({ enum: Object.values(PaymentMethod), required: false })
  @ApiProperty({
    enum: PaymentMethod,
    description: 'Payment method used',
    required: false,
  })
  paymentMethod?: PaymentMethod;

  @Prop({ required: false })
  @ApiProperty({
    description: 'Date when payment was completed',
    required: false,
  })
  paidAt?: Date;

  @Prop({ required: false })
  @ApiProperty({
    description: 'Authorization code for card payments',
    required: false,
  })
  authorizationCode?: string;

  @Prop({ required: false })
  @ApiProperty({ description: 'Gateway fees charged', required: false })
  gatewayFees?: number;

  @Prop({ required: false })
  @ApiProperty({ description: 'Reason for payment failure', required: false })
  failureReason?: string;

  @Prop({ type: Object, required: false })
  @ApiProperty({ description: 'Additional metadata', required: false })
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    source?: string;
    [key: string]: any;
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
