import { Task } from '../../src/models/Task';
import { Project } from '../../src/models/Project';
import { User } from '../../src/models/User';
import { TaskStatus, TaskPriority } from '../../src/types';

describe('Task Model', () => {
  let user: any;
  let project: any;

  beforeEach(async () => {
    user = await User.create({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
    });

    project = await Project.create({
      name: 'Test Project',
      key: 'TEST',
      owner: user._id,
      description: 'Test project description',
    });
  });

  describe('Task Creation', () => {
    it('should create a valid task', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test task description',
        reporter: user._id,
        project: project._id,
      };

      const task = await Task.create(taskData);

      expect(task).toBeDefined();
      expect(task.title).toBe(taskData.title);
      expect(task.description).toBe(taskData.description);
      expect(task.status).toBe(TaskStatus.TODO);
      expect(task.priority).toBe(TaskPriority.MEDIUM);
      expect(task.reporter.toString()).toBe(user._id.toString());
      expect(task.project.toString()).toBe(project._id.toString());
    });

    it('should require title', async () => {
      const taskData = {
        description: 'Test task description',
        reporter: user._id,
        project: project._id,
      };

      await expect(Task.create(taskData)).rejects.toThrow();
    });

    it('should require reporter', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test task description',
        project: project._id,
      };

      await expect(Task.create(taskData)).rejects.toThrow();
    });

    it('should require project', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test task description',
        reporter: user._id,
      };

      await expect(Task.create(taskData)).rejects.toThrow();
    });

    it('should set default values', async () => {
      const taskData = {
        title: 'Test Task',
        reporter: user._id,
        project: project._id,
      };

      const task = await Task.create(taskData);

      expect(task.status).toBe(TaskStatus.TODO);
      expect(task.priority).toBe(TaskPriority.MEDIUM);
      expect(task.actualHours).toBe(0);
      expect(task.description).toBe('');
      expect(task.tags).toEqual([]);
      expect(task.attachments).toEqual([]);
      expect(task.watchers).toEqual([]);
    });

    it('should create task with all fields', async () => {
      const dueDate = new Date();
      const startDate = new Date();

      const taskData = {
        title: 'Test Task',
        description: 'Detailed description',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        assignee: user._id,
        reporter: user._id,
        project: project._id,
        tags: ['urgent', 'frontend'],
        dueDate,
        startDate,
        estimatedHours: 8,
      };

      const task = await Task.create(taskData);

      expect(task.title).toBe(taskData.title);
      expect(task.description).toBe(taskData.description);
      expect(task.status).toBe(taskData.status);
      expect(task.priority).toBe(taskData.priority);
      expect(task.assignee?.toString()).toBe(user._id.toString());
      expect(task.tags).toEqual(taskData.tags);
      expect(task.estimatedHours).toBe(taskData.estimatedHours);
    });
  });

  describe('Task Relationships', () => {
    it('should support parent-child relationships', async () => {
      const parentTask = await Task.create({
        title: 'Parent Task',
        reporter: user._id,
        project: project._id,
      });

      const childTask = await Task.create({
        title: 'Child Task',
        reporter: user._id,
        project: project._id,
        parentTask: parentTask._id,
      });

      parentTask.subtasks.push(childTask._id.toString());
      await parentTask.save();

      expect(childTask.parentTask?.toString()).toBe(parentTask._id.toString());
      expect(parentTask.subtasks).toContain(childTask._id.toString());
    });

    it('should support task watchers', async () => {
      const task = await Task.create({
        title: 'Test Task',
        reporter: user._id,
        project: project._id,
      });

      task.watchers.push(user._id.toString());
      await task.save();

      expect(task.watchers).toHaveLength(1);
      expect(task.watchers[0]).toBe(user._id.toString());
    });

    it('should support attachments', async () => {
      const task = await Task.create({
        title: 'Test Task',
        reporter: user._id,
        project: project._id,
      });

      task.attachments.push({
        _id: 'attach1',
        filename: 'test.pdf',
        originalName: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        path: '/uploads/test.pdf',
        uploadedBy: user._id.toString(),
        uploadedAt: new Date(),
      });

      await task.save();

      expect(task.attachments).toHaveLength(1);
      expect(task.attachments[0].filename).toBe('test.pdf');
    });
  });

  describe('Task Static Methods', () => {
    it('should find tasks by project', async () => {
      await Task.create({
        title: 'Task 1',
        reporter: user._id,
        project: project._id,
      });

      await Task.create({
        title: 'Task 2',
        reporter: user._id,
        project: project._id,
      });

      const tasks = await Task.findByProject(project._id.toString());

      expect(tasks).toHaveLength(2);
    });

    it('should find tasks by assignee', async () => {
      await Task.create({
        title: 'Task 1',
        reporter: user._id,
        project: project._id,
        assignee: user._id,
      });

      const tasks = await Task.findByAssignee(user._id.toString());

      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe('Task 1');
    });

    it('should find overdue tasks', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      await Task.create({
        title: 'Overdue Task',
        reporter: user._id,
        project: project._id,
        dueDate: pastDate,
        status: TaskStatus.IN_PROGRESS,
      });

      const overdueTasks = await Task.findOverdue();

      expect(overdueTasks).toHaveLength(1);
      expect(overdueTasks[0].title).toBe('Overdue Task');
    });
  });

  describe('Task Virtuals', () => {
    it('should calculate isOverdue correctly', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const overdueTask = await Task.create({
        title: 'Overdue Task',
        reporter: user._id,
        project: project._id,
        dueDate: pastDate,
        status: TaskStatus.IN_PROGRESS,
      });

      expect(overdueTask.isOverdue).toBe(true);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const upcomingTask = await Task.create({
        title: 'Upcoming Task',
        reporter: user._id,
        project: project._id,
        dueDate: futureDate,
      });

      expect(upcomingTask.isOverdue).toBe(false);
    });
  });

  describe('Task Validation', () => {
    it('should enforce title length limit', async () => {
      const longTitle = 'a'.repeat(201);

      await expect(
        Task.create({
          title: longTitle,
          reporter: user._id,
          project: project._id,
        })
      ).rejects.toThrow();
    });

    it('should enforce description length limit', async () => {
      const longDescription = 'a'.repeat(5001);

      await expect(
        Task.create({
          title: 'Test Task',
          description: longDescription,
          reporter: user._id,
          project: project._id,
        })
      ).rejects.toThrow();
    });

    it('should validate estimated hours', async () => {
      await expect(
        Task.create({
          title: 'Test Task',
          reporter: user._id,
          project: project._id,
          estimatedHours: -5,
        })
      ).rejects.toThrow();
    });

    it('should validate actual hours', async () => {
      await expect(
        Task.create({
          title: 'Test Task',
          reporter: user._id,
          project: project._id,
          actualHours: -3,
        })
      ).rejects.toThrow();
    });
  });
});
