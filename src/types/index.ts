export interface IUser {
  _id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
  avatar?: string;
  role: UserRole;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  lastLogin?: Date;
  preferences: IUserPreferences;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): string;
  generateRefreshToken(): string;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MANAGER = 'manager',
  GUEST = 'guest',
}

export interface IUserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  language: string;
  timezone: string;
}

export interface ITask {
  _id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: string;
  reporter: string;
  project: string;
  tags: string[];
  dueDate?: Date;
  startDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  parentTask?: string;
  subtasks: string[];
  attachments: IAttachment[];
  watchers: string[];
  customFields: Map<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  BLOCKED = 'blocked',
  DONE = 'done',
  ARCHIVED = 'archived',
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface IProject {
  _id: string;
  name: string;
  description: string;
  key: string;
  owner: string;
  members: IProjectMember[];
  status: ProjectStatus;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  visibility: ProjectVisibility;
  settings: IProjectSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProjectMember {
  user: string;
  role: ProjectRole;
  joinedAt: Date;
}

export enum ProjectRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

export enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ProjectVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  TEAM = 'team',
}

export interface IProjectSettings {
  allowExternalCollaborators: boolean;
  requireApproval: boolean;
  autoAssignTasks: boolean;
  notifyMembers: boolean;
}

export interface IComment {
  _id: string;
  content: string;
  author: string;
  task: string;
  parentComment?: string;
  mentions: string[];
  attachments: IAttachment[];
  reactions: IReaction[];
  isEdited: boolean;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAttachment {
  _id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface IReaction {
  user: string;
  emoji: string;
  createdAt: Date;
}

export interface IActivity {
  _id: string;
  actor: string;
  action: ActivityAction;
  target: {
    type: ActivityTargetType;
    id: string;
  };
  metadata: Record<string, any>;
  project?: string;
  task?: string;
  createdAt: Date;
}

export enum ActivityAction {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  ASSIGNED = 'assigned',
  COMMENTED = 'commented',
  MENTIONED = 'mentioned',
  STATUS_CHANGED = 'status_changed',
  PRIORITY_CHANGED = 'priority_changed',
  DUE_DATE_CHANGED = 'due_date_changed',
}

export enum ActivityTargetType {
  TASK = 'task',
  PROJECT = 'project',
  COMMENT = 'comment',
  USER = 'user',
}

export interface INotification {
  _id: string;
  recipient: string;
  sender?: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntity?: {
    type: string;
    id: string;
  };
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

export enum NotificationType {
  TASK_ASSIGNED = 'task_assigned',
  TASK_UPDATED = 'task_updated',
  COMMENT_ADDED = 'comment_added',
  MENTION = 'mention',
  PROJECT_INVITE = 'project_invite',
  DUE_DATE_REMINDER = 'due_date_reminder',
  SYSTEM = 'system',
}

export interface ITeam {
  _id: string;
  name: string;
  description: string;
  owner: string;
  members: string[];
  projects: string[];
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILabel {
  _id: string;
  name: string;
  color: string;
  description?: string;
  project: string;
  createdAt: Date;
}

export interface IWorkLog {
  _id: string;
  task: string;
  user: string;
  description: string;
  timeSpent: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWebhook {
  _id: string;
  url: string;
  events: WebhookEvent[];
  project: string;
  secret: string;
  isActive: boolean;
  lastTriggered?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum WebhookEvent {
  TASK_CREATED = 'task.created',
  TASK_UPDATED = 'task.updated',
  TASK_DELETED = 'task.deleted',
  COMMENT_CREATED = 'comment.created',
  PROJECT_UPDATED = 'project.updated',
}
