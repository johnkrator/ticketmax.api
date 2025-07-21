import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { BookingStatus } from '../entities/booking.entity';

export class FilterBookingDto {
  @ApiProperty({
    description: 'Search term for event name or venue',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    enum: BookingStatus,
    description: 'Filter by booking status',
    required: false,
  })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @ApiProperty({ description: 'Filter by start date', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'Filter by end date', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: 'Page number for pagination', required: false })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiProperty({ description: 'Items per page', required: false })
  @IsOptional()
  @IsString()
  limit?: string;
}
