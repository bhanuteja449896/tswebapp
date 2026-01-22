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

interface PaginatedResult<T> {
  activities: T[];
  total: number;
}

class ActivityService {
  /* =========================
     Helpers
  ========================= */

  private getPagination(page: number, limit: number) {
    return {
      skip: (page - 1) * limit,
      limit,
    };
  }

  private logAndThrow(message: string, error: unknown): never {
    logger.error(message, error);
    throw error;
  }

  /* =========================
     Create Activity
  ========================= */

  async createActivity(options: CreateActivityOptions): Promise<void> {
    try {
      await Activity.create({
        actor: options.actorId,
        action: options.action,
        target: {
          type: options.targetType,
          id: options.targetId,
        },
        metadata: options.metadata ?? {},
        project: options.projectId,
        task: options.taskId,
      });

      logger.info(
        `Activity created: ${options.action} on ${options.targetType} by ${options.actorId}`
      );
    } catch (error) {
      this.logAndThrow('Error creating activity:', error);
    }
  }

  /* =========================
     Project Activities
  ========================= */

  async getProjectActivities(
    projectId: string,
    page = 1,
    limit = 50
  ): Promise<PaginatedResult<any>> {
    try {
      const { skip } = this.getPagination(page, limit);

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
      this.logAndThrow('Error getting project activities:', error);
    }
  }

  /* =========================
     Task Activities
  ========================= */

  async getTaskActivities(
    taskId: string,
    page = 1,
    limit = 50
  ): Promise<PaginatedResult<any>> {
    try {
      const { skip } = this.getPagination(page, limit);

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
      this.logAndThrow('Error getting task activities:', error);
    }
  }

  /* =========================
     User Activities
  ========================= */

  async getUserActivities(
    userId: string,
    page = 1,
    limit = 50
  ): Promise<PaginatedResult<any>> {
    try {
      const { skip } = this.getPagination(page, limit);

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
      this.logAndThrow('Error getting user activities:', error);
    }
  }

  /* =========================
     Activity Stats
  ========================= */

  async getActivityStats(projectId: string, days = 30): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      return await Activity.aggregate([
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
              date: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt',
                },
              },
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { '_id.date': 1 },
        },
      ]);
    } catch (error) {
      this.logAndThrow('Error getting activity stats:', error);
    }
  }
}

export const activityService = new ActivityService();
