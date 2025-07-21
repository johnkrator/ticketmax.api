import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);
  private readonly suspiciousIPs = new Map<
    string,
    { count: number; lastSeen: Date }
  >();
  private readonly maxFailedAttempts = 10;
  private readonly blockDuration = 15 * 60 * 1000; // 15 minutes

  use(req: Request, res: Response, next: NextFunction) {
    const clientIP = this.getClientIP(req);

    // Check if IP is currently blocked
    if (this.isIPBlocked(clientIP)) {
      this.logger.warn(`Blocked request from suspicious IP: ${clientIP}`);
      return res.status(429).json({
        error: 'Too many failed attempts. Please try again later.',
        blockedUntil: new Date(Date.now() + this.blockDuration).toISOString(),
      });
    }

    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );

    // Log suspicious patterns
    this.detectSuspiciousActivity(req);

    next();
  }

  private getClientIP(req: Request): string {
    return (
      req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      'unknown'
    );
  }

  private isIPBlocked(ip: string): boolean {
    const record = this.suspiciousIPs.get(ip);
    if (!record) return false;

    if (record.count >= this.maxFailedAttempts) {
      const timeSinceLastAttempt = Date.now() - record.lastSeen.getTime();
      if (timeSinceLastAttempt < this.blockDuration) {
        return true;
      } else {
        // Reset count after block duration
        this.suspiciousIPs.delete(ip);
        return false;
      }
    }
    return false;
  }

  private detectSuspiciousActivity(req: Request) {
    const clientIP = this.getClientIP(req);
    const userAgent = req.headers['user-agent'];

    // Detect potential bot activity
    if (!userAgent || this.isSuspiciousUserAgent(userAgent)) {
      this.markSuspiciousActivity(clientIP, 'Suspicious User Agent');
    }

    // Detect rapid requests (handled by throttler, but log here)
    if (req.url.includes('/login') || req.url.includes('/register')) {
      this.logger.log(
        `Auth attempt from IP: ${clientIP}, User-Agent: ${userAgent}`,
      );
    }
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i,
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(userAgent));
  }

  private markSuspiciousActivity(ip: string, reason: string) {
    const record = this.suspiciousIPs.get(ip) || {
      count: 0,
      lastSeen: new Date(),
    };
    record.count++;
    record.lastSeen = new Date();
    this.suspiciousIPs.set(ip, record);

    this.logger.warn(
      `Suspicious activity from ${ip}: ${reason} (Count: ${record.count})`,
    );
  }

  // Method to be called when authentication fails
  public recordFailedAuth(ip: string) {
    this.markSuspiciousActivity(ip, 'Failed Authentication');
  }
}
