import { Request, Response } from 'express';
import {
  generalLimiter,
  authLimiter,
  uploadLimiter,
} from '../../../src/middleware/rateLimiter';

describe('Rate Limiter Middleware', () => {
  it('should export general rate limiter', () => {
    expect(generalLimiter).toBeDefined();
    expect(typeof generalLimiter).toBe('function');
  });

  it('should export auth rate limiter', () => {
    expect(authLimiter).toBeDefined();
    expect(typeof authLimiter).toBe('function');
  });

  it('should export upload rate limiter', () => {
    expect(uploadLimiter).toBeDefined();
    expect(typeof uploadLimiter).toBe('function');
  });

  it('should have correct configuration for general limiter', () => {
    const limiterConfig = (generalLimiter as any).options;
    expect(limiterConfig.windowMs).toBeDefined();
    expect(limiterConfig.max).toBeDefined();
  });

  it('should have stricter limits for auth limiter', () => {
    const generalConfig = (generalLimiter as any).options;
    const authConfig = (authLimiter as any).options;
    
    expect(authConfig.max).toBeLessThan(generalConfig.max);
  });
});
