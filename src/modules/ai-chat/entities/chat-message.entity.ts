import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChatMessageDocument = ChatMessage & Document;

@Schema({ timestamps: true })
export class ChatMessage {
  @Prop({ type: Types.ObjectId, ref: 'ChatSession', required: true })
  sessionId: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({
    type: String,
    enum: ['user', 'ai', 'human_agent'],
    required: true,
  })
  sender: string;

  @Prop()
  userId?: string;

  @Prop()
  agentId?: string;

  @Prop({
    type: String,
    enum: ['text', 'image', 'file', 'quick_reply', 'suggestion'],
    default: 'text',
  })
  messageType: string;

  @Prop({ type: Object })
  metadata?: {
    confidence?: number;
    intent?: string;
    entities?: any[];
    suggestedActions?: string[];
  };

  @Prop({ default: false })
  isRead: boolean;

  @Prop()
  replyToMessageId?: Types.ObjectId;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
