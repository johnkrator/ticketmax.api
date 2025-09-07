import { Injectable, Logger } from '@nestjs/common';
import { AgentRequest, AgentResponse } from '../interfaces/agent.interface';
import { IntentClassifier } from '../nlp/intent-classifier';
import { KnowledgeBase } from '../knowledge/knowledge-base';
import { ResponseGenerator } from './response-generator';
import { CodingAssistant } from '../utils/coding-assistant';
import { ContextManager } from '../utils/context-manager';

@Injectable()
export class CustomAiAgent {
  private readonly logger = new Logger(CustomAiAgent.name);
  private intentClassifier: IntentClassifier;
  private knowledgeBase: KnowledgeBase;
  private responseGenerator: ResponseGenerator;
  private codingAssistant: CodingAssistant;
  private contextManager: ContextManager;

  constructor() {
    this.initializeAgent();
  }

  private initializeAgent(): void {
    try {
      this.logger.log('Initializing Custom AI Agent...');
      
      // Initialize core components
      this.intentClassifier = new IntentClassifier();
      this.knowledgeBase = new KnowledgeBase();
      this.codingAssistant = new CodingAssistant();
      this.contextManager = new ContextManager();
      
      // Initialize response generator with dependencies
      this.responseGenerator = new ResponseGenerator(
        this.knowledgeBase,
        this.codingAssistant,
        this.contextManager
      );

      // Start cleanup task for expired contexts
      this.startContextCleanup();
      
      this.logger.log('Custom AI Agent initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Custom AI Agent:', error);
      throw error;
    }
  }

  public async processRequest(request: AgentRequest): Promise<AgentResponse> {
    try {
      const { message, sessionId = 'default', userId, context } = request;
      
      this.logger.debug(`Processing request: ${message.substring(0, 100)}...`);
      
      // Classify intent and extract entities
      const intentResult = this.intentClassifier.classifyIntent(message);
      
      // Handle special cases
      if (this.isCodeExplanationRequest(message)) {
        return this.handleCodeExplanation(message, sessionId, intentResult);
      }
      
      if (this.isCodeDebuggingRequest(message)) {
        return this.handleCodeDebugging(message, sessionId, intentResult);
      }

      // Generate response
      const response = this.responseGenerator.generateResponse(
        message,
        intentResult.intent,
        intentResult.entities,
        sessionId,
        intentResult.confidence
      );

      // Update context
      this.contextManager.updateContext(
        sessionId,
        message,
        response.response,
        intentResult.intent,
        intentResult.entities,
        userId
      );

      this.logger.debug(`Generated response for intent: ${intentResult.intent}`);
      
      return response;
    } catch (error) {
      this.logger.error('Error processing agent request:', error);
      return this.generateErrorResponse(error);
    }
  }

  private isCodeExplanationRequest(message: string): boolean {
    const codePatterns = [
      /explain.*code/i,
      /what.*does.*code/i,
      /analyze.*code/i,
      /```[\s\S]*```/,
      /function\s+\w+\s*\(/,
      /class\s+\w+/,
      /const\s+\w+\s*=/,
      /let\s+\w+\s*=/,
      /var\s+\w+\s*=/
    ];

    return codePatterns.some(pattern => pattern.test(message));
  }

  private isCodeDebuggingRequest(message: string): boolean {
    const debugPatterns = [
      /debug.*code/i,
      /fix.*code/i,
      /error.*code/i,
      /not.*working/i,
      /bug.*in/i,
      /problem.*with.*code/i
    ];

    return debugPatterns.some(pattern => pattern.test(message)) && 
           (message.includes('```') || message.length > 100);
  }

  private async handleCodeExplanation(
    message: string,
    sessionId: string,
    intentResult: any
  ): Promise<AgentResponse> {
    // Extract code from message
    const codeMatch = message.match(/```[\s\S]*?```/);
    let codeToExplain = '';
    
    if (codeMatch) {
      codeToExplain = codeMatch[0].replace(/```\w*\n?/g, '').replace(/\n?```$/g, '');
    } else {
      // Try to find code-like patterns
      const lines = message.split('\n');
      codeToExplain = lines.filter(line => 
        line.includes('(') || line.includes('{') || line.includes('=') || 
        line.includes('function') || line.includes('class')
      ).join('\n');
    }

    const explanation = codeToExplain 
      ? this.codingAssistant.explainCode(codeToExplain)
      : 'I\'d be happy to explain code for you! Please share the code you\'d like me to analyze, preferably in a code block using triple backticks (```).';

    return this.buildResponse(explanation, 'coding_help', intentResult.entities, intentResult.confidence, [
      'Show more examples',
      'Explain specific part',
      'Help with optimization',
      'Ask another coding question'
    ]);
  }

  private async handleCodeDebugging(
    message: string,
    sessionId: string,
    intentResult: any
  ): Promise<AgentResponse> {
    const codeMatch = message.match(/```[\s\S]*?```/);
    let codeToDebug = '';
    let errorMessage = '';
    
    if (codeMatch) {
      codeToDebug = codeMatch[0].replace(/```\w*\n?/g, '').replace(/\n?```$/g, '');
    }

    // Extract error message if present
    const errorPatterns = [
      /error[:\s]+(.*)/i,
      /exception[:\s]+(.*)/i,
      /fails?[:\s]+(.*)/i
    ];

    for (const pattern of errorPatterns) {
      const match = message.match(pattern);
      if (match) {
        errorMessage = match[1];
        break;
      }
    }

    const debuggingSuggestions = this.codingAssistant.debugCode(codeToDebug, errorMessage);

    return this.buildResponse(debuggingSuggestions, 'coding_help', intentResult.entities, intentResult.confidence, [
      'Show corrected code',
      'Explain the fix',
      'More debugging tips',
      'Test the solution'
    ]);
  }

  private buildResponse(
    response: string,
    intent: string,
    entities: any[],
    confidence: number,
    suggestions: string[]
  ): AgentResponse {
    return {
      response,
      confidence,
      intent,
      entities,
      suggestions,
      metadata: {
        timestamp: new Date().toISOString(),
        agentVersion: '1.0.0',
        processingTime: Date.now()
      }
    };
  }

  private generateErrorResponse(error: any): AgentResponse {
    return {
      response: 'I apologize, but I encountered an error while processing your request. Please try rephrasing your question or contact support if the issue persists.',
      confidence: 0.1,
      intent: 'error',
      entities: [],
      suggestions: [
        'Try asking differently',
        'Contact technical support',
        'Start a new conversation'
      ],
      metadata: {
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }

  // Public methods for external use
  public async generateResponse(
    messages: Array<{ role: string; content: string }>,
    context?: any
  ): Promise<string> {
    try {
      // Get the latest message
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage) {
        return 'Hello! How can I help you today?';
      }

      const request: AgentRequest = {
        message: lastMessage.content,
        context,
        sessionId: context?.sessionId || 'default'
      };

      const response = await this.processRequest(request);
      return response.response;
    } catch (error) {
      this.logger.error('Error in generateResponse:', error);
      return 'I apologize, but I\'m having trouble processing your request right now. Please try again.';
    }
  }

  public async analyzeIntent(message: string): Promise<{
    intent: string;
    confidence: number;
    entities: any[];
    category: string;
  }> {
    try {
      const result = this.intentClassifier.classifyIntent(message);
      
      // Map intent to category
      const intentCategoryMap: Record<string, string> = {
        'booking_inquiry': 'booking',
        'payment_issue': 'payment',
        'event_question': 'event',
        'technical_support': 'technical',
        'coding_help': 'technical',
        'complaint': 'general',
        'greeting': 'general',
        'general': 'general'
      };

      return {
        intent: result.intent,
        confidence: result.confidence,
        entities: result.entities,
        category: intentCategoryMap[result.intent] || 'general'
      };
    } catch (error) {
      this.logger.error('Error in analyzeIntent:', error);
      return {
        intent: 'general',
        confidence: 0.5,
        entities: [],
        category: 'general'
      };
    }
  }

  public async generateSuggestions(context: any): Promise<string[]> {
    try {
      const sessionId = context?.sessionId || 'default';
      const contextData = this.contextManager.getContext(sessionId);
      
      // Get suggestions based on last intent
      const lastIntent = contextData.history.length > 0 
        ? contextData.history[contextData.history.length - 1].intent 
        : 'general';

      const suggestionMap: Record<string, string[]> = {
        'booking_inquiry': [
          'Show available events',
          'Help with payment',
          'Check booking status'
        ],
        'coding_help': [
          'Show code examples',
          'Debug assistance',
          'Best practices'
        ],
        'technical_support': [
          'Troubleshoot issue',
          'Contact support',
          'Try different approach'
        ],
        'general': [
          'Browse events',
          'Get coding help',
          'Technical support'
        ]
      };

      return suggestionMap[lastIntent] || suggestionMap.general;
    } catch (error) {
      this.logger.error('Error in generateSuggestions:', error);
      return [
        'How can I help you?',
        'Ask me anything',
        'Get assistance'
      ];
    }
  }

  private startContextCleanup(): void {
    // Clean up expired contexts every 10 minutes
    setInterval(() => {
      try {
        this.contextManager.cleanupExpiredContexts();
        const stats = this.contextManager.getContextStats();
        this.logger.debug(`Context cleanup: ${stats.activeSessions}/${stats.totalSessions} active sessions`);
      } catch (error) {
        this.logger.error('Error during context cleanup:', error);
      }
    }, 10 * 60 * 1000); // 10 minutes
  }

  public getAgentStats(): any {
    return {
      availableIntents: this.intentClassifier.getAvailableIntents(),
      knowledgeCategories: this.knowledgeBase.getAllCategories(),
      contextStats: this.contextManager.getContextStats(),
      agentVersion: '1.0.0',
      uptime: process.uptime()
    };
  }
}