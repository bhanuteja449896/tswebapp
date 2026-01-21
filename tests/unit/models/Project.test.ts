import { Project } from '../../src/models/Project';
import { User } from '../../src/models/User';
import { ProjectStatus, ProjectRole, ProjectVisibility } from '../../src/types';

describe('Project Model', () => {
  let user: any;

  beforeEach(async () => {
    user = await User.create({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      username: 'johndoe',
    });
  });

  describe('Project Creation', () => {
    it('should create a valid project', async () => {
      const projectData = {
        name: 'Test Project',
        description: 'Test description',
        key: 'TEST',
        owner: user._id,
      };

      const project = await Project.create(projectData);

      expect(project).toBeDefined();
      expect(project.name).toBe(projectData.name);
      expect(project.description).toBe(projectData.description);
      expect(project.key).toBe(projectData.key);
      expect(project.owner.toString()).toBe(user._id.toString());
      expect(project.status).toBe(ProjectStatus.PLANNING);
      expect(project.visibility).toBe(ProjectVisibility.PRIVATE);
    });

    it('should require name', async () => {
      const projectData = {
        key: 'TEST',
        owner: user._id,
      };

      await expect(Project.create(projectData)).rejects.toThrow();
    });

    it('should require key', async () => {
      const projectData = {
        name: 'Test Project',
        owner: user._id,
      };

      await expect(Project.create(projectData)).rejects.toThrow();
    });

    it('should require owner', async () => {
      const projectData = {
        name: 'Test Project',
        key: 'TEST',
      };

      await expect(Project.create(projectData)).rejects.toThrow();
    });

    it('should not allow duplicate keys', async () => {
      await Project.create({
        name: 'Project 1',
        key: 'DUP',
        owner: user._id,
      });

      await expect(
        Project.create({
          name: 'Project 2',
          key: 'DUP',
          owner: user._id,
        })
      ).rejects.toThrow();
    });

    it('should validate key format', async () => {
      await expect(
        Project.create({
          name: 'Test Project',
          key: 'invalid-key',
          owner: user._id,
        })
      ).rejects.toThrow();

      await expect(
        Project.create({
          name: 'Test Project',
          key: 'A',
          owner: user._id,
        })
      ).rejects.toThrow();
    });

    it('should automatically add owner to members', async () => {
      const project = await Project.create({
        name: 'Test Project',
        key: 'TEST',
        owner: user._id,
      });

      expect(project.members).toHaveLength(1);
      expect(project.members[0].user.toString()).toBe(user._id.toString());
      expect(project.members[0].role).toBe(ProjectRole.OWNER);
    });

    it('should set default settings', async () => {
      const project = await Project.create({
        name: 'Test Project',
        key: 'TEST',
        owner: user._id,
      });

      expect(project.settings).toBeDefined();
      expect(project.settings.allowExternalCollaborators).toBe(false);
      expect(project.settings.requireApproval).toBe(false);
      expect(project.settings.autoAssignTasks).toBe(false);
      expect(project.settings.notifyMembers).toBe(true);
    });
  });

  describe('Project Members', () => {
    it('should add members to project', async () => {
      const member = await User.create({
        email: 'member@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith',
      });

      const project = await Project.create({
        name: 'Test Project',
        key: 'TEST',
        owner: user._id,
      });

      project.members.push({
        user: member._id.toString(),
        role: ProjectRole.MEMBER,
        joinedAt: new Date(),
      });

      await project.save();

      expect(project.members).toHaveLength(2);
      expect(project.members[1].user.toString()).toBe(member._id.toString());
      expect(project.members[1].role).toBe(ProjectRole.MEMBER);
    });

    it('should support different member roles', async () => {
      const admin = await User.create({
        email: 'admin@example.com',
        password: 'password123',
        firstName: 'Admin',
        lastName: 'User',
        username: 'adminuser',
      });

      const project = await Project.create({
        name: 'Test Project',
        key: 'TEST',
        owner: user._id,
      });

      project.members.push({
        user: admin._id.toString(),
        role: ProjectRole.ADMIN,
        joinedAt: new Date(),
      });

      await project.save();

      const adminMember = project.members.find(
        (m) => m.user.toString() === admin._id.toString()
      );

      expect(adminMember?.role).toBe(ProjectRole.ADMIN);
    });
  });

  describe('Project Static Methods', () => {
    it('should find projects by owner', async () => {
      await Project.create({
        name: 'Project 1',
        key: 'PROJ1',
        owner: user._id,
      });

      await Project.create({
        name: 'Project 2',
        key: 'PROJ2',
        owner: user._id,
      });

      const projects = await Project.findByOwner(user._id.toString());

      expect(projects).toHaveLength(2);
    });

    it('should find projects by member', async () => {
      const member = await User.create({
        email: 'member@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith',
      });

      const project = await Project.create({
        name: 'Test Project',
        key: 'TEST',
        owner: user._id,
      });

      project.members.push({
        user: member._id.toString(),
        role: ProjectRole.MEMBER,
        joinedAt: new Date(),
      });

      await project.save();

      const projects = await Project.findByMember(member._id.toString());

      expect(projects).toHaveLength(1);
      expect(projects[0]._id.toString()).toBe(project._id.toString());
    });

    it('should generate unique project keys', async () => {
      const key1 = await Project.generateProjectKey('Test Project');
      expect(key1).toBe('TES');

      await Project.create({
        name: 'Test Project',
        key: key1,
        owner: user._id,
      });

      const key2 = await Project.generateProjectKey('Test Project');
      expect(key2).toBe('TES1');
    });
  });

  describe('Project Virtuals', () => {
    it('should calculate member count', async () => {
      const member = await User.create({
        email: 'member@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith',
      });

      const project = await Project.create({
        name: 'Test Project',
        key: 'TEST',
        owner: user._id,
      });

      project.members.push({
        user: member._id.toString(),
        role: ProjectRole.MEMBER,
        joinedAt: new Date(),
      });

      await project.save();

      expect(project.memberCount).toBe(2);
    });

    it('should check if project is active', async () => {
      const project = await Project.create({
        name: 'Test Project',
        key: 'TEST',
        owner: user._id,
        status: ProjectStatus.ACTIVE,
      });

      expect(project.isActive).toBe(true);

      project.status = ProjectStatus.COMPLETED;
      expect(project.isActive).toBe(false);
    });

    it('should calculate project duration', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-15');

      const project = await Project.create({
        name: 'Test Project',
        key: 'TEST',
        owner: user._id,
        startDate,
        endDate,
      });

      expect(project.duration).toBe(14);
    });
  });

  describe('Project Validation', () => {
    it('should enforce name length limit', async () => {
      const longName = 'a'.repeat(101);

      await expect(
        Project.create({
          name: longName,
          key: 'TEST',
          owner: user._id,
        })
      ).rejects.toThrow();
    });

    it('should enforce description length limit', async () => {
      const longDescription = 'a'.repeat(2001);

      await expect(
        Project.create({
          name: 'Test Project',
          description: longDescription,
          key: 'TEST',
          owner: user._id,
        })
      ).rejects.toThrow();
    });

    it('should validate end date is after start date', async () => {
      const startDate = new Date('2024-01-15');
      const endDate = new Date('2024-01-01');

      await expect(
        Project.create({
          name: 'Test Project',
          key: 'TEST',
          owner: user._id,
          startDate,
          endDate,
        })
      ).rejects.toThrow();
    });

    it('should validate budget is non-negative', async () => {
      await expect(
        Project.create({
          name: 'Test Project',
          key: 'TEST',
          owner: user._id,
          budget: -1000,
        })
      ).rejects.toThrow();
    });
  });
});
