import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddressDto {
  @ApiProperty({ example: '123 Main Street', description: 'Street address' })
  @IsString()
  @IsNotEmpty()
  @Length(5, 100)
  address: string;

  @ApiProperty({ example: 'New York', description: 'City' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  city: string;

  @ApiProperty({ example: 'NY', description: 'State or province' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  state: string;

  @ApiProperty({ example: '10001', description: 'ZIP or postal code' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 10)
  zipCode: string;

  @ApiProperty({ example: 'United States', description: 'Country' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  country: string;
}
