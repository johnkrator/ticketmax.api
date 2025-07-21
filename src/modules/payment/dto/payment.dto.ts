import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

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
  @ApiProperty({ description: 'Event type from Paystack' })
  @IsNotEmpty()
  @IsString()
  event: string;

  @ApiProperty({ description: 'Webhook data from Paystack' })
  @IsNotEmpty()
  data: any;
}
