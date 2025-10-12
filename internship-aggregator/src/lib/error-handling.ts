// Comprehensive error handling utilities
import { NextResponse } from 'next/server';

// Error types
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  RATE_LIMITED = 'RATE_LIMITED',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

// Custom error classes
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;
  public readonly timestamp: string;
  public readonly requestId?: string;

  constructor(
    message: string,
    type: ErrorType = ErrorType.INTERNAL_ERROR,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    
    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.name = this.constructor.name;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorType.VALIDATION_ERROR, 400, true, context);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(message, ErrorType.NOT_FOUND, 404, true, { resource, id });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, ErrorType.UNAUTHORIZED, 401, true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden') {
    super(message, ErrorType.FORBIDDEN, 403, true);
  }
}

export class RateLimitError extends AppError {
  constructor(limit: number, windowMs: number) {
    super(
      `Rate limit exceeded: ${limit} requests per ${windowMs}ms`,
      ErrorType.RATE_LIMITED,
      429,
      true,
      { limit, windowMs }
    );
  }
}

export class ExternalApiError extends AppError {
  constructor(service: string, originalError?: Error, context?: Record<string, any>) {
    super(
      `External API error from ${service}: ${originalError?.message || 'Unknown error'}`,
      ErrorType.EXTERNAL_API_ERROR,
      502,
      true,
      { service, originalError: originalError?.message, ...context }
    );
  }
}

export class DatabaseError extends AppError {
  constructor(operation: string, originalError?: Error) {
    super(
      `Database error during ${operation}: ${originalError?.message || 'Unknown error'}`,
      ErrorType.DATABASE_ERROR,
      500,
      true,
      { operation, originalError: originalError?.message }
    );
  }
}

export class NetworkError extends AppError {
  constructor(url: string, originalError?: Error) {
    super(
      `Network error for ${url}: ${originalError?.message || 'Connection failed'}`,
      ErrorType.NETWORK_ERROR,
      503,
      true,
      { url, originalError: originalError?.message }
    );
  }
}

export class TimeoutError extends AppError {
  constructor(operation: string, timeoutMs: number) {
    super(
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      ErrorType.TIMEOUT_ERROR,
      408,
      true,
      { operation, timeoutMs }
    );
  }
}

// Error handler for API routes
export function handleApiError(error: unknown, requestId?: string): NextResponse {
  // Generate request ID if not provided
  const id = requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Log error
  console.error(`[${id}] API Error:`, error);

  // Handle known error types
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          type: error.type,
          message: error.message,
          requestId: id,
          timestamp: error.timestamp,
          ...(process.env.NODE_ENV === 'development' && {
            context: error.context,
            stack: error.stack,
          }),
        },
      },
      { status: error.statusCode }
    );
  }

  // Handle validation errors from Zod or similar
  if (error && typeof error === 'object' && 'issues' in error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          type: ErrorType.VALIDATION_ERROR,
          message: 'Validation failed',
          requestId: id,
          timestamp: new Date().toISOString(),
          details: error.issues,
        },
      },
      { status: 400 }
    );
  }

  // Handle unknown errors
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  
  return NextResponse.json(
    {
      success: false,
      error: {
        type: ErrorType.INTERNAL_ERROR,
        message: process.env.NODE_ENV === 'development' ? message : 'Internal server error',
        requestId: id,
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && {
          stack: error instanceof Error ? error.stack : undefined,
        }),
      },
    },
    { status: 500 }
  );
}

// Async error wrapper for API routes
export function asyncHandler(
  handler: (req: Request, context?: any) => Promise<NextResponse>
) {
  return async (req: Request, context?: any): Promise<NextResponse> => {
    try {
      return await handler(req, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

// Retry utility with exponential backoff
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 10000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        baseDelayMs * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelayMs
      );

      console.warn(`Operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, lastError.message);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// Circuit breaker pattern
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly recoveryTimeMs: number = 60000,
    private readonly monitoringPeriodMs: number = 120000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeMs) {
        this.state = 'HALF_OPEN';
      } else {
        throw new AppError(
          'Circuit breaker is OPEN - service temporarily unavailable',
          ErrorType.EXTERNAL_API_ERROR,
          503
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState(): string {
    return this.state;
  }

  getFailureCount(): number {
    return this.failures;
  }
}

// Error reporting utility
export class ErrorReporter {
  private static instance: ErrorReporter;
  private circuitBreaker = new CircuitBreaker(3, 30000);

  static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter();
    }
    return ErrorReporter.instance;
  }

  async reportError(error: Error | AppError, context?: Record<string, any>): Promise<void> {
    try {
      await this.circuitBreaker.execute(async () => {
        const errorReport = {
          message: error.message,
          stack: error.stack,
          type: error instanceof AppError ? error.type : ErrorType.INTERNAL_ERROR,
          timestamp: new Date().toISOString(),
          context: {
            ...context,
            ...(error instanceof AppError ? error.context : {}),
          },
          environment: process.env.NODE_ENV,
          userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
        };

        // In production, send to error reporting service
        if (process.env.NODE_ENV === 'production') {
          // Example: await errorReportingService.captureException(errorReport);
          console.error('Error reported:', errorReport);
        } else {
          console.error('Development error:', errorReport);
        }
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }
}

// Global error handler setup
export function setupGlobalErrorHandling(): void {
  if (typeof window !== 'undefined') {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      ErrorReporter.getInstance().reportError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        { type: 'unhandledrejection' }
      );
    });

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      console.error('Uncaught error:', event.error);
      ErrorReporter.getInstance().reportError(
        event.error || new Error(event.message),
        { 
          type: 'uncaughterror',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        }
      );
    });
  }
}

// Utility functions
export function isOperationalError(error: unknown): boolean {
  return error instanceof AppError && error.isOperational;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function getErrorType(error: unknown): ErrorType {
  if (error instanceof AppError) {
    return error.type;
  }
  return ErrorType.INTERNAL_ERROR;
}