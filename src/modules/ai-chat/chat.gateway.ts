import { Logger } from '@nestjs/common';
import { AiChatService } from './ai-chat.service';

// WebSocket Gateway - Requires @nestjs/websockets and socket.io packages
// To enable real-time chat, install: npm install @nestjs/websockets @nestjs/platform-socket.io socket.io

export class ChatGateway {
  private readonly logger = new Logger(ChatGateway.name);
  private connectedUsers = new Map<string, string>(); // socketId -> userId

  constructor(private readonly aiChatService: AiChatService) {
    this.logger.warn(
      'WebSocket dependencies not installed. Real-time chat disabled.',
    );
    this.logger.warn(
      'To enable: npm install @nestjs/websockets @nestjs/platform-socket.io socket.io',
    );
  }

  // Placeholder methods - will be enabled when WebSocket packages are installed
  handleConnection(client: any) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: any) {
    const userId = this.connectedUsers.get(client.id);
    if (userId) {
      this.connectedUsers.delete(client.id);
      this.logger.log(`User ${userId} disconnected`);
    }
  }

  // Method to send notifications to specific users (placeholder)
  async sendNotificationToUser(userId: string, notification: any) {
    this.logger.log(`Notification for user ${userId}:`, notification);
    // Will be implemented when WebSocket is available
  }
}
