import { Notification } from '../models/Notification';
import { NotificationType } from '../types';
import { logger } from '../utils/logger';
import { emailService } from './emailService';
import { User } from '../models/User';

interface CreateNotificationOptions {
  recipientId: string;
  senderId?: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntity?: {
    type: string;
    id: string;
  };
  sendEmail?: boolean;
}

class NotificationService {
  async createNotification(options: CreateNotificationOptions): Promise<void> {
    try {
      // Create notification in database
      await Notification.create({
        recipient: options.recipientId,
        sender: options.senderId,
        type: options.type,
        title: options.title,
        message: options.message,
        relatedEntity: options.relatedEntity,
      });

      // Send email if requested
      if (options.sendEmail) {
        const recipient = await User.findById(options.recipientId);
        if (recipient && recipient.preferences.notifications.email) {
          await emailService.sendEmail({
            to: recipient.email,
            subject: options.title,
            html: `<p>${options.message}</p>`,
          });
        }
      }

      logger.info(`Notification created for user ${options.recipientId}: ${options.title}`);
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { isRead: true, readAt: new Date() }
      );
    } catch (error) {
      logger.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    try {
      await Notification.updateMany(
        { recipient: userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await Notification.countDocuments({ recipient: userId, isRead: false });
    } catch (error) {
      logger.error('Error getting unread count:', error);
      throw error;
    }
  }

  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ notifications: any[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        Notification.find({ recipient: userId })
          .populate('sender', 'firstName lastName username avatar')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Notification.countDocuments({ recipient: userId }),
      ]);

      return { notifications, total };
    } catch (error) {
      logger.error('Error getting user notifications:', error);
      throw error;
    }
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      await Notification.findOneAndDelete({ _id: notificationId, recipient: userId });
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
