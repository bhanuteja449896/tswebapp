import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterQuery {
  search?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  project?: string;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    path: string;
  }>;
}

export interface FileUploadOptions {
  fieldName: string;
  maxSize: number;
  allowedTypes: string[];
  destination: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface QueryBuilder<T> {
  filters: Partial<T>;
  sort: Record<string, 1 | -1>;
  pagination: {
    skip: number;
    limit: number;
  };
  populate?: string[];
}
