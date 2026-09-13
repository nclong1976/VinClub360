import express from 'express';
import { ValidationException } from './validation';

export interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
  requestId?: string;
  timestamp: string;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorHandler(app: express.Application) {
  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
    });
  });

  // Error handler middleware (must be last)
  app.use(
    (
      err: Error | ApiError | ValidationException,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      const requestId = req.headers['x-request-id'] as string || `req-${Date.now()}`;
      const timestamp = new Date().toISOString();

      // Validation errors
      if (err instanceof ValidationException) {
        console.warn(`[Validation] ${requestId}:`, err.errors);
        return res.status(400).json({
          error: 'VALIDATION_FAILED',
          message: 'Request validation failed',
          details: err.errors,
          requestId,
          timestamp,
        });
      }

      // API errors
      if (err instanceof ApiError) {
        console.error(`[ApiError] ${requestId} (${err.statusCode}):`, err.message);
        return res.status(err.statusCode).json({
          error: err.name,
          message: err.message,
          ...(process.env.NODE_ENV !== 'production' && { details: err.details }),
          requestId,
          timestamp,
        });
      }

      // Unhandled errors
      console.error(`[UnhandledError] ${requestId}:`, err);
      res.status(500).json({
        error: 'INTERNAL_SERVER_ERROR',
        message: process.env.NODE_ENV === 'production' 
          ? 'An internal server error occurred' 
          : err.message,
        requestId,
        timestamp,
      });
    }
  );
}
