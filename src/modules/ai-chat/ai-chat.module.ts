import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';
import { ClaudeService } from './claude.service';
import { CustomAiService } from './custom-ai.service';
import { ChatGateway } from './chat.gateway';
import { ChatSession, ChatSessionSchema } from './entities/chat-session.entity';
import { ChatMessage, ChatMessageSchema } from './entities/chat-message.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatSession.name, schema: ChatSessionSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '60m' },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
  ],
  controllers: [AiChatController],
  providers: [AiChatService, ClaudeService, CustomAiService, ChatGateway],
  exports: [AiChatService, ClaudeService, CustomAiService, ChatGateway],
})
export class AiChatModule {}
