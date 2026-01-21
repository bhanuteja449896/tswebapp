import request from 'supertest';
import app from '../../src/index';
import { User } from '../../src/models/User';
import { Project } from '../../src/models/Project';
import { Task } from '../../src/models/Task';

describe('Task Controller Integration Tests', () => {
  let token: string;
  let user: any;
  let project: any;

  beforeEach(async () => {
    user = await User.create({
      email: 'tasktest@example.com',
      password: 'password123',
      firstName: 'Task',
      lastName: 'Tester',
      username: 'tasktester',
    });

    token = user.generateAuthToken();

    project = await Project.create({
      name: 'Test Project',
      key: 'TEST',
      owner: user._id,
    });
  });

  describe('POST /api/v1/tasks', () => {
    it('should create a new task', async () => {
      const taskData = {
        title: 'New Task',
        description: 'Task description',
        project: project._id.toString(),
        priority: 'high',
      };

      const response = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send(taskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.task.title).toBe(taskData.title);
      expect(response.body.data.task.priority).toBe(taskData.priority);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/tasks')
        .send({ title: 'Test Task', project: project._id.toString() })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ description: 'Missing title' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/tasks', () => {
    beforeEach(async () => {
      await Task.create([
        {
          title: 'Task 1',
          reporter: user._id,
          project: project._id,
          status: 'todo',
          priority: 'high',
        },
        {
          title: 'Task 2',
          reporter: user._id,
          project: project._id,
          status: 'in_progress',
          priority: 'medium',
        },
        {
          title: 'Task 3',
          reporter: user._id,
          project: project._id,
          status: 'done',
          priority: 'low',
        },
      ]);
    });

    it('should get all tasks', async () => {
      const response = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tasks).toHaveLength(3);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter tasks by status', async () => {
      const response = await request(app)
        .get('/api/v1/tasks?status=todo')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tasks).toHaveLength(1);
      expect(response.body.data.tasks[0].status).toBe('todo');
    });

    it('should filter tasks by priority', async () => {
      const response = await request(app)
        .get('/api/v1/tasks?priority=high')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tasks).toHaveLength(1);
      expect(response.body.data.tasks[0].priority).toBe('high');
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/v1/tasks?page=1&limit=2')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tasks).toHaveLength(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.total).toBe(3);
    });
  });

  describe('GET /api/v1/tasks/:id', () => {
    let task: any;

    beforeEach(async () => {
      task = await Task.create({
        title: 'Single Task',
        reporter: user._id,
        project: project._id,
      });
    });

    it('should get task by id', async () => {
      const response = await request(app)
        .get(`/api/v1/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.task.title).toBe('Single Task');
    });

    it('should return 404 for non-existent task', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/v1/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/tasks/:id', () => {
    let task: any;

    beforeEach(async () => {
      task = await Task.create({
        title: 'Original Title',
        reporter: user._id,
        project: project._id,
        status: 'todo',
      });
    });

    it('should update task', async () => {
      const response = await request(app)
        .put(`/api/v1/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Updated Title',
          status: 'in_progress',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.task.title).toBe('Updated Title');
      expect(response.body.data.task.status).toBe('in_progress');
    });

    it('should update assignee', async () => {
      const assignee = await User.create({
        email: 'assignee@example.com',
        password: 'password123',
        firstName: 'Assignee',
        lastName: 'User',
        username: 'assigneeuser',
      });

      const response = await request(app)
        .put(`/api/v1/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          assignee: assignee._id.toString(),
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    let task: any;

    beforeEach(async () => {
      task = await Task.create({
        title: 'Task to Delete',
        reporter: user._id,
        project: project._id,
      });
    });

    it('should delete task', async () => {
      const response = await request(app)
        .delete(`/api/v1/tasks/${task._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      const deletedTask = await Task.findById(task._id);
      expect(deletedTask).toBeNull();
    });

    it('should not allow non-owner to delete', async () => {
      const otherUser = await User.create({
        email: 'other@example.com',
        password: 'password123',
        firstName: 'Other',
        lastName: 'User',
        username: 'otheruser',
      });

      const otherToken = otherUser.generateAuthToken();

      const response = await request(app)
        .delete(`/api/v1/tasks/${task._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/tasks/:id/assign', () => {
    let task: any;
    let assignee: any;

    beforeEach(async () => {
      task = await Task.create({
        title: 'Task to Assign',
        reporter: user._id,
        project: project._id,
      });

      assignee = await User.create({
        email: 'assignee@example.com',
        password: 'password123',
        firstName: 'Assignee',
        lastName: 'User',
        username: 'assigneeuser',
      });
    });

    it('should assign task to user', async () => {
      const response = await request(app)
        .post(`/api/v1/tasks/${task._id}/assign`)
        .set('Authorization', `Bearer ${token}`)
        .send({ assigneeId: assignee._id.toString() })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/tasks/:id/watchers', () => {
    let task: any;

    beforeEach(async () => {
      task = await Task.create({
        title: 'Task with Watchers',
        reporter: user._id,
        project: project._id,
      });
    });

    it('should add watcher to task', async () => {
      const response = await request(app)
        .post(`/api/v1/tasks/${task._id}/watchers`)
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: user._id.toString() })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.task.watchers).toContain(user._id.toString());
    });
  });
});
