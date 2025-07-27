import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
} from 'class-validator';
import { PaymentGateway } from '../entities/payment.entity';

export class InitiatePaymentDto {
  @ApiProperty({ description: 'Booking ID to pay for' })
  @IsNotEmpty()
  @IsString()
  bookingId: string;

  @ApiProperty({ description: 'Customer email address' })
  @IsNotEmpty()
  @IsEmail()
  customerEmail: string;

  @ApiProperty({ description: 'Customer full name' })
  @IsNotEmpty()
  @IsString()
  customerName: string;

  @ApiProperty({ description: 'Customer phone number', required: false })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiProperty({
    description: 'Payment gateway to use',
    enum: PaymentGateway,
    default: PaymentGateway.PAYSTACK,
  })
  @IsOptional()
  @IsEnum(PaymentGateway)
  gateway?: PaymentGateway = PaymentGateway.PAYSTACK;

  @ApiProperty({ description: 'Success redirect URL', required: false })
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiProperty({ description: 'Cancel redirect URL', required: false })
  @IsOptional()
  @IsString()
  cancelUrl?: string;
}

export class PaymentWebhookDto {
  @ApiProperty({ description: 'Event type from payment gateway' })
  @IsNotEmpty()
  @IsString()
  event: string;

  @ApiProperty({ description: 'Webhook data from payment gateway' })
  @IsNotEmpty()
  data: any;
}
