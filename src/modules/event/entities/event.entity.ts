import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document, Types } from 'mongoose';
import { BaseEntity } from '../../base-entity';

export type EventDocument = Event & Document;

@Schema({ timestamps: true })
export class Event extends BaseEntity {
  @Prop({ required: true, trim: true })
  @ApiProperty({ description: 'Event title' })
  title: string;

  @Prop({ required: true, trim: true })
  @ApiProperty({ description: 'Event description' })
  description: string;

  @Prop({ required: true })
  @ApiProperty({ description: 'Event date' })
  date: string;

  @Prop({ required: true })
  @ApiProperty({ description: 'Event time' })
  time: string;

  @Prop({ required: true, trim: true })
  @ApiProperty({ description: 'Event location' })
  location: string;

  @Prop({ required: true, trim: true })
  @ApiProperty({ description: 'Event category' })
  category: string;

  @Prop({ required: true })
  @ApiProperty({ description: 'Ticket price' })
  price: string;

  @Prop({ trim: true })
  @ApiProperty({ description: 'Event image URL', required: false })
  image?: string;

  @Prop({ default: false })
  @ApiProperty({ description: 'Featured event flag', default: false })
  featured: boolean;

  @Prop({ required: true })
  @ApiProperty({ description: 'Total number of tickets available' })
  totalTickets: number;

  @Prop({ default: 0 })
  @ApiProperty({ description: 'Number of tickets sold', default: 0 })
  ticketsSold: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  @ApiProperty({ description: 'User ID who created the event' })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Organizer', required: true })
  @ApiProperty({ description: 'Organizer ID managing the event' })
  organizerId: Types.ObjectId;

  @Prop([{ type: Types.ObjectId, ref: 'User' }])
  @ApiProperty({ description: 'Users attending this event', required: false })
  attendeeUsers: Types.ObjectId[];

  @Prop([{ type: Types.ObjectId, ref: 'User' }])
  @ApiProperty({
    description: 'Users who favorited this event',
    required: false,
  })
  favoritedBy: Types.ObjectId[];

  @Prop({ default: 'active' })
  @ApiProperty({ description: 'Event status', default: 'active' })
  status: string;

  @Prop({ type: Object })
  @ApiProperty({ description: 'Event metadata', required: false })
  metadata?: {
    ageRestriction?: number;
    requiresApproval?: boolean;
    maxCapacity?: number;
    tags?: string[];
    cancellationPolicy?: string;
  };

  // Virtual field for attendee count
  @ApiProperty({
    description: 'Number of attendees (computed from attendeeUsers array)',
  })
  get attendees(): string {
    return this.attendeeUsers ? this.attendeeUsers.length.toString() : '0';
  }
}

export const EventSchema = SchemaFactory.createForClass(Event);

// Add virtual for attendees count
EventSchema.virtual('attendees').get(function () {
  return this.attendeeUsers ? this.attendeeUsers.length.toString() : '0';
});

// Indexes for better query performance
EventSchema.index({ createdBy: 1 });
EventSchema.index({ organizerId: 1 });
EventSchema.index({ category: 1 });
EventSchema.index({ status: 1 });
EventSchema.index({ featured: 1 });
EventSchema.index({ createdAt: -1 });
