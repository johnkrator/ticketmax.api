export interface AgentRequest {
  message: string;
  context?: Record<string, any>;
  sessionId?: string;
  userId?: string;
}

export interface AgentResponse {
  response: string;
  confidence: number;
  intent: string;
  entities: Entity[];
  suggestions: string[];
  metadata?: Record<string, any>;
}

export interface Entity {
  type: string;
  value: string;
  confidence: number;
  start?: number;
  end?: number;
}

export interface IntentResult {
  intent: string;
  confidence: number;
  entities: Entity[];
}

export interface KnowledgeEntry {
  id: string;
  category: string;
  keywords: string[];
  patterns: string[];
  responses: string[];
  conditions?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ContextMemory {
  sessionId: string;
  userId?: string;
  history: ConversationTurn[];
  entities: Record<string, any>;
  preferences: Record<string, any>;
  lastActivity: Date;
}

export interface ConversationTurn {
  message: string;
  response: string;
  intent: string;
  timestamp: Date;
  entities: Entity[];
}