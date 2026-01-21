import nodemailer from 'nodemailer';
import { User } from '../models/User';
import { logger } from '../utils/logger';

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface EmailOptions {
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: string | Buffer;
  }>;
  priority?: 'high' | 'normal' | 'low';
  headers?: Record<string, string>;
}

export class EmailTemplateService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(user: any, verificationToken?: string): Promise<void> {
    const template = this.getWelcomeTemplate(user, verificationToken);

    await this.sendEmail({
      to: user.email,
      ...template,
    });

    logger.info(`Welcome email sent to ${user.email}`);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user: any, resetToken: string): Promise<void> {
    const template = this.getPasswordResetTemplate(user, resetToken);

    await this.sendEmail({
      to: user.email,
      priority: 'high',
      ...template,
    });

    logger.info(`Password reset email sent to ${user.email}`);
  }

  /**
   * Send task assignment notification
   */
  async sendTaskAssignmentEmail(
    user: any,
    task: any,
    project: any
  ): Promise<void> {
    const template = this.getTaskAssignmentTemplate(user, task, project);

    await this.sendEmail({
      to: user.email,
      ...template,
    });

    logger.info(`Task assignment email sent to ${user.email}`);
  }

  /**
   * Send task completion notification
   */
  async sendTaskCompletionEmail(
    user: any,
    task: any,
    project: any
  ): Promise<void> {
    const template = this.getTaskCompletionTemplate(user, task, project);

    await this.sendEmail({
      to: user.email,
      ...template,
    });

    logger.info(`Task completion email sent to ${user.email}`);
  }

  /**
   * Send due date reminder
   */
  async sendDueDateReminderEmail(
    user: any,
    task: any,
    daysUntilDue: number
  ): Promise<void> {
    const template = this.getDueDateReminderTemplate(user, task, daysUntilDue);

    await this.sendEmail({
      to: user.email,
      priority: 'high',
      ...template,
    });

    logger.info(`Due date reminder sent to ${user.email}`);
  }

  /**
   * Send project invitation email
   */
  async sendProjectInvitationEmail(
    invitee: any,
    inviter: any,
    project: any,
    invitationToken: string
  ): Promise<void> {
    const template = this.getProjectInvitationTemplate(
      invitee,
      inviter,
      project,
      invitationToken
    );

    await this.sendEmail({
      to: invitee.email,
      ...template,
    });

    logger.info(`Project invitation sent to ${invitee.email}`);
  }

  /**
   * Send weekly digest email
   */
  async sendWeeklyDigestEmail(
    user: any,
    digest: {
      completedTasks: number;
      newTasks: number;
      upcomingDeadlines: any[];
      projects: any[];
    }
  ): Promise<void> {
    const template = this.getWeeklyDigestTemplate(user, digest);

    await this.sendEmail({
      to: user.email,
      ...template,
    });

    logger.info(`Weekly digest sent to ${user.email}`);
  }

  /**
   * Send comment notification
   */
  async sendCommentNotificationEmail(
    user: any,
    commenter: any,
    task: any,
    comment: any
  ): Promise<void> {
    const template = this.getCommentNotificationTemplate(
      user,
      commenter,
      task,
      comment
    );

    await this.sendEmail({
      to: user.email,
      ...template,
    });

    logger.info(`Comment notification sent to ${user.email}`);
  }

  /**
   * Send mention notification
   */
  async sendMentionNotificationEmail(
    user: any,
    mentioner: any,
    context: string,
    link: string
  ): Promise<void> {
    const template = this.getMentionNotificationTemplate(
      user,
      mentioner,
      context,
      link
    );

    await this.sendEmail({
      to: user.email,
      ...template,
    });

    logger.info(`Mention notification sent to ${user.email}`);
  }

  /**
   * Send bulk emails (e.g., newsletters, announcements)
   */
  async sendBulkEmail(
    recipients: string[],
    subject: string,
    html: string,
    text: string
  ): Promise<void> {
    const chunks = this.chunkArray(recipients, 50); // Send in batches

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map((email) =>
          this.sendEmail({
            to: email,
            subject,
            html,
            text,
          })
        )
      );

      // Wait between batches to avoid rate limiting
      await this.delay(1000);
    }

    logger.info(`Bulk email sent to ${recipients.length} recipients`);
  }

  /**
   * Core email sending method
   */
  private async sendEmail(
    options: EmailOptions & {
      subject: string;
      html: string;
      text: string;
    }
  ): Promise<void> {
    try {
      const mailOptions = {
        from: process.env.SMTP_FROM || '"TaskFlow" <noreply@taskflow.com>',
        to: Array.isArray(options.to) ? options.to.join(',') : options.to,
        cc: options.cc?.join(','),
        bcc: options.bcc?.join(','),
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
        priority: options.priority,
        headers: options.headers,
      };

      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      logger.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Template: Welcome email
   */
  private getWelcomeTemplate(
    user: any,
    verificationToken?: string
  ): EmailTemplate {
    const verificationLink = verificationToken
      ? `${process.env.APP_URL}/verify-email?token=${verificationToken}`
      : null;

    return {
      subject: 'Welcome to TaskFlow!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to TaskFlow!</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.firstName},</h2>
              <p>Thank you for joining TaskFlow! We're excited to have you on board.</p>
              <p>TaskFlow helps teams collaborate and manage projects efficiently. You can create projects, assign tasks, track progress, and much more.</p>
              ${
                verificationLink
                  ? `
                <p>Please verify your email address to get started:</p>
                <a href="${verificationLink}" class="button">Verify Email</a>
              `
                  : ''
              }
              <h3>Getting Started:</h3>
              <ul>
                <li>Create your first project</li>
                <li>Invite team members</li>
                <li>Start adding tasks</li>
                <li>Track your team's progress</li>
              </ul>
              <p>If you have any questions, feel free to reach out to our support team.</p>
              <p>Happy collaborating!</p>
            </div>
            <div class="footer">
              <p>© 2026 TaskFlow. All rights reserved.</p>
              <p>You're receiving this email because you signed up for TaskFlow.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to TaskFlow!
        
        Hi ${user.firstName},
        
        Thank you for joining TaskFlow! We're excited to have you on board.
        
        ${verificationLink ? `Please verify your email: ${verificationLink}` : ''}
        
        Getting Started:
        - Create your first project
        - Invite team members
        - Start adding tasks
        - Track your team's progress
        
        © 2026 TaskFlow
      `,
    };
  }

  /**
   * Template: Password reset
   */
  private getPasswordResetTemplate(user: any, resetToken: string): EmailTemplate {
    const resetLink = `${process.env.APP_URL}/reset-password?token=${resetToken}`;

    return {
      subject: 'Reset Your TaskFlow Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #667eea; color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.firstName},</h2>
              <p>We received a request to reset your TaskFlow password.</p>
              <p>Click the button below to reset your password:</p>
              <a href="${resetLink}" class="button">Reset Password</a>
              <div class="warning">
                <strong>Security Note:</strong>
                <p>This link will expire in 1 hour. If you didn't request this reset, please ignore this email and ensure your account is secure.</p>
              </div>
              <p>For security reasons, this link can only be used once.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Password Reset Request
        
        Hi ${user.firstName},
        
        We received a request to reset your TaskFlow password.
        
        Reset your password: ${resetLink}
        
        This link will expire in 1 hour. If you didn't request this reset, please ignore this email.
      `,
    };
  }

  /**
   * Template: Task assignment
   */
  private getTaskAssignmentTemplate(
    user: any,
    task: any,
    project: any
  ): EmailTemplate {
    const taskLink = `${process.env.APP_URL}/projects/${project._id}/tasks/${task._id}`;

    return {
      subject: `New Task Assigned: ${task.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>New Task Assigned</h2>
            <p>Hi ${user.firstName},</p>
            <p>You have been assigned a new task:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">${task.title}</h3>
              <p><strong>Project:</strong> ${project.name}</p>
              <p><strong>Priority:</strong> ${task.priority}</p>
              ${task.dueDate ? `<p><strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleDateString()}</p>` : ''}
              ${task.description ? `<p><strong>Description:</strong> ${task.description}</p>` : ''}
            </div>
            <a href="${taskLink}" style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px;">View Task</a>
          </div>
        </body>
        </html>
      `,
      text: `
        New Task Assigned
        
        Hi ${user.firstName},
        
        You have been assigned: ${task.title}
        Project: ${project.name}
        Priority: ${task.priority}
        ${task.dueDate ? `Due Date: ${new Date(task.dueDate).toLocaleDateString()}` : ''}
        
        View task: ${taskLink}
      `,
    };
  }

  /**
   * Template: Task completion
   */
  private getTaskCompletionTemplate(
    user: any,
    task: any,
    project: any
  ): EmailTemplate {
    return {
      subject: `Task Completed: ${task.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>✅ Task Completed</h2>
            <p>Hi ${user.firstName},</p>
            <p>Great news! A task has been marked as completed:</p>
            <div style="background: #e8f5e9; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">${task.title}</h3>
              <p><strong>Project:</strong> ${project.name}</p>
              <p><strong>Completed by:</strong> ${task.completedBy?.firstName} ${task.completedBy?.lastName}</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Task Completed
        
        Hi ${user.firstName},
        
        ${task.title} has been completed!
        Project: ${project.name}
      `,
    };
  }

  /**
   * Template: Due date reminder
   */
  private getDueDateReminderTemplate(
    user: any,
    task: any,
    daysUntilDue: number
  ): EmailTemplate {
    return {
      subject: `⏰ Reminder: Task Due ${daysUntilDue === 0 ? 'Today' : `in ${daysUntilDue} day(s)`}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>⏰ Due Date Reminder</h2>
            <p>Hi ${user.firstName},</p>
            <p>This is a reminder that the following task is due ${daysUntilDue === 0 ? 'today' : `in ${daysUntilDue} day(s)`}:</p>
            <div style="background: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <h3 style="margin-top: 0;">${task.title}</h3>
              <p><strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleDateString()}</p>
              <p><strong>Priority:</strong> ${task.priority}</p>
              <p><strong>Status:</strong> ${task.status}</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Due Date Reminder
        
        Hi ${user.firstName},
        
        ${task.title} is due ${daysUntilDue === 0 ? 'today' : `in ${daysUntilDue} day(s)`}!
        
        Priority: ${task.priority}
        Status: ${task.status}
      `,
    };
  }

  /**
   * Template: Project invitation
   */
  private getProjectInvitationTemplate(
    invitee: any,
    inviter: any,
    project: any,
    invitationToken: string
  ): EmailTemplate {
    const acceptLink = `${process.env.APP_URL}/invitations/accept?token=${invitationToken}`;

    return {
      subject: `You've been invited to join ${project.name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Project Invitation</h2>
            <p>Hi ${invitee.firstName || invitee.email},</p>
            <p>${inviter.firstName} ${inviter.lastName} has invited you to join the project:</p>
            <div style="background: #e3f2fd; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">${project.name}</h3>
              ${project.description ? `<p>${project.description}</p>` : ''}
            </div>
            <a href="${acceptLink}" style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px;">Accept Invitation</a>
          </div>
        </body>
        </html>
      `,
      text: `
        Project Invitation
        
        Hi ${invitee.firstName || invitee.email},
        
        ${inviter.firstName} ${inviter.lastName} has invited you to join ${project.name}.
        
        Accept invitation: ${acceptLink}
      `,
    };
  }

  /**
   * Template: Weekly digest
   */
  private getWeeklyDigestTemplate(
    user: any,
    digest: {
      completedTasks: number;
      newTasks: number;
      upcomingDeadlines: any[];
      projects: any[];
    }
  ): EmailTemplate {
    return {
      subject: 'Your Weekly TaskFlow Digest',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>📊 Your Weekly Digest</h2>
            <p>Hi ${user.firstName},</p>
            <p>Here's your activity summary for this week:</p>
            
            <div style="display: flex; gap: 10px; margin: 20px 0;">
              <div style="flex: 1; background: #e8f5e9; padding: 20px; border-radius: 5px; text-align: center;">
                <h3 style="margin: 0; color: #4caf50;">${digest.completedTasks}</h3>
                <p style="margin: 5px 0;">Completed</p>
              </div>
              <div style="flex: 1; background: #e3f2fd; padding: 20px; border-radius: 5px; text-align: center;">
                <h3 style="margin: 0; color: #2196f3;">${digest.newTasks}</h3>
                <p style="margin: 5px 0;">New Tasks</p>
              </div>
            </div>
            
            ${
              digest.upcomingDeadlines.length > 0
                ? `
              <h3>Upcoming Deadlines</h3>
              <ul>
                ${digest.upcomingDeadlines.map((task) => `<li>${task.title} - ${new Date(task.dueDate).toLocaleDateString()}</li>`).join('')}
              </ul>
            `
                : ''
            }
            
            <p>Keep up the great work!</p>
          </div>
        </body>
        </html>
      `,
      text: `
        Your Weekly Digest
        
        Hi ${user.firstName},
        
        This week:
        - Completed: ${digest.completedTasks} tasks
        - New Tasks: ${digest.newTasks}
        
        ${digest.upcomingDeadlines.length > 0 ? `Upcoming Deadlines:\n${digest.upcomingDeadlines.map((t) => `- ${t.title} - ${new Date(t.dueDate).toLocaleDateString()}`).join('\n')}` : ''}
      `,
    };
  }

  /**
   * Template: Comment notification
   */
  private getCommentNotificationTemplate(
    user: any,
    commenter: any,
    task: any,
    comment: any
  ): EmailTemplate {
    const taskLink = `${process.env.APP_URL}/tasks/${task._id}`;

    return {
      subject: `New comment on: ${task.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>💬 New Comment</h2>
            <p>Hi ${user.firstName},</p>
            <p>${commenter.firstName} ${commenter.lastName} commented on a task:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3>${task.title}</h3>
              <div style="background: white; padding: 15px; border-radius: 5px; margin-top: 15px;">
                <p style="margin: 0;"><strong>${commenter.firstName} ${commenter.lastName}</strong></p>
                <p>${comment.content}</p>
              </div>
            </div>
            <a href="${taskLink}" style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px;">View Task</a>
          </div>
        </body>
        </html>
      `,
      text: `
        New Comment
        
        Hi ${user.firstName},
        
        ${commenter.firstName} ${commenter.lastName} commented on "${task.title}":
        
        ${comment.content}
        
        View task: ${taskLink}
      `,
    };
  }

  /**
   * Template: Mention notification
   */
  private getMentionNotificationTemplate(
    user: any,
    mentioner: any,
    context: string,
    link: string
  ): EmailTemplate {
    return {
      subject: `${mentioner.firstName} mentioned you in TaskFlow`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>@Mention Notification</h2>
            <p>Hi ${user.firstName},</p>
            <p>${mentioner.firstName} ${mentioner.lastName} mentioned you:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <p>${context}</p>
            </div>
            <a href="${link}" style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px;">View Context</a>
          </div>
        </body>
        </html>
      `,
      text: `
        Mention Notification
        
        Hi ${user.firstName},
        
        ${mentioner.firstName} ${mentioner.lastName} mentioned you:
        ${context}
        
        View: ${link}
      `,
    };
  }

  /**
   * Utility: Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Utility: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const emailTemplateService = new EmailTemplateService();
