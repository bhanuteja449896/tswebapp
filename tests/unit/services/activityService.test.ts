import { activityService } from '../../../src/services/activityService';
import Activity from '../../../src/models/Activity';
import { ActivityAction } from '../../../src/types';

jest.mock('../../../src/models/Activity');

describe('Activity Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logActivity', () => {
    it('should log a new activity', async () => {
      const activityData = {
        userId: 'user-id-123',
        action: ActivityAction.TASK_CREATED,
        entityType: 'Task',
        entityId: 'task-id-123',
        metadata: {
          taskTitle: 'New Task',
        },
      };

      const mockActivity = {
        _id: 'activity-id',
        ...activityData,
        save: jest.fn().mockResolvedValue(this),
      };

      (Activity.create as jest.Mock).mockResolvedValue(mockActivity);

      const result = await activityService.logActivity(activityData);

      expect(Activity.create).toHaveBeenCalledWith(activityData);
      expect(result).toEqual(mockActivity);
    });

    it('should handle task creation activity', async () => {
      const activityData = {
        userId: 'user-id-123',
        action: ActivityAction.TASK_CREATED,
        entityType: 'Task',
        entityId: 'task-id-123',
        metadata: {
          taskTitle: 'Important Task',
          priority: 'high',
        },
      };

      const mockActivity = { _id: 'activity-id', ...activityData };
      (Activity.create as jest.Mock).mockResolvedValue(mockActivity);

      const result = await activityService.logActivity(activityData);

      expect(result.action).toBe(ActivityAction.TASK_CREATED);
      expect(result.metadata.taskTitle).toBe('Important Task');
    });

    it('should handle task update activity', async () => {
      const activityData = {
        userId: 'user-id-123',
        action: ActivityAction.TASK_UPDATED,
        entityType: 'Task',
        entityId: 'task-id-123',
        metadata: {
          changes: {
            status: { from: 'todo', to: 'in_progress' },
          },
        },
      };

      const mockActivity = { _id: 'activity-id', ...activityData };
      (Activity.create as jest.Mock).mockResolvedValue(mockActivity);

      const result = await activityService.logActivity(activityData);

      expect(result.metadata.changes.status.from).toBe('todo');
      expect(result.metadata.changes.status.to).toBe('in_progress');
    });

    it('should handle task assignment activity', async () => {
      const activityData = {
        userId: 'user-id-123',
        action: ActivityAction.TASK_ASSIGNED,
        entityType: 'Task',
        entityId: 'task-id-123',
        metadata: {
          assignedTo: 'assignee-id-456',
          assignedBy: 'user-id-123',
        },
      };

      const mockActivity = { _id: 'activity-id', ...activityData };
      (Activity.create as jest.Mock).mockResolvedValue(mockActivity);

      const result = await activityService.logActivity(activityData);

      expect(result.action).toBe(ActivityAction.TASK_ASSIGNED);
    });

    it('should throw error if required fields are missing', async () => {
      const invalidData = {
        userId: 'user-id-123',
        // Missing action and entityType
      };

      await expect(
        activityService.logActivity(invalidData as any)
      ).rejects.toThrow();
    });
  });

  describe('getActivities', () => {
    it('should retrieve activities with pagination', async () => {
      const mockActivities = [
        {
          _id: 'activity-1',
          userId: 'user-id-123',
          action: ActivityAction.TASK_CREATED,
          createdAt: new Date(),
        },
        {
          _id: 'activity-2',
          userId: 'user-id-123',
          action: ActivityAction.TASK_UPDATED,
          createdAt: new Date(),
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(mockActivities),
      };

      (Activity.find as jest.Mock).mockReturnValue(mockQuery);

      const result = await activityService.getActivities({
        page: 1,
        limit: 20,
      });

      expect(Activity.find).toHaveBeenCalled();
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockActivities);
    });

    it('should filter activities by user', async () => {
      const userId = 'user-id-123';
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([]),
      };

      (Activity.find as jest.Mock).mockReturnValue(mockQuery);

      await activityService.getActivities({
        userId,
        page: 1,
        limit: 20,
      });

      expect(Activity.find).toHaveBeenCalledWith(
        expect.objectContaining({ userId })
      );
    });

    it('should filter activities by entity', async () => {
      const entityId = 'task-id-123';
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([]),
      };

      (Activity.find as jest.Mock).mockReturnValue(mockQuery);

      await activityService.getActivities({
        entityId,
        page: 1,
        limit: 20,
      });

      expect(Activity.find).toHaveBeenCalledWith(
        expect.objectContaining({ entityId })
      );
    });

    it('should filter activities by action type', async () => {
      const action = ActivityAction.TASK_CREATED;
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([]),
      };

      (Activity.find as jest.Mock).mockReturnValue(mockQuery);

      await activityService.getActivities({
        action,
        page: 1,
        limit: 20,
      });

      expect(Activity.find).toHaveBeenCalledWith(
        expect.objectContaining({ action })
      );
    });

    it('should filter activities by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([]),
      };

      (Activity.find as jest.Mock).mockReturnValue(mockQuery);

      await activityService.getActivities({
        startDate,
        endDate,
        page: 1,
        limit: 20,
      });

      expect(Activity.find).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: {
            $gte: startDate,
            $lte: endDate,
          },
        })
      );
    });

    it('should populate user information', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([]),
      };

      (Activity.find as jest.Mock).mockReturnValue(mockQuery);

      await activityService.getActivities({ page: 1, limit: 20 });

      expect(mockQuery.populate).toHaveBeenCalledWith(
        'userId',
        'firstName lastName email avatar'
      );
    });
  });

  describe('getProjectActivities', () => {
    it('should retrieve activities for a specific project', async () => {
      const projectId = 'project-id-123';
      const mockActivities = [
        {
          _id: 'activity-1',
          entityType: 'Project',
          entityId: projectId,
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(mockActivities),
      };

      (Activity.find as jest.Mock).mockReturnValue(mockQuery);

      const result = await activityService.getProjectActivities(projectId, {
        page: 1,
        limit: 20,
      });

      expect(result).toEqual(mockActivities);
    });

    it('should include task activities for the project', async () => {
      const projectId = 'project-id-123';
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([]),
      };

      (Activity.find as jest.Mock).mockReturnValue(mockQuery);

      await activityService.getProjectActivities(projectId, {
        page: 1,
        limit: 20,
      });

      expect(Activity.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.any(Array),
        })
      );
    });
  });

  describe('getUserActivityStats', () => {
    it('should return user activity statistics', async () => {
      const userId = 'user-id-123';
      const mockStats = [
        {
          _id: ActivityAction.TASK_CREATED,
          count: 10,
        },
        {
          _id: ActivityAction.TASK_UPDATED,
          count: 25,
        },
      ];

      (Activity.aggregate as jest.Mock).mockResolvedValue(mockStats);

      const result = await activityService.getUserActivityStats(userId);

      expect(Activity.aggregate).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });

    it('should filter stats by date range', async () => {
      const userId = 'user-id-123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      (Activity.aggregate as jest.Mock).mockResolvedValue([]);

      await activityService.getUserActivityStats(
        userId,
        startDate,
        endDate
      );

      const pipeline = (Activity.aggregate as jest.Mock).mock.calls[0][0];
      const matchStage = pipeline.find((stage: any) => stage.$match);
      
      expect(matchStage.$match).toMatchObject({
        userId,
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      });
    });

    it('should group by action type', async () => {
      const userId = 'user-id-123';

      (Activity.aggregate as jest.Mock).mockResolvedValue([]);

      await activityService.getUserActivityStats(userId);

      const pipeline = (Activity.aggregate as jest.Mock).mock.calls[0][0];
      const groupStage = pipeline.find((stage: any) => stage.$group);
      
      expect(groupStage).toBeDefined();
      expect(groupStage.$group._id).toBe('$action');
    });
  });

  describe('getTeamActivityFeed', () => {
    it('should retrieve team activity feed', async () => {
      const teamMemberIds = ['user-1', 'user-2', 'user-3'];
      const mockActivities = [
        {
          _id: 'activity-1',
          userId: 'user-1',
          action: ActivityAction.TASK_CREATED,
        },
        {
          _id: 'activity-2',
          userId: 'user-2',
          action: ActivityAction.COMMENT_ADDED,
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(mockActivities),
      };

      (Activity.find as jest.Mock).mockReturnValue(mockQuery);

      const result = await activityService.getTeamActivityFeed(
        teamMemberIds,
        { page: 1, limit: 20 }
      );

      expect(Activity.find).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: { $in: teamMemberIds },
        })
      );
      expect(result).toEqual(mockActivities);
    });

    it('should handle empty team', async () => {
      const teamMemberIds: string[] = [];

      await expect(
        activityService.getTeamActivityFeed(teamMemberIds, {
          page: 1,
          limit: 20,
        })
      ).rejects.toThrow();
    });
  });

  describe('deleteActivity', () => {
    it('should delete an activity', async () => {
      const activityId = 'activity-id-123';

      const mockActivity = {
        _id: activityId,
      };

      (Activity.findByIdAndDelete as jest.Mock).mockResolvedValue(
        mockActivity
      );

      await activityService.deleteActivity(activityId);

      expect(Activity.findByIdAndDelete).toHaveBeenCalledWith(activityId);
    });

    it('should throw error if activity not found', async () => {
      const activityId = 'activity-id-123';

      (Activity.findByIdAndDelete as jest.Mock).mockResolvedValue(null);

      await expect(
        activityService.deleteActivity(activityId)
      ).rejects.toThrow('Activity not found');
    });
  });

  describe('cleanupOldActivities', () => {
    it('should delete activities older than specified days', async () => {
      const days = 90;

      (Activity.deleteMany as jest.Mock).mockResolvedValue({
        deletedCount: 50,
      });

      const result = await activityService.cleanupOldActivities(days);

      expect(Activity.deleteMany).toHaveBeenCalledWith({
        createdAt: { $lt: expect.any(Date) },
      });
      expect(result.deletedCount).toBe(50);
    });

    it('should use default 90 days if not specified', async () => {
      (Activity.deleteMany as jest.Mock).mockResolvedValue({
        deletedCount: 30,
      });

      await activityService.cleanupOldActivities();

      expect(Activity.deleteMany).toHaveBeenCalled();
    });

    it('should return 0 if no old activities', async () => {
      const days = 90;

      (Activity.deleteMany as jest.Mock).mockResolvedValue({
        deletedCount: 0,
      });

      const result = await activityService.cleanupOldActivities(days);

      expect(result.deletedCount).toBe(0);
    });
  });

  describe('Activity Aggregations', () => {
    it('should aggregate activities by day', async () => {
      const userId = 'user-id-123';
      const mockAggregation = [
        {
          _id: '2024-01-01',
          count: 5,
        },
        {
          _id: '2024-01-02',
          count: 8,
        },
      ];

      (Activity.aggregate as jest.Mock).mockResolvedValue(mockAggregation);

      const result = await activityService.getActivityByDay(userId, 7);

      expect(Activity.aggregate).toHaveBeenCalled();
      expect(result).toEqual(mockAggregation);
    });

    it('should aggregate activities by hour', async () => {
      const userId = 'user-id-123';
      const mockAggregation = [
        {
          _id: 9,
          count: 12,
        },
        {
          _id: 10,
          count: 15,
        },
      ];

      (Activity.aggregate as jest.Mock).mockResolvedValue(mockAggregation);

      const result = await activityService.getActivityByHour(userId);

      expect(Activity.aggregate).toHaveBeenCalled();
      expect(result).toEqual(mockAggregation);
    });

    it('should get most active users', async () => {
      const projectId = 'project-id-123';
      const mockUsers = [
        {
          _id: 'user-1',
          activityCount: 50,
        },
        {
          _id: 'user-2',
          activityCount: 35,
        },
      ];

      (Activity.aggregate as jest.Mock).mockResolvedValue(mockUsers);

      const result = await activityService.getMostActiveUsers(projectId, 10);

      expect(Activity.aggregate).toHaveBeenCalled();
      expect(result).toEqual(mockUsers);
    });
  });

  describe('Real-time Activity Updates', () => {
    it('should emit activity event after logging', async () => {
      const activityData = {
        userId: 'user-id-123',
        action: ActivityAction.TASK_CREATED,
        entityType: 'Task',
        entityId: 'task-id-123',
      };

      const mockActivity = { _id: 'activity-id', ...activityData };
      const emitSpy = jest.fn();

      (Activity.create as jest.Mock).mockResolvedValue(mockActivity);

      await activityService.logActivity(activityData, emitSpy);

      expect(emitSpy).toHaveBeenCalledWith('activity:created', mockActivity);
    });

    it('should handle emit failure gracefully', async () => {
      const activityData = {
        userId: 'user-id-123',
        action: ActivityAction.TASK_CREATED,
        entityType: 'Task',
        entityId: 'task-id-123',
      };

      const mockActivity = { _id: 'activity-id', ...activityData };
      const emitSpy = jest.fn().mockImplementation(() => {
        throw new Error('Emit failed');
      });

      (Activity.create as jest.Mock).mockResolvedValue(mockActivity);

      // Should not throw even if emit fails
      await expect(
        activityService.logActivity(activityData, emitSpy)
      ).resolves.not.toThrow();
    });
  });

  describe('Activity Search', () => {
    it('should search activities by keyword', async () => {
      const keyword = 'important';
      const mockActivities = [
        {
          _id: 'activity-1',
          metadata: {
            taskTitle: 'Important Task',
          },
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(mockActivities),
      };

      (Activity.find as jest.Mock).mockReturnValue(mockQuery);

      const result = await activityService.searchActivities(keyword, {
        page: 1,
        limit: 20,
      });

      expect(Activity.find).toHaveBeenCalled();
      expect(result).toEqual(mockActivities);
    });

    it('should handle case-insensitive search', async () => {
      const keyword = 'TASK';

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([]),
      };

      (Activity.find as jest.Mock).mockReturnValue(mockQuery);

      await activityService.searchActivities(keyword, {
        page: 1,
        limit: 20,
      });

      expect(Activity.find).toHaveBeenCalled();
    });
  });
});
