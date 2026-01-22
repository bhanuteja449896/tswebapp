import { analyticsService } from '../../../src/services/analyticsService';
import { Task } from '../../../src/models/Task';
import { Project } from '../../../src/models/Project';
import { WorkLog } from '../../../src/models/WorkLog';
import { TaskStatus } from '../../../src/types';

jest.mock('../../../src/models/Task');
jest.mock('../../../src/models/Project');
jest.mock('../../../src/models/WorkLog');

describe('AnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTaskStats', () => {
    it('should return correct task statistics', async () => {
      (Task.find as jest.Mock).mockResolvedValue([
        {
          status: TaskStatus.DONE,
          priority: 'high',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-03'),
        },
        {
          status: TaskStatus.IN_PROGRESS,
          priority: 'medium',
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-04'),
        },
      ]);

      const result = await analyticsService.getTaskStats('project-1');

      expect(result.totalTasks).toBe(2);
      expect(result.byStatus.done).toBe(1);
      expect(result.byPriority.high).toBe(1);
      expect(result.completionRate).toBe(50);
    });
  });

  describe('getProjectStats', () => {
    it('should return project statistics for user', async () => {
      (Project.find as jest.Mock).mockResolvedValue([
        { _id: 'p1', isActive: true, status: 'active' },
        { _id: 'p2', isActive: false, status: 'completed' },
      ]);

      (Task.find as jest.Mock).mockResolvedValue([
        { status: TaskStatus.DONE },
        { status: TaskStatus.IN_PROGRESS },
      ]);

      const stats = await analyticsService.getProjectStats('user-1');

      expect(stats.totalProjects).toBe(2);
      expect(stats.activeProjects).toBe(1);
      expect(stats.completedProjects).toBe(1);
      expect(stats.completedTasks).toBe(1);
    });
  });

  describe('getUserProductivity', () => {
    it('should calculate user productivity metrics', async () => {
      (Task.find as jest.Mock).mockResolvedValue([
        {
          status: TaskStatus.DONE,
          priority: 'high',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-02'),
        },
        {
          status: TaskStatus.IN_PROGRESS,
          priority: 'low',
        },
      ]);

      (WorkLog.find as jest.Mock).mockResolvedValue([
        { timeSpent: 120 },
        { timeSpent: 60 },
      ]);

      const result = await analyticsService.getUserProductivity('user-1');

      expect(result.tasksCompleted).toBe(1);
      expect(result.tasksInProgress).toBe(1);
      expect(result.totalTimeLogged).toBe(180);
      expect(result.tasksByPriority.high).toBe(1);
    });
  });

  describe('getProjectVelocity', () => {
    it('should calculate velocity by week', async () => {
      (Task.find as jest.Mock).mockResolvedValue([
        {
          updatedAt: new Date(),
          estimatedHours: 5,
          status: TaskStatus.DONE,
        },
      ]);

      const velocity = await analyticsService.getProjectVelocity('project-1');

      expect(velocity.length).toBeGreaterThan(0);
      expect(velocity[0]).toHaveProperty('completed');
      expect(velocity[0]).toHaveProperty('points');
    });
  });

  describe('getBurndownChart', () => {
    it('should generate burndown data', async () => {
      (Task.find as jest.Mock).mockResolvedValueOnce([
        { estimatedHours: 10 },
        { estimatedHours: 5 },
      ]);

      (Task.find as jest.Mock).mockResolvedValue([]);

      const burndown = await analyticsService.getBurndownChart('project-1', 3);

      expect(burndown.length).toBe(4);
      expect(burndown[0]).toHaveProperty('ideal');
      expect(burndown[0]).toHaveProperty('actual');
    });
  });
});
