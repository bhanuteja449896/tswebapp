import { notificationService } from '../../../src/services/notificationService';
import Notification from '../../../src/models/Notification';
import User from '../../../src/models/User';
import { NotificationType } from '../../../src/types';

jest.mock('../../../src/models/Notification');
jest.mock('../../../src/models/User');

describe('Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create a new notification', async () => {
      const notificationData = {
        userId: 'user-id-123',
        type: NotificationType.TASK_ASSIGNED,
        title: 'Task Assigned',
        message: 'You have been assigned a new task',
        relatedTo: 'task-id-123',
      };

      const mockNotification = {
        _id: 'notification-id',
        ...notificationData,
        save: jest.fn().mockResolvedValue(this),
      };

      (Notification.create as jest.Mock).mockResolvedValue(mockNotification);

      const result = await notificationService.createNotification(notificationData);

      expect(Notification.create).toHaveBeenCalledWith(notificationData);
      expect(result).toEqual(mockNotification);
    });

    it('should throw error if userId is missing', async () => {
      const notificationData = {
        type: NotificationType.TASK_ASSIGNED,
        title: 'Task Assigned',
        message: 'You have been assigned a new task',
      };

      await expect(
        notificationService.createNotification(notificationData as any)
      ).rejects.toThrow();
    });

    it('should handle notification type correctly', async () => {
      const notificationData = {
        userId: 'user-id-123',
        type: NotificationType.COMMENT_ADDED,
        title: 'New Comment',
        message: 'Someone commented on your task',
        relatedTo: 'task-id-123',
      };

      const mockNotification = {
        _id: 'notification-id',
        ...notificationData,
      };

      (Notification.create as jest.Mock).mockResolvedValue(mockNotification);

      const result = await notificationService.createNotification(notificationData);

      expect(result.type).toBe(NotificationType.COMMENT_ADDED);
    });

    it('should include metadata if provided', async () => {
      const notificationData = {
        userId: 'user-id-123',
        type: NotificationType.TASK_UPDATED,
        title: 'Task Updated',
        message: 'Task status changed',
        relatedTo: 'task-id-123',
        metadata: {
          previousStatus: 'todo',
          newStatus: 'in_progress',
        },
      };

      const mockNotification = {
        _id: 'notification-id',
        ...notificationData,
      };

      (Notification.create as jest.Mock).mockResolvedValue(mockNotification);

      const result = await notificationService.createNotification(notificationData);

      expect(result.metadata).toEqual(notificationData.metadata);
    });
  });

  describe('getNotifications', () => {
    it('should retrieve notifications for a user', async () => {
      const userId = 'user-id-123';
      const mockNotifications = [
        {
          _id: 'notification-1',
          userId,
          type: NotificationType.TASK_ASSIGNED,
          title: 'Task Assigned',
          isRead: false,
        },
        {
          _id: 'notification-2',
          userId,
          type: NotificationType.COMMENT_ADDED,
          title: 'New Comment',
          isRead: true,
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockResolvedValue(mockNotifications),
      };

      (Notification.find as jest.Mock).mockReturnValue(mockQuery);

      const result = await notificationService.getNotifications(userId, {
        page: 1,
        limit: 20,
      });

      expect(Notification.find).toHaveBeenCalledWith({ userId });
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockNotifications);
    });

    it('should filter by read status', async () => {
      const userId = 'user-id-123';
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockResolvedValue([]),
      };

      (Notification.find as jest.Mock).mockReturnValue(mockQuery);

      await notificationService.getNotifications(userId, {
        page: 1,
        limit: 20,
        isRead: false,
      });

      expect(Notification.find).toHaveBeenCalledWith({
        userId,
        isRead: false,
      });
    });

    it('should filter by notification type', async () => {
      const userId = 'user-id-123';
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockResolvedValue([]),
      };

      (Notification.find as jest.Mock).mockReturnValue(mockQuery);

      await notificationService.getNotifications(userId, {
        page: 1,
        limit: 20,
        type: NotificationType.TASK_ASSIGNED,
      });

      expect(Notification.find).toHaveBeenCalledWith({
        userId,
        type: NotificationType.TASK_ASSIGNED,
      });
    });

    it('should handle pagination correctly', async () => {
      const userId = 'user-id-123';
      const page = 2;
      const limit = 10;

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockResolvedValue([]),
      };

      (Notification.find as jest.Mock).mockReturnValue(mockQuery);

      await notificationService.getNotifications(userId, { page, limit });

      expect(mockQuery.skip).toHaveBeenCalledWith((page - 1) * limit);
      expect(mockQuery.limit).toHaveBeenCalledWith(limit);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const notificationId = 'notification-id-123';
      const userId = 'user-id-123';

      const mockNotification = {
        _id: notificationId,
        userId,
        isRead: false,
        save: jest.fn().mockResolvedValue(this),
      };

      (Notification.findOne as jest.Mock).mockResolvedValue(mockNotification);

      await notificationService.markAsRead(notificationId, userId);

      expect(Notification.findOne).toHaveBeenCalledWith({
        _id: notificationId,
        userId,
      });
      expect(mockNotification.isRead).toBe(true);
      expect(mockNotification.save).toHaveBeenCalled();
    });

    it('should throw error if notification not found', async () => {
      const notificationId = 'notification-id-123';
      const userId = 'user-id-123';

      (Notification.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        notificationService.markAsRead(notificationId, userId)
      ).rejects.toThrow('Notification not found');
    });

    it('should not allow marking other users notifications', async () => {
      const notificationId = 'notification-id-123';
      const userId = 'user-id-123';
      const otherUserId = 'other-user-id';

      (Notification.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        notificationService.markAsRead(notificationId, otherUserId)
      ).rejects.toThrow();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for a user', async () => {
      const userId = 'user-id-123';

      (Notification.updateMany as jest.Mock).mockResolvedValue({
        modifiedCount: 5,
      });

      const result = await notificationService.markAllAsRead(userId);

      expect(Notification.updateMany).toHaveBeenCalledWith(
        { userId, isRead: false },
        { $set: { isRead: true } }
      );
      expect(result.modifiedCount).toBe(5);
    });

    it('should return 0 if no unread notifications', async () => {
      const userId = 'user-id-123';

      (Notification.updateMany as jest.Mock).mockResolvedValue({
        modifiedCount: 0,
      });

      const result = await notificationService.markAllAsRead(userId);

      expect(result.modifiedCount).toBe(0);
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      const notificationId = 'notification-id-123';
      const userId = 'user-id-123';

      const mockNotification = {
        _id: notificationId,
        userId,
      };

      (Notification.findOneAndDelete as jest.Mock).mockResolvedValue(
        mockNotification
      );

      await notificationService.deleteNotification(notificationId, userId);

      expect(Notification.findOneAndDelete).toHaveBeenCalledWith({
        _id: notificationId,
        userId,
      });
    });

    it('should throw error if notification not found', async () => {
      const notificationId = 'notification-id-123';
      const userId = 'user-id-123';

      (Notification.findOneAndDelete as jest.Mock).mockResolvedValue(null);

      await expect(
        notificationService.deleteNotification(notificationId, userId)
      ).rejects.toThrow('Notification not found');
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      const userId = 'user-id-123';

      (Notification.countDocuments as jest.Mock).mockResolvedValue(10);

      const count = await notificationService.getUnreadCount(userId);

      expect(Notification.countDocuments).toHaveBeenCalledWith({
        userId,
        isRead: false,
      });
      expect(count).toBe(10);
    });

    it('should return 0 if no unread notifications', async () => {
      const userId = 'user-id-123';

      (Notification.countDocuments as jest.Mock).mockResolvedValue(0);

      const count = await notificationService.getUnreadCount(userId);

      expect(count).toBe(0);
    });
  });

  describe('sendBulkNotifications', () => {
    it('should send notifications to multiple users', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      const notificationData = {
        type: NotificationType.SYSTEM_UPDATE,
        title: 'System Update',
        message: 'System will be down for maintenance',
      };

      const mockNotifications = userIds.map((userId) => ({
        _id: `notification-${userId}`,
        userId,
        ...notificationData,
      }));

      (Notification.insertMany as jest.Mock).mockResolvedValue(
        mockNotifications
      );

      const result = await notificationService.sendBulkNotifications(
        userIds,
        notificationData
      );

      expect(Notification.insertMany).toHaveBeenCalled();
      expect(result).toHaveLength(3);
    });

    it('should handle empty user list', async () => {
      const userIds: string[] = [];
      const notificationData = {
        type: NotificationType.SYSTEM_UPDATE,
        title: 'System Update',
        message: 'Test',
      };

      await expect(
        notificationService.sendBulkNotifications(userIds, notificationData)
      ).rejects.toThrow('No users provided');
    });

    it('should handle database errors gracefully', async () => {
      const userIds = ['user-1', 'user-2'];
      const notificationData = {
        type: NotificationType.SYSTEM_UPDATE,
        title: 'System Update',
        message: 'Test',
      };

      (Notification.insertMany as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        notificationService.sendBulkNotifications(userIds, notificationData)
      ).rejects.toThrow('Database error');
    });
  });

  describe('cleanupOldNotifications', () => {
    it('should delete notifications older than specified days', async () => {
      const days = 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      (Notification.deleteMany as jest.Mock).mockResolvedValue({
        deletedCount: 15,
      });

      const result = await notificationService.cleanupOldNotifications(days);

      expect(Notification.deleteMany).toHaveBeenCalledWith({
        createdAt: { $lt: expect.any(Date) },
        isRead: true,
      });
      expect(result.deletedCount).toBe(15);
    });

    it('should only delete read notifications', async () => {
      const days = 30;

      (Notification.deleteMany as jest.Mock).mockResolvedValue({
        deletedCount: 10,
      });

      await notificationService.cleanupOldNotifications(days);

      const callArgs = (Notification.deleteMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.isRead).toBe(true);
    });

    it('should handle case when no old notifications exist', async () => {
      const days = 30;

      (Notification.deleteMany as jest.Mock).mockResolvedValue({
        deletedCount: 0,
      });

      const result = await notificationService.cleanupOldNotifications(days);

      expect(result.deletedCount).toBe(0);
    });
  });

  describe('Notification Preferences', () => {
    it('should respect user notification preferences', async () => {
      const userId = 'user-id-123';
      const mockUser = {
        _id: userId,
        preferences: {
          notifications: {
            email: true,
            push: false,
          },
        },
      };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      const prefs = await notificationService.getUserPreferences(userId);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(prefs.email).toBe(true);
      expect(prefs.push).toBe(false);
    });

    it('should use default preferences if user has none set', async () => {
      const userId = 'user-id-123';
      const mockUser = {
        _id: userId,
        preferences: {},
      };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      const prefs = await notificationService.getUserPreferences(userId);

      expect(prefs).toBeDefined();
    });

    it('should update user notification preferences', async () => {
      const userId = 'user-id-123';
      const newPreferences = {
        email: false,
        push: true,
        inApp: true,
      };

      const mockUser = {
        _id: userId,
        preferences: {
          notifications: {},
        },
        save: jest.fn().mockResolvedValue(this),
      };

      (User.findById as jest.Mock).mockResolvedValue(mockUser);

      await notificationService.updateUserPreferences(userId, newPreferences);

      expect(mockUser.preferences.notifications).toEqual(newPreferences);
      expect(mockUser.save).toHaveBeenCalled();
    });
  });
});
