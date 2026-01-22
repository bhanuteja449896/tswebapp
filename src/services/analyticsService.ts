import { Task } from '../models/Task';
import { Project } from '../models/Project';
import { WorkLog } from '../models/WorkLog';
import { TaskStatus } from '../types';
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
  /* =========================
     TASK ANALYTICS
  ========================= */

  async getTaskStats(
    projectId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<TaskStats> {
    try {
      const tasks = await Task.find(
        this.buildDateQuery({ project: projectId }, 'createdAt', startDate, endDate)
      );

      const byStatus: Record<string, number> = {};
      const byPriority: Record<string, number> = {};

      let completedCount = 0;
      let totalCompletionTime = 0;

      tasks.forEach((task) => {
        byStatus[task.status] = (byStatus[task.status] || 0) + 1;
        byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;

        if (task.status === TaskStatus.DONE && task.createdAt && task.updatedAt) {
          completedCount++;
          totalCompletionTime +=
            task.updatedAt.getTime() - task.createdAt.getTime();
        }
      });

      const completionRate =
        tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

      const avgCompletionTime =
        completedCount > 0
          ? totalCompletionTime / completedCount / 86400000
          : 0;

      return {
        totalTasks: tasks.length,
        byStatus,
        byPriority,
        completionRate: Number(completionRate.toFixed(2)),
        averageCompletionTime: Number(avgCompletionTime.toFixed(2)),
      };
    } catch (error) {
      logger.error('Error getting task stats:', error);
      throw error;
    }
  }

  /* =========================
     PROJECT ANALYTICS
  ========================= */

  async getProjectStats(userId: string): Promise<ProjectStats> {
    try {
      const projects = await Project.find({
        $or: [{ owner: userId }, { 'members.user': userId }],
      });

      const projectIds = projects.map((p) => p._id);
      const tasks = await Task.find({ project: { $in: projectIds } });

      return {
        totalProjects: projects.length,
        activeProjects: projects.filter((p) => p.isActive).length,
        completedProjects: projects.filter((p) => p.status === 'completed').length,
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t) => t.status === TaskStatus.DONE).length,
      };
    } catch (error) {
      logger.error('Error getting project stats:', error);
      throw error;
    }
  }

  /* =========================
     USER PRODUCTIVITY
  ========================= */

  async getUserProductivity(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<UserProductivity> {
    try {
      const tasks = await Task.find(
        this.buildDateQuery({ assignee: userId }, 'updatedAt', startDate, endDate)
      );

      const tasksByPriority: Record<string, number> = {};
      let completedCount = 0;
      let totalCompletionTime = 0;

      tasks.forEach((task) => {
        tasksByPriority[task.priority] =
          (tasksByPriority[task.priority] || 0) + 1;

        if (task.status === TaskStatus.DONE && task.createdAt && task.updatedAt) {
          completedCount++;
          totalCompletionTime +=
            task.updatedAt.getTime() - task.createdAt.getTime();
        }
      });

      const workLogs = await WorkLog.find(
        this.buildDateQuery({ user: userId }, 'date', startDate, endDate)
      );

      const totalTimeLogged = workLogs.reduce(
        (sum, log) => sum + log.timeSpent,
        0
      );

      return {
        tasksCompleted: completedCount,
        tasksInProgress: tasks.filter(
          (t) => t.status === TaskStatus.IN_PROGRESS
        ).length,
        totalTimeLogged,
        averageTaskCompletionTime:
          completedCount > 0
            ? Number(
                (
                  totalCompletionTime /
                  completedCount /
                  86400000
                ).toFixed(2)
              )
            : 0,
        tasksByPriority,
      };
    } catch (error) {
      logger.error('Error getting user productivity:', error);
      throw error;
    }
  }

  /* =========================
     VELOCITY & BURNDOWN
  ========================= */

  async getProjectVelocity(
    projectId: string,
    weeks: number = 4
  ): Promise<any[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - weeks * 7);

      const tasks = await Task.find({
        project: projectId,
        status: TaskStatus.DONE,
        updatedAt: { $gte: startDate },
      });

      const velocity: Record<string, { completed: number; points: number }> =
        {};

      tasks.forEach((task) => {
        const week = new Date(task.updatedAt);
        week.setDate(week.getDate() - week.getDay());
        const key = week.toISOString().split('T')[0];

        velocity[key] ??= { completed: 0, points: 0 };
        velocity[key].completed++;
        velocity[key].points += task.estimatedHours || 0;
      });

      return Object.entries(velocity).map(([week, data]) => ({
        week,
        ...data,
      }));
    } catch (error) {
      logger.error('Error getting project velocity:', error);
      throw error;
    }
  }

  async getBurndownChart(
    projectId: string,
    sprintDays: number = 14
  ): Promise<any[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - sprintDays);

      const tasks = await Task.find({ project: projectId });
      const totalPoints = tasks.reduce(
        (sum, t) => sum + (t.estimatedHours || 0),
        0
      );

      const burndown: any[] = [];

      for (let i = 0; i <= sprintDays; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);

        const completed = await Task.find({
          project: projectId,
          status: TaskStatus.DONE,
          updatedAt: { $lte: date },
        });

        const completedPoints = completed.reduce(
          (sum, t) => sum + (t.estimatedHours || 0),
          0
        );

        burndown.push({
          date: date.toISOString().split('T')[0],
          ideal: totalPoints - (totalPoints / sprintDays) * i,
          actual: totalPoints - completedPoints,
        });
      }

      return burndown;
    } catch (error) {
      logger.error('Error getting burndown chart:', error);
      throw error;
    }
  }

  /* =========================
     HELPERS
  ========================= */

  private buildDateQuery(
    base: any,
    field: string,
    startDate?: Date,
    endDate?: Date
  ) {
    if (!startDate && !endDate) return base;

    return {
      ...base,
      [field]: {
        ...(startDate && { $gte: startDate }),
        ...(endDate && { $lte: endDate }),
      },
    };
  }
}

export const analyticsService = new AnalyticsService();
