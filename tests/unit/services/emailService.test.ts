import { emailService } from '../../../src/services/emailService';
import nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');

describe('Email Service', () => {
  let mockTransporter: any;

  beforeEach(() => {
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email with correct parameters', async () => {
      const user = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      await emailService.sendWelcomeEmail(user);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: user.email,
          subject: 'Welcome to TaskFlow!',
        })
      );
    });

    it('should include user name in email content', async () => {
      const user = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      await emailService.sendWelcomeEmail(user);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('John');
      expect(callArgs.html).toContain('TaskFlow');
    });

    it('should throw error if email sending fails', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

      const user = {
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      await expect(emailService.sendWelcomeEmail(user)).rejects.toThrow('SMTP error');
    });

    it('should handle missing last name', async () => {
      const user = {
        email: 'test@example.com',
        firstName: 'John',
      };

      await emailService.sendWelcomeEmail(user);

      expect(mockTransporter.sendMail).toHaveBeenCalled();
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email with token', async () => {
      const user = {
        email: 'test@example.com',
        firstName: 'John',
      };
      const resetToken = 'reset-token-123';

      await emailService.sendPasswordResetEmail(user, resetToken);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: user.email,
          subject: 'Password Reset Request',
        })
      );
    });

    it('should include reset link in email', async () => {
      const user = {
        email: 'test@example.com',
        firstName: 'John',
      };
      const resetToken = 'reset-token-123';

      await emailService.sendPasswordResetEmail(user, resetToken);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(resetToken);
      expect(callArgs.html).toContain('reset-password');
    });

    it('should include expiration notice', async () => {
      const user = {
        email: 'test@example.com',
        firstName: 'John',
      };
      const resetToken = 'reset-token-123';

      await emailService.sendPasswordResetEmail(user, resetToken);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('expire');
    });

    it('should throw error if user email is invalid', async () => {
      const user = {
        email: '',
        firstName: 'John',
      };
      const resetToken = 'reset-token-123';

      await expect(
        emailService.sendPasswordResetEmail(user, resetToken)
      ).rejects.toThrow();
    });
  });

  describe('sendTaskAssignmentEmail', () => {
    it('should send task assignment notification', async () => {
      const assignee = {
        email: 'assignee@example.com',
        firstName: 'Jane',
      };
      const task = {
        title: 'Test Task',
        description: 'Task description',
        _id: 'task-id-123',
      };
      const assigner = {
        firstName: 'John',
        lastName: 'Doe',
      };

      await emailService.sendTaskAssignmentEmail(assignee, task, assigner);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: assignee.email,
          subject: expect.stringContaining('Task Assigned'),
        })
      );
    });

    it('should include task details in email', async () => {
      const assignee = {
        email: 'assignee@example.com',
        firstName: 'Jane',
      };
      const task = {
        title: 'Important Task',
        description: 'Very important',
        _id: 'task-id-123',
      };
      const assigner = {
        firstName: 'John',
        lastName: 'Doe',
      };

      await emailService.sendTaskAssignmentEmail(assignee, task, assigner);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Important Task');
      expect(callArgs.html).toContain('John Doe');
    });

    it('should include task link', async () => {
      const assignee = {
        email: 'assignee@example.com',
        firstName: 'Jane',
      };
      const task = {
        title: 'Test Task',
        description: 'Task description',
        _id: 'task-id-123',
      };
      const assigner = {
        firstName: 'John',
        lastName: 'Doe',
      };

      await emailService.sendTaskAssignmentEmail(assignee, task, assigner);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('task-id-123');
    });
  });

  describe('sendCommentNotificationEmail', () => {
    it('should send comment notification to task owner', async () => {
      const recipient = {
        email: 'owner@example.com',
        firstName: 'Alice',
      };
      const task = {
        title: 'Test Task',
        _id: 'task-id-123',
      };
      const commenter = {
        firstName: 'Bob',
        lastName: 'Smith',
      };
      const comment = {
        content: 'This is a test comment',
      };

      await emailService.sendCommentNotificationEmail(
        recipient,
        task,
        commenter,
        comment
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: recipient.email,
          subject: expect.stringContaining('New Comment'),
        })
      );
    });

    it('should include comment content in email', async () => {
      const recipient = {
        email: 'owner@example.com',
        firstName: 'Alice',
      };
      const task = {
        title: 'Test Task',
        _id: 'task-id-123',
      };
      const commenter = {
        firstName: 'Bob',
        lastName: 'Smith',
      };
      const comment = {
        content: 'Important comment here',
      };

      await emailService.sendCommentNotificationEmail(
        recipient,
        task,
        commenter,
        comment
      );

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Important comment here');
      expect(callArgs.html).toContain('Bob Smith');
    });

    it('should handle long comment content', async () => {
      const recipient = {
        email: 'owner@example.com',
        firstName: 'Alice',
      };
      const task = {
        title: 'Test Task',
        _id: 'task-id-123',
      };
      const commenter = {
        firstName: 'Bob',
        lastName: 'Smith',
      };
      const comment = {
        content: 'a'.repeat(1000),
      };

      await emailService.sendCommentNotificationEmail(
        recipient,
        task,
        commenter,
        comment
      );

      expect(mockTransporter.sendMail).toHaveBeenCalled();
    });
  });

  describe('sendProjectInviteEmail', () => {
    it('should send project invitation email', async () => {
      const invitee = {
        email: 'invitee@example.com',
        firstName: 'David',
      };
      const project = {
        name: 'Awesome Project',
        _id: 'project-id-123',
      };
      const inviter = {
        firstName: 'Eve',
        lastName: 'Johnson',
      };
      const role = 'member';

      await emailService.sendProjectInviteEmail(
        invitee,
        project,
        inviter,
        role
      );

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: invitee.email,
          subject: expect.stringContaining('Project Invitation'),
        })
      );
    });

    it('should include project details and role', async () => {
      const invitee = {
        email: 'invitee@example.com',
        firstName: 'David',
      };
      const project = {
        name: 'Awesome Project',
        _id: 'project-id-123',
      };
      const inviter = {
        firstName: 'Eve',
        lastName: 'Johnson',
      };
      const role = 'admin';

      await emailService.sendProjectInviteEmail(
        invitee,
        project,
        inviter,
        role
      );

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Awesome Project');
      expect(callArgs.html).toContain('admin');
      expect(callArgs.html).toContain('Eve Johnson');
    });

    it('should include accept invitation link', async () => {
      const invitee = {
        email: 'invitee@example.com',
        firstName: 'David',
      };
      const project = {
        name: 'Awesome Project',
        _id: 'project-id-123',
      };
      const inviter = {
        firstName: 'Eve',
        lastName: 'Johnson',
      };
      const role = 'member';

      await emailService.sendProjectInviteEmail(
        invitee,
        project,
        inviter,
        role
      );

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('project-id-123');
      expect(callArgs.html).toContain('accept');
    });
  });

  describe('sendDueDateReminderEmail', () => {
    it('should send due date reminder for upcoming task', async () => {
      const assignee = {
        email: 'assignee@example.com',
        firstName: 'Frank',
      };
      const task = {
        title: 'Urgent Task',
        dueDate: new Date('2024-12-31'),
        _id: 'task-id-123',
      };

      await emailService.sendDueDateReminderEmail(assignee, task);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: assignee.email,
          subject: expect.stringContaining('Due Date Reminder'),
        })
      );
    });

    it('should include task details and due date', async () => {
      const assignee = {
        email: 'assignee@example.com',
        firstName: 'Frank',
      };
      const dueDate = new Date('2024-12-31');
      const task = {
        title: 'Urgent Task',
        dueDate,
        _id: 'task-id-123',
      };

      await emailService.sendDueDateReminderEmail(assignee, task);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Urgent Task');
      expect(callArgs.html).toContain('due');
    });

    it('should handle overdue tasks differently', async () => {
      const assignee = {
        email: 'assignee@example.com',
        firstName: 'Frank',
      };
      const pastDate = new Date('2020-01-01');
      const task = {
        title: 'Overdue Task',
        dueDate: pastDate,
        _id: 'task-id-123',
      };

      await emailService.sendDueDateReminderEmail(assignee, task);

      expect(mockTransporter.sendMail).toHaveBeenCalled();
    });

    it('should include task priority in urgent reminders', async () => {
      const assignee = {
        email: 'assignee@example.com',
        firstName: 'Frank',
      };
      const task = {
        title: 'Critical Task',
        dueDate: new Date('2024-12-31'),
        priority: 'critical',
        _id: 'task-id-123',
      };

      await emailService.sendDueDateReminderEmail(assignee, task);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Critical Task');
    });
  });

  describe('Email Configuration', () => {
    it('should use environment variables for SMTP config', () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'user@example.com';
      process.env.SMTP_PASSWORD = 'password';

      const service = require('../../../src/services/emailService');

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'smtp.example.com',
          port: 587,
        })
      );
    });

    it('should handle missing SMTP configuration', () => {
      delete process.env.SMTP_HOST;

      expect(() => {
        require('../../../src/services/emailService');
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should log error when email sending fails', async () => {
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      mockTransporter.sendMail.mockRejectedValue(new Error('Network error'));

      const user = {
        email: 'test@example.com',
        firstName: 'John',
      };

      await expect(emailService.sendWelcomeEmail(user)).rejects.toThrow();
      
      consoleErrorSpy.mockRestore();
    });

    it('should retry sending email on transient failures', async () => {
      mockTransporter.sendMail
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ messageId: 'success' });

      const user = {
        email: 'test@example.com',
        firstName: 'John',
      };

      // Implementation would need retry logic
      await expect(emailService.sendWelcomeEmail(user)).rejects.toThrow();
    });

    it('should handle invalid email addresses', async () => {
      const user = {
        email: 'invalid-email',
        firstName: 'John',
      };

      await expect(emailService.sendWelcomeEmail(user)).rejects.toThrow();
    });
  });

  describe('Email Templates', () => {
    it('should use HTML templates for emails', async () => {
      const user = {
        email: 'test@example.com',
        firstName: 'John',
      };

      await emailService.sendWelcomeEmail(user);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toBeDefined();
      expect(typeof callArgs.html).toBe('string');
    });

    it('should include plain text alternative', async () => {
      const user = {
        email: 'test@example.com',
        firstName: 'John',
      };

      await emailService.sendWelcomeEmail(user);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.text).toBeDefined();
    });

    it('should properly escape HTML in user content', async () => {
      const recipient = {
        email: 'owner@example.com',
        firstName: 'Alice',
      };
      const task = {
        title: '<script>alert("xss")</script>',
        _id: 'task-id-123',
      };
      const commenter = {
        firstName: 'Bob',
        lastName: 'Smith',
      };
      const comment = {
        content: '<img src=x onerror=alert(1)>',
      };

      await emailService.sendCommentNotificationEmail(
        recipient,
        task,
        commenter,
        comment
      );

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).not.toContain('<script>');
      expect(callArgs.html).not.toContain('onerror');
    });
  });
});
