import nodemailer, { Transporter } from 'nodemailer';
import { EmailOptions } from '../types/express';
import { logger } from './logger';

class EmailService {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@taskflow.com',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent to ${options.to}: ${options.subject}`);
    } catch (error) {
      logger.error('Error sending email:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const subject = 'Welcome to TaskFlow!';
    const html = `
      <h1>Welcome to TaskFlow, ${name}!</h1>
      <p>Thank you for joining us. We're excited to have you on board.</p>
      <p>Get started by creating your first project and inviting team members.</p>
      <p>If you have any questions, feel free to reach out to our support team.</p>
    `;

    await this.sendEmail({ to: email, subject, html });
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    const subject = 'Password Reset Request';
    const html = `
      <h1>Password Reset Request</h1>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    await this.sendEmail({ to: email, subject, html });
  }

  async sendTaskAssignmentEmail(
    email: string,
    taskTitle: string,
    projectName: string
  ): Promise<void> {
    const subject = `New Task Assigned: ${taskTitle}`;
    const html = `
      <h1>New Task Assignment</h1>
      <p>You have been assigned a new task in project <strong>${projectName}</strong>:</p>
      <h2>${taskTitle}</h2>
      <p>Log in to TaskFlow to view details and get started.</p>
    `;

    await this.sendEmail({ to: email, subject, html });
  }

  async sendCommentNotificationEmail(
    email: string,
    commenterName: string,
    taskTitle: string
  ): Promise<void> {
    const subject = `New Comment on ${taskTitle}`;
    const html = `
      <h1>New Comment</h1>
      <p><strong>${commenterName}</strong> commented on task: <strong>${taskTitle}</strong></p>
      <p>Log in to TaskFlow to view the comment.</p>
    `;

    await this.sendEmail({ to: email, subject, html });
  }

  async sendProjectInviteEmail(
    email: string,
    projectName: string,
    inviterName: string
  ): Promise<void> {
    const subject = `Invitation to join ${projectName}`;
    const html = `
      <h1>Project Invitation</h1>
      <p><strong>${inviterName}</strong> has invited you to join the project <strong>${projectName}</strong>.</p>
      <p>Log in to TaskFlow to accept the invitation.</p>
    `;

    await this.sendEmail({ to: email, subject, html });
  }

  async sendDueDateReminderEmail(
    email: string,
    taskTitle: string,
    dueDate: Date
  ): Promise<void> {
    const subject = `Task Due Date Reminder: ${taskTitle}`;
    const html = `
      <h1>Task Due Date Reminder</h1>
      <p>Your task <strong>${taskTitle}</strong> is due on ${dueDate.toLocaleDateString()}.</p>
      <p>Make sure to complete it on time!</p>
    `;

    await this.sendEmail({ to: email, subject, html });
  }
}

export const emailService = new EmailService();
