import type { ErrorHandler } from 'hono';
import type { Env, Variables } from '../types.js';

/**
 * Known error codes
 */
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
} as const;

/**
 * Application error class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppError';
  }

  static notFound(resource: string): AppError {
    return new AppError(`${resource} not found`, ErrorCodes.NOT_FOUND, 404);
  }

  static badRequest(message: string): AppError {
    return new AppError(message, ErrorCodes.BAD_REQUEST, 400);
  }

  static unauthorized(message: string = 'Unauthorized'): AppError {
    return new AppError(message, ErrorCodes.UNAUTHORIZED, 401);
  }

  static forbidden(message: string = 'Forbidden'): AppError {
    return new AppError(message, ErrorCodes.FORBIDDEN, 403);
  }
}

/**
 * Global error handler
 */
export const errorHandler: ErrorHandler<{ Bindings: Env; Variables: Variables }> = (
  err,
  c
) => {
  console.error('[API Error]', {
    requestId: c.get('requestId'),
    error: err.message,
    stack: err.stack,
  });

  // Handle known application errors
  if (err instanceof AppError) {
    return c.json(
      {
        success: false,
        error: err.message,
        code: err.code,
      },
      err.statusCode as any
    );
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    return c.json(
      {
        success: false,
        error: 'Validation failed',
        code: ErrorCodes.VALIDATION_ERROR,
        details: (err as any).errors,
      },
      400
    );
  }

  // Handle unknown errors
  const isDev = c.env.ENVIRONMENT === 'local';

  return c.json(
    {
      success: false,
      error: isDev ? err.message : 'Internal server error',
      code: ErrorCodes.INTERNAL_ERROR,
      ...(isDev && { stack: err.stack }),
    },
    500
  );
};
