import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsPhoneNumber,
  MinLength,
  MaxLength,
  IsObject,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '../../../enums/user-role';

export class CreateUserDto {
  @ApiProperty({ description: 'First name', example: 'John' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({
    description: 'Email address',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'Phone number',
    example: '+1234567890',
    required: false,
  })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiProperty({
    description: 'Date of birth',
    example: '1990-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({
    description: 'User bio',
    example: 'Event enthusiast',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiProperty({
    enum: UserRole,
    description: 'User role',
    required: false,
    default: UserRole.USER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      // Handle case where client sends enum key names instead of values
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
