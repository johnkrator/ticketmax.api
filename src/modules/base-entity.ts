import { Prop } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';

export abstract class BaseEntity {
  @Prop({
    type: String,
    default: uuidv4,
    required: true,
    unique: true
  })
  @ApiProperty({ description: 'Entity ID' })
  _id: string;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;

  @ApiProperty({ description: 'Deleted at' })
  deletedAt: Date;
}