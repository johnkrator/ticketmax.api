import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChatSessionDocument = ChatSession & Document;

@Schema({ timestamps: true })
export class ChatSession {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: false })
  userEmail?: string;

  @Prop({ required: false })
  userName?: string;

  @Prop({
    type: String,
    enum: ['active', 'resolved', 'pending', 'escalated'],
    default: 'active',
  })
  status: string;

  @Prop({
    type: String,
    enum: ['booking', 'payment', 'event', 'technical', 'general'],
    default: 'general',
  })
  category: string;

  @Prop({ default: false })
  isHandoffToHuman: boolean;

  @Prop()
  humanAgentId?: string;

  @Prop()
  summary?: string;

  @Prop({ default: 0 })
  satisfactionRating?: number;

  @Prop()
  feedback?: string;

  @Prop({ default: Date.now })
  lastActivityAt: Date;
}

export const ChatSessionSchema = SchemaFactory.createForClass(ChatSession);
