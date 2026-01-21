import { Request, Response } from 'express';
import { authController } from '../../../src/controllers/authController';
import User from '../../../src/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

jest.mock('../../../src/models/User');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('Auth Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      body: {},
      user: undefined,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
      };

      mockRequest.body = userData;

      (User.findOne as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (jwt.sign as jest.Mock).mockReturnValue('token');

      const mockUser = {
        _id: 'user-123',
        email: userData.email,
        save: jest.fn().mockResolvedValue(this),
      };

      (User.prototype.save as jest.Mock) = jest
        .fn()
        .mockResolvedValue(mockUser);

      await authController.register(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          token: 'token',
        }),
      });
    });

    it('should return 400 if email already exists', async () => {
      mockRequest.body = {
        email: 'existing@example.com',
        password: 'Password123!',
      };

      (User.findOne as jest.Mock).mockResolvedValue({
        _id: 'user-123',
        email: 'existing@example.com',
      });

      await authController.register(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should validate password strength', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'weak',
      };

      await authController.register(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      mockRequest.body = credentials;

      const mockUser = {
        _id: 'user-123',
        email: credentials.email,
        password: 'hashedPassword',
        role: 'user',
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('token');

      await authController.login(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          token: 'token',
        }),
      });
    });

    it('should return 401 for invalid email', async () => {
      mockRequest.body = {
        email: 'invalid@example.com',
        password: 'Password123!',
      };

      (User.findOne as jest.Mock).mockResolvedValue(null);

      await authController.login(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });

    it('should return 401 for invalid password', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      const mockUser = {
        _id: 'user-123',
        email: 'test@example.com',
        password: 'hashedPassword',
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await authController.login(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user', async () => {
      mockRequest.user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      };

      const mockUser = {
        _id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await authController.getCurrentUser(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { user: mockUser },
      });
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token', async () => {
      const refreshToken = 'valid-refresh-token';
      mockRequest.body = { refreshToken };

      const decoded = { userId: 'user-123' };

      (jwt.verify as jest.Mock).mockReturnValue(decoded);
      (jwt.sign as jest.Mock).mockReturnValue('new-token');

      await authController.refreshToken(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { token: 'new-token' },
      });
    });

    it('should return 401 for invalid refresh token', async () => {
      mockRequest.body = { refreshToken: 'invalid-token' };

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authController.refreshToken(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });

  describe('logout', () => {
    it('should logout user', async () => {
      await authController.logout(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out successfully',
      });
    });
  });

  describe('resetPassword', () => {
    it('should initiate password reset', async () => {
      mockRequest.body = { email: 'test@example.com' };

      const mockUser = {
        _id: 'user-123',
        email: 'test@example.com',
      };

      (User.findOne as jest.Mock).mockResolvedValue(mockUser);

      await authController.resetPassword(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: expect.any(String),
      });
    });
  });
});
