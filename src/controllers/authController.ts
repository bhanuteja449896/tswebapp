import { Response, NextFunction } from 'express';
import { User } from '../models/User';
import { AuthRequest } from '../types/express';
import { AppError } from '../middleware/auth';
import { emailService } from '../services/emailService';
import crypto from 'crypto';
import { logger } from '../utils/logger';

export class AuthController {
  async register(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, firstName, lastName, username } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });

      if (existingUser) {
        if (existingUser.email === email) {
          throw new AppError('Email already registered', 400);
        }
        throw new AppError('Username already taken', 400);
      }

      // Create new user
      const user = await User.create({
        email,
        password,
        firstName,
        lastName,
        username,
      });

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      user.emailVerificationToken = verificationToken;
      await user.save();

      // Send welcome email
      await emailService.sendWelcomeEmail(email, firstName);

      // Generate tokens
      const token = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();

      logger.info(`New user registered: ${email}`);

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            role: user.role,
          },
          token,
          refreshToken,
        },
        message: 'User registered successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      // Find user and include password
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        throw new AppError('Invalid credentials', 401);
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new AppError('Invalid credentials', 401);
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate tokens
      const token = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();

      logger.info(`User logged in: ${email}`);

      res.json({
        success: true,
        data: {
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            role: user.role,
            avatar: user.avatar,
            preferences: user.preferences,
          },
          token,
          refreshToken,
        },
        message: 'Login successful',
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new AppError('Refresh token required', 400);
      }

      // Verify refresh token
      const decoded = require('jsonwebtoken').verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'refresh-secret'
      ) as { id: string };

      const user = await User.findById(decoded.id);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Generate new tokens
      const newToken = user.generateAuthToken();
      const newRefreshToken = user.generateRefreshToken();

      res.json({
        success: true,
        data: {
          token: newToken,
          refreshToken: newRefreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        // Don't reveal if email exists
        res.json({
          success: true,
          message: 'If email exists, password reset instructions have been sent',
        });
        return;
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
      await user.save();

      // Send reset email
      await emailService.sendPasswordResetEmail(email, resetToken);

      logger.info(`Password reset requested for: ${email}`);

      res.json({
        success: true,
        message: 'If email exists, password reset instructions have been sent',
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, password } = req.body;

      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() },
      }).select('+resetPasswordToken +resetPasswordExpires');

      if (!user) {
        throw new AppError('Invalid or expired reset token', 400);
      }

      // Update password
      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      logger.info(`Password reset successful for: ${user.email}`);

      res.json({
        success: true,
        message: 'Password reset successful',
      });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await User.findById(req.user!.id);

      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { firstName, lastName, avatar, preferences } = req.body;

      const user = await User.findById(req.user!.id);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (avatar) user.avatar = avatar;
      if (preferences) user.preferences = { ...user.preferences, ...preferences };

      await user.save();

      logger.info(`Profile updated for user: ${user.email}`);

      res.json({
        success: true,
        data: { user },
        message: 'Profile updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(req.user!.id).select('+password');
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Verify current password
      const isValid = await user.comparePassword(currentPassword);
      if (!isValid) {
        throw new AppError('Current password is incorrect', 400);
      }

      // Update password
      user.password = newPassword;
      await user.save();

      logger.info(`Password changed for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // In a real application, you might want to blacklist the token here
      logger.info(`User logged out: ${req.user!.email}`);

      res.json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
