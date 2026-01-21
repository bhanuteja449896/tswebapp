import { Response, NextFunction } from 'express';
import { Task } from '../models/Task';
import { Project } from '../models/Project';
import { User } from '../models/User';
import { AuthRequest } from '../types/express';
import { AppError } from '../middleware/auth';
import { buildQuery } from '../utils/queryBuilder';
import { activityService } from '../services/activityService';
import { notificationService } from '../services/notificationService';
import { ActivityAction, ActivityTargetType, NotificationType } from '../types';
import { logger } from '../utils/logger';

export class TaskController {
  async createTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        title,
        description,
        status,
        priority,
        assignee,
        project: projectId,
        tags,
        dueDate,
        startDate,
        estimatedHours,
        parentTask,
      } = req.body;

      // Verify project exists and user has access
      const project = await Project.findById(projectId);
      if (!project) {
        throw new AppError('Project not found', 404);
      }

      const isMember = project.members.some((m) => m.user.toString() === req.user!.id);
      const isOwner = project.owner.toString() === req.user!.id;

      if (!isMember && !isOwner) {
        throw new AppError('Not authorized to create tasks in this project', 403);
      }

      const task = await Task.create({
        title,
        description,
        status,
        priority,
        assignee,
        reporter: req.user!.id,
        project: projectId,
        tags,
        dueDate,
        startDate,
        estimatedHours,
        parentTask,
      });

      // Populate references
      await task.populate([
        { path: 'assignee', select: 'firstName lastName username avatar' },
        { path: 'reporter', select: 'firstName lastName username avatar' },
        { path: 'project', select: 'name key' },
      ]);

      // Log activity
      await activityService.createActivity({
        actorId: req.user!.id,
        action: ActivityAction.CREATED,
        targetType: ActivityTargetType.TASK,
        targetId: task._id.toString(),
        projectId: projectId,
        taskId: task._id.toString(),
      });

      // Send notification to assignee
      if (assignee && assignee !== req.user!.id) {
        await notificationService.createNotification({
          recipientId: assignee,
          senderId: req.user!.id,
          type: NotificationType.TASK_ASSIGNED,
          title: 'New Task Assigned',
          message: `You have been assigned: ${title}`,
          relatedEntity: {
            type: 'task',
            id: task._id.toString(),
          },
          sendEmail: true,
        });
      }

      logger.info(`Task created: ${task.title} in project ${projectId}`);

      res.status(201).json({
        success: true,
        data: { task },
        message: 'Task created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllTasks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        priority,
        assignee,
        project,
        tags,
        sortBy,
        sortOrder,
      } = req.query;

      const queryBuilder = buildQuery(Task).paginate({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      });

      // Build filter object
      const filters: any = {};
      if (search) filters.search = search;
      if (status) filters.status = status;
      if (priority) filters.priority = priority;
      if (assignee) filters.assignee = assignee;
      if (project) filters.project = project;
      if (tags) filters.tags = (tags as string).split(',');

      queryBuilder
        .filter(filters)
        .populate(['assignee', 'reporter', 'project']);

      const { data: tasks, total } = await queryBuilder.execute();

      res.json({
        success: true,
        data: { tasks },
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getTaskById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const task = await Task.findById(id)
        .populate('assignee', 'firstName lastName username avatar email')
        .populate('reporter', 'firstName lastName username avatar email')
        .populate('project', 'name key owner members')
        .populate('parentTask', 'title status')
        .populate('subtasks', 'title status')
        .populate('watchers', 'firstName lastName username avatar');

      if (!task) {
        throw new AppError('Task not found', 404);
      }

      // Check if user has access
      const project = task.project as any;
      const isMember = project.members.some((m: any) => m.user.toString() === req.user!.id);
      const isOwner = project.owner.toString() === req.user!.id;

      if (!isMember && !isOwner && project.visibility === 'private') {
        throw new AppError('Not authorized to view this task', 403);
      }

      res.json({
        success: true,
        data: { task },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      const task = await Task.findById(id).populate('project');

      if (!task) {
        throw new AppError('Task not found', 404);
      }

      // Check if user has access
      const project = task.project as any;
      const isMember = project.members.some((m: any) => m.user.toString() === req.user!.id);
      const isOwner = project.owner.toString() === req.user!.id;

      if (!isMember && !isOwner) {
        throw new AppError('Not authorized to update this task', 403);
      }

      // Track changes for activity log
      const changes: any = {};

      // Update fields
      const allowedUpdates = [
        'title',
        'description',
        'status',
        'priority',
        'assignee',
        'tags',
        'dueDate',
        'startDate',
        'estimatedHours',
        'actualHours',
      ];

      for (const key of allowedUpdates) {
        if (updates[key] !== undefined && updates[key] !== (task as any)[key]) {
          changes[key] = { from: (task as any)[key], to: updates[key] };
          (task as any)[key] = updates[key];
        }
      }

      await task.save();

      // Log activity based on what changed
      if (changes.status) {
        await activityService.createActivity({
          actorId: req.user!.id,
          action: ActivityAction.STATUS_CHANGED,
          targetType: ActivityTargetType.TASK,
          targetId: task._id.toString(),
          projectId: project._id.toString(),
          taskId: task._id.toString(),
          metadata: { from: changes.status.from, to: changes.status.to },
        });
      }

      if (changes.assignee) {
        await activityService.createActivity({
          actorId: req.user!.id,
          action: ActivityAction.ASSIGNED,
          targetType: ActivityTargetType.TASK,
          targetId: task._id.toString(),
          projectId: project._id.toString(),
          taskId: task._id.toString(),
          metadata: { assignee: changes.assignee.to },
        });

        // Notify new assignee
        if (changes.assignee.to && changes.assignee.to !== req.user!.id) {
          await notificationService.createNotification({
            recipientId: changes.assignee.to,
            senderId: req.user!.id,
            type: NotificationType.TASK_ASSIGNED,
            title: 'Task Assigned',
            message: `You have been assigned: ${task.title}`,
            relatedEntity: {
              type: 'task',
              id: task._id.toString(),
            },
          });
        }
      }

      if (Object.keys(changes).length > 0) {
        await activityService.createActivity({
          actorId: req.user!.id,
          action: ActivityAction.UPDATED,
          targetType: ActivityTargetType.TASK,
          targetId: task._id.toString(),
          projectId: project._id.toString(),
          taskId: task._id.toString(),
          metadata: { changes },
        });
      }

      logger.info(`Task updated: ${task.title}`);

      res.json({
        success: true,
        data: { task },
        message: 'Task updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const task = await Task.findById(id).populate('project');

      if (!task) {
        throw new AppError('Task not found', 404);
      }

      // Check if user has access
      const project = task.project as any;
      const isOwner = project.owner.toString() === req.user!.id;
      const isReporter = task.reporter.toString() === req.user!.id;

      if (!isOwner && !isReporter && req.user!.role !== 'admin') {
        throw new AppError('Not authorized to delete this task', 403);
      }

      await task.deleteOne();

      logger.info(`Task deleted: ${task.title}`);

      res.json({
        success: true,
        message: 'Task deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async assignTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { assigneeId } = req.body;

      const task = await Task.findById(id).populate('project');

      if (!task) {
        throw new AppError('Task not found', 404);
      }

      // Verify assignee exists
      if (assigneeId) {
        const assignee = await User.findById(assigneeId);
        if (!assignee) {
          throw new AppError('Assignee not found', 404);
        }
      }

      const previousAssignee = task.assignee;
      task.assignee = assigneeId;
      await task.save();

      // Log activity
      await activityService.createActivity({
        actorId: req.user!.id,
        action: ActivityAction.ASSIGNED,
        targetType: ActivityTargetType.TASK,
        targetId: task._id.toString(),
        projectId: (task.project as any)._id.toString(),
        taskId: task._id.toString(),
        metadata: { from: previousAssignee, to: assigneeId },
      });

      // Notify new assignee
      if (assigneeId && assigneeId !== req.user!.id) {
        await notificationService.createNotification({
          recipientId: assigneeId,
          senderId: req.user!.id,
          type: NotificationType.TASK_ASSIGNED,
          title: 'Task Assigned',
          message: `You have been assigned: ${task.title}`,
          relatedEntity: {
            type: 'task',
            id: task._id.toString(),
          },
          sendEmail: true,
        });
      }

      res.json({
        success: true,
        data: { task },
        message: 'Task assigned successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async addWatcher(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      const task = await Task.findById(id);

      if (!task) {
        throw new AppError('Task not found', 404);
      }

      if (task.watchers.includes(userId)) {
        throw new AppError('User is already watching this task', 400);
      }

      task.watchers.push(userId);
      await task.save();

      res.json({
        success: true,
        data: { task },
        message: 'Watcher added successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async removeWatcher(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, userId } = req.params;

      const task = await Task.findById(id);

      if (!task) {
        throw new AppError('Task not found', 404);
      }

      task.watchers = task.watchers.filter((w) => w !== userId);
      await task.save();

      res.json({
        success: true,
        data: { task },
        message: 'Watcher removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async addAttachment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!req.file) {
        throw new AppError('No file uploaded', 400);
      }

      const task = await Task.findById(id);

      if (!task) {
        throw new AppError('Task not found', 404);
      }

      task.attachments.push({
        _id: require('mongoose').Types.ObjectId().toString(),
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        uploadedBy: req.user!.id,
        uploadedAt: new Date(),
      });

      await task.save();

      res.json({
        success: true,
        data: { task },
        message: 'Attachment added successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteAttachment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, attachmentId } = req.params;

      const task = await Task.findById(id);

      if (!task) {
        throw new AppError('Task not found', 404);
      }

      task.attachments = task.attachments.filter((a) => a._id !== attachmentId);
      await task.save();

      res.json({
        success: true,
        data: { task },
        message: 'Attachment deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const taskController = new TaskController();
