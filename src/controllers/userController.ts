import { Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Project } from '../models/Project';
import { Task } from '../models/Task';
import { AuthRequest } from '../types/express';
import { AppError } from '../middleware/auth';
import { buildQuery } from '../utils/queryBuilder';
import { logger } from '../utils/logger';

export class UserController {
  async getAllUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page = 1, limit = 20, search, role, sortBy, sortOrder } = req.query;

      const queryBuilder = buildQuery(User)
        .paginate({
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          sortBy: sortBy as string,
          sortOrder: sortOrder as 'asc' | 'desc',
        })
        .select('-password');

      if (search) {
        queryBuilder.filter({ search: search as string });
      }

      if (role) {
        queryBuilder.filter({ status: role as string });
      }

      const { data: users, total } = await queryBuilder.execute();

      res.json({
        success: true,
        data: { users },
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

  async getUserById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const user = await User.findById(id).select('-password');

      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { firstName, lastName, role, isEmailVerified } = req.body;

      // Only admins can update other users
      if (req.user!.role !== 'admin' && req.user!.id !== id) {
        throw new AppError('Not authorized to update this user', 403);
      }

      const user = await User.findById(id);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;

      // Only admins can change roles
      if (role && req.user!.role === 'admin') {
        user.role = role;
      }

      if (typeof isEmailVerified !== 'undefined' && req.user!.role === 'admin') {
        user.isEmailVerified = isEmailVerified;
      }

      await user.save();

      logger.info(`User updated: ${user.email}`);

      res.json({
        success: true,
        data: { user },
        message: 'User updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      // Only admins can delete users
      if (req.user!.role !== 'admin') {
        throw new AppError('Not authorized to delete users', 403);
      }

      const user = await User.findById(id);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Don't allow deleting yourself
      if (user._id.toString() === req.user!.id) {
        throw new AppError('Cannot delete your own account', 400);
      }

      await user.deleteOne();

      logger.info(`User deleted: ${user.email}`);

      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const [projects, ownedProjects, assignedTasks, reportedTasks] = await Promise.all([
        Project.find({ 'members.user': id }).countDocuments(),
        Project.find({ owner: id }).countDocuments(),
        Task.find({ assignee: id }).countDocuments(),
        Task.find({ reporter: id }).countDocuments(),
      ]);

      const completedTasks = await Task.find({
        assignee: id,
        status: 'done',
      }).countDocuments();

      res.json({
        success: true,
        data: {
          stats: {
            projects,
            ownedProjects,
            assignedTasks,
            reportedTasks,
            completedTasks,
            completionRate:
              assignedTasks > 0 ? Math.round((completedTasks / assignedTasks) * 100) : 0,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async searchUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { query, limit = 10 } = req.query;

      if (!query || typeof query !== 'string') {
        throw new AppError('Search query is required', 400);
      }

      const users = await User.find({
        $or: [
          { firstName: { $regex: query, $options: 'i' } },
          { lastName: { $regex: query, $options: 'i' } },
          { username: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
        ],
      })
        .select('firstName lastName username email avatar')
        .limit(parseInt(limit as string));

      res.json({
        success: true,
        data: { users },
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserProjects(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const [projects, total] = await Promise.all([
        Project.find({
          $or: [{ owner: id }, { 'members.user': id }],
        })
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(parseInt(limit as string)),
        Project.countDocuments({
          $or: [{ owner: id }, { 'members.user': id }],
        }),
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

  async getUserTasks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20, status, priority } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const query: any = { assignee: id };
      if (status) query.status = status;
      if (priority) query.priority = priority;

      const [tasks, total] = await Promise.all([
        Task.find(query)
          .populate('project', 'name key')
          .populate('reporter', 'firstName lastName username')
          .sort({ dueDate: 1, priority: -1 })
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
}

export const userController = new UserController();
