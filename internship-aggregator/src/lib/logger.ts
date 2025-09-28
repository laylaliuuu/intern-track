// Structured logging utility for ingestion and application events
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export interface LogContext {
  component?: string;
  operation?: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatLogEntry(entry: LogEntry): string {
    if (this.isDevelopment) {
      // Pretty format for development
      const timestamp = new Date(entry.timestamp).toLocaleTimeString();
      const level = entry.level.toUpperCase().padEnd(5);
      const component = entry.context?.component ? `[${entry.context.component}]` : '';
      const operation = entry.context?.operation ? `(${entry.context.operation})` : '';
      
      let message = `${timestamp} ${level} ${component}${operation} ${entry.message}`;
      
      if (entry.context?.metadata) {
        message += ` ${JSON.stringify(entry.context.metadata)}`;
      }
      
      if (entry.error) {
        message += `\nError: ${entry.error.message}`;
        if (entry.error.stack) {
          message += `\n${entry.error.stack}`;
        }
      }
      
      return message;
    } else {
      // JSON format for production
      return JSON.stringify(entry);
    }
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    const formattedMessage = this.formatLogEntry(entry);

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext, error?: Error): void {
    this.log(LogLevel.WARN, message, context, error);
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  // Specialized logging methods for ingestion
  ingestionStart(type: string, options: Record<string, unknown>): void {
    this.info('Ingestion started', {
      component: 'ingestion',
      operation: 'start',
      metadata: { type, ...options }
    });
  }

  ingestionComplete(type: string, metrics: Record<string, unknown>): void {
    this.info('Ingestion completed', {
      component: 'ingestion',
      operation: 'complete',
      metadata: { type, ...metrics }
    });
  }

  ingestionError(type: string, error: Error, context?: Record<string, unknown>): void {
    this.error('Ingestion failed', {
      component: 'ingestion',
      operation: 'error',
      metadata: { type, ...context }
    }, error);
  }

  apiRequest(method: string, path: string, statusCode: number, duration: number): void {
    this.info('API request', {
      component: 'api',
      operation: 'request',
      metadata: { method, path, statusCode, duration }
    });
  }

  dataFetch(source: string, count: number, duration: number): void {
    this.info('Data fetch completed', {
      component: 'data-fetcher',
      operation: 'fetch',
      metadata: { source, count, duration }
    });
  }

  normalization(processed: number, successful: number, failed: number, duration: number): void {
    this.info('Normalization completed', {
      component: 'normalization',
      operation: 'normalize',
      metadata: { processed, successful, failed, duration }
    });
  }

  databaseOperation(operation: string, table: string, count: number, duration: number): void {
    this.info('Database operation', {
      component: 'database',
      operation,
      metadata: { table, count, duration }
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const log = {
  debug: (message: string, context?: LogContext) => logger.debug(message, context),
  info: (message: string, context?: LogContext) => logger.info(message, context),
  warn: (message: string, context?: LogContext, error?: Error) => logger.warn(message, context, error),
  error: (message: string, context?: LogContext, error?: Error) => logger.error(message, context, error),
  
  // Specialized methods
  ingestionStart: (type: string, options: Record<string, unknown>) => logger.ingestionStart(type, options),
  ingestionComplete: (type: string, metrics: Record<string, unknown>) => logger.ingestionComplete(type, metrics),
  ingestionError: (type: string, error: Error, context?: Record<string, unknown>) => logger.ingestionError(type, error, context),
  apiRequest: (method: string, path: string, statusCode: number, duration: number) => logger.apiRequest(method, path, statusCode, duration),
  dataFetch: (source: string, count: number, duration: number) => logger.dataFetch(source, count, duration),
  normalization: (processed: number, successful: number, failed: number, duration: number) => logger.normalization(processed, successful, failed, duration),
  databaseOperation: (operation: string, table: string, count: number, duration: number) => logger.databaseOperation(operation, table, count, duration)
};