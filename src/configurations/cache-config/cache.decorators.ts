import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY = 'cache_key';
export const CACHE_TTL = 'cache_ttl';

export const CacheKey = (key: string) => SetMetadata(CACHE_KEY, key);
export const CacheTTL = (ttl: number) => SetMetadata(CACHE_TTL, ttl);

// Predefined cache TTL values
export const CACHE_TIMES = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 900, // 15 minutes
  VERY_LONG: 3600, // 1 hour
} as const;
