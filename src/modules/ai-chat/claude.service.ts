import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);
  private anthropic: Anthropic;

  constructor(private configService: ConfigService) {
    // Initialize Claude API
    this.initializeClaude();
  }

  private initializeClaude() {
    try {
      this.anthropic = new Anthropic({
        apiKey: this.configService.get<string>('CLAUDE_API_KEY'),
      });
    } catch (error) {
      this.logger.error('Failed to initialize Claude API:', error);
    }
  }

  async generateResponse(
    messages: Array<{ role: string; content: string }>,
    context?: any,
  ): Promise<string> {
    if (!this.anthropic) {
      return "I'm sorry, the AI service is currently unavailable. Please contact our support team directly.";
    }

    try {
      const systemPrompt = this.buildSystemPrompt(context);

      // Convert messages format for Claude
      const claudeMessages = messages.map((msg) => ({
        role: (msg.role === 'assistant' ? 'assistant' : 'user') as
          | 'user'
          | 'assistant',
        content: msg.content,
      }));

      const completion = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        system: systemPrompt,
        messages: claudeMessages,
        temperature: 0.7,
      });

      const responseContent = completion.content[0];
      return responseContent.type === 'text'
        ? responseContent.text
        : 'I apologize, but I could not generate a response at this time.';
    } catch (error) {
      this.logger.error('Error generating AI response:', error);
      return "I'm experiencing technical difficulties. Please try again or contact our support team.";
    }
  }

  async analyzeIntent(message: string): Promise<{
    intent: string;
    confidence: number;
    entities: any[];
    category: string;
  }> {
    if (!this.anthropic) {
      return {
        intent: 'unknown',
        confidence: 0,
        entities: [],
        category: 'general',
      };
    }

    try {
      const prompt = `Analyze the following customer support message and extract:
1. Intent (booking_inquiry, payment_issue, event_question, technical_support, complaint, general)
2. Confidence (0-1)
3. Category (booking, payment, event, technical, general) 
4. Any entities (dates, event names, amounts, etc.)

Message: "${message}"

Respond in JSON format only:
{
  "intent": "intent_name",
  "confidence": 0.85,
  "category": "category_name",
  "entities": []
}`;

      const completion = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      });

      const responseContent = completion.content[0];
      const response =
        responseContent.type === 'text' ? responseContent.text : '';
      return JSON.parse(
        response ||
          '{"intent":"unknown","confidence":0,"category":"general","entities":[]}',
      );
    } catch (error) {
      this.logger.error('Error analyzing intent:', error);
      return {
        intent: 'unknown',
        confidence: 0,
        entities: [],
        category: 'general',
      };
    }
  }

  async generateSuggestions(context: any): Promise<string[]> {
    if (!this.anthropic) {
      return [
        'How can I help you with your booking?',
        'Do you have questions about an event?',
      ];
    }

    try {
      const prompt = `Based on the following context, generate 3 helpful quick reply suggestions for customer support:

Context: ${JSON.stringify(context)}

Return only a JSON array of strings:
["suggestion 1", "suggestion 2", "suggestion 3"]`;

      const completion = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
      });

      const responseContent = completion.content[0];
      const response =
        responseContent.type === 'text' ? responseContent.text : '';
      return JSON.parse(response || '[]');
    } catch (error) {
      this.logger.error('Error generating suggestions:', error);
      return [
        'How can I help you today?',
        'Do you need assistance with your booking?',
      ];
    }
  }

  private buildSystemPrompt(context?: any): string {
    return `You are a helpful customer support AI for TicketMax, a ticket booking platform.

Key information:
- Be friendly, professional, and concise
- Help users with booking, payments, events, and technical issues
- If you cannot resolve an issue, offer to escalate to a human agent
- Always provide accurate information about policies and procedures
- Use context from previous messages to provide better assistance

Current context: ${context ? JSON.stringify(context) : 'No additional context'}

Guidelines:
1. Be empathetic and understanding
2. Provide clear, actionable solutions
3. Ask clarifying questions when needed
4. Escalate complex issues to human agents
5. Always maintain a professional tone`;
  }
}
