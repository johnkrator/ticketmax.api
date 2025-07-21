import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import {
  Payment,
  PaymentDocument,
  PaymentStatus,
} from './entities/payment.entity';
import {
  Booking,
  BookingDocument,
  BookingStatus,
} from '../booking/entities/booking.entity';
import { InitiatePaymentDto } from './dto/payment.dto';
import { BookingService } from '../booking/booking.service';
import * as crypto from 'crypto';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly paystackSecretKey: string;
  private readonly paystackPublicKey: string;
  private readonly webhookSecret: string;
  private readonly paystackBaseUrl = 'https://api.paystack.co';

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly bookingService: BookingService,
  ) {
    this.paystackSecretKey =
      this.configService.get<string>('PAYSTACK_SECRET_KEY') ?? '';
    this.paystackPublicKey =
      this.configService.get<string>('PAYSTACK_PUBLIC_KEY') ?? '';
    this.webhookSecret =
      this.configService.get<string>('PAYSTACK_WEBHOOK_SECRET') ?? '';

    // Validate required environment variables
    if (
      !this.paystackSecretKey ||
      !this.paystackPublicKey ||
      !this.webhookSecret
    ) {
      this.logger.error(
        'Missing required Paystack configuration. Please check your environment variables.',
      );
    }
  }

  async initiatePayment(
    initiatePaymentDto: InitiatePaymentDto,
    userId: string,
  ): Promise<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }> {
    try {
      // Validate booking exists and belongs to user
      const booking = await this.bookingModel.findById(
        initiatePaymentDto.bookingId,
      );
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }

      if (booking.userId.toString() !== userId) {
        throw new BadRequestException('Access denied to this booking');
      }

      if (booking.status === BookingStatus.CONFIRMED) {
        throw new BadRequestException('Booking is already confirmed and paid');
      }

      if (booking.status === BookingStatus.CANCELLED) {
        throw new BadRequestException('Cannot pay for cancelled booking');
      }

      // Check if payment already exists for this booking
      const existingPayment = await this.paymentModel.findOne({
        bookingId: booking._id,
        status: { $in: [PaymentStatus.PENDING, PaymentStatus.SUCCESS] },
      });

      if (existingPayment && existingPayment.status === PaymentStatus.SUCCESS) {
        throw new BadRequestException(
          'Payment already completed for this booking',
        );
      }

      // Generate unique reference
      const reference = this.generatePaymentReference();

      // Convert amount to kobo (smallest currency unit for NGN)
      const amountInKobo = Math.round(booking.totalAmount * 100);

      // Prepare Paystack payment payload
      const paymentPayload = {
        email: initiatePaymentDto.customerEmail,
        amount: amountInKobo,
        currency: 'NGN',
        reference: reference,
        callback_url:
          initiatePaymentDto.successUrl ||
          `${this.configService.get('FRONTEND_URL')}/payment/success`,
        metadata: {
          bookingId: booking._id.toString(),
          userId: userId,
          customerName: initiatePaymentDto.customerName,
          customerPhone: initiatePaymentDto.customerPhone,
          eventId: booking.eventId.toString(),
          quantity: booking.quantity,
        },
        channels: [
          'card',
          'bank',
          'ussd',
          'qr',
          'mobile_money',
          'bank_transfer',
        ],
      };

      // Initialize payment with Paystack
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.paystackBaseUrl}/transaction/initialize`,
          paymentPayload,
          {
            headers: {
              Authorization: `Bearer ${this.paystackSecretKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      if (!response.data.status) {
        throw new BadRequestException(
          'Failed to initialize payment with Paystack',
        );
      }

      // Create payment record
      const payment = new this.paymentModel({
        userId: new Types.ObjectId(userId),
        bookingId: booking._id,
        amount: amountInKobo,
        currency: 'NGN',
        status: PaymentStatus.PENDING,
        paystackReference: reference,
        customerEmail: initiatePaymentDto.customerEmail,
        customerName: initiatePaymentDto.customerName,
        customerPhone: initiatePaymentDto.customerPhone,
        metadata: {
          ipAddress: null, // Will be updated via webhook
          userAgent: null, // Will be updated via webhook
          source: 'web',
        },
      });

      await payment.save();

      // Update booking with payment reference
      await this.bookingModel.findByIdAndUpdate(booking._id, {
        paymentId: payment._id,
      });

      return {
        authorization_url: response.data.data.authorization_url,
        access_code: response.data.data.access_code,
        reference: reference,
      };
    } catch (error) {
      this.logger.error('Failed to initiate payment:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to initiate payment: ' + error.message,
      );
    }
  }

  async verifyPayment(reference: string): Promise<Payment> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.paystackBaseUrl}/transaction/verify/${reference}`,
          {
            headers: {
              Authorization: `Bearer ${this.paystackSecretKey}`,
            },
          },
        ),
      );

      if (!response.data.status) {
        throw new BadRequestException('Failed to verify payment with Paystack');
      }

      const transactionData = response.data.data;

      // Find payment record
      const payment = await this.paymentModel.findOne({
        paystackReference: reference,
      });
      if (!payment) {
        throw new NotFoundException('Payment record not found');
      }

      // Update payment status based on Paystack response
      const status =
        transactionData.status === 'success'
          ? PaymentStatus.SUCCESS
          : PaymentStatus.FAILED;

      const updatedPayment = await this.paymentModel.findByIdAndUpdate(
        payment._id,
        {
          status,
          paystackTransactionId: transactionData.id,
          paymentMethod: transactionData.channel,
          paidAt:
            transactionData.status === 'success'
              ? new Date(transactionData.paid_at)
              : null,
          authorizationCode: transactionData.authorization?.authorization_code,
          gatewayFees: transactionData.fees,
          paystackData: transactionData,
          failureReason:
            transactionData.status !== 'success'
              ? transactionData.gateway_response
              : null,
        },
        { new: true },
      );

      if (!updatedPayment) {
        throw new NotFoundException('Failed to update payment record');
      }

      // If payment successful, confirm the booking
      if (status === PaymentStatus.SUCCESS) {
        await this.bookingService.confirmBooking(payment.bookingId.toString());
      }

      return updatedPayment;
    } catch (error) {
      this.logger.error('Failed to verify payment:', error);
      throw new BadRequestException(
        'Failed to verify payment: ' + error.message,
      );
    }
  }

  async handleWebhook(payload: any, signature: string): Promise<void> {
    try {
      // Verify webhook signature
      const computedSignature = crypto
        .createHmac('sha512', this.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (computedSignature !== signature) {
        throw new BadRequestException('Invalid webhook signature');
      }

      const { event, data } = payload;

      switch (event) {
        case 'charge.success':
          await this.handleSuccessfulPayment(data);
          break;
        case 'charge.failed':
          await this.handleFailedPayment(data);
          break;
        default:
          this.logger.log(`Unhandled webhook event: ${event}`);
      }
    } catch (error) {
      this.logger.error('Webhook processing failed:', error);
      throw error;
    }
  }

  async getUserPayments(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<{
    payments: Payment[];
    total: number;
    page: number;
    pages: number;
  }> {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.paymentModel
        .find({ userId: new Types.ObjectId(userId) })
        .populate({
          path: 'bookingId',
          populate: {
            path: 'eventId',
            select: 'title date time location',
          },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.paymentModel.countDocuments({ userId: new Types.ObjectId(userId) }),
    ]);

    return {
      payments,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async getPaymentStats(userId: string): Promise<any> {
    const stats = await this.paymentModel.aggregate([
      { $match: { userId: new Types.ObjectId(userId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    const totalPayments = await this.paymentModel.countDocuments({
      userId: new Types.ObjectId(userId),
    });
    const totalSpent = await this.paymentModel.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          status: PaymentStatus.SUCCESS,
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    return {
      totalPayments,
      totalSpent: (totalSpent[0]?.total || 0) / 100, // Convert back from kobo to naira
      byStatus: stats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          amount: stat.totalAmount / 100, // Convert back from kobo to naira
        };
        return acc;
      }, {}),
    };
  }

  private async handleSuccessfulPayment(data: any): Promise<void> {
    const payment = await this.paymentModel.findOne({
      paystackReference: data.reference,
    });

    if (!payment) {
      this.logger.warn(`Payment not found for reference: ${data.reference}`);
      return;
    }

    await this.paymentModel.findByIdAndUpdate(payment._id, {
      status: PaymentStatus.SUCCESS,
      paystackTransactionId: data.id,
      paymentMethod: data.channel,
      paidAt: new Date(data.paid_at),
      authorizationCode: data.authorization?.authorization_code,
      gatewayFees: data.fees,
      paystackData: data,
    });

    // Confirm booking
    await this.bookingService.confirmBooking(payment.bookingId.toString());

    this.logger.log(`Payment successful for reference: ${data.reference}`);
  }

  private async handleFailedPayment(data: any): Promise<void> {
    const payment = await this.paymentModel.findOne({
      paystackReference: data.reference,
    });

    if (!payment) {
      this.logger.warn(`Payment not found for reference: ${data.reference}`);
      return;
    }

    await this.paymentModel.findByIdAndUpdate(payment._id, {
      status: PaymentStatus.FAILED,
      failureReason: data.gateway_response,
      paystackData: data,
    });

    this.logger.log(`Payment failed for reference: ${data.reference}`);
  }

  private generatePaymentReference(): string {
    const prefix = 'TM_PAY';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}_${timestamp}_${random}`;
  }
}
