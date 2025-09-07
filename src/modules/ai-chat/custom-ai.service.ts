import { Injectable, Logger } from '@nestjs/common';
import { CustomAiAgent } from './AiAgent/core/ai-agent';

@Injectable()
export class CustomAiService {
  private readonly logger = new Logger(CustomAiService.name);
  private aiAgent: CustomAiAgent;

  constructor() {
    this.initializeService();
  }

  private initializeService(): void {
    try {
      this.aiAgent = new CustomAiAgent();
      this.logger.log('Custom AI Service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Custom AI Service:', error);
    }
  }

  async generateResponse(
    messages: Array<{ role: string; content: string }>,
    context?: any,
  ): Promise<string> {
    if (!this.aiAgent) {
      return "I'm sorry, the AI service is currently unavailable. Please contact our support team directly.";
    }

    try {
      return await this.aiAgent.generateResponse(messages, context);
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
    if (!this.aiAgent) {
      return {
        intent: 'unknown',
        confidence: 0,
        entities: [],
        category: 'general',
      };
    }

    try {
      return await this.aiAgent.analyzeIntent(message);
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
    if (!this.aiAgent) {
      return [
        'How can I help you with your booking?',
        'Do you have questions about an event?',
        'Need coding assistance?',
      ];
    }

    try {
      return await this.aiAgent.generateSuggestions(context);
    } catch (error) {
      this.logger.error('Error generating suggestions:', error);
      return [
        'How can I help you today?',
        'Do you need assistance with your booking?',
        'Ask me about coding or technical issues',
      ];
    }
  }

  getServiceStats(): any {
    if (!this.aiAgent) {
      return { status: 'unavailable' };
    }

    try {
      return {
        status: 'active',
        ...this.aiAgent.getAgentStats(),
        serviceName: 'CustomAiService'
      };
    } catch (error) {
      this.logger.error('Error getting service stats:', error);
      return { status: 'error', error: error.message };
    }
  }

  isHealthy(): boolean {
    return !!this.aiAgent;
  }
}