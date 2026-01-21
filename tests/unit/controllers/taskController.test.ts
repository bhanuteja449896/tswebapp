import { Request, Response } from 'express';
import { taskController } from '../../../src/controllers/taskController';
import Task from '../../../src/models/Task';
import Project from '../../../src/models/Project';

jest.mock('../../../src/models/Task');
jest.mock('../../../src/models/Project');

describe('Task Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      params: {},
      query: {},
      body: {},
      user: { userId: 'user-123', role: 'user' },
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  describe('getAllTasks', () => {
    it('should return all tasks', async () => {
      const mockTasks = [
        {
          _id: 'task-1',
          title: 'Task 1',
          project: 'project-1',
        },
        {
          _id: 'task-2',
          title: 'Task 2',
          project: 'project-1',
        },
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockTasks),
      };

      (Task.find as jest.Mock).mockReturnValue(mockQuery);
      (Task.countDocuments as jest.Mock).mockResolvedValue(2);

      await taskController.getAllTasks(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { tasks: mockTasks },
        pagination: expect.any(Object),
      });
    });

    it('should filter by status', async () => {
      mockRequest.query = { status: 'in_progress' };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };

      (Task.find as jest.Mock).mockReturnValue(mockQuery);
      (Task.countDocuments as jest.Mock).mockResolvedValue(0);

      await taskController.getAllTasks(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(Task.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'in_progress' })
      );
    });

    it('should filter by priority', async () => {
      mockRequest.query = { priority: 'high' };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };

      (Task.find as jest.Mock).mockReturnValue(mockQuery);
      (Task.countDocuments as jest.Mock).mockResolvedValue(0);

      await taskController.getAllTasks(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(Task.find).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 'high' })
      );
    });
  });

  describe('getTaskById', () => {
    it('should return task by ID', async () => {
      const mockTask = {
        _id: 'task-123',
        title: 'Test Task',
        project: 'project-123',
      };

      mockRequest.params = { id: 'task-123' };

      const mockQuery = {
        populate: jest.fn().mockResolvedValue(mockTask),
      };

      (Task.findById as jest.Mock).mockReturnValue(mockQuery);

      await taskController.getTaskById(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { task: mockTask },
      });
    });

    it('should return 404 if task not found', async () => {
      mockRequest.params = { id: 'invalid-id' };

      const mockQuery = {
        populate: jest.fn().mockResolvedValue(null),
      };

      (Task.findById as jest.Mock).mockReturnValue(mockQuery);

      await taskController.getTaskById(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
  });

  describe('createTask', () => {
    it('should create new task', async () => {
      const taskData = {
        title: 'New Task',
        description: 'Test description',
        project: 'project-123',
      };

      mockRequest.body = taskData;

      const mockProject = {
        _id: 'project-123',
        name: 'Test Project',
      };

      (Project.findById as jest.Mock).mockResolvedValue(mockProject);

      const mockTask = {
        _id: 'task-123',
        ...taskData,
        save: jest.fn().mockResolvedValue(this),
      };

      (Task.prototype.save as jest.Mock) = jest
        .fn()
        .mockResolvedValue(mockTask);

      await taskController.createTask(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should validate project exists', async () => {
      mockRequest.body = {
        title: 'New Task',
        project: 'invalid-project',
      };

      (Project.findById as jest.Mock).mockResolvedValue(null);

      await taskController.createTask(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateTask', () => {
    it('should update task', async () => {
      const mockTask = {
        _id: 'task-123',
        title: 'Old Title',
        assignedTo: 'user-123',
        save: jest.fn().mockResolvedValue(this),
      };

      mockRequest.params = { id: 'task-123' };
      mockRequest.body = { title: 'New Title' };

      (Task.findById as jest.Mock).mockResolvedValue(mockTask);

      await taskController.updateTask(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockTask.save).toHaveBeenCalled();
    });

    it('should check permissions before update', async () => {
      const mockTask = {
        _id: 'task-123',
        assignedTo: 'other-user',
        createdBy: 'other-user',
      };

      mockRequest.params = { id: 'task-123' };
      mockRequest.body = { title: 'New Title' };

      (Task.findById as jest.Mock).mockResolvedValue(mockTask);

      await taskController.updateTask(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('deleteTask', () => {
    it('should delete task', async () => {
      const mockTask = {
        _id: 'task-123',
        createdBy: 'user-123',
      };

      mockRequest.params = { id: 'task-123' };

      (Task.findById as jest.Mock).mockResolvedValue(mockTask);
      (Task.findByIdAndDelete as jest.Mock).mockResolvedValue(mockTask);

      await taskController.deleteTask(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(Task.findByIdAndDelete).toHaveBeenCalledWith('task-123');
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status', async () => {
      const mockTask = {
        _id: 'task-123',
        status: 'todo',
        assignedTo: 'user-123',
        save: jest.fn().mockResolvedValue(this),
      };

      mockRequest.params = { id: 'task-123' };
      mockRequest.body = { status: 'in_progress' };

      (Task.findById as jest.Mock).mockResolvedValue(mockTask);

      await taskController.updateTaskStatus(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockTask.save).toHaveBeenCalled();
      expect(mockTask.status).toBe('in_progress');
    });
  });
});
