import {
  IsOptional,
  ValidateNested,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PersonalInformationDto } from './personal-information.dto';
import { OrganizationDetailsDto } from './organization-details.dto';
import { AddressDto } from './address.dto';
import { BankingInformationDto } from './banking-information.dto';
import { ExperienceDetailsDto } from './experience-details.dto';

export class CreateOrganizerDto {
  @ApiProperty({ type: PersonalInformationDto })
  @ValidateNested()
  @Type(() => PersonalInformationDto)
  personalInformation: PersonalInformationDto;

  @ApiProperty({ type: OrganizationDetailsDto })
  @ValidateNested()
  @Type(() => OrganizationDetailsDto)
  organizationDetails: OrganizationDetailsDto;

  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;

  @ApiProperty({ type: BankingInformationDto, required: false })
  @ValidateNested()
  @Type(() => BankingInformationDto)
  @IsOptional()
  bankingInformation?: BankingInformationDto;

  @ApiProperty({ type: ExperienceDetailsDto, required: false })
  @ValidateNested()
  @Type(() => ExperienceDetailsDto)
  @IsOptional()
  experienceDetails?: ExperienceDetailsDto;
}

export class UpdateOrganizerStepDto {
  @ApiProperty({ example: 1, description: 'Current step (1-6)' })
  @IsNumber()
  @Min(1)
  @Max(6)
  currentStep: number;

  @ApiProperty({ type: PersonalInformationDto, required: false })
  @ValidateNested()
  @Type(() => PersonalInformationDto)
  @IsOptional()
  personalInformation?: PersonalInformationDto;

  @ApiProperty({ type: OrganizationDetailsDto, required: false })
  @ValidateNested()
  @Type(() => OrganizationDetailsDto)
  @IsOptional()
  organizationDetails?: OrganizationDetailsDto;

  @ApiProperty({ type: AddressDto, required: false })
  @ValidateNested()
  @Type(() => AddressDto)
  @IsOptional()
  address?: AddressDto;

  @ApiProperty({ type: BankingInformationDto, required: false })
  @ValidateNested()
  @Type(() => BankingInformationDto)
  @IsOptional()
  bankingInformation?: BankingInformationDto;

  @ApiProperty({ type: ExperienceDetailsDto, required: false })
  @ValidateNested()
  @Type(() => ExperienceDetailsDto)
  @IsOptional()
  experienceDetails?: ExperienceDetailsDto;
}
