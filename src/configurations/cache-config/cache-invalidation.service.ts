import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheInvalidationService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async invalidatePattern(pattern: string): Promise<void> {
    // Get all keys from Redis
    const keys = await this.getAllKeys();

    // Filter keys that match the pattern
    const keysToDelete = keys.filter((key) => key.includes(pattern));

    // Delete matching keys
    for (const key of keysToDelete) {
      await this.cacheManager.del(key);
    }
  }

  async invalidateEventCache(eventId?: string): Promise<void> {
    const patterns = [
      'events-all',
      'events-featured',
      'events-category',
      'events-statistics',
      'events-organizer',
    ];

    if (eventId) {
      patterns.push(`event-detail:*:${eventId}`);
    }

    for (const pattern of patterns) {
      await this.invalidatePattern(pattern);
    }
  }

  async invalidateUserCache(userId?: string): Promise<void> {
    const patterns = ['users-all', 'user-profile'];

    if (userId) {
      patterns.push(`user-detail:*:${userId}`);
    }

    for (const pattern of patterns) {
      await this.invalidatePattern(pattern);
    }
  }

  async invalidateBookingCache(userId?: string): Promise<void> {
    const patterns = ['user-bookings'];

    if (userId) {
      patterns.push(`booking-detail:*${userId}`);
    }

    for (const pattern of patterns) {
      await this.invalidatePattern(pattern);
    }
  }

  async clearAllCache(): Promise<void> {
    // Use store.reset() for cache-manager
    const store = (this.cacheManager as any).store;
    if (store && store.reset) {
      await store.reset();
    } else {
      // Fallback: delete all keys manually
      const keys = await this.getAllKeys();
      for (const key of keys) {
        await this.cacheManager.del(key);
      }
    }
  }

  private async getAllKeys(): Promise<string[]> {
    // This would need to be implemented based on your Redis setup
    // For now, return empty array - in production, you'd use Redis SCAN
    return [];
  }
}
