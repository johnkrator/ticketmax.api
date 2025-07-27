import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class OAuthCallbackDto {
  @ApiProperty({ description: 'OAuth authorization code' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'OAuth state parameter', required: false })
  @IsOptional()
  @IsString()
  state?: string;
}

export class LinkProviderDto {
  @ApiProperty({
    description: 'OAuth provider to link',
    enum: ['google', 'github', 'facebook', 'apple'],
  })
  @IsEnum(['google', 'github', 'facebook', 'apple'])
  provider: 'google' | 'github' | 'facebook' | 'apple';
}

export class OAuthLoginResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  access_token: string;

  @ApiProperty({ description: 'User information' })
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    avatar?: string;
  };
}
