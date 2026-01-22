import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types/express';
import User from '../models/User';
import { logger } from '../utils/logger';

/* =========================
   AUTHENTICATE
========================= */

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader) {
      token = authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : authHeader;
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'No token provided',
      });
      return;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    ) as { userId: string; role: string };

    const user = await User.findById(decoded.userId);

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    req.user = {
      userId: decoded.userId,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }
};

/* =========================
   AUTHORIZE
========================= */

export const authorize =
  (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
      return;
    }

    next();
  };

/* =========================
   ERROR HANDLER
========================= */

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error({
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
  });

  // Validation error
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: Object.values(err.errors)
        .map((e: any) => e.message)
        .join(', '),
    });
    return;
  }

  // Duplicate key
  if (err.code === 11000) {
    res.status(400).json({
      success: false,
      error: 'Duplicate field value',
    });
    return;
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
    return;
  }

  // Production-safe response
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
    return;
  }

  // Default
  res.status(500).json({
    success: false,
    error: err.message || 'Server Error',
  });
};
