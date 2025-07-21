import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class FilterEventDto {
  @ApiProperty({
    description: 'Search query for title, description, or location',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Filter by category', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: 'Filter by location', required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    description: 'Filter by featured events only',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  featured?: boolean;

  @ApiProperty({ description: 'Filter by organizer ID', required: false })
  @IsOptional()
  @IsString()
  organizerId?: string;

  @ApiProperty({ description: 'Filter by event status', required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description: 'Page number for pagination',
    required: false,
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value) || 1)
  page?: number;

  @ApiProperty({
    description: 'Number of items per page',
    required: false,
    default: 10,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value) || 10)
  limit?: number;
}
