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
import { Transform } from 'class-transformer';
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
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      // Convert to lowercase and handle common variations
      const lowerValue = value.toLowerCase();
      const ticketTypeMap: { [key: string]: TicketType } = {
        general: TicketType.GENERAL,
        vip: TicketType.VIP,
        premium: TicketType.PREMIUM,
        early_bird: TicketType.EARLY_BIRD,
        earlybird: TicketType.EARLY_BIRD,
        'early-bird': TicketType.EARLY_BIRD,
      };
      return ticketTypeMap[lowerValue] || TicketType.GENERAL;
    }
    return value || TicketType.GENERAL;
  })
  ticketType?: TicketType;

  @ApiProperty({ description: 'Special requests or notes', required: false })
  @IsOptional()
  @IsString()
  specialRequests?: string;
}
