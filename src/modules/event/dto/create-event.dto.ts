import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateEventDto {
  @ApiProperty({ description: 'Event title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Event description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Event date (YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'Event time (HH:MM)' })
  @IsString()
  @IsNotEmpty()
  time: string;

  @ApiProperty({ description: 'Event location' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ description: 'Event category' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ description: 'Ticket price' })
  @IsString()
  @IsNotEmpty()
  price: string;

  @ApiProperty({ description: 'Event image URL', required: false })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ description: 'Featured event flag', default: false })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiProperty({ description: 'Total number of tickets available' })
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value))
  totalTickets: number;

  @ApiProperty({ description: 'User ID who is creating the event' })
  @IsString()
  @IsNotEmpty()
  createdBy: string;

  @ApiProperty({ description: 'Organizer ID managing the event' })
  @IsString()
  @IsNotEmpty()
  organizerId: string;

  @ApiProperty({ description: 'Event status', default: 'active' })
  @IsOptional()
  @IsString()
  status?: string;
}
