import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Track by IP + user agent for auth endpoints to prevent brute force
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';
    return `${ip}-${userAgent}`;
  }

  protected generateKey(
    context: any,
    tracker: string,
    throttlerName?: string,
  ): string {
    return `auth-${tracker}-${throttlerName || 'default'}`;
  }
}

@Injectable()
export class StandardThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.ip || req.connection.remoteAddress;
  }
}
