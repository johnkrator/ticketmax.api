import { PartialType } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';
import { CreateEventDto } from './create-event.dto';

export class UpdateEventDto extends PartialType(CreateEventDto) {
  @ApiProperty({ description: 'Number of attendees', required: false })
  @IsOptional()
  @IsString()
  attendees?: string;

  @ApiProperty({ description: 'Number of tickets sold', required: false })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  ticketsSold?: number;
}
