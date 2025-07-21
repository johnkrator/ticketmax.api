import { SetMetadata } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

// Custom throttle decorators for different scenarios
export const ThrottleAuth = () => Throttle({ auth: { limit: 5, ttl: 60000 } }); // 5 attempts per minute
export const ThrottleShort = () =>
  Throttle({ short: { limit: 10, ttl: 1000 } }); // 10 requests per second
export const ThrottleMedium = () =>
  Throttle({ medium: { limit: 50, ttl: 10000 } }); // 50 requests per 10 seconds
export const ThrottleLong = () =>
  Throttle({ long: { limit: 200, ttl: 60000 } }); // 200 requests per minute

// Special decorator for sensitive operations
export const ThrottleSensitive = () =>
  Throttle({ auth: { limit: 3, ttl: 300000 } }); // 3 attempts per 5 minutes

export const THROTTLE_SKIP_METADATA = 'throttle_skip';
export const SkipThrottle = () => SetMetadata(THROTTLE_SKIP_METADATA, true);
