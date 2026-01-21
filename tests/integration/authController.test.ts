import request from 'supertest';
import app from '../../src/index';
import { User } from '../../src/models/User';

describe('Auth Controller Integration Tests', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
        username: 'newuser',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.firstName).toBe(userData.firstName);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should not register user with existing email', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Existing',
        lastName: 'User',
        username: 'existinguser',
      };

      await User.create(userData);

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...userData, username: 'differentusername' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
          username: 'testuser',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate password length', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'short',
          firstName: 'Test',
          lastName: 'User',
          username: 'testuser',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await User.create({
        email: 'login@example.com',
        password: 'password123',
        firstName: 'Login',
        lastName: 'User',
        username: 'loginuser',
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.email).toBe('login@example.com');
    });

    it('should not login with invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should not login with invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should update last login time', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123',
        })
        .expect(200);

      const user = await User.findOne({ email: 'login@example.com' });
      expect(user?.lastLogin).toBeDefined();
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    let token: string;

    beforeEach(async () => {
      const user = await User.create({
        email: 'profile@example.com',
        password: 'password123',
        firstName: 'Profile',
        lastName: 'User',
        username: 'profileuser',
      });

      token = user.generateAuthToken();
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('profile@example.com');
    });

    it('should not get profile without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should not get profile with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/auth/profile', () => {
    let token: string;
    let userId: string;

    beforeEach(async () => {
      const user = await User.create({
        email: 'update@example.com',
        password: 'password123',
        firstName: 'Update',
        lastName: 'User',
        username: 'updateuser',
      });

      userId = user._id.toString();
      token = user.generateAuthToken();
    });

    it('should update user profile', async () => {
      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.firstName).toBe('Updated');
      expect(response.body.data.user.lastName).toBe('Name');
    });

    it('should update preferences', async () => {
      const response = await request(app)
        .put('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          preferences: {
            theme: 'dark',
            language: 'es',
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.preferences.theme).toBe('dark');
      expect(response.body.data.user.preferences.language).toBe('es');
    });
  });

  describe('PUT /api/v1/auth/change-password', () => {
    let token: string;

    beforeEach(async () => {
      const user = await User.create({
        email: 'changepass@example.com',
        password: 'password123',
        firstName: 'Change',
        lastName: 'Password',
        username: 'changepass',
      });

      token = user.generateAuthToken();
    });

    it('should change password with valid current password', async () => {
      const response = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify new password works
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'changepass@example.com',
          password: 'newpassword123',
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('should not change password with wrong current password', async () => {
      const response = await request(app)
        .put('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    beforeEach(async () => {
      await User.create({
        email: 'forgot@example.com',
        password: 'password123',
        firstName: 'Forgot',
        lastName: 'Password',
        username: 'forgot',
      });
    });

    it('should handle forgot password request', async () => {
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'forgot@example.com',
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      const user = await User.findOne({ email: 'forgot@example.com' }).select('+resetPasswordToken');
      expect(user?.resetPasswordToken).toBeDefined();
      expect(user?.resetPasswordExpires).toBeDefined();
    });

    it('should not reveal if email exists', async () => {
      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
