import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { validate } from '../../../src/middleware/validation';

jest.mock('express-validator');

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {},
      query: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    nextFunction = jest.fn();
    jest.clearAllMocks();
  });

  it('should call next if validation passes', () => {
    (validationResult as unknown as jest.Mock).mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    validate(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
  });

  it('should return 400 if validation fails', () => {
    const errors = [
      {
        msg: 'Email is required',
        param: 'email',
        location: 'body',
      },
      {
        msg: 'Password must be at least 8 characters',
        param: 'password',
        location: 'body',
      },
    ];

    (validationResult as unknown as jest.Mock).mockReturnValue({
      isEmpty: () => false,
      array: () => errors,
    });

    validate(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      errors: errors,
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it('should format validation errors correctly', () => {
    const errors = [
      {
        msg: 'Invalid value',
        param: 'username',
        location: 'body',
        value: '  ',
      },
    ];

    (validationResult as unknown as jest.Mock).mockReturnValue({
      isEmpty: () => false,
      array: () => errors,
    });

    validate(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      errors: expect.arrayContaining([
        expect.objectContaining({
          msg: 'Invalid value',
          param: 'username',
        }),
      ]),
    });
  });
});
