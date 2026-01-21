import User from '../../../src/models/User';
import Project from '../../../src/models/Project';
import Task from '../../../src/models/Task';
import Comment from '../../../src/models/Comment';
import Activity from '../../../src/models/Activity';

describe('Models', () => {
  describe('User Model', () => {
    it('should have User model', () => {
      expect(User).toBeDefined();
    });

    it('should have correct schema fields', () => {
      const user = new User();
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('password');
      expect(user).toHaveProperty('firstName');
      expect(user).toHaveProperty('lastName');
    });

    it('should validate email format', async () => {
      const user = new User({
        email: 'invalid-email',
        password: 'password123',
      });

      await expect(user.validate()).rejects.toThrow();
    });

    it('should require password', async () => {
      const user = new User({
        email: 'test@example.com',
      });

      await expect(user.validate()).rejects.toThrow();
    });
  });

  describe('Project Model', () => {
    it('should have Project model', () => {
      expect(Project).toBeDefined();
    });

    it('should have correct schema fields', () => {
      const project = new Project();
      expect(project).toHaveProperty('name');
      expect(project).toHaveProperty('description');
      expect(project).toHaveProperty('owner');
      expect(project).toHaveProperty('status');
    });

    it('should require name', async () => {
      const project = new Project({
        description: 'Test project',
      });

      await expect(project.validate()).rejects.toThrow();
    });
  });

  describe('Task Model', () => {
    it('should have Task model', () => {
      expect(Task).toBeDefined();
    });

    it('should have correct schema fields', () => {
      const task = new Task();
      expect(task).toHaveProperty('title');
      expect(task).toHaveProperty('description');
      expect(task).toHaveProperty('project');
      expect(task).toHaveProperty('status');
      expect(task).toHaveProperty('priority');
    });

    it('should have valid status enum', () => {
      const schema = Task.schema.obj;
      expect(schema.status.enum).toContain('todo');
      expect(schema.status.enum).toContain('in_progress');
      expect(schema.status.enum).toContain('done');
    });

    it('should have valid priority enum', () => {
      const schema = Task.schema.obj;
      expect(schema.priority.enum).toContain('low');
      expect(schema.priority.enum).toContain('medium');
      expect(schema.priority.enum).toContain('high');
    });
  });

  describe('Comment Model', () => {
    it('should have Comment model', () => {
      expect(Comment).toBeDefined();
    });

    it('should have correct schema fields', () => {
      const comment = new Comment();
      expect(comment).toHaveProperty('content');
      expect(comment).toHaveProperty('task');
      expect(comment).toHaveProperty('author');
    });
  });

  describe('Activity Model', () => {
    it('should have Activity model', () => {
      expect(Activity).toBeDefined();
    });

    it('should have correct schema fields', () => {
      const activity = new Activity();
      expect(activity).toHaveProperty('action');
      expect(activity).toHaveProperty('user');
      expect(activity).toHaveProperty('entityType');
      expect(activity).toHaveProperty('entityId');
    });
  });
});
