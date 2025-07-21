import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const CacheConfigModule = CacheModule.registerAsync({
  imports: [ConfigModule],
  isGlobal: true,
  useFactory: async (configService: ConfigService) => ({
    ttl: 300, // 5 minutes default TTL
    max: 1000, // Maximum number of items in cache
    // For now, use in-memory store. Redis can be added later
    // store: 'memory',
  }),
  inject: [ConfigService],
});
