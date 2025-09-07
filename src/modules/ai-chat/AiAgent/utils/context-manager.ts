import { ContextMemory, ConversationTurn, Entity } from '../interfaces/agent.interface';

export class ContextManager {
  private contextStore: Map<string, ContextMemory> = new Map();
  private readonly MAX_HISTORY = 10;
  private readonly CONTEXT_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  public getContext(sessionId: string): ContextMemory {
    const existing = this.contextStore.get(sessionId);
    
    if (existing) {
      // Check if context has expired
      const timeDiff = Date.now() - existing.lastActivity.getTime();
      if (timeDiff > this.CONTEXT_TIMEOUT) {
        this.contextStore.delete(sessionId);
        return this.createNewContext(sessionId);
      }
      return existing;
    }

    return this.createNewContext(sessionId);
  }

  private createNewContext(sessionId: string): ContextMemory {
    const context: ContextMemory = {
      sessionId,
      history: [],
      entities: {},
      preferences: {},
      lastActivity: new Date()
    };
    
    this.contextStore.set(sessionId, context);
    return context;
  }

  public updateContext(
    sessionId: string,
    message: string,
    response: string,
    intent: string,
    entities: Entity[],
    userId?: string
  ): void {
    const context = this.getContext(sessionId);
    
    if (userId) {
      context.userId = userId;
    }

    // Add conversation turn
    const turn: ConversationTurn = {
      message,
      response,
      intent,
      timestamp: new Date(),
      entities
    };

    context.history.push(turn);

    // Keep only recent history
    if (context.history.length > this.MAX_HISTORY) {
      context.history = context.history.slice(-this.MAX_HISTORY);
    }

    // Update entities
    this.updateEntities(context, entities);

    // Update last activity
    context.lastActivity = new Date();

    this.contextStore.set(sessionId, context);
  }

  private updateEntities(context: ContextMemory, newEntities: Entity[]): void {
    for (const entity of newEntities) {
      if (!context.entities[entity.type]) {
        context.entities[entity.type] = [];
      }
      
      // Check if entity already exists
      const existing = context.entities[entity.type].find(
        (e: any) => e.value === entity.value
      );
      
      if (!existing) {
        context.entities[entity.type].push({
          value: entity.value,
          confidence: entity.confidence,
          lastSeen: new Date()
        });
      } else {
        existing.lastSeen = new Date();
        existing.confidence = Math.max(existing.confidence, entity.confidence);
      }
    }
  }

  public getRecentMessages(sessionId: string, count: number = 3): string[] {
    const context = this.getContext(sessionId);
    return context.history
      .slice(-count)
      .map(turn => turn.message);
  }

  public getEntityValue(sessionId: string, entityType: string): any {
    const context = this.getContext(sessionId);
    const entities = context.entities[entityType];
    
    if (!entities || entities.length === 0) {
      return null;
    }

    // Return the most recent entity of this type
    return entities[entities.length - 1].value;
  }

  public setPreference(sessionId: string, key: string, value: any): void {
    const context = this.getContext(sessionId);
    context.preferences[key] = value;
    this.contextStore.set(sessionId, context);
  }

  public getPreference(sessionId: string, key: string): any {
    const context = this.getContext(sessionId);
    return context.preferences[key];
  }

  public getConversationSummary(sessionId: string): string {
    const context = this.getContext(sessionId);
    
    if (context.history.length === 0) {
      return 'This is the beginning of our conversation.';
    }

    const recentIntents = context.history
      .slice(-3)
      .map(turn => turn.intent);

    const intentSummary = [...new Set(recentIntents)].join(', ');
    
    return `In our recent conversation, we've discussed: ${intentSummary}. ` +
           `We've exchanged ${context.history.length} messages.`;
  }

  public hasDiscussedTopic(sessionId: string, topic: string): boolean {
    const context = this.getContext(sessionId);
    
    return context.history.some(turn => 
      turn.message.toLowerCase().includes(topic.toLowerCase()) ||
      turn.response.toLowerCase().includes(topic.toLowerCase())
    );
  }

  public getLastIntent(sessionId: string): string {
    const context = this.getContext(sessionId);
    
    if (context.history.length === 0) {
      return 'general';
    }

    return context.history[context.history.length - 1].intent;
  }

  public clearContext(sessionId: string): void {
    this.contextStore.delete(sessionId);
  }

  public cleanupExpiredContexts(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, context] of this.contextStore) {
      const timeDiff = now - context.lastActivity.getTime();
      if (timeDiff > this.CONTEXT_TIMEOUT) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.contextStore.delete(sessionId);
    }
  }

  public getContextStats(): { totalSessions: number; activeSessions: number } {
    const now = Date.now();
    let activeSessions = 0;

    for (const context of this.contextStore.values()) {
      const timeDiff = now - context.lastActivity.getTime();
      if (timeDiff <= this.CONTEXT_TIMEOUT) {
        activeSessions++;
      }
    }

    return {
      totalSessions: this.contextStore.size,
      activeSessions
    };
  }
}