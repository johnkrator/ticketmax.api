import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateChatSessionDto {
  @ApiProperty({ description: 'User email (optional)' })
  @IsOptional()
  @IsString()
  userEmail?: string;

  @ApiProperty({ description: 'User name (optional)' })
  @IsOptional()
  @IsString()
  userName?: string;
}

export class SendMessageDto {
  @ApiProperty({ description: 'Message content' })
  @IsString()
  content: string;
}

export class EscalateChatDto {
  @ApiProperty({ description: 'Reason for escalation', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CloseChatSessionDto {
  @ApiProperty({ description: 'Satisfaction rating (1-5)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiProperty({ description: 'User feedback', required: false })
  @IsOptional()
  @IsString()
  feedback?: string;
}

export class ChatAnalyticsDto {
  @ApiProperty({ description: 'Start date for analytics' })
  @IsString()
  startDate: string;

  @ApiProperty({ description: 'End date for analytics' })
  @IsString()
  endDate: string;
}
