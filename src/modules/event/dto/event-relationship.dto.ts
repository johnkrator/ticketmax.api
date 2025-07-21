import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class AttendEventDto {
  @ApiProperty({ description: 'User ID who wants to attend the event' })
  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class FavoriteEventDto {
  @ApiProperty({ description: 'User ID who wants to favorite the event' })
  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class EventRelationshipDto {
  @ApiProperty({ description: 'Event ID' })
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @ApiProperty({ description: 'User ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;
}

export class BulkAttendEventDto {
  @ApiProperty({ description: 'Array of user IDs to add as attendees' })
  @IsArray()
  @IsString({ each: true })
  userIds: string[];
}
