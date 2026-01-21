import { User } from '../../src/models/User';
import { UserRole } from '../../src/types';

describe('User Model', () => {
  describe('User Creation', () => {
    it('should create a valid user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
      };

      const user = await User.create(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.firstName).toBe(userData.firstName);
      expect(user.lastName).toBe(userData.lastName);
      expect(user.username).toBe(userData.username);
      expect(user.role).toBe(UserRole.USER);
      expect(user.isEmailVerified).toBe(false);
      expect(user.password).not.toBe(userData.password); // Password should be hashed
    });

    it('should not allow duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe1',
      };

      await User.create(userData);

      await expect(
        User.create({ ...userData, username: 'johndoe2' })
      ).rejects.toThrow();
    });

    it('should not allow duplicate username', async () => {
      const userData = {
        email: 'test1@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        username: 'duplicateusername',
      };

      await User.create(userData);

      await expect(
        User.create({ ...userData, email: 'test2@example.com' })
      ).rejects.toThrow();
    });

    it('should validate email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should require all mandatory fields', async () => {
      const userData = {
        email: 'test@example.com',
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should set default preferences', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
      };

      const user = await User.create(userData);

      expect(user.preferences).toBeDefined();
      expect(user.preferences.theme).toBe('system');
      expect(user.preferences.notifications.email).toBe(true);
      expect(user.preferences.notifications.push).toBe(true);
      expect(user.preferences.notifications.inApp).toBe(true);
      expect(user.preferences.language).toBe('en');
      expect(user.preferences.timezone).toBe('UTC');
    });
  });

  describe('User Methods', () => {
    it('should compare password correctly', async () => {
      const password = 'password123';
      const user = await User.create({
        email: 'test@example.com',
        password,
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
      });

      const isMatch = await user.comparePassword(password);
      expect(isMatch).toBe(true);

      const isNotMatch = await user.comparePassword('wrongpassword');
      expect(isNotMatch).toBe(false);
    });

    it('should generate auth token', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
      });

      const token = user.generateAuthToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate refresh token', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
      });

      const refreshToken = user.generateRefreshToken();
      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe('string');
      expect(refreshToken.length).toBeGreaterThan(0);
    });

    it('should hash password on update', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
      });

      const originalHash = user.password;
      user.password = 'newpassword123';
      await user.save();

      expect(user.password).not.toBe('newpassword123');
      expect(user.password).not.toBe(originalHash);
    });
  });

  describe('User Static Methods', () => {
    it('should find user by email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
      };

      await User.create(userData);

      const user = await User.findByEmail(userData.email);
      expect(user).toBeDefined();
      expect(user?.email).toBe(userData.email);
    });

    it('should find user by username', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
      };

      await User.create(userData);

      const user = await User.findByUsername(userData.username);
      expect(user).toBeDefined();
      expect(user?.username).toBe(userData.username);
    });
  });

  describe('User Virtuals', () => {
    it('should return full name', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
      });

      expect(user.fullName).toBe('John Doe');
    });
  });

  describe('User Validation', () => {
    it('should validate username format', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        username: 'invalid user name!',
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should enforce minimum password length', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'short',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should enforce minimum username length', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        username: 'ab',
      };

      await expect(User.create(userData)).rejects.toThrow();
    });
  });
});
