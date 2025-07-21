import {
  IsString,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  Length,
  IsUrl,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrganizationType } from '../entities/organizer.entity';

export class OrganizationDetailsDto {
  @ApiProperty({
    enum: OrganizationType,
    example: OrganizationType.INDIVIDUAL,
    description: 'Type of organization',
  })
  @IsEnum(OrganizationType)
  @IsNotEmpty()
  organizationType: OrganizationType;

  @ApiProperty({
    example: 'Event Masters Inc.',
    description: 'Organization name (required for company/nonprofit)',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Length(2, 100)
  organizationName?: string;

  @ApiProperty({
    example: '123456789',
    description: 'Business registration number',
    required: false,
  })
  @IsString()
  @IsOptional()
  businessRegistrationNumber?: string;

  @ApiProperty({
    example: '12-3456789',
    description: 'Tax ID/EIN',
    required: false,
  })
  @IsString()
  @IsOptional()
  taxId?: string;

  @ApiProperty({
    example: 'https://eventmasters.com',
    description: 'Organization website',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiProperty({
    example: 'We specialize in organizing corporate events and conferences.',
    description: 'Description of the organization or individual',
  })
  @IsString()
  @IsNotEmpty()
  @Length(10, 500)
  description: string;
}
