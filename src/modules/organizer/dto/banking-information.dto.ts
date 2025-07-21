import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BankingInformationDto {
  @ApiProperty({ example: 'Bank of America', description: 'Bank name' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  bankName: string;

  @ApiProperty({ example: '1234567890', description: 'Bank account number' })
  @IsString()
  @IsNotEmpty()
  @Length(8, 20)
  accountNumber: string;

  @ApiProperty({ example: '123456789', description: 'Bank routing number' })
  @IsString()
  @IsNotEmpty()
  @Length(9, 9)
  routingNumber: string;

  @ApiProperty({ example: 'John Doe', description: 'Account holder name' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  accountHolderName: string;
}
