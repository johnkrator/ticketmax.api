import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ChatSession,
  ChatSessionDocument,
} from './entities/chat-session.entity';
import {
  ChatMessage,
  ChatMessageDocument,
} from './entities/chat-message.entity';
import { OpenAiService } from './openai.service';

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(
    @InjectModel(ChatSession.name)
    private chatSessionModel: Model<ChatSessionDocument>,
    @InjectModel(ChatMessage.name)
    private chatMessageModel: Model<ChatMessageDocument>,
    private openAiService: OpenAiService,
  ) {}

  async createChatSession(
    userId: string,
    userEmail?: string,
    userName?: string,
  ): Promise<ChatSession> {
    const session = new this.chatSessionModel({
      userId,
      userEmail,
      userName,
      status: 'active',
      category: 'general',
      lastActivityAt: new Date(),
    });

    const savedSession = await session.save();
    this.logger.log(
      `Created new chat session: ${savedSession._id} for user: ${userId}`,
    );
    return savedSession;
  }

  async getChatSession(sessionId: string): Promise<ChatSession> {
    const session = await this.chatSessionModel.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Chat session not found');
    }
    return session;
  }

  async getUserActiveSessions(userId: string): Promise<ChatSession[]> {
    return this.chatSessionModel
      .find({ userId, status: { $in: ['active', 'pending'] } })
      .sort({ lastActivityAt: -1 });
  }

  async sendMessage(
    sessionId: string,
    content: string,
    sender: 'user' | 'ai' | 'human_agent',
    userId?: string,
    agentId?: string,
  ): Promise<ChatMessage> {
    const session = await this.getChatSession(sessionId);

    // Analyze intent for user messages
    let metadata = {};
    if (sender === 'user') {
      const analysis = await this.openAiService.analyzeIntent(content);
      metadata = {
        confidence: analysis.confidence,
        intent: analysis.intent,
        entities: analysis.entities,
      };

      // Update session category if needed
      if (analysis.category !== 'general' && session.category === 'general') {
        await this.chatSessionModel.findByIdAndUpdate(sessionId, {
          category: analysis.category,
        });
      }
    }

    const message = new this.chatMessageModel({
      sessionId: new Types.ObjectId(sessionId),
      content,
      sender,
      userId,
      agentId,
      metadata,
      messageType: 'text',
      isRead: false,
    });

    const savedMessage = await message.save();

    // Update session last activity
    await this.chatSessionModel.findByIdAndUpdate(sessionId, {
      lastActivityAt: new Date(),
    });

    this.logger.log(`Message sent in session ${sessionId} by ${sender}`);
    return savedMessage;
  }

  async generateAiResponse(
    sessionId: string,
    userMessage: string,
  ): Promise<ChatMessage> {
    const session = await this.getChatSession(sessionId);

    // Get recent conversation history
    const recentMessages = await this.chatMessageModel
      .find({ sessionId: new Types.ObjectId(sessionId) })
      .sort({ createdAt: -1 })
      .limit(10);

    // Format messages for AI context
    const conversationHistory = recentMessages.reverse().map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

    // Add current user message
    conversationHistory.push({ role: 'user', content: userMessage });

    // Generate AI response
    const aiResponse = await this.openAiService.generateResponse(
      conversationHistory,
      {
        sessionCategory: session.category,
        userId: session.userId,
        userEmail: session.userEmail,
      },
    );

    // Save AI response
    return this.sendMessage(sessionId, aiResponse, 'ai');
  }

  async getSessionMessages(
    sessionId: string,
    page = 1,
    limit = 50,
  ): Promise<ChatMessage[]> {
    const skip = (page - 1) * limit;
    return this.chatMessageModel
      .find({ sessionId: new Types.ObjectId(sessionId) })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);
  }

  async escalateToHuman(
    sessionId: string,
    reason?: string,
  ): Promise<ChatSession> {
    const session = await this.chatSessionModel.findByIdAndUpdate(
      sessionId,
      {
        isHandoffToHuman: true,
        status: 'escalated',
        summary: reason,
      },
      { new: true },
    );

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    // Send escalation message
    await this.sendMessage(
      sessionId,
      'Your chat has been escalated to a human agent. Someone will be with you shortly.',
      'ai',
    );

    this.logger.log(`Session ${sessionId} escalated to human agent`);
    return session;
  }

  async closeChatSession(
    sessionId: string,
    rating?: number,
    feedback?: string,
  ): Promise<ChatSession> {
    const session = await this.chatSessionModel.findByIdAndUpdate(
      sessionId,
      {
        status: 'resolved',
        satisfactionRating: rating,
        feedback,
      },
      { new: true },
    );

    if (!session) {
      throw new NotFoundException('Chat session not found');
    }

    return session;
  }

  async getSuggestions(sessionId: string): Promise<string[]> {
    const session = await this.getChatSession(sessionId);
    return this.openAiService.generateSuggestions({
      category: session.category,
      status: session.status,
    });
  }

  async markMessagesAsRead(sessionId: string, _userId: string): Promise<void> {
    await this.chatMessageModel.updateMany(
      {
        sessionId: new Types.ObjectId(sessionId),
        sender: { $ne: 'user' },
        isRead: false,
      },
      { isRead: true },
    );
  }

  async getChatAnalytics(startDate: Date, endDate: Date) {
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          avgSatisfactionRating: { $avg: '$satisfactionRating' },
          escalationRate: {
            $avg: { $cond: ['$isHandoffToHuman', 1, 0] },
          },
          categoryBreakdown: {
            $push: '$category',
          },
        },
      },
    ];

    const analytics = await this.chatSessionModel.aggregate(pipeline);
    return analytics[0] || {};
  }
}
