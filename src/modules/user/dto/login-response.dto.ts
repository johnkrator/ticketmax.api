import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../../../enums/user-role';

export class LoginResponseDto {
  @ApiProperty({ description: 'Access token' })
  access_token: string;

  @ApiProperty({ description: 'Refresh token' })
  refresh_token: string;

  @ApiProperty({ description: 'User information' })
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    emailVerified: boolean;
    avatar?: string;
  };

  @ApiProperty({ description: 'Token expiration time' })
  expiresIn: number;
}
