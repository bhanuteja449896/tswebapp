import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { AppError } from './auth';

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const extractedErrors: Array<{ field: string; message: string }> = [];
    errors.array().forEach((err: any) => {
      extractedErrors.push({
        field: err.path || err.param,
        message: err.msg,
      });
    });

    next(
      new AppError(
        `Validation failed: ${extractedErrors.map((e) => e.message).join(', ')}`,
        400
      )
    );
  };
};

export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  // Remove any potentially dangerous characters or scripts
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        obj[key] = sanitize(obj[key]);
      }
    }
    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);

  next();
};
