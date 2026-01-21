import { Request, Response } from 'express';
import { projectController } from '../../../src/controllers/projectController';
import Project from '../../../src/models/Project';
import Task from '../../../src/models/Task';

jest.mock('../../../src/models/Project');
jest.mock('../../../src/models/Task');

describe('Project Controller', () => {
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

  describe('getAllProjects', () => {
    it('should return all projects for user', async () => {
      const mockProjects = [
        {
          _id: 'project-1',
          name: 'Project 1',
          owner: 'user-123',
        },
        {
          _id: 'project-2',
          name: 'Project 2',
          owner: 'user-123',
        },
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockProjects),
      };

      (Project.find as jest.Mock).mockReturnValue(mockQuery);
      (Project.countDocuments as jest.Mock).mockResolvedValue(2);

      await projectController.getAllProjects(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { projects: mockProjects },
        pagination: expect.any(Object),
      });
    });

    it('should filter by status', async () => {
      mockRequest.query = { status: 'active' };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };

      (Project.find as jest.Mock).mockReturnValue(mockQuery);
      (Project.countDocuments as jest.Mock).mockResolvedValue(0);

      await projectController.getAllProjects(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(Project.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' })
      );
    });
  });

  describe('getProjectById', () => {
    it('should return project by ID', async () => {
      const mockProject = {
        _id: 'project-123',
        name: 'Test Project',
        owner: 'user-123',
      };

      mockRequest.params = { id: 'project-123' };

      const mockQuery = {
        populate: jest.fn().mockResolvedValue(mockProject),
      };

      (Project.findById as jest.Mock).mockReturnValue(mockQuery);

      await projectController.getProjectById(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { project: mockProject },
      });
    });

    it('should return 404 if project not found', async () => {
      mockRequest.params = { id: 'invalid-id' };

      const mockQuery = {
        populate: jest.fn().mockResolvedValue(null),
      };

      (Project.findById as jest.Mock).mockReturnValue(mockQuery);

      await projectController.getProjectById(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
    });
  });

  describe('createProject', () => {
    it('should create new project', async () => {
      const projectData = {
        name: 'New Project',
        description: 'Test description',
      };

      mockRequest.body = projectData;

      const mockProject = {
        _id: 'project-123',
        ...projectData,
        owner: 'user-123',
        save: jest.fn().mockResolvedValue(this),
      };

      (Project.prototype.save as jest.Mock) = jest
        .fn()
        .mockResolvedValue(mockProject);

      await projectController.createProject(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should validate required fields', async () => {
      mockRequest.body = {};

      await projectController.createProject(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('updateProject', () => {
    it('should update project', async () => {
      const mockProject = {
        _id: 'project-123',
        name: 'Old Name',
        owner: { _id: 'user-123' },
        save: jest.fn().mockResolvedValue(this),
      };

      mockRequest.params = { id: 'project-123' };
      mockRequest.body = { name: 'New Name' };

      (Project.findById as jest.Mock).mockResolvedValue(mockProject);

      await projectController.updateProject(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockProject.save).toHaveBeenCalled();
    });

    it('should check ownership before update', async () => {
      const mockProject = {
        _id: 'project-123',
        owner: { _id: 'other-user' },
      };

      mockRequest.params = { id: 'project-123' };
      mockRequest.body = { name: 'New Name' };

      (Project.findById as jest.Mock).mockResolvedValue(mockProject);

      await projectController.updateProject(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('deleteProject', () => {
    it('should delete project', async () => {
      const mockProject = {
        _id: 'project-123',
        owner: { _id: 'user-123' },
      };

      mockRequest.params = { id: 'project-123' };

      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      (Project.findByIdAndDelete as jest.Mock).mockResolvedValue(mockProject);

      await projectController.deleteProject(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(Project.findByIdAndDelete).toHaveBeenCalledWith('project-123');
    });

    it('should check ownership before delete', async () => {
      const mockProject = {
        _id: 'project-123',
        owner: { _id: 'other-user' },
      };

      mockRequest.params = { id: 'project-123' };

      (Project.findById as jest.Mock).mockResolvedValue(mockProject);

      await projectController.deleteProject(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });

  describe('getProjectStats', () => {
    it('should return project statistics', async () => {
      const mockProject = {
        _id: 'project-123',
        name: 'Test Project',
      };

      mockRequest.params = { id: 'project-123' };

      (Project.findById as jest.Mock).mockResolvedValue(mockProject);
      (Task.countDocuments as jest.Mock).mockResolvedValue(10);

      await projectController.getProjectStats(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          stats: expect.any(Object),
        }),
      });
    });
  });
});
