import {
  IsString,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  Length,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  EventExperience,
  ExpectedEventVolume,
} from '../entities/organizer.entity';

export class ExperienceDetailsDto {
  @ApiProperty({
    enum: EventExperience,
    example: EventExperience.INTERMEDIATE,
    description: 'Event organization experience level',
  })
  @IsEnum(EventExperience)
  @IsNotEmpty()
  eventExperience: EventExperience;

  @ApiProperty({
    example: 'Organized several corporate conferences and workshops.',
    description: 'Description of previous events organized',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Length(10, 1000)
  previousEvents?: string;

  @ApiProperty({
    enum: ExpectedEventVolume,
    example: ExpectedEventVolume.MEDIUM,
    description: 'Expected number of events per year',
  })
  @IsEnum(ExpectedEventVolume)
  @IsNotEmpty()
  expectedEventVolume: ExpectedEventVolume;
}
