import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  Min,
} from 'class-validator';
import { TicketType } from '../entities/booking.entity';

export class CreateBookingDto {
  @ApiProperty({ description: 'Event ID to book' })
  @IsNotEmpty()
  @IsString()
  eventId: string;

  @ApiProperty({ description: 'Number of tickets to book' })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

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
    enum: TicketType,
    description: 'Type of ticket',
    required: false,
  })
  @IsOptional()
  @IsEnum(TicketType)
  ticketType?: TicketType;

  @ApiProperty({ description: 'Special requests or notes', required: false })
  @IsOptional()
  @IsString()
  specialRequests?: string;
}
