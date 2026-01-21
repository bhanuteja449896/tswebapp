import { Request, Response } from 'express';
import { userController } from '../../../src/controllers/userController';
import User from '../../../src/models/User';

jest.mock('../../../src/models/User');

describe('User Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any;

  beforeEach(() => {
    responseObject = {
      statusCode: 200,
      jsonData: {},
    };

    mockRequest = {
      params: {},
      query: {},
      body: {},
      user: { userId: 'user-123', role: 'user' },
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn((data) => {
        responseObject.jsonData = data;
        return mockResponse;
      }),
    };

    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    it('should return paginated list of users', async () => {
      const mockUsers = [
        {
          _id: 'user-1',
          email: 'user1@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'user',
        },
        {
          _id: 'user-2',
          email: 'user2@example.com',
          firstName: 'Jane',
          lastName: 'Smith',
          role: 'user',
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockUsers),
      };

      (User.find as jest.Mock).mockReturnValue(mockQuery);
      (User.countDocuments as jest.Mock).mockResolvedValue(2);

      mockRequest.query = { page: '1', limit: '20' };

      await userController.getAllUsers(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { users: mockUsers },
        pagination: expect.any(Object),
      });
    });

    it('should filter users by role', async () => {
      mockRequest.query = { role: 'admin' };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };

      (User.find as jest.Mock).mockReturnValue(mockQuery);
      (User.countDocuments as jest.Mock).mockResolvedValue(0);

      await userController.getAllUsers(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(User.find).toHaveBeenCalledWith({ role: 'admin' });
    });

    it('should search users by query', async () => {
      mockRequest.query = { search: 'john' };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };

      (User.find as jest.Mock).mockReturnValue(mockQuery);
      (User.countDocuments as jest.Mock).mockResolvedValue(0);

      await userController.getAllUsers(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(User.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.any(Array),
        })
      );
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      const mockUser = {
        _id: 'user-123',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockRequest.params = { id: 'user-123' };

      const mockQuery = {
        select: jest.fn().mockResolvedValue(mockUser),
      };

      (User.findById as jest.Mock).mockReturnValue(mockQuery);

      await userController.getUserById(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(User.findById).toHaveBeenCalledWith('user-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { user: mockUser },
      });
    });

    it('should return 404 if user not found', async () => {
      mockRequest.params = { id: 'invalid-id' };

      const mockQuery = {
        select: jest.fn().mockResolvedValue(null),
      };

      (User.findById as jest.Mock).mockReturnValue(mockQuery);

      await userController.getUserById(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
  });

  describe('searchUsers', () => {
    it('should search users by name or email', async () => {
      const mockUsers = [
        {
          _id: 'user-1',
          email: 'john@example.com',
          firstName: 'John',
        },
      ];

      mockRequest.query = { query: 'john' };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockUsers),
      };

      (User.find as jest.Mock).mockReturnValue(mockQuery);

      await userController.searchUsers(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { users: mockUsers },
      });
    });

    it('should return empty array if no query provided', async () => {
      mockRequest.query = {};

      await userController.searchUsers(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { users: [] },
      });
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const mockUser = {
        _id: 'user-123',
        email: 'user@example.com',
      };

      mockRequest.params = { id: 'user-123' };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      const mockStats = {
        projects: 5,
        assignedTasks: 23,
        completedTasks: 15,
      };

      // Mock aggregate functions for stats
      jest
        .spyOn(userController, 'calculateUserStats')
        .mockResolvedValue(mockStats);

      await userController.getUserStats(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { stats: expect.any(Object) },
      });
    });

    it('should return 404 if user not found', async () => {
      mockRequest.params = { id: 'invalid-id' };

      (User.findById as jest.Mock).mockResolvedValue(null);

      await userController.getUserStats(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateUser', () => {
    it('should update user profile', async () => {
      const mockUser = {
        _id: 'user-123',
        email: 'user@example.com',
        firstName: 'John',
        save: jest.fn().mockResolvedValue(this),
      };

      mockRequest.params = { id: 'user-123' };
      mockRequest.body = {
        firstName: 'John',
        lastName: 'Updated',
      };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await userController.updateUser(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockUser.save).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should not allow updating email', async () => {
      const mockUser = {
        _id: 'user-123',
        email: 'user@example.com',
      };

      mockRequest.params = { id: 'user-123' };
      mockRequest.body = {
        email: 'newemail@example.com',
      };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await userController.updateUser(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteUser', () => {
    it('should delete user (admin only)', async () => {
      mockRequest.user = { userId: 'admin-123', role: 'admin' };
      mockRequest.params = { id: 'user-123' };

      const mockUser = {
        _id: 'user-123',
        email: 'user@example.com',
      };

      (User.findByIdAndDelete as jest.Mock).mockResolvedValue(mockUser);

      await userController.deleteUser(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(User.findByIdAndDelete).toHaveBeenCalledWith('user-123');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User deleted successfully',
      });
    });

    it('should return 403 if not admin', async () => {
      mockRequest.user = { userId: 'user-123', role: 'user' };
      mockRequest.params = { id: 'other-user' };

      await userController.deleteUser(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });

    it('should not allow users to delete themselves', async () => {
      mockRequest.user = { userId: 'user-123', role: 'admin' };
      mockRequest.params = { id: 'user-123' };

      await userController.deleteUser(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });
});
