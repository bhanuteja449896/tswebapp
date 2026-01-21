import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { logger } from '../utils/logger';

// Create Redis client for distributed rate limiting
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.connect().catch((err) => logger.error('Redis Connection Error', err));

/**
 * Global rate limiter - applies to all requests
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    // @ts-expect-error - Known issue with RedisStore types
    client: redisClient,
    prefix: 'rl:global:',
  }),
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts, please try again after 15 minutes.',
  skipSuccessfulRequests: true,
  store: new RedisStore({
    // @ts-expect-error - Known issue with RedisStore types
    client: redisClient,
    prefix: 'rl:auth:',
  }),
});

/**
 * Rate limiter for API endpoints
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per minute
  message: 'Too many API requests, please slow down.',
  store: new RedisStore({
    // @ts-expect-error - Known issue with RedisStore types
    client: redisClient,
    prefix: 'rl:api:',
  }),
});

/**
 * Rate limiter for file uploads
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 uploads per hour
  message: 'Too many file uploads, please try again later.',
  store: new RedisStore({
    // @ts-expect-error - Known issue with RedisStore types
    client: redisClient,
    prefix: 'rl:upload:',
  }),
});

/**
 * Rate limiter for password reset requests
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: 'Too many password reset requests, please try again later.',
  skipSuccessfulRequests: true,
  store: new RedisStore({
    // @ts-expect-error - Known issue with RedisStore types
    client: redisClient,
    prefix: 'rl:password:',
  }),
});

/**
 * Rate limiter for email sending
 */
export const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 emails per hour
  message: 'Too many emails sent, please try again later.',
  store: new RedisStore({
    // @ts-expect-error - Known issue with RedisStore types
    client: redisClient,
    prefix: 'rl:email:',
  }),
});

/**
 * Strict rate limiter for registration
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 registrations per hour
  message: 'Too many accounts created, please try again later.',
  skipSuccessfulRequests: false,
  store: new RedisStore({
    // @ts-expect-error - Known issue with RedisStore types
    client: redisClient,
    prefix: 'rl:register:',
  }),
});

/**
 * Dynamic rate limiter based on user role
 */
export const dynamicRoleBasedLimiter = (
  standardMax: number,
  premiumMax: number,
  adminMax: number
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    let maxRequests = standardMax;
    if (user) {
      switch (user.role) {
        case 'admin':
          maxRequests = adminMax;
          break;
        case 'premium':
          maxRequests = premiumMax;
          break;
        default:
          maxRequests = standardMax;
      }
    }

    const limiter = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: maxRequests,
      message: `Too many requests. Your limit is ${maxRequests} requests per minute.`,
      keyGenerator: (req) => {
        return (req as any).user?.userId || req.ip;
      },
      store: new RedisStore({
        // @ts-expect-error - Known issue with RedisStore types
        client: redisClient,
        prefix: 'rl:dynamic:',
      }),
    });

    return limiter(req, res, next);
  };
};

/**
 * Rate limiter for search endpoints
 */
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 searches per minute
  message: 'Too many search requests, please slow down.',
  store: new RedisStore({
    // @ts-expect-error - Known issue with RedisStore types
    client: redisClient,
    prefix: 'rl:search:',
  }),
});

/**
 * Rate limiter for bulk operations
 */
export const bulkOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 bulk operations per hour
  message: 'Too many bulk operations, please try again later.',
  store: new RedisStore({
    // @ts-expect-error - Known issue with RedisStore types
    client: redisClient,
    prefix: 'rl:bulk:',
  }),
});

/**
 * Rate limiter for export operations
 */
export const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 exports per hour
  message: 'Too many export requests, please try again later.',
  store: new RedisStore({
    // @ts-expect-error - Known issue with RedisStore types
    client: redisClient,
    prefix: 'rl:export:',
  }),
});

/**
 * Rate limiter for webhook endpoints
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 webhook calls per minute
  message: 'Webhook rate limit exceeded.',
  store: new RedisStore({
    // @ts-expect-error - Known issue with RedisStore types
    client: redisClient,
    prefix: 'rl:webhook:',
  }),
});

/**
 * Slow down middleware - progressively increases delay
 */
export const slowDown = (req: Request, res: Response, next: NextFunction) => {
  const key = `slowdown:${req.ip}`;
  
  redisClient.incr(key).then((requests) => {
    redisClient.expire(key, 60); // Reset after 1 minute
    
    if (requests > 50) {
      // Add progressive delay
      const delay = Math.min((requests - 50) * 100, 5000); // Max 5 second delay
      setTimeout(() => next(), delay);
    } else {
      next();
    }
  }).catch(() => next());
};

/**
 * Cost-based rate limiter - different endpoints have different costs
 */
class CostBasedRateLimiter {
  private costs: Map<string, number> = new Map([
    ['GET', 1],
    ['POST', 2],
    ['PUT', 2],
    ['DELETE', 3],
    ['BULK', 10],
    ['EXPORT', 5],
  ]);

  middleware(maxPoints: number = 100) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const key = `cost:${(req as any).user?.userId || req.ip}`;
      const cost = this.getCost(req);

      try {
        const current = await redisClient.get(key);
        const currentPoints = current ? parseInt(current) : 0;

        if (currentPoints + cost > maxPoints) {
          return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded based on operation cost.',
            resetIn: 60,
          });
        }

        await redisClient.setEx(key, 60, (currentPoints + cost).toString());
        next();
      } catch (error) {
        logger.error('Cost-based rate limiter error:', error);
        next();
      }
    };
  }

  private getCost(req: Request): number {
    if (req.path.includes('/bulk')) return this.costs.get('BULK') || 10;
    if (req.path.includes('/export')) return this.costs.get('EXPORT') || 5;
    return this.costs.get(req.method) || 1;
  }
}

export const costBasedLimiter = new CostBasedRateLimiter();

/**
 * Token bucket rate limiter
 */
class TokenBucketLimiter {
  private capacity: number;
  private refillRate: number; // tokens per second
  private refillInterval: number; // milliseconds

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.refillInterval = 1000 / refillRate;
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const key = `token:${(req as any).user?.userId || req.ip}`;

      try {
        const data = await redisClient.get(key);
        let bucket = data ? JSON.parse(data) : {
          tokens: this.capacity,
          lastRefill: Date.now(),
        };

        // Refill tokens based on time passed
        const now = Date.now();
        const timePassed = now - bucket.lastRefill;
        const tokensToAdd = Math.floor(timePassed / this.refillInterval);
        
        bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;

        if (bucket.tokens < 1) {
          return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded. Please wait before trying again.',
            retryAfter: Math.ceil(this.refillInterval / 1000),
          });
        }

        bucket.tokens -= 1;
        await redisClient.setEx(key, 3600, JSON.stringify(bucket));
        
        res.setHeader('X-RateLimit-Limit', this.capacity.toString());
        res.setHeader('X-RateLimit-Remaining', bucket.tokens.toString());
        
        next();
      } catch (error) {
        logger.error('Token bucket limiter error:', error);
        next();
      }
    };
  }
}

export const tokenBucketLimiter = new TokenBucketLimiter(100, 10); // 100 capacity, 10 tokens/second

/**
 * Sliding window rate limiter
 */
class SlidingWindowLimiter {
  private windowSize: number; // milliseconds
  private maxRequests: number;

  constructor(windowSize: number, maxRequests: number) {
    this.windowSize = windowSize;
    this.maxRequests = maxRequests;
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const key = `sliding:${(req as any).user?.userId || req.ip}`;
      const now = Date.now();
      const windowStart = now - this.windowSize;

      try {
        // Add current request
        await redisClient.zAdd(key, { score: now, value: `${now}` });
        
        // Remove old requests outside the window
        await redisClient.zRemRangeByScore(key, 0, windowStart);
        
        // Count requests in current window
        const count = await redisClient.zCard(key);
        
        // Set expiry
        await redisClient.expire(key, Math.ceil(this.windowSize / 1000));

        if (count > this.maxRequests) {
          return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded.',
            resetIn: Math.ceil(this.windowSize / 1000),
          });
        }

        res.setHeader('X-RateLimit-Limit', this.maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', (this.maxRequests - count).toString());
        
        next();
      } catch (error) {
        logger.error('Sliding window limiter error:', error);
        next();
      }
    };
  }
}

export const slidingWindowLimiter = new SlidingWindowLimiter(60000, 100); // 1 minute, 100 requests

/**
 * Concurrent request limiter
 */
class ConcurrentRequestLimiter {
  private maxConcurrent: number;

  constructor(maxConcurrent: number) {
    this.maxConcurrent = maxConcurrent;
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const key = `concurrent:${(req as any).user?.userId || req.ip}`;
      const requestId = `${Date.now()}-${Math.random()}`;

      try {
        // Add to set of active requests
        await redisClient.sAdd(key, requestId);
        await redisClient.expire(key, 300); // 5 minutes max request time

        // Check concurrent count
        const concurrent = await redisClient.sCard(key);

        if (concurrent > this.maxConcurrent) {
          await redisClient.sRem(key, requestId);
          return res.status(429).json({
            success: false,
            error: 'Too many concurrent requests. Please wait for previous requests to complete.',
          });
        }

        // Remove from set when request completes
        res.on('finish', async () => {
          await redisClient.sRem(key, requestId);
        });

        next();
      } catch (error) {
        logger.error('Concurrent limiter error:', error);
        next();
      }
    };
  }
}

export const concurrentLimiter = new ConcurrentRequestLimiter(5); // Max 5 concurrent requests

/**
 * Distributed rate limiter with leader election
 */
class DistributedRateLimiter {
  private limits: Map<string, number> = new Map();

  async incrementAndCheck(key: string, max: number, windowMs: number): Promise<boolean> {
    const lockKey = `lock:${key}`;
    const countKey = `count:${key}`;

    try {
      // Try to acquire lock
      const acquired = await redisClient.set(lockKey, '1', {
        NX: true,
        EX: 1, // 1 second lock
      });

      if (!acquired) {
        // Wait for lock to be released
        await this.sleep(100);
      }

      const count = await redisClient.incr(countKey);
      if (count === 1) {
        await redisClient.expire(countKey, Math.ceil(windowMs / 1000));
      }

      return count <= max;
    } finally {
      await redisClient.del(lockKey);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const distributedLimiter = new DistributedRateLimiter();

/**
 * Cleanup function to close Redis connection
 */
export const closeRateLimiters = async (): Promise<void> => {
  await redisClient.quit();
};

/**
 * Get rate limit statistics for monitoring
 */
export const getRateLimitStats = async (prefix: string): Promise<any> => {
  try {
    const keys = await redisClient.keys(`${prefix}:*`);
    const stats = {
      totalKeys: keys.length,
      limits: [],
    };

    for (const key of keys.slice(0, 10)) { // Sample first 10
      const ttl = await redisClient.ttl(key);
      const value = await redisClient.get(key);
      stats.limits.push({ key, ttl, value });
    }

    return stats;
  } catch (error) {
    logger.error('Error getting rate limit stats:', error);
    return null;
  }
};

/**
 * Reset rate limit for a specific key
 */
export const resetRateLimit = async (key: string): Promise<boolean> => {
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error('Error resetting rate limit:', error);
    return false;
  }
};

/**
 * Whitelist IP addresses - bypass rate limiting
 */
const whitelistedIPs = new Set(
  (process.env.RATE_LIMIT_WHITELIST || '').split(',').filter(Boolean)
);

export const whitelistChecker = (req: Request, res: Response, next: NextFunction) => {
  if (whitelistedIPs.has(req.ip)) {
    return next();
  }
  next();
};
