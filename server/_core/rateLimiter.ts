import { LRUCache } from 'lru-cache';
import { NextFunction, Request, Response } from 'express';

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

const rateLimitCache = new LRUCache<string, RateLimitBucket>({
  max: 10000,  // 10K usuarios máximo
  ttl: 60 * 1000,  // 1 minuto TTL
});

const RATE_LIMITS = {
  search: { tokensPerSecond: 10, burst: 20 },           // 10/s normal, ráfaga 20
  sync: { tokensPerSecond: 0.5, burst: 1 },             // 1 cada 2s max
  apiGeneral: { tokensPerSecond: 100, burst: 200 },     // 100/s general
};

export function checkRateLimit(identifier: string, endpoint: 'search' | 'sync' | 'apiGeneral'): boolean {
  const limit = RATE_LIMITS[endpoint];
  const now = Date.now();
  
  let bucket = rateLimitCache.get(identifier);
  
  if (!bucket) {
    bucket = {
      tokens: limit.burst,
      lastRefill: now,
    };
  } else {
    // Refill tokens based on time elapsed
    const elapsedSec = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(
      limit.burst,
      bucket.tokens + elapsedSec * limit.tokensPerSecond
    );
    bucket.lastRefill = now;
  }
  
  if (bucket.tokens < 1) {
    rateLimitCache.set(identifier, bucket);
    return false;  // Rate limited
  }
  
  bucket.tokens -= 1;
  rateLimitCache.set(identifier, bucket);
  return true;  // Allowed
}

// Middleware para Express
export function rateLimitMiddleware(endpoint: keyof typeof RATE_LIMITS) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Para rutas tRPC u otras Express, req.user podría no existir en Request nativo,
    // se puede usar req.ip como fallback seguro
    const identifier = (req as any).user?.openId || req.ip;  
    
    if (!checkRateLimit(identifier, endpoint)) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: 60,
      });
    }
    
    next();
  };
}
