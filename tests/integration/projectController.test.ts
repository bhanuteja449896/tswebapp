import request from 'supertest';
import app from '../../src/index';
import { User } from '../../src/models/User';
import { Project } from '../../src/models/Project';

describe('Project Controller Integration Tests', () => {
  let token: string;
  let user: any;

  beforeEach(async () => {
    user = await User.create({
      email: 'projecttest@example.com',
      password: 'password123',
      firstName: 'Project',
      lastName: 'Tester',
      username: 'projecttester',
    });

    token = user.generateAuthToken();
  });

  describe('POST /api/v1/projects', () => {
    it('should create a new project', async () => {
      const projectData = {
        name: 'New Project',
        description: 'Project description',
        key: 'NEWP',
      };

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${token}`)
        .send(projectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.project.name).toBe(projectData.name);
      expect(response.body.data.project.key).toBe(projectData.key);
    });

    it('should auto-generate key if not provided', async () => {
      const projectData = {
        name: 'Auto Key Project',
        description: 'Project with auto-generated key',
      };

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${token}`)
        .send(projectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.project.key).toBeDefined();
      expect(response.body.data.project.key.length).toBeGreaterThan(0);
    });

    it('should not allow duplicate keys', async () => {
      await Project.create({
        name: 'First Project',
        key: 'DUP',
        owner: user._id,
      });

      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Second Project',
          key: 'DUP',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate key format', async () => {
      const response = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Invalid Key Project',
          key: 'invalid-key',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/projects', () => {
    beforeEach(async () => {
      await Project.create([
        {
          name: 'Project 1',
          key: 'PROJ1',
          owner: user._id,
          status: 'active',
        },
        {
          name: 'Project 2',
          key: 'PROJ2',
          owner: user._id,
          status: 'planning',
        },
      ]);
    });

    it('should get all user projects', async () => {
      const response = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.projects).toHaveLength(2);
    });

    it('should filter projects by status', async () => {
      const response = await request(app)
        .get('/api/v1/projects?status=active')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.projects).toHaveLength(1);
      expect(response.body.data.projects[0].status).toBe('active');
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    let project: any;

    beforeEach(async () => {
      project = await Project.create({
        name: 'Single Project',
        key: 'SINGLE',
        owner: user._id,
      });
    });

    it('should get project by id', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${project._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.project.name).toBe('Single Project');
    });

    it('should return 404 for non-existent project', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/v1/projects/${fakeId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/projects/:id', () => {
    let project: any;

    beforeEach(async () => {
      project = await Project.create({
        name: 'Original Name',
        key: 'ORIG',
        owner: user._id,
      });
    });

    it('should update project', async () => {
      const response = await request(app)
        .put(`/api/v1/projects/${project._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Name',
          status: 'active',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.project.name).toBe('Updated Name');
      expect(response.body.data.project.status).toBe('active');
    });

    it('should not allow non-owner to update', async () => {
      const otherUser = await User.create({
        email: 'other@example.com',
        password: 'password123',
        firstName: 'Other',
        lastName: 'User',
        username: 'otheruser',
      });

      const otherToken = otherUser.generateAuthToken();

      const response = await request(app)
        .put(`/api/v1/projects/${project._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ name: 'Hacked Name' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/projects/:id/members', () => {
    let project: any;
    let member: any;

    beforeEach(async () => {
      project = await Project.create({
        name: 'Team Project',
        key: 'TEAM',
        owner: user._id,
      });

      member = await User.create({
        email: 'member@example.com',
        password: 'password123',
        firstName: 'Team',
        lastName: 'Member',
        username: 'teammember',
      });
    });

    it('should add member to project', async () => {
      const response = await request(app)
        .post(`/api/v1/projects/${project._id}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: member._id.toString(),
          role: 'member',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.project.members.length).toBeGreaterThan(1);
    });

    it('should not add duplicate member', async () => {
      await request(app)
        .post(`/api/v1/projects/${project._id}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: member._id.toString(),
          role: 'member',
        });

      const response = await request(app)
        .post(`/api/v1/projects/${project._id}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          userId: member._id.toString(),
          role: 'member',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/projects/:id/members/:userId', () => {
    let project: any;
    let member: any;

    beforeEach(async () => {
      member = await User.create({
        email: 'member@example.com',
        password: 'password123',
        firstName: 'Team',
        lastName: 'Member',
        username: 'teammember',
      });

      project = await Project.create({
        name: 'Team Project',
        key: 'TEAM',
        owner: user._id,
        members: [
          { user: user._id, role: 'owner', joinedAt: new Date() },
          { user: member._id, role: 'member', joinedAt: new Date() },
        ],
      });
    });

    it('should remove member from project', async () => {
      const response = await request(app)
        .delete(`/api/v1/projects/${project._id}/members/${member._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should not allow removing owner', async () => {
      const response = await request(app)
        .delete(`/api/v1/projects/${project._id}/members/${user._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/projects/:id/stats', () => {
    let project: any;

    beforeEach(async () => {
      project = await Project.create({
        name: 'Stats Project',
        key: 'STATS',
        owner: user._id,
      });
    });

    it('should get project statistics', async () => {
      const response = await request(app)
        .get(`/api/v1/projects/${project._id}/stats`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toBeDefined();
      expect(response.body.data.stats.totalTasks).toBeDefined();
      expect(response.body.data.stats.memberCount).toBeDefined();
    });
  });
});
