import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { sanitize } from 'sanitize-html';
import { logger } from '../utils/logger';

/**
 * Advanced validation service with comprehensive rules
 */
export class ValidationService {
  /**
   * User registration validation schema
   */
  static userRegistrationSchema = Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .lowercase()
      .trim()
      .max(255)
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
        'string.max': 'Email must not exceed 255 characters',
      }),
    password: Joi.string()
      .min(8)
      .max(128)
      .required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password must not exceed 128 characters',
        'string.pattern.base':
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'Password is required',
      }),
    firstName: Joi.string()
      .trim()
      .min(1)
      .max(50)
      .required()
      .pattern(/^[a-zA-Z\s'-]+$/)
      .messages({
        'string.min': 'First name must be at least 1 character',
        'string.max': 'First name must not exceed 50 characters',
        'string.pattern.base': 'First name can only contain letters, spaces, hyphens, and apostrophes',
        'any.required': 'First name is required',
      }),
    lastName: Joi.string()
      .trim()
      .min(1)
      .max(50)
      .required()
      .pattern(/^[a-zA-Z\s'-]+$/)
      .messages({
        'string.min': 'Last name must be at least 1 character',
        'string.max': 'Last name must not exceed 50 characters',
        'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, and apostrophes',
        'any.required': 'Last name is required',
      }),
    phoneNumber: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Please provide a valid phone number in E.164 format',
      }),
    role: Joi.string()
      .valid('user', 'manager', 'admin')
      .default('user')
      .messages({
        'any.only': 'Role must be either user, manager, or admin',
      }),
  });

  /**
   * User login validation schema
   */
  static userLoginSchema = Joi.object({
    email: Joi.string()
      .email({ tlds: { allow: false } })
      .required()
      .lowercase()
      .trim()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required',
      }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required',
    }),
    rememberMe: Joi.boolean().optional().default(false),
  });

  /**
   * Project creation validation schema
   */
  static projectCreationSchema = Joi.object({
    name: Joi.string()
      .trim()
      .min(3)
      .max(100)
      .required()
      .messages({
        'string.min': 'Project name must be at least 3 characters',
        'string.max': 'Project name must not exceed 100 characters',
        'any.required': 'Project name is required',
      }),
    description: Joi.string()
      .trim()
      .max(1000)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Description must not exceed 1000 characters',
      }),
    status: Joi.string()
      .valid('planning', 'active', 'on_hold', 'completed', 'cancelled')
      .default('planning')
      .messages({
        'any.only': 'Invalid project status',
      }),
    startDate: Joi.date().iso().optional().messages({
      'date.format': 'Start date must be a valid ISO date',
    }),
    endDate: Joi.date()
      .iso()
      .greater(Joi.ref('startDate'))
      .optional()
      .messages({
        'date.format': 'End date must be a valid ISO date',
        'date.greater': 'End date must be after start date',
      }),
    budget: Joi.number().positive().precision(2).optional().messages({
      'number.positive': 'Budget must be a positive number',
      'number.precision': 'Budget must have at most 2 decimal places',
    }),
    priority: Joi.string()
      .valid('low', 'medium', 'high', 'critical')
      .default('medium')
      .messages({
        'any.only': 'Invalid priority level',
      }),
    tags: Joi.array()
      .items(Joi.string().trim().max(50))
      .max(10)
      .optional()
      .messages({
        'array.max': 'Maximum 10 tags allowed',
        'string.max': 'Each tag must not exceed 50 characters',
      }),
    members: Joi.array()
      .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
      .optional()
      .messages({
        'string.pattern.base': 'Invalid member ID format',
      }),
  });

  /**
   * Task creation validation schema
   */
  static taskCreationSchema = Joi.object({
    title: Joi.string()
      .trim()
      .min(3)
      .max(200)
      .required()
      .messages({
        'string.min': 'Task title must be at least 3 characters',
        'string.max': 'Task title must not exceed 200 characters',
        'any.required': 'Task title is required',
      }),
    description: Joi.string()
      .trim()
      .max(5000)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Description must not exceed 5000 characters',
      }),
    status: Joi.string()
      .valid('todo', 'in_progress', 'review', 'done', 'blocked')
      .default('todo')
      .messages({
        'any.only': 'Invalid task status',
      }),
    priority: Joi.string()
      .valid('low', 'medium', 'high', 'urgent')
      .default('medium')
      .messages({
        'any.only': 'Invalid priority level',
      }),
    project: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid project ID format',
        'any.required': 'Project ID is required',
      }),
    assignedTo: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Invalid user ID format',
      }),
    dueDate: Joi.date().iso().min('now').optional().messages({
      'date.format': 'Due date must be a valid ISO date',
      'date.min': 'Due date cannot be in the past',
    }),
    estimatedHours: Joi.number()
      .positive()
      .max(1000)
      .precision(2)
      .optional()
      .messages({
        'number.positive': 'Estimated hours must be positive',
        'number.max': 'Estimated hours cannot exceed 1000',
        'number.precision': 'Estimated hours must have at most 2 decimal places',
      }),
    tags: Joi.array()
      .items(Joi.string().trim().max(50))
      .max(20)
      .optional()
      .messages({
        'array.max': 'Maximum 20 tags allowed',
      }),
    attachments: Joi.array()
      .items(Joi.string().uri())
      .max(10)
      .optional()
      .messages({
        'array.max': 'Maximum 10 attachments allowed',
        'string.uri': 'Each attachment must be a valid URL',
      }),
    dependencies: Joi.array()
      .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
      .optional()
      .messages({
        'string.pattern.base': 'Invalid dependency task ID format',
      }),
  });

  /**
   * Comment creation validation schema
   */
  static commentCreationSchema = Joi.object({
    content: Joi.string()
      .trim()
      .min(1)
      .max(2000)
      .required()
      .messages({
        'string.min': 'Comment cannot be empty',
        'string.max': 'Comment must not exceed 2000 characters',
        'any.required': 'Comment content is required',
      }),
    task: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid task ID format',
        'any.required': 'Task ID is required',
      }),
    parentComment: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Invalid parent comment ID format',
      }),
    mentions: Joi.array()
      .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
      .optional()
      .messages({
        'string.pattern.base': 'Invalid user ID format in mentions',
      }),
  });

  /**
   * Pagination validation schema
   */
  static paginationSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
      'number.min': 'Page number must be at least 1',
      'number.integer': 'Page number must be an integer',
    }),
    limit: Joi.number().integer().min(1).max(100).default(20).messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100',
      'number.integer': 'Limit must be an integer',
    }),
    sortBy: Joi.string()
      .valid('createdAt', 'updatedAt', 'name', 'title', 'priority', 'status')
      .optional()
      .messages({
        'any.only': 'Invalid sort field',
      }),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc').messages({
      'any.only': 'Sort order must be either asc or desc',
    }),
  });

  /**
   * Search validation schema
   */
  static searchSchema = Joi.object({
    query: Joi.string()
      .trim()
      .min(1)
      .max(200)
      .required()
      .messages({
        'string.min': 'Search query cannot be empty',
        'string.max': 'Search query must not exceed 200 characters',
        'any.required': 'Search query is required',
      }),
    type: Joi.string()
      .valid('all', 'projects', 'tasks', 'users', 'comments')
      .default('all')
      .messages({
        'any.only': 'Invalid search type',
      }),
    filters: Joi.object({
      status: Joi.string().optional(),
      priority: Joi.string().optional(),
      assignedTo: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
      project: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
      tags: Joi.array().items(Joi.string()).optional(),
      dateFrom: Joi.date().iso().optional(),
      dateTo: Joi.date().iso().greater(Joi.ref('dateFrom')).optional(),
    }).optional(),
  });

  /**
   * File upload validation schema
   */
  static fileUploadSchema = Joi.object({
    fileName: Joi.string()
      .trim()
      .max(255)
      .required()
      .pattern(/^[a-zA-Z0-9._-]+$/)
      .messages({
        'string.max': 'File name must not exceed 255 characters',
        'string.pattern.base': 'File name contains invalid characters',
        'any.required': 'File name is required',
      }),
    fileSize: Joi.number()
      .integer()
      .positive()
      .max(10 * 1024 * 1024) // 10MB
      .required()
      .messages({
        'number.max': 'File size cannot exceed 10MB',
        'number.positive': 'File size must be positive',
        'any.required': 'File size is required',
      }),
    mimeType: Joi.string()
      .valid(
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/svg+xml',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv',
        'application/zip',
        'application/x-zip-compressed'
      )
      .required()
      .messages({
        'any.only': 'Unsupported file type',
        'any.required': 'File MIME type is required',
      }),
  });

  /**
   * Webhook validation schema
   */
  static webhookSchema = Joi.object({
    url: Joi.string()
      .uri({ scheme: ['http', 'https'] })
      .required()
      .messages({
        'string.uri': 'Webhook URL must be a valid HTTP or HTTPS URL',
        'any.required': 'Webhook URL is required',
      }),
    events: Joi.array()
      .items(
        Joi.string().valid(
          'task.created',
          'task.updated',
          'task.deleted',
          'project.created',
          'project.updated',
          'comment.created',
          'user.invited'
        )
      )
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one event must be selected',
        'any.only': 'Invalid event type',
        'any.required': 'Events are required',
      }),
    secret: Joi.string()
      .min(32)
      .max(128)
      .required()
      .messages({
        'string.min': 'Secret must be at least 32 characters',
        'string.max': 'Secret must not exceed 128 characters',
        'any.required': 'Webhook secret is required',
      }),
    active: Joi.boolean().default(true),
  });

  /**
   * Notification preference validation schema
   */
  static notificationPreferenceSchema = Joi.object({
    email: Joi.object({
      taskAssigned: Joi.boolean().default(true),
      taskCompleted: Joi.boolean().default(true),
      commentAdded: Joi.boolean().default(true),
      mentioned: Joi.boolean().default(true),
      dueDateReminder: Joi.boolean().default(true),
      weeklyDigest: Joi.boolean().default(false),
    }).default(),
    push: Joi.object({
      taskAssigned: Joi.boolean().default(true),
      taskCompleted: Joi.boolean().default(false),
      commentAdded: Joi.boolean().default(true),
      mentioned: Joi.boolean().default(true),
      dueDateReminder: Joi.boolean().default(true),
    }).default(),
    inApp: Joi.object({
      taskAssigned: Joi.boolean().default(true),
      taskCompleted: Joi.boolean().default(true),
      commentAdded: Joi.boolean().default(true),
      mentioned: Joi.boolean().default(true),
      dueDateReminder: Joi.boolean().default(true),
      projectUpdates: Joi.boolean().default(true),
    }).default(),
  });

  /**
   * Date range validation schema
   */
  static dateRangeSchema = Joi.object({
    startDate: Joi.date().iso().required().messages({
      'date.format': 'Start date must be a valid ISO date',
      'any.required': 'Start date is required',
    }),
    endDate: Joi.date()
      .iso()
      .greater(Joi.ref('startDate'))
      .required()
      .messages({
        'date.format': 'End date must be a valid ISO date',
        'date.greater': 'End date must be after start date',
        'any.required': 'End date is required',
      }),
  });

  /**
   * Bulk operation validation schema
   */
  static bulkOperationSchema = Joi.object({
    ids: Joi.array()
      .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
      .min(1)
      .max(100)
      .required()
      .messages({
        'array.min': 'At least one ID is required',
        'array.max': 'Cannot process more than 100 items at once',
        'string.pattern.base': 'Invalid ID format',
        'any.required': 'IDs are required',
      }),
    action: Joi.string()
      .valid('delete', 'archive', 'restore', 'update')
      .required()
      .messages({
        'any.only': 'Invalid bulk action',
        'any.required': 'Action is required',
      }),
    data: Joi.object().when('action', {
      is: 'update',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  });

  /**
   * Report generation validation schema
   */
  static reportGenerationSchema = Joi.object({
    type: Joi.string()
      .valid('project_summary', 'team_performance', 'task_completion', 'time_tracking')
      .required()
      .messages({
        'any.only': 'Invalid report type',
        'any.required': 'Report type is required',
      }),
    format: Joi.string()
      .valid('pdf', 'csv', 'json', 'xlsx')
      .default('pdf')
      .messages({
        'any.only': 'Invalid report format',
      }),
    dateRange: ValidationService.dateRangeSchema.required(),
    projectId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Invalid project ID format',
      }),
    includeArchived: Joi.boolean().default(false),
  });

  /**
   * API key creation validation schema
   */
  static apiKeyCreationSchema = Joi.object({
    name: Joi.string()
      .trim()
      .min(3)
      .max(100)
      .required()
      .messages({
        'string.min': 'API key name must be at least 3 characters',
        'string.max': 'API key name must not exceed 100 characters',
        'any.required': 'API key name is required',
      }),
    scopes: Joi.array()
      .items(
        Joi.string().valid(
          'read:projects',
          'write:projects',
          'read:tasks',
          'write:tasks',
          'read:users',
          'write:users',
          'read:comments',
          'write:comments',
          'admin'
        )
      )
      .min(1)
      .required()
      .messages({
        'array.min': 'At least one scope is required',
        'any.only': 'Invalid scope',
        'any.required': 'Scopes are required',
      }),
    expiresIn: Joi.number()
      .integer()
      .positive()
      .max(365)
      .optional()
      .messages({
        'number.positive': 'Expiration must be positive',
        'number.max': 'API key cannot expire in more than 365 days',
      }),
  });

  /**
   * Middleware: Validate request body
   */
  static validateBody(schema: Joi.ObjectSchema) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const validated = await schema.validateAsync(req.body, {
          abortEarly: false,
          stripUnknown: true,
        });
        req.body = validated;
        next();
      } catch (error: any) {
        const errors = error.details?.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors,
        });
      }
    };
  }

  /**
   * Middleware: Validate query parameters
   */
  static validateQuery(schema: Joi.ObjectSchema) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const validated = await schema.validateAsync(req.query, {
          abortEarly: false,
          stripUnknown: true,
        });
        req.query = validated;
        next();
      } catch (error: any) {
        const errors = error.details?.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors,
        });
      }
    };
  }

  /**
   * Middleware: Validate route parameters
   */
  static validateParams(schema: Joi.ObjectSchema) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const validated = await schema.validateAsync(req.params, {
          abortEarly: false,
          stripUnknown: true,
        });
        req.params = validated;
        next();
      } catch (error: any) {
        const errors = error.details?.map((detail: any) => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors,
        });
      }
    };
  }

  /**
   * Sanitize HTML content
   */
  static sanitizeHTML(content: string): string {
    return sanitize(content, {
      allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'code', 'pre'],
      allowedAttributes: {
        a: ['href', 'title', 'target'],
      },
      allowedSchemes: ['http', 'https', 'mailto'],
    });
  }

  /**
   * Validate MongoDB ObjectId
   */
  static isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Validate URL format
   */
  static isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): {
    valid: boolean;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 8) score += 1;
    else feedback.push('Password should be at least 8 characters long');

    if (password.length >= 12) score += 1;

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Password should contain lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Password should contain uppercase letters');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Password should contain numbers');

    if (/[@$!%*?&]/.test(password)) score += 1;
    else feedback.push('Password should contain special characters');

    return {
      valid: score >= 5,
      score,
      feedback,
    };
  }

  /**
   * Validate phone number (E.164 format)
   */
  static isValidPhoneNumber(phone: string): boolean {
    return /^\+?[1-9]\d{1,14}$/.test(phone);
  }

  /**
   * Validate date range
   */
  static isValidDateRange(startDate: Date, endDate: Date): boolean {
    return startDate < endDate && startDate <= new Date();
  }

  /**
   * Validate file extension
   */
  static isValidFileExtension(filename: string, allowedExtensions: string[]): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext ? allowedExtensions.includes(ext) : false;
  }

  /**
   * Validate credit card number (Luhn algorithm)
   */
  static isValidCreditCard(cardNumber: string): boolean {
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return false;

    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Validate IP address
   */
  static isValidIPAddress(ip: string): boolean {
    // IPv4
    const ipv4Regex =
      /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (ipv4Regex.test(ip)) return true;

    // IPv6
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv6Regex.test(ip);
  }

  /**
   * Custom validator: Check if value is unique in database
   */
  static async isUnique(
    model: any,
    field: string,
    value: any,
    excludeId?: string
  ): Promise<boolean> {
    const query: any = { [field]: value };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const existing = await model.findOne(query);
    return !existing;
  }

  /**
   * Custom validator: Check if reference exists
   */
  static async referenceExists(model: any, id: string): Promise<boolean> {
    const document = await model.findById(id);
    return !!document;
  }

  /**
   * Log validation errors for monitoring
   */
  static logValidationError(
    endpoint: string,
    errors: any[],
    req: Request
  ): void {
    logger.warn('Validation error', {
      endpoint,
      errors,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  }
}

export const validationService = ValidationService;
