import { IntentResult, Entity } from '../interfaces/agent.interface';

interface IntentPattern {
  intent: string;
  patterns: string[];
  keywords: string[];
  weight: number;
}

export class IntentClassifier {
  private intentPatterns: IntentPattern[] = [
    {
      intent: 'booking_inquiry',
      patterns: [
        'book.*ticket',
        'reserve.*seat',
        'purchase.*event',
        'buy.*ticket',
        'how.*book',
        'booking.*process',
        'available.*event',
        'event.*schedule'
      ],
      keywords: ['book', 'booking', 'reserve', 'ticket', 'event', 'purchase', 'buy', 'available'],
      weight: 1.0
    },
    {
      intent: 'payment_issue',
      patterns: [
        'payment.*fail',
        'card.*decline',
        'billing.*problem',
        'refund.*request',
        'payment.*error',
        'transaction.*issue',
        'charge.*problem'
      ],
      keywords: ['payment', 'card', 'billing', 'refund', 'charge', 'transaction', 'money'],
      weight: 1.0
    },
    {
      intent: 'event_question',
      patterns: [
        'event.*detail',
        'show.*time',
        'venue.*location',
        'event.*information',
        'what.*event',
        'when.*event',
        'where.*event',
        'looking.*forward.*event',
        'excited.*about.*event',
        'hope.*event.*goes',
        'can\'t.*wait.*event',
        'event.*smoothly',
        'event.*successful'
      ],
      keywords: ['event', 'show', 'venue', 'time', 'date', 'location', 'information', 'detail', 'looking', 'forward', 'excited', 'hope', 'smoothly', 'successful'],
      weight: 0.9
    },
    {
      intent: 'technical_support',
      patterns: [
        'not.*work',
        'error.*message',
        'technical.*problem',
        'website.*broken',
        'login.*issue',
        'account.*problem',
        'bug.*report'
      ],
      keywords: ['error', 'problem', 'issue', 'broken', 'bug', 'technical', 'help', 'support'],
      weight: 1.0
    },
    {
      intent: 'coding_help',
      patterns: [
        'code.*help',
        'programming.*question',
        'javascript.*code',
        'typescript.*help',
        'react.*component',
        'nestjs.*service',
        'function.*create',
        'class.*define',
        'debug.*code',
        'algorithm.*help'
      ],
      keywords: ['code', 'programming', 'javascript', 'typescript', 'react', 'nestjs', 'function', 'class', 'debug', 'algorithm', 'development'],
      weight: 1.0
    },
    {
      intent: 'complaint',
      patterns: [
        'not.*satisfied',
        'poor.*service',
        'disappointed.*with',
        'complaint.*about',
        'unhappy.*with',
        'terrible.*experience'
      ],
      keywords: ['complaint', 'disappointed', 'unhappy', 'terrible', 'poor', 'bad', 'worst'],
      weight: 0.8
    },
    {
      intent: 'greeting',
      patterns: [
        '^(hello|hi|hey)',
        'good.*(morning|afternoon|evening)',
        'how.*are.*you',
        'what.*up'
      ],
      keywords: ['hello', 'hi', 'hey', 'morning', 'afternoon', 'evening', 'how'],
      weight: 0.7
    },
    {
      intent: 'general',
      patterns: [
        'thank.*you',
        'thanks.*much',
        'appreciate.*help',
        'bye.*bye',
        'goodbye',
        'see.*you'
      ],
      keywords: ['thank', 'thanks', 'appreciate', 'bye', 'goodbye'],
      weight: 0.6
    }
  ];

  public classifyIntent(message: string): IntentResult {
    const messageLower = message.toLowerCase();
    const scores = new Map<string, number>();

    // Calculate scores for each intent
    for (const intentPattern of this.intentPatterns) {
      let score = 0;

      // Pattern matching
      for (const pattern of intentPattern.patterns) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(message)) {
          score += 0.7 * intentPattern.weight;
          break; // Only count the first matching pattern
        }
      }

      // Keyword matching
      let keywordMatches = 0;
      for (const keyword of intentPattern.keywords) {
        if (messageLower.includes(keyword)) {
          keywordMatches++;
        }
      }
      
      if (keywordMatches > 0) {
        score += (keywordMatches / intentPattern.keywords.length) * 0.5 * intentPattern.weight;
      }

      scores.set(intentPattern.intent, score);
    }

    // Find the intent with the highest score
    let bestIntent = 'general';
    let bestScore = 0;
    
    for (const [intent, score] of scores) {
      if (score > bestScore) {
        bestScore = score;
        bestIntent = intent;
      }
    }

    // If no intent scored above threshold, classify as general
    if (bestScore < 0.3) {
      bestIntent = 'general';
      bestScore = 0.5;
    }

    // Extract entities
    const entities = this.extractEntities(message);

    return {
      intent: bestIntent,
      confidence: Math.min(bestScore, 1.0),
      entities
    };
  }

  private extractEntities(message: string): Entity[] {
    const entities: Entity[] = [];

    // Email extraction
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    let match;
    while ((match = emailRegex.exec(message)) !== null) {
      entities.push({
        type: 'email',
        value: match[0],
        confidence: 0.9,
        start: match.index,
        end: match.index + match[0].length
      });
    }

    // Phone number extraction
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    while ((match = phoneRegex.exec(message)) !== null) {
      entities.push({
        type: 'phone',
        value: match[0],
        confidence: 0.8,
        start: match.index,
        end: match.index + match[0].length
      });
    }

    // Date extraction
    const dateRegex = /\b(?:today|tomorrow|yesterday|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s\d{2,4})\b/gi;
    while ((match = dateRegex.exec(message)) !== null) {
      entities.push({
        type: 'date',
        value: match[0],
        confidence: 0.7,
        start: match.index,
        end: match.index + match[0].length
      });
    }

    // Time extraction
    const timeRegex = /\b(?:\d{1,2}:\d{2}(?:\s?(?:am|pm))?|\d{1,2}\s?(?:am|pm))\b/gi;
    while ((match = timeRegex.exec(message)) !== null) {
      entities.push({
        type: 'time',
        value: match[0],
        confidence: 0.8,
        start: match.index,
        end: match.index + match[0].length
      });
    }

    // Money/Price extraction
    const moneyRegex = /\$?\d+(?:,\d{3})*(?:\.\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?\s?(?:dollar|usd|naira|ngn)/gi;
    while ((match = moneyRegex.exec(message)) !== null) {
      entities.push({
        type: 'money',
        value: match[0],
        confidence: 0.8,
        start: match.index,
        end: match.index + match[0].length
      });
    }

    // Programming language extraction
    const progLangRegex = /\b(?:javascript|typescript|python|java|c\+\+|c#|php|ruby|go|rust|swift|kotlin|dart|html|css|sql|mongodb|nodejs|react|angular|vue|nestjs|express)\b/gi;
    while ((match = progLangRegex.exec(message)) !== null) {
      entities.push({
        type: 'programming_language',
        value: match[0],
        confidence: 0.9,
        start: match.index,
        end: match.index + match[0].length
      });
    }

    return entities;
  }

  public addIntentPattern(intent: string, patterns: string[], keywords: string[], weight: number = 1.0): void {
    this.intentPatterns.push({
      intent,
      patterns,
      keywords,
      weight
    });
  }

  public getAvailableIntents(): string[] {
    return this.intentPatterns.map(pattern => pattern.intent);
  }
}