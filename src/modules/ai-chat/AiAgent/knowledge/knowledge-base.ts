import { KnowledgeEntry } from '../interfaces/agent.interface';

export class KnowledgeBase {
  private knowledgeEntries: Map<string, KnowledgeEntry[]> = new Map();
  
  constructor() {
    this.initializeKnowledge();
  }

  private initializeKnowledge(): void {
    // Booking-related knowledge
    this.addKnowledgeCategory('booking', [
      {
        id: 'booking_1',
        category: 'booking',
        keywords: ['book', 'booking', 'reserve', 'reservation', 'ticket', 'event', 'purchase'],
        patterns: [
          'how.*book.*ticket',
          'want.*reserve.*seat',
          'purchase.*event.*ticket',
          'booking.*process',
          'how.*buy.*ticket'
        ],
        responses: [
          'To book a ticket, visit our events page, select your desired event, choose your seats, and complete the payment process.',
          'You can book tickets by browsing available events, selecting seats, and proceeding to checkout.',
          'Booking is simple: find your event, pick your seats, and pay securely through our platform.'
        ]
      },
      {
        id: 'booking_2',
        category: 'booking',
        keywords: ['cancel', 'cancellation', 'refund', 'change', 'modify'],
        patterns: [
          'cancel.*booking',
          'want.*refund',
          'change.*reservation',
          'modify.*ticket',
          'refund.*policy'
        ],
        responses: [
          'You can cancel your booking within 24 hours for a full refund. After that, cancellation fees may apply.',
          'To cancel or modify your booking, go to "My Bookings" in your account and select the booking you want to change.',
          'Refund policies vary by event. Check your booking confirmation email for specific cancellation terms.'
        ]
      }
    ]);

    // Payment-related knowledge
    this.addKnowledgeCategory('payment', [
      {
        id: 'payment_1',
        category: 'payment',
        keywords: ['payment', 'pay', 'card', 'credit', 'debit', 'paypal', 'billing'],
        patterns: [
          'payment.*method',
          'how.*pay',
          'credit.*card',
          'payment.*failed',
          'billing.*issue'
        ],
        responses: [
          'We accept credit cards, debit cards, and PayPal. All payments are processed securely.',
          'You can pay using Visa, MasterCard, American Express, or PayPal.',
          'If your payment failed, please check your card details and try again. Contact your bank if issues persist.'
        ]
      }
    ]);

    // Technical support knowledge
    this.addKnowledgeCategory('technical', [
      {
        id: 'tech_1',
        category: 'technical',
        keywords: ['error', 'bug', 'problem', 'issue', 'not working', 'broken', 'help'],
        patterns: [
          'getting.*error',
          'not.*working',
          'technical.*problem',
          'website.*broken',
          'help.*with'
        ],
        responses: [
          'I\'m sorry you\'re experiencing technical difficulties. Please try refreshing your browser or clearing your cache.',
          'For technical issues, try logging out and logging back in. If problems persist, contact our technical support team.',
          'Common solutions include clearing browser cache, disabling ad blockers, or trying a different browser.'
        ]
      }
    ]);

    // Programming and coding knowledge
    this.addKnowledgeCategory('programming', [
      {
        id: 'prog_1',
        category: 'programming',
        keywords: ['javascript', 'typescript', 'nodejs', 'react', 'nestjs', 'code', 'programming'],
        patterns: [
          'javascript.*code',
          'typescript.*help',
          'react.*component',
          'nestjs.*service',
          'how.*code',
          'programming.*help'
        ],
        responses: [
          'I can help with JavaScript, TypeScript, React, NestJS, and many other programming languages. What specific coding question do you have?',
          'For coding assistance, please provide your specific question or the code you\'re working with.',
          'I can help debug code, explain programming concepts, and provide coding examples. What do you need help with?'
        ]
      },
      {
        id: 'prog_2',
        category: 'programming',
        keywords: ['function', 'method', 'class', 'variable', 'array', 'object'],
        patterns: [
          'create.*function',
          'define.*class',
          'array.*method',
          'object.*property',
          'variable.*scope'
        ],
        responses: [
          'I can help you create functions, classes, and work with data structures. Please share your specific requirements.',
          'For programming concepts like functions, classes, or data structures, I can provide examples and explanations.',
          'What specific programming task are you trying to accomplish? I can guide you through the implementation.'
        ]
      }
    ]);

    // Event-related knowledge  
    this.addKnowledgeCategory('event', [
      {
        id: 'event_1',
        category: 'event',
        keywords: ['event', 'show', 'concert', 'performance', 'venue', 'tickets'],
        patterns: [
          'event.*detail',
          'show.*information',
          'concert.*detail',
          'venue.*location',
          'event.*time'
        ],
        responses: [
          'I can help you find detailed information about any event. Which specific event are you interested in?',
          'Let me help you with event details. Please tell me the name of the event or show you\'re asking about.',
          'I\'d be happy to provide event information. What event would you like to know more about?'
        ]
      },
      {
        id: 'event_2',
        category: 'event',
        keywords: ['looking', 'forward', 'excited', 'hope', 'smoothly', 'successful', 'event', 'goes', 'well'],
        patterns: [
          'looking.*forward.*event',
          'excited.*about.*event',
          'hope.*event.*goes',
          'hope.*goes.*smoothly',
          'can\'t.*wait.*event',
          'event.*smoothly',
          'event.*successful',
          'hope.*everything.*goes.*well'
        ],
        responses: [
          'That\'s wonderful to hear! I\'m sure the event will be fantastic. If you need any assistance before or during the event, I\'m here to help!',
          'I love your enthusiasm! Events are so much more enjoyable when attendees are excited. Is there anything specific about the event you\'d like to know or prepare for?',
          'Your excitement is contagious! I\'m confident everything will go perfectly. Feel free to reach out if you have any questions or need assistance with anything related to your event experience.'
        ]
      }
    ]);

    // General conversation knowledge
    this.addKnowledgeCategory('general', [
      {
        id: 'general_1',
        category: 'general',
        keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
        patterns: [
          '^(hello|hi|hey)',
          'good.*(morning|afternoon|evening)',
          'how.*are.*you',
          'what.*up'
        ],
        responses: [
          'Hello! I\'m here to help you with your TicketMax experience. How can I assist you today?',
          'Hi there! Welcome to TicketMax support. What can I help you with?',
          'Hey! I\'m your virtual assistant. How can I help you today?'
        ]
      },
      {
        id: 'general_2',
        category: 'general',
        keywords: ['thank', 'thanks', 'appreciate', 'grateful'],
        patterns: [
          'thank.*you',
          'thanks.*much',
          'appreciate.*help',
          'grateful.*for'
        ],
        responses: [
          'You\'re very welcome! I\'m glad I could help.',
          'Happy to help! Is there anything else you need assistance with?',
          'You\'re welcome! Feel free to ask if you have any other questions.'
        ]
      }
    ]);
  }

  private addKnowledgeCategory(category: string, entries: KnowledgeEntry[]): void {
    this.knowledgeEntries.set(category, entries);
  }

  public findRelevantEntries(query: string, intent: string): KnowledgeEntry[] {
    const queryLower = query.toLowerCase();
    const relevantEntries: Array<{ entry: KnowledgeEntry; score: number }> = [];

    // First, try to find entries in the specific intent category
    const categoryEntries = this.knowledgeEntries.get(intent) || [];
    
    for (const entry of categoryEntries) {
      const score = this.calculateRelevanceScore(queryLower, entry);
      if (score > 0.3) {
        relevantEntries.push({ entry, score });
      }
    }

    // If no relevant entries found in the specific category, search all categories
    if (relevantEntries.length === 0) {
      for (const [, entries] of this.knowledgeEntries) {
        for (const entry of entries) {
          const score = this.calculateRelevanceScore(queryLower, entry);
          if (score > 0.2) {
            relevantEntries.push({ entry, score });
          }
        }
      }
    }

    return relevantEntries
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.entry);
  }

  private calculateRelevanceScore(query: string, entry: KnowledgeEntry): number {
    let score = 0;

    // Check keyword matches
    const keywordMatches = entry.keywords.filter(keyword => 
      query.includes(keyword.toLowerCase())
    ).length;
    score += keywordMatches * 0.4;

    // Check pattern matches
    for (const pattern of entry.patterns) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(query)) {
        score += 0.6;
        break;
      }
    }

    return Math.min(score, 1.0);
  }

  public getResponse(entry: KnowledgeEntry): string {
    const responses = entry.responses;
    return responses[Math.floor(Math.random() * responses.length)];
  }

  public getAllCategories(): string[] {
    return Array.from(this.knowledgeEntries.keys());
  }

  public addKnowledgeEntry(category: string, entry: KnowledgeEntry): void {
    if (!this.knowledgeEntries.has(category)) {
      this.knowledgeEntries.set(category, []);
    }
    this.knowledgeEntries.get(category)!.push(entry);
  }
}