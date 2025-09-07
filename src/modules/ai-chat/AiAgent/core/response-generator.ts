import { AgentResponse } from '../interfaces/agent.interface';
import { KnowledgeBase } from '../knowledge/knowledge-base';
import { CodingAssistant } from '../utils/coding-assistant';
import { ContextManager } from '../utils/context-manager';

interface ResponseTemplate {
  intent: string;
  templates: string[];
  requiresEntities?: string[];
  contextDependent?: boolean;
}

export class ResponseGenerator {
  private responseTemplates: ResponseTemplate[] = [
    {
      intent: 'greeting',
      templates: [
        'Hello! Welcome to TicketMax. I\'m here to help you with bookings, events, technical support, and even coding questions. How can I assist you today?',
        'Hi there! I\'m your TicketMax virtual assistant. Whether you need help with tickets, have questions about events, or need coding assistance, I\'m here to help. What can I do for you?',
        'Hey! Great to see you here. I can help with ticket bookings, event information, technical issues, and programming questions. What would you like to know?'
      ]
    },
    {
      intent: 'booking_inquiry',
      templates: [
        'I\'d be happy to help you with booking tickets! {knowledge_response} Would you like me to guide you through the booking process or help you find specific events?',
        'Let me assist you with your booking needs. {knowledge_response} Do you have a particular event in mind, or would you like to browse available shows?'
      ],
      contextDependent: true
    },
    {
      intent: 'payment_issue',
      templates: [
        'I understand you\'re having payment difficulties. That can be frustrating. {knowledge_response} Can you tell me more about the specific issue you\'re experiencing?',
        'Let me help resolve your payment issue. {knowledge_response} What error message are you seeing, or what seems to be going wrong?'
      ]
    },
    {
      intent: 'event_question',
      templates: [
        'I can help you find information about our events. {knowledge_response} Which event are you interested in learning more about?',
        'Great! I love helping people discover events. {knowledge_response} Are you looking for something specific, like concerts, sports, or theater?'
      ]
    },
    {
      intent: 'technical_support',
      templates: [
        'I\'m sorry you\'re experiencing technical difficulties. Let me help you troubleshoot. {knowledge_response} Can you describe exactly what\'s happening?',
        'Technical issues can be really annoying. I\'m here to help! {knowledge_response} What specific problem are you encountering?'
      ]
    },
    {
      intent: 'coding_help',
      templates: [
        'I love helping with coding! {coding_response} Feel free to share your code or ask about specific programming concepts.',
        'Programming assistance coming right up! {coding_response} What language or framework are you working with?'
      ]
    },
    {
      intent: 'complaint',
      templates: [
        'I\'m truly sorry to hear about your disappointing experience. Your feedback is valuable to us. {knowledge_response} Let me see how I can help resolve this issue for you.',
        'I apologize that we haven\'t met your expectations. I want to make this right. {knowledge_response} Can you tell me more details about what went wrong?'
      ]
    },
    {
      intent: 'general',
      templates: [
        'Thanks for reaching out! {knowledge_response} Is there anything specific I can help you with regarding your TicketMax experience?',
        'I appreciate you contacting us. {knowledge_response} How else can I assist you today?'
      ]
    }
  ];

  constructor(
    private knowledgeBase: KnowledgeBase,
    private codingAssistant: CodingAssistant,
    private contextManager: ContextManager
  ) {}

  public generateResponse(
    message: string,
    intent: string,
    entities: any[],
    sessionId: string,
    confidence: number
  ): AgentResponse {
    // Get context
    const context = this.contextManager.getContext(sessionId);
    
    // Handle coding-specific requests
    if (intent === 'coding_help') {
      const codingResponse = this.codingAssistant.getCodingHelp(message, entities);
      return this.buildAgentResponse(
        this.formatResponse('coding_help', { coding_response: codingResponse }),
        intent,
        entities,
        confidence,
        this.generateSuggestions(intent, context.history.length > 0)
      );
    }

    // Get knowledge base response
    const knowledgeEntries = this.knowledgeBase.findRelevantEntries(message, intent);
    let knowledgeResponse = '';
    
    if (knowledgeEntries.length > 0) {
      const bestEntry = knowledgeEntries[0];
      knowledgeResponse = this.knowledgeBase.getResponse(bestEntry);
    } else {
      knowledgeResponse = this.getDefaultResponse(intent);
    }

    // Generate personalized response
    const personalizedResponse = this.personalizeResponse(
      message,
      intent,
      knowledgeResponse,
      sessionId,
      entities
    );

    const suggestions = this.generateSuggestions(intent, context.history.length > 0);

    return this.buildAgentResponse(
      personalizedResponse,
      intent,
      entities,
      confidence,
      suggestions
    );
  }

  private formatResponse(intent: string, replacements: Record<string, string>): string {
    const template = this.responseTemplates.find(t => t.intent === intent);
    if (!template) {
      return replacements.knowledge_response || replacements.coding_response || 'I\'m here to help! What can I do for you?';
    }

    const selectedTemplate = template.templates[Math.floor(Math.random() * template.templates.length)];
    
    let response = selectedTemplate;
    for (const [key, value] of Object.entries(replacements)) {
      response = response.replace(`{${key}}`, value);
    }

    return response;
  }

  private personalizeResponse(
    message: string,
    intent: string,
    knowledgeResponse: string,
    sessionId: string,
    entities: any[]
  ): string {
    const context = this.contextManager.getContext(sessionId);
    
    // Check if this is a follow-up question
    const isFollowUp = context.history.length > 0;
    const lastIntent = context.history.length > 0 ? context.history[context.history.length - 1].intent : '';
    
    let personalizedResponse = this.formatResponse(intent, { knowledge_response: knowledgeResponse });

    // Add personalization based on context
    if (isFollowUp && lastIntent === intent) {
      personalizedResponse = this.addFollowUpContext(personalizedResponse, lastIntent);
    }

    // Add entity-specific personalization
    if (entities.length > 0) {
      personalizedResponse = this.addEntityPersonalization(personalizedResponse, entities);
    }

    return personalizedResponse;
  }

  private addFollowUpContext(response: string, lastIntent: string): string {
    const followUpPhrases = {
      'booking_inquiry': 'I see you\'re still interested in booking. ',
      'payment_issue': 'Let\'s continue working on your payment issue. ',
      'technical_support': 'I\'m still here to help with your technical problem. ',
      'coding_help': 'Great! Let\'s dive deeper into the coding topic. '
    };

    const phrase = followUpPhrases[lastIntent as keyof typeof followUpPhrases];
    if (phrase) {
      return phrase + response;
    }

    return response;
  }

  private addEntityPersonalization(response: string, entities: any[]): string {
    // Add specific mentions of detected entities
    const programmingEntities = entities.filter(e => e.type === 'programming_language');
    const dateEntities = entities.filter(e => e.type === 'date');
    const timeEntities = entities.filter(e => e.type === 'time');

    if (programmingEntities.length > 0) {
      const languages = programmingEntities.map(e => e.value).join(', ');
      response += ` I see you\'re working with ${languages}.`;
    }

    if (dateEntities.length > 0 && timeEntities.length > 0) {
      response += ` I noticed you mentioned a specific date and time - I can help you find events around that schedule.`;
    }

    return response;
  }

  private generateSuggestions(intent: string, hasHistory: boolean): string[] {
    const suggestionMap: Record<string, string[]> = {
      greeting: [
        'Browse upcoming events',
        'Help with booking process',
        'Ask a coding question',
        'Check my bookings'
      ],
      booking_inquiry: [
        'Show me available events',
        'Help with seat selection',
        'Explain booking process',
        'Check booking status'
      ],
      payment_issue: [
        'Try different payment method',
        'Check payment status',
        'Contact payment support',
        'Request refund'
      ],
      event_question: [
        'Browse events by category',
        'Find events near me',
        'Check event details',
        'Set event reminders'
      ],
      technical_support: [
        'Clear browser cache',
        'Try different browser',
        'Check internet connection',
        'Contact technical support'
      ],
      coding_help: [
        'Show code examples',
        'Explain programming concept',
        'Help debug code',
        'Suggest best practices'
      ],
      general: [
        'Browse events',
        'Check my bookings',
        'Get help with payment',
        'Ask technical question'
      ]
    };

    const baseSuggestions = suggestionMap[intent] || suggestionMap.general;
    
    // Add context-aware suggestions
    if (hasHistory) {
      return [...baseSuggestions.slice(0, 2), 'Continue our conversation', ...baseSuggestions.slice(2, 3)];
    }

    return baseSuggestions.slice(0, 3);
  }

  private getDefaultResponse(intent: string): string {
    const defaultResponses: Record<string, string> = {
      booking_inquiry: 'I can help you book tickets for various events. Our booking process is quick and secure.',
      payment_issue: 'I understand payment issues can be frustrating. Let me help you resolve this.',
      event_question: 'We have a wide variety of events available. I can help you find something you\'ll enjoy.',
      technical_support: 'I\'m here to help with any technical issues you might be experiencing.',
      coding_help: 'I can assist with programming questions across various languages and frameworks.',
      complaint: 'I apologize for any inconvenience. Let me help make this right.',
      general: 'I\'m here to assist you with any questions about TicketMax.'
    };

    return defaultResponses[intent] || 'I\'m here to help! What can I do for you?';
  }

  private buildAgentResponse(
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
        responseLength: response.length,
        entityCount: entities.length
      }
    };
  }

  public addResponseTemplate(template: ResponseTemplate): void {
    this.responseTemplates.push(template);
  }

  public updateResponseTemplate(intent: string, templates: string[]): void {
    const existingTemplate = this.responseTemplates.find(t => t.intent === intent);
    if (existingTemplate) {
      existingTemplate.templates = templates;
    } else {
      this.addResponseTemplate({ intent, templates });
    }
  }
}