import { Activity } from '../models/Activity';
import { ActivityAction, ActivityTargetType } from '../types';
import { logger } from '../utils/logger';

interface CreateActivityOptions {
  actorId: string;
  action: ActivityAction;
  targetType: ActivityTargetType;
  targetId: string;
  metadata?: Record<string, any>;
  projectId?: string;
  taskId?: string;
}

class ActivityService {
  async createActivity(options: CreateActivityOptions): Promise<void> {
    try {
      await Activity.create({
        actor: options.actorId,
        action: options.action,
        target: {
          type: options.targetType,
          id: options.targetId,
        },
        metadata: options.metadata || {},
        project: options.projectId,
        task: options.taskId,
      });

      logger.info(
        `Activity created: ${options.action} on ${options.targetType} by ${options.actorId}`
      );
    } catch (error) {
      logger.error('Error creating activity:', error);
      throw error;
    }
  }

  async getProjectActivities(
    projectId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ activities: any[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      const [activities, total] = await Promise.all([
        Activity.find({ project: projectId })
          .populate('actor', 'firstName lastName username avatar')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Activity.countDocuments({ project: projectId }),
      ]);

      return { activities, total };
    } catch (error) {
      logger.error('Error getting project activities:', error);
      throw error;
    }
  }

  async getTaskActivities(
    taskId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ activities: any[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      const [activities, total] = await Promise.all([
        Activity.find({ task: taskId })
          .populate('actor', 'firstName lastName username avatar')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Activity.countDocuments({ task: taskId }),
      ]);

      return { activities, total };
    } catch (error) {
      logger.error('Error getting task activities:', error);
      throw error;
    }
  }

  async getUserActivities(
    userId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ activities: any[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      const [activities, total] = await Promise.all([
        Activity.find({ actor: userId })
          .populate('project', 'name key')
          .populate('task', 'title')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Activity.countDocuments({ actor: userId }),
      ]);

      return { activities, total };
    } catch (error) {
      logger.error('Error getting user activities:', error);
      throw error;
    }
  }

  async getActivityStats(projectId: string, days: number = 30): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const stats = await Activity.aggregate([
        {
          $match: {
            project: projectId,
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              action: '$action',
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { '_id.date': 1 },
        },
      ]);

      return stats;
    } catch (error) {
      logger.error('Error getting activity stats:', error);
      throw error;
    }
  }
}

export const activityService = new ActivityService();
