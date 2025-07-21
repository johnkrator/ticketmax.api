import {
  IsString,
  IsEmail,
  IsDateString,
  IsNotEmpty,
  IsPhoneNumber,
  Length,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PersonalInformationDto {
  @ApiProperty({ example: 'John', description: 'First name of the organizer' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name of the organizer' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  lastName: string;

  @ApiProperty({ example: 'john@example.com', description: 'Email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+1234567890', description: 'Phone number' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '1990-01-01', description: 'Date of birth' })
  @IsDateString()
  @IsNotEmpty()
  dateOfBirth: string;
}
