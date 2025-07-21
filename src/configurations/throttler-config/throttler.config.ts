import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const ThrottlerConfigModule = ThrottlerModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => [
    {
      name: 'short',
      ttl: 1000, // 1 second
      limit: 3, // 3 requests per second
    },
    {
      name: 'medium',
      ttl: 10000, // 10 seconds
      limit: 20, // 20 requests per 10 seconds
    },
    {
      name: 'long',
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute
    },
    {
      name: 'auth',
      ttl: 60000, // 1 minute
      limit: 5, // 5 auth attempts per minute (brute force protection)
    },
  ],
  inject: [ConfigService],
});
