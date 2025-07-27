import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AiChatService } from './ai-chat.service';
import { JwtAuthGuard } from '../../configurations/jwt_configuration/jwt-auth-guard.service';
import {
  CreateChatSessionDto,
  SendMessageDto,
  EscalateChatDto,
  CloseChatSessionDto,
} from './dto/chat.dto';

@ApiTags('AI Chat')
@Controller('ai-chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Post('sessions')
  @ApiOperation({ summary: 'Create a new chat session' })
  @ApiResponse({
    status: 201,
    description: 'Chat session created successfully',
  })
  async createSession(
    @Body(ValidationPipe) createSessionDto: CreateChatSessionDto,
    @Request() req,
  ) {
    const { sub: userId, email } = req.user;
    return this.aiChatService.createChatSession(
      userId,
      createSessionDto.userEmail || email,
      createSessionDto.userName,
    );
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get chat session details' })
  async getSession(@Param('sessionId') sessionId: string) {
    return this.aiChatService.getChatSession(sessionId);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get user active chat sessions' })
  async getUserSessions(@Request() req) {
    return this.aiChatService.getUserActiveSessions(req.user.sub);
  }

  @Post('sessions/:sessionId/messages')
  @ApiOperation({ summary: 'Send a message in chat session' })
  async sendMessage(
    @Param('sessionId') sessionId: string,
    @Body(ValidationPipe) sendMessageDto: SendMessageDto,
    @Request() req,
  ) {
    const { content } = sendMessageDto;
    const { sub: userId } = req.user;

    // Send user a message
    const userMessage = await this.aiChatService.sendMessage(
      sessionId,
      content,
      'user',
      userId,
    );

    // Generate AI response
    const aiResponse = await this.aiChatService.generateAiResponse(
      sessionId,
      content,
    );

    return {
      userMessage,
      aiResponse,
    };
  }

  @Get('sessions/:sessionId/messages')
  @ApiOperation({ summary: 'Get chat session messages' })
  async getMessages(
    @Param('sessionId') sessionId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.aiChatService.getSessionMessages(sessionId, page, limit);
  }

  @Post('sessions/:sessionId/escalate')
  @ApiOperation({ summary: 'Escalate chat to human agent' })
  async escalateToHuman(
    @Param('sessionId') sessionId: string,
    @Body(ValidationPipe) escalateDto: EscalateChatDto,
  ) {
    return this.aiChatService.escalateToHuman(sessionId, escalateDto.reason);
  }

  @Post('sessions/:sessionId/close')
  @ApiOperation({ summary: 'Close chat session with feedback' })
  async closeSession(
    @Param('sessionId') sessionId: string,
    @Body(ValidationPipe) closeSessionDto: CloseChatSessionDto,
  ) {
    return this.aiChatService.closeChatSession(
      sessionId,
      closeSessionDto.rating,
      closeSessionDto.feedback,
    );
  }

  @Get('sessions/:sessionId/suggestions')
  @ApiOperation({ summary: 'Get AI-generated quick reply suggestions' })
  async getSuggestions(@Param('sessionId') sessionId: string) {
    return this.aiChatService.getSuggestions(sessionId);
  }

  @Post('sessions/:sessionId/read')
  @ApiOperation({ summary: 'Mark messages as read' })
  async markAsRead(@Param('sessionId') sessionId: string, @Request() req) {
    await this.aiChatService.markMessagesAsRead(sessionId, req.user.sub);
    return { success: true };
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get chat analytics (admin only)' })
  async getAnalytics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return this.aiChatService.getChatAnalytics(start, end);
  }
}
