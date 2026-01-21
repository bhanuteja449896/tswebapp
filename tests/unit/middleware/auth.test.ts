import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import {
  authenticate,
  authorize,
  errorHandler,
} from '../../../src/middleware/auth';
import User from '../../../src/models/User';

jest.mock('jsonwebtoken');
jest.mock('../../../src/models/User');

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      user: undefined,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate valid token', async () => {
      const token = 'valid-token';
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      const decoded = { userId: 'user-123', role: 'user' };
      const mockUser = {
        _id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };

      (jwt.verify as jest.Mock).mockReturnValue(decoded);
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(jwt.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
      expect(mockRequest.user).toEqual({
        userId: 'user-123',
        email: 'user@example.com',
        role: 'user',
      });
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should return 401 if no token provided', async () => {
      mockRequest.headers = {};

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'No token provided',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', async () => {
      const token = 'invalid-token';
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if user not found', async () => {
      const token = 'valid-token';
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      const decoded = { userId: 'user-123', role: 'user' };

      (jwt.verify as jest.Mock).mockReturnValue(decoded);
      (User.findById as jest.Mock).mockResolvedValue(null);

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should handle token without Bearer prefix', async () => {
      const token = 'valid-token';
      mockRequest.headers = {
        authorization: token,
      };

      const decoded = { userId: 'user-123', role: 'user' };
      const mockUser = {
        _id: 'user-123',
        email: 'user@example.com',
        role: 'user',
      };

      (jwt.verify as jest.Mock).mockReturnValue(decoded);
      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await authenticate(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('authorize', () => {
    it('should authorize user with correct role', () => {
      const roles = ['admin', 'manager'];
      const middleware = authorize(...roles);

      mockRequest.user = { userId: 'user-123', role: 'admin' };

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });

    it('should return 403 if user does not have required role', () => {
      const roles = ['admin'];
      const middleware = authorize(...roles);

      mockRequest.user = { userId: 'user-123', role: 'user' };

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions',
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if user not authenticated', () => {
      const roles = ['admin'];
      const middleware = authorize(...roles);

      mockRequest.user = undefined;

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should allow multiple roles', () => {
      const roles = ['admin', 'manager', 'user'];
      const middleware = authorize(...roles);

      mockRequest.user = { userId: 'user-123', role: 'manager' };

      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('errorHandler', () => {
    it('should handle validation errors', () => {
      const error = {
        name: 'ValidationError',
        message: 'Validation failed',
        errors: {
          email: { message: 'Email is required' },
        },
      };

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String),
        })
      );
    });

    it('should handle duplicate key errors', () => {
      const error = {
        name: 'MongoError',
        code: 11000,
        message: 'Duplicate key error',
      };

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should handle JWT errors', () => {
      const error = {
        name: 'JsonWebTokenError',
        message: 'Invalid token',
      };

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should handle generic errors', () => {
      const error = new Error('Something went wrong');

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Something went wrong',
      });
    });

    it('should hide error details in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Database connection failed');

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
      });

      process.env.NODE_ENV = 'test';
    });
  });
});
