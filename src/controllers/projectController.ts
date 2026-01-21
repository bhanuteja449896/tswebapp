import { Response, NextFunction } from 'express';
import { Project } from '../models/Project';
import { Task } from '../models/Task';
import { AuthRequest } from '../types/express';
import { AppError } from '../middleware/auth';
import { buildQuery } from '../utils/queryBuilder';
import { activityService } from '../services/activityService';
import { ActivityAction, ActivityTargetType, ProjectRole } from '../types';
import { logger } from '../utils/logger';

export class ProjectController {
  async createProject(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, description, key, visibility, startDate, endDate, budget, settings } =
        req.body;

      // Generate project key if not provided
      let projectKey = key;
      if (!projectKey) {
        projectKey = await Project.generateProjectKey(name);
      } else {
        // Check if key already exists
        const existing = await Project.findOne({ key: projectKey });
        if (existing) {
          throw new AppError('Project key already exists', 400);
        }
      }

      const project = await Project.create({
        name,
        description,
        key: projectKey,
        owner: req.user!.id,
        visibility,
        startDate,
        endDate,
        budget,
        settings,
      });

      // Log activity
      await activityService.createActivity({
        actorId: req.user!.id,
        action: ActivityAction.CREATED,
        targetType: ActivityTargetType.PROJECT,
        targetId: project._id.toString(),
        projectId: project._id.toString(),
      });

      logger.info(`Project created: ${project.name} (${project.key})`);

      res.status(201).json({
        success: true,
        data: { project },
        message: 'Project created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllProjects(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = 1, limit = 20, search, status, visibility, sortBy, sortOrder } = req.query;

      let query: any = {
        $or: [{ owner: req.user!.id }, { 'members.user': req.user!.id }],
      };

      if (status) {
        query.status = status;
      }

      if (visibility) {
        query.visibility = visibility;
      }

      if (search) {
        query.$text = { $search: search as string };
      }

      const sort: any = {};
      if (sortBy) {
        sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;
      } else {
        sort.updatedAt = -1;
      }

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const [projects, total] = await Promise.all([
        Project.find(query)
          .populate('owner', 'firstName lastName username avatar')
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit as string)),
        Project.countDocuments(query),
      ]);

      res.json({
        success: true,
        data: { projects },
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

  async getProjectById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const project = await Project.findById(id)
        .populate('owner', 'firstName lastName username avatar email')
        .populate('members.user', 'firstName lastName username avatar email');

      if (!project) {
        throw new AppError('Project not found', 404);
      }

      // Check if user has access
      const isMember = project.members.some(
        (m) => m.user.toString() === req.user!.id || (m.user as any)._id?.toString() === req.user!.id
      );
      const isOwner = project.owner.toString() === req.user!.id;

      if (!isMember && !isOwner && project.visibility === 'private') {
        throw new AppError('Not authorized to access this project', 403);
      }

      res.json({
        success: true,
        data: { project },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProject(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description, status, visibility, startDate, endDate, budget, settings } =
        req.body;

      const project = await Project.findById(id);

      if (!project) {
        throw new AppError('Project not found', 404);
      }

      // Check if user is owner or admin
      const member = project.members.find((m) => m.user.toString() === req.user!.id);
      const isOwner = project.owner.toString() === req.user!.id;
      const isAdmin = member?.role === ProjectRole.ADMIN;

      if (!isOwner && !isAdmin) {
        throw new AppError('Not authorized to update this project', 403);
      }

      if (name) project.name = name;
      if (description !== undefined) project.description = description;
      if (status) project.status = status;
      if (visibility) project.visibility = visibility;
      if (startDate) project.startDate = startDate;
      if (endDate) project.endDate = endDate;
      if (budget !== undefined) project.budget = budget;
      if (settings) project.settings = { ...project.settings, ...settings };

      await project.save();

      // Log activity
      await activityService.createActivity({
        actorId: req.user!.id,
        action: ActivityAction.UPDATED,
        targetType: ActivityTargetType.PROJECT,
        targetId: project._id.toString(),
        projectId: project._id.toString(),
        metadata: { changes: req.body },
      });

      logger.info(`Project updated: ${project.name} (${project.key})`);

      res.json({
        success: true,
        data: { project },
        message: 'Project updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteProject(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const project = await Project.findById(id);

      if (!project) {
        throw new AppError('Project not found', 404);
      }

      // Only owner can delete project
      if (project.owner.toString() !== req.user!.id) {
        throw new AppError('Only project owner can delete the project', 403);
      }

      // Delete all tasks in this project
      await Task.deleteMany({ project: id });

      await project.deleteOne();

      logger.info(`Project deleted: ${project.name} (${project.key})`);

      res.json({
        success: true,
        message: 'Project deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async addMember(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { userId, role = ProjectRole.MEMBER } = req.body;

      const project = await Project.findById(id);

      if (!project) {
        throw new AppError('Project not found', 404);
      }

      // Check if requester is owner or admin
      const member = project.members.find((m) => m.user.toString() === req.user!.id);
      const isOwner = project.owner.toString() === req.user!.id;
      const isAdmin = member?.role === ProjectRole.ADMIN;

      if (!isOwner && !isAdmin) {
        throw new AppError('Not authorized to add members', 403);
      }

      // Check if user is already a member
      const existingMember = project.members.find((m) => m.user.toString() === userId);
      if (existingMember) {
        throw new AppError('User is already a member', 400);
      }

      project.members.push({
        user: userId,
        role,
        joinedAt: new Date(),
      });

      await project.save();

      logger.info(`Member added to project ${project.key}: ${userId}`);

      res.json({
        success: true,
        data: { project },
        message: 'Member added successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async removeMember(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, userId } = req.params;

      const project = await Project.findById(id);

      if (!project) {
        throw new AppError('Project not found', 404);
      }

      // Check if requester is owner or admin
      const member = project.members.find((m) => m.user.toString() === req.user!.id);
      const isOwner = project.owner.toString() === req.user!.id;
      const isAdmin = member?.role === ProjectRole.ADMIN;

      if (!isOwner && !isAdmin && req.user!.id !== userId) {
        throw new AppError('Not authorized to remove members', 403);
      }

      // Cannot remove owner
      if (project.owner.toString() === userId) {
        throw new AppError('Cannot remove project owner', 400);
      }

      project.members = project.members.filter((m) => m.user.toString() !== userId);

      await project.save();

      logger.info(`Member removed from project ${project.key}: ${userId}`);

      res.json({
        success: true,
        data: { project },
        message: 'Member removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async updateMemberRole(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, userId } = req.params;
      const { role } = req.body;

      const project = await Project.findById(id);

      if (!project) {
        throw new AppError('Project not found', 404);
      }

      // Only owner can change roles
      if (project.owner.toString() !== req.user!.id) {
        throw new AppError('Only project owner can change member roles', 403);
      }

      const member = project.members.find((m) => m.user.toString() === userId);
      if (!member) {
        throw new AppError('User is not a member of this project', 404);
      }

      member.role = role;
      await project.save();

      logger.info(`Member role updated in project ${project.key}: ${userId} -> ${role}`);

      res.json({
        success: true,
        data: { project },
        message: 'Member role updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getProjectMembers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const project = await Project.findById(id).populate(
        'members.user',
        'firstName lastName username email avatar'
      );

      if (!project) {
        throw new AppError('Project not found', 404);
      }

      // Check access
      const isMember = project.members.some((m) => m.user.toString() === req.user!.id);
      const isOwner = project.owner.toString() === req.user!.id;

      if (!isMember && !isOwner && project.visibility === 'private') {
        throw new AppError('Not authorized to view project members', 403);
      }

      res.json({
        success: true,
        data: { members: project.members },
      });
    } catch (error) {
      next(error);
    }
  }

  async getProjectTasks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20, status, priority, assignee } = req.query;

      const project = await Project.findById(id);

      if (!project) {
        throw new AppError('Project not found', 404);
      }

      // Check access
      const isMember = project.members.some((m) => m.user.toString() === req.user!.id);
      const isOwner = project.owner.toString() === req.user!.id;

      if (!isMember && !isOwner && project.visibility === 'private') {
        throw new AppError('Not authorized to view project tasks', 403);
      }

      const query: any = { project: id };
      if (status) query.status = status;
      if (priority) query.priority = priority;
      if (assignee) query.assignee = assignee;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const [tasks, total] = await Promise.all([
        Task.find(query)
          .populate('assignee', 'firstName lastName username avatar')
          .populate('reporter', 'firstName lastName username avatar')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit as string)),
        Task.countDocuments(query),
      ]);

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

  async getProjectStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const project = await Project.findById(id);

      if (!project) {
        throw new AppError('Project not found', 404);
      }

      // Check access
      const isMember = project.members.some((m) => m.user.toString() === req.user!.id);
      const isOwner = project.owner.toString() === req.user!.id;

      if (!isMember && !isOwner) {
        throw new AppError('Not authorized to view project stats', 403);
      }

      const [totalTasks, tasksByStatus, tasksByPriority, overdueTasks] = await Promise.all([
        Task.countDocuments({ project: id }),
        Task.aggregate([
          { $match: { project: project._id } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        Task.aggregate([
          { $match: { project: project._id } },
          { $group: { _id: '$priority', count: { $sum: 1 } } },
        ]),
        Task.countDocuments({
          project: id,
          dueDate: { $lt: new Date() },
          status: { $nin: ['done', 'archived'] },
        }),
      ]);

      const stats = {
        totalTasks,
        byStatus: tasksByStatus.reduce(
          (acc, item) => {
            acc[item._id] = item.count;
            return acc;
          },
          {} as Record<string, number>
        ),
        byPriority: tasksByPriority.reduce(
          (acc, item) => {
            acc[item._id] = item.count;
            return acc;
          },
          {} as Record<string, number>
        ),
        overdueTasks,
        memberCount: project.members.length,
      };

      res.json({
        success: true,
        data: { stats },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const projectController = new ProjectController();
