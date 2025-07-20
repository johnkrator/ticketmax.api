import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole, UserStatus } from '../../../enums/user-role';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty({ description: 'First name', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName?: string;

  @ApiProperty({ description: 'Last name', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName?: string;

  @ApiProperty({ description: 'Phone number', required: false })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiProperty({ description: 'Profile picture URL', required: false })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ description: 'Date of birth', required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ description: 'User bio', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiProperty({ enum: UserRole, description: 'User role', required: false })
  @IsOptional()
  @IsEnum(UserRole)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      // Handle case where a client sends enum key names instead of values
      const roleMap = {
        USER: UserRole.USER,
        ADMIN: UserRole.ADMIN,
        ORGANIZER: UserRole.ORGANIZER,
        user: UserRole.USER,
        admin: UserRole.ADMIN,
        organizer: UserRole.ORGANIZER,
      };
      return roleMap[value] || value;
    }
    return value;
  })
  role?: UserRole;

  @ApiProperty({
    enum: UserStatus,
    description: 'User status',
    required: false,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      // Handle case where client sends enum key names instead of values
      const statusMap = {
        ACTIVE: UserStatus.ACTIVE,
        INACTIVE: UserStatus.INACTIVE,
        SUSPENDED: UserStatus.SUSPENDED,
        active: UserStatus.ACTIVE,
        inactive: UserStatus.INACTIVE,
        suspended: UserStatus.SUSPENDED,
      };
      return statusMap[value] || value;
    }
    return value;
  })
  status?: UserStatus;

  @ApiProperty({ description: 'Email verification status', required: false })
  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;

  @ApiProperty({ description: 'Phone verification status', required: false })
  @IsOptional()
  @IsBoolean()
  phoneVerified?: boolean;

  @ApiProperty({ description: 'User address', required: false })
  @IsOptional()
  @IsObject()
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };

  @ApiProperty({ description: 'User preferences', required: false })
  @IsOptional()
  @IsObject()
  preferences?: {
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
    theme: string;
    language: string;
  };
}
