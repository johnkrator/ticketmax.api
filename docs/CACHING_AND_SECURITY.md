# Cache, Rate Limiting & Security Implementation

## Overview

This implementation adds comprehensive caching, rate limiting, and brute force attack protection to the TicketMax API
using Redis and NestJS Throttler.

## Features Implemented

### 1. Redis-based Caching System

- **Cache Interceptor**: Automatically caches GET requests based on decorators
- **Configurable TTL**: Different cache durations for different data types
- **Cache Invalidation**: Smart cache clearing when data is updated
- **Pattern-based Keys**: Organized cache keys for easy management

### 2. Rate Limiting & Throttling

- **Multiple Rate Limits**: Different limits for different endpoint types
- **IP-based Tracking**: Tracks requests per IP address
- **Custom Guards**: Specialized guards for authentication endpoints
- **Configurable Limits**: Environment-based configuration

### 3. Brute Force Protection

- **Authentication Throttling**: Strict limits on login/register attempts
- **IP Blocking**: Temporary blocks for suspicious IPs
- **User Agent Detection**: Identifies and blocks suspicious bots
- **Progressive Penalties**: Increasing delays for repeated violations

## Configuration

### Environment Variables (.env)

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Rate Limiting
THROTTLE_TTL_SHORT=1000
THROTTLE_LIMIT_SHORT=10
THROTTLE_TTL_MEDIUM=10000
THROTTLE_LIMIT_MEDIUM=50

# Authentication Protection
AUTH_THROTTLE_TTL=60000
AUTH_THROTTLE_LIMIT=5
SENSITIVE_THROTTLE_TTL=300000
SENSITIVE_THROTTLE_LIMIT=3

# Cache TTL (seconds)
CACHE_TTL_SHORT=60
CACHE_TTL_MEDIUM=300
CACHE_TTL_LONG=900
```

## Rate Limiting Tiers

### 1. Short Throttle (GET requests)

- **Limit**: 10 requests per second
- **Use Case**: Frequent data retrieval
- **Applied to**: Event lists, user profiles, booking details

### 2. Medium Throttle (POST/PATCH requests)

- **Limit**: 50 requests per 10 seconds
- **Use Case**: Data modifications
- **Applied to**: Event creation, bookings, updates

### 3. Authentication Throttle (Brute Force Protection)

- **Limit**: 5 attempts per minute
- **Use Case**: Login, register, password reset
- **Applied to**: All authentication endpoints

### 4. Sensitive Operations

- **Limit**: 3 attempts per 5 minutes
- **Use Case**: Critical security operations
- **Applied to**: Password reset, email verification

## Cache Strategy

### Cache TTL Levels

- **SHORT (60s)**: User profiles, recent bookings
- **MEDIUM (5min)**: Event details, statistics
- **LONG (15min)**: Featured events, categories
- **VERY_LONG (1hr)**: Static content, configurations

### Cached Endpoints

- `GET /events` - Event listings with filters
- `GET /events/featured` - Featured events
- `GET /events/statistics` - Event statistics
- `GET /events/category/:category` - Events by category
- `GET /events/:id` - Event details
- `GET /user/profile` - User profiles
- `GET /bookings` - User booking history

## Security Features

### IP-based Protection

- Tracks failed authentication attempts per IP
- Automatically blocks IPs after 10 failed attempts
- 15-minute block duration with automatic unblocking
- Logs all suspicious activities

### Headers Added

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### Bot Detection

- Identifies suspicious user agents
- Blocks common scraping tools
- Monitors rapid request patterns

## Installation & Setup

### 1. Install Dependencies

```bash
npm install @nestjs/cache-manager @nestjs/throttler cache-manager cache-manager-redis-store redis
```

### 2. Setup Redis

```bash
# Using Docker
docker run -d -p 6379:6379 --name redis redis:alpine

# Or install locally
# macOS: brew install redis
# Ubuntu: sudo apt-get install redis-server
```

### 3. Environment Configuration

Copy `.env.example` to `.env` and configure Redis connection:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### 4. Start Application

```bash
npm run start:dev
```

## Usage Examples

### 1. Cached API Calls

```typescript
// This endpoint is automatically cached for 5 minutes
GET / api / events / featured
// Response includes cache headers

// Cache is invalidated when events are created/updated
POST / api / events
// Clears related cache patterns
```

### 2. Rate Limited Requests

```typescript
// Standard rate limiting
GET / api / events
// Headers: X-RateLimit-Limit, X-RateLimit-Remaining

// Authentication protection
POST / api / user / login
// Limited to 5 attempts per minute per IP
```

### 3. Monitoring

```typescript
// Check rate limit status
curl - I
http://localhost:3000/api/events
// X-RateLimit-Limit: 10
// X-RateLimit-Remaining: 7
// X-RateLimit-Reset: 1234567890
```

## Monitoring & Debugging

### Cache Statistics

- Monitor Redis memory usage
- Track cache hit/miss ratios
- Review cache key patterns

### Rate Limiting Logs

- Failed authentication attempts
- Blocked IP addresses
- Suspicious user agents
- Rate limit violations

### Performance Metrics

- Response times before/after caching
- Database query reduction
- Memory usage optimization

## Best Practices

### 1. Cache Management

- Use specific cache keys for different data types
- Implement cache warming for critical data
- Monitor cache memory usage
- Set appropriate TTL values

### 2. Rate Limiting

- Adjust limits based on usage patterns
- Monitor for legitimate users being blocked
- Implement whitelist for trusted IPs
- Use progressive penalties for repeat offenders

### 3. Security

- Regularly review blocked IPs
- Monitor authentication patterns
- Keep security headers updated
- Log and analyze suspicious activities

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**
    - Check Redis server status
    - Verify connection credentials
    - Ensure network connectivity

2. **Cache Not Working**
    - Verify cache decorators are applied
    - Check Redis memory limits
    - Review cache key patterns

3. **Rate Limiting Too Strict**
    - Adjust throttle limits in environment
    - Review IP tracking logic
    - Check for legitimate traffic patterns

4. **Performance Issues**
    - Monitor Redis memory usage
    - Optimize cache key structures
    - Review TTL settings

## Files Modified/Created

### New Configuration Files

- `src/configurations/cache-config/cache.config.ts`
- `src/configurations/cache-config/cache.decorators.ts`
- `src/configurations/cache-config/cache.interceptor.ts`
- `src/configurations/cache-config/cache-invalidation.service.ts`
- `src/configurations/throttler-config/throttler.config.ts`
- `src/configurations/throttler-config/throttler.decorators.ts`
- `src/configurations/throttler-config/throttler.guards.ts`
- `src/configurations/security/security.middleware.ts`

### Updated Controllers

- `src/modules/event/event.controller.ts`
- `src/modules/user/user.controller.ts`
- `src/modules/organizer/organizer.controller.ts`
- `src/modules/booking/booking.controller.ts`

### Updated Module

- `src/app.module.ts`

### Configuration Files

- `package.json` (added dependencies)
- `.env.example` (configuration template)

This implementation provides enterprise-grade caching, rate limiting, and security features that will significantly
improve your API's performance, reliability, and security posture.
