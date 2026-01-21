import { Task } from '../models/Task';
import { Project } from '../models/Project';
import { WorkLog } from '../models/WorkLog';
import { TaskStatus, TaskPriority } from '../types';
import { logger } from '../utils/logger';

interface TaskStats {
  totalTasks: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  completionRate: number;
  averageCompletionTime: number;
}

interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTasks: number;
  completedTasks: number;
}

interface UserProductivity {
  tasksCompleted: number;
  tasksInProgress: number;
  totalTimeLogged: number;
  averageTaskCompletionTime: number;
  tasksByPriority: Record<string, number>;
}

class AnalyticsService {
  async getTaskStats(projectId: string, startDate?: Date, endDate?: Date): Promise<TaskStats> {
    try {
      const query: any = { project: projectId };

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = startDate;
        if (endDate) query.createdAt.$lte = endDate;
      }

      const tasks = await Task.find(query);

      const byStatus: Record<string, number> = {};
      const byPriority: Record<string, number> = {};

      tasks.forEach((task) => {
        byStatus[task.status] = (byStatus[task.status] || 0) + 1;
        byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
      });

      const completedTasks = tasks.filter((t) => t.status === TaskStatus.DONE);
      const completionRate =
        tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;

      // Calculate average completion time
      let totalCompletionTime = 0;
      let completedCount = 0;

      completedTasks.forEach((task) => {
        if (task.createdAt && task.updatedAt) {
          const timeToComplete = task.updatedAt.getTime() - task.createdAt.getTime();
          totalCompletionTime += timeToComplete;
          completedCount++;
        }
      });

      const averageCompletionTime =
        completedCount > 0 ? totalCompletionTime / completedCount / (1000 * 60 * 60 * 24) : 0;

      return {
        totalTasks: tasks.length,
        byStatus,
        byPriority,
        completionRate: Math.round(completionRate * 100) / 100,
        averageCompletionTime: Math.round(averageCompletionTime * 100) / 100,
      };
    } catch (error) {
      logger.error('Error getting task stats:', error);
      throw error;
    }
  }

  async getProjectStats(userId: string): Promise<ProjectStats> {
    try {
      const projects = await Project.find({
        $or: [{ owner: userId }, { 'members.user': userId }],
      });

      const projectIds = projects.map((p) => p._id);
      const tasks = await Task.find({ project: { $in: projectIds } });

      const activeProjects = projects.filter((p) => p.isActive).length;
      const completedProjects = projects.filter((p) => p.status === 'completed').length;
      const completedTasks = tasks.filter((t) => t.status === TaskStatus.DONE).length;

      return {
        totalProjects: projects.length,
        activeProjects,
        completedProjects,
        totalTasks: tasks.length,
        completedTasks,
      };
    } catch (error) {
      logger.error('Error getting project stats:', error);
      throw error;
    }
  }

  async getUserProductivity(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<UserProductivity> {
    try {
      const query: any = { assignee: userId };

      if (startDate || endDate) {
        query.updatedAt = {};
        if (startDate) query.updatedAt.$gte = startDate;
        if (endDate) query.updatedAt.$lte = endDate;
      }

      const tasks = await Task.find(query);

      const tasksByPriority: Record<string, number> = {};
      let totalCompletionTime = 0;
      let completedCount = 0;

      tasks.forEach((task) => {
        tasksByPriority[task.priority] = (tasksByPriority[task.priority] || 0) + 1;

        if (task.status === TaskStatus.DONE && task.createdAt && task.updatedAt) {
          const timeToComplete = task.updatedAt.getTime() - task.createdAt.getTime();
          totalCompletionTime += timeToComplete;
          completedCount++;
        }
      });

      // Get work logs
      const workLogQuery: any = { user: userId };
      if (startDate || endDate) {
        workLogQuery.date = {};
        if (startDate) workLogQuery.date.$gte = startDate;
        if (endDate) workLogQuery.date.$lte = endDate;
      }

      const workLogs = await WorkLog.find(workLogQuery);
      const totalTimeLogged = workLogs.reduce((sum, log) => sum + log.timeSpent, 0);

      return {
        tasksCompleted: tasks.filter((t) => t.status === TaskStatus.DONE).length,
        tasksInProgress: tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length,
        totalTimeLogged,
        averageTaskCompletionTime:
          completedCount > 0
            ? Math.round((totalCompletionTime / completedCount / (1000 * 60 * 60 * 24)) * 100) /
              100
            : 0,
        tasksByPriority,
      };
    } catch (error) {
      logger.error('Error getting user productivity:', error);
      throw error;
    }
  }

  async getProjectVelocity(projectId: string, weeks: number = 4): Promise<any[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - weeks * 7);

      const tasks = await Task.find({
        project: projectId,
        status: TaskStatus.DONE,
        updatedAt: { $gte: startDate },
      });

      const velocityByWeek: Record<string, { completed: number; points: number }> = {};

      tasks.forEach((task) => {
        const weekStart = new Date(task.updatedAt);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!velocityByWeek[weekKey]) {
          velocityByWeek[weekKey] = { completed: 0, points: 0 };
        }

        velocityByWeek[weekKey].completed++;
        velocityByWeek[weekKey].points += task.estimatedHours || 0;
      });

      return Object.entries(velocityByWeek).map(([week, data]) => ({
        week,
        ...data,
      }));
    } catch (error) {
      logger.error('Error getting project velocity:', error);
      throw error;
    }
  }

  async getBurndownChart(projectId: string, sprintDays: number = 14): Promise<any[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - sprintDays);

      const tasks = await Task.find({ project: projectId });
      const totalPoints = tasks.reduce((sum, task) => sum + (task.estimatedHours || 0), 0);

      const burndown: any[] = [];
      let remainingPoints = totalPoints;

      for (let i = 0; i <= sprintDays; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);

        const completedByDate = await Task.find({
          project: projectId,
          status: TaskStatus.DONE,
          updatedAt: { $lte: date },
        });

        const pointsCompleted = completedByDate.reduce(
          (sum, task) => sum + (task.estimatedHours || 0),
          0
        );

        remainingPoints = totalPoints - pointsCompleted;

        burndown.push({
          date: date.toISOString().split('T')[0],
          ideal: totalPoints - (totalPoints / sprintDays) * i,
          actual: remainingPoints,
        });
      }

      return burndown;
    } catch (error) {
      logger.error('Error getting burndown chart:', error);
      throw error;
    }
  }
}

export const analyticsService = new AnalyticsService();
