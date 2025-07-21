import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CACHE_KEY, CACHE_TTL } from './cache.decorators';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const cacheKey = this.reflector.get<string>(
      CACHE_KEY,
      context.getHandler(),
    );
    const cacheTTL = this.reflector.get<number>(
      CACHE_TTL,
      context.getHandler(),
    );

    if (!cacheKey) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const fullCacheKey = this.generateCacheKey(cacheKey, request);

    // Try to get cached value
    const cachedValue = await this.cacheManager.get(fullCacheKey);
    if (cachedValue) {
      return of(cachedValue);
    }

    // If not cached, execute handler and cache result
    return next.handle().pipe(
      tap(async (response) => {
        await this.cacheManager.set(fullCacheKey, response, cacheTTL || 300);
      }),
    );
  }

  private generateCacheKey(baseKey: string, request: any): string {
    const { method, url, query, params } = request;
    const queryString = JSON.stringify(query);
    const paramsString = JSON.stringify(params);
    return `${baseKey}:${method}:${url}:${queryString}:${paramsString}`;
  }
}
