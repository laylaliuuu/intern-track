// Comprehensive logging system with structured logging and correlation IDs
import { ErrorType } from './error-handling';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    type?: ErrorType;
  };
  environment: string;
  service: string;
  version?: string;
}

export interface LogTransport {
  log(entry: LogEntry): Promise<void>;
}

// Console transport for development
class ConsoleTransport implements LogTransport {
  async log(entry: LogEntry): Promise<void> {
    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
    const levelName = levelNames[entry.level];
    
    const colors = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m',  // Green
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.FATAL]: '\x1b[35m', // Magenta
    };
    
    const reset = '\x1b[0m';
    const color = colors[entry.level] || '';
    
    const prefix = `${color}[${entry.timestamp}] ${levelName}${reset}`;
    const contextStr = entry.context.requestId ? ` [${entry.context.requestId}]` : '';
    
    console.log(`${prefix}${contextStr} ${entry.message}`);
    
    if (entry.context.metadata && Object.keys(entry.context.metadata).length > 0) {
      console.log('  Context:', entry.context.metadata);
    }
    
    if (entry.error) {
      console.error('  Error:', entry.error);
    }
  }
}

// HTTP transport for production logging services
class HttpTransport implements LogTransport {
  constructor(
    private endpoint: string,
    private apiKey?: string,
    private batchSize: number = 10,
    private flushInterval: number = 5000
  ) {
    this.setupBatching();
  }

  private batch: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;

  async log(entry: LogEntry): Promise<void> {
    this.batch.push(entry);
    
    if (this.batch.length >= this.batchSize) {
      await this.flush();
    }
  }

  private setupBatching(): void {
    this.flushTimer = setInterval(() => {
      if (this.batch.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  private async flush(): Promise<void> {
    if (this.batch.length === 0) return;

    const entries = [...this.batch];
    this.batch = [];

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        },
        body: JSON.stringify({ logs: entries }),
      });

      if (!response.ok) {
        console.error('Failed to send logs to remote service:', response.statusText);
        // In case of failure, we could implement a retry mechanism or fallback
      }
    } catch (error) {
      console.error('Error sending logs:', error);
    }
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush(); // Final flush
  }
}

// Main logger class
export class Logger {
  private static instance: Logger;
  private transports: LogTransport[] = [];
  private context: LogContext = {};
  private minLevel: LogLevel = LogLevel.INFO;

  constructor() {
    // Set up default transports based on environment
    if (typeof window === 'undefined') {
      // Server-side
      this.addTransport(new ConsoleTransport());
      
      if (process.env.NODE_ENV === 'production' && process.env.LOG_ENDPOINT) {
        this.addTransport(new HttpTransport(
          process.env.LOG_ENDPOINT,
          process.env.LOG_API_KEY
        ));
      }
    } else {
      // Client-side
      if (process.env.NODE_ENV === 'development') {
        this.addTransport(new ConsoleTransport());
      }
    }

    // Set log level based on environment
    this.minLevel = process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  setContext(context: Partial<LogContext>): void {
    this.context = { ...this.context, ...context };
  }

  clearContext(): void {
    this.context = {};
  }

  withContext(context: Partial<LogContext>): Logger {
    const logger = new Logger();
    logger.transports = this.transports;
    logger.minLevel = this.minLevel;
    logger.context = { ...this.context, ...context };
    return logger;
  }

  private async log(level: LogLevel, message: string, context: Partial<LogContext> = {}, error?: Error): Promise<void> {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...context },
      environment: process.env.NODE_ENV || 'development',
      service: 'internship-aggregator',
      version: process.env.npm_package_version,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          type: (error as any).type,
        },
      }),
    };

    // Send to all transports
    await Promise.all(
      this.transports.map(transport => 
        transport.log(entry).catch(err => 
          console.error('Transport error:', err)
        )
      )
    );
  }

  debug(message: string, context?: Partial<LogContext>): Promise<void> {
    return this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Partial<LogContext>): Promise<void> {
    return this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Partial<LogContext>): Promise<void> {
    return this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: Partial<LogContext>): Promise<void> {
    return this.log(LogLevel.ERROR, message, context, error);
  }

  fatal(message: string, error?: Error, context?: Partial<LogContext>): Promise<void> {
    return this.log(LogLevel.FATAL, message, context, error);
  }
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private static measurements = new Map<string, number>();

  static startTimer(name: string): void {
    this.measurements.set(name, performance.now());
  }

  static endTimer(name: string): number {
    const start = this.measurements.get(name);
    if (!start) {
      console.warn(`No timer found for: ${name}`);
      return 0;
    }

    const duration = performance.now() - start;
    this.measurements.delete(name);
    
    // Log performance metrics
    Logger.getInstance().info(`Performance: ${name}`, {
      action: 'performance_measurement',
      duration,
      metadata: { operation: name }
    });

    return duration;
  }

  static async measure<T>(name: string, operation: () => Promise<T>): Promise<T> {
    this.startTimer(name);
    try {
      const result = await operation();
      return result;
    } finally {
      this.endTimer(name);
    }
  }
}

// Request correlation utilities
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Middleware for request logging
export function createRequestLogger() {
  return (req: Request, context?: any) => {
    const requestId = generateRequestId();
    const logger = Logger.getInstance().withContext({
      requestId,
      component: 'api',
      metadata: {
        method: req.method,
        url: req.url,
        userAgent: req.headers.get('user-agent'),
      }
    });

    const startTime = performance.now();

    logger.info('Request started', {
      action: 'request_start',
    });

    return {
      requestId,
      logger,
      end: (statusCode: number, error?: Error) => {
        const duration = performance.now() - startTime;
        
        if (error) {
          logger.error('Request failed', error, {
            action: 'request_error',
            duration,
            metadata: { statusCode }
          });
        } else {
          logger.info('Request completed', {
            action: 'request_complete',
            duration,
            metadata: { statusCode }
          });
        }
      }
    };
  };
}

// Metrics collection
export class MetricsCollector {
  private static metrics = new Map<string, number>();
  private static counters = new Map<string, number>();

  static increment(name: string, value: number = 1): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
  }

  static gauge(name: string, value: number): void {
    this.metrics.set(name, value);
  }

  static getMetrics(): Record<string, number> {
    return {
      ...Object.fromEntries(this.metrics),
      ...Object.fromEntries(this.counters),
    };
  }

  static reset(): void {
    this.metrics.clear();
    this.counters.clear();
  }
}

// Health check utilities
export interface HealthCheck {
  name: string;
  check: () => Promise<{ healthy: boolean; details?: any }>;
}

export class HealthMonitor {
  private checks: HealthCheck[] = [];

  addCheck(check: HealthCheck): void {
    this.checks.push(check);
  }

  async runChecks(): Promise<{
    healthy: boolean;
    checks: Record<string, { healthy: boolean; details?: any; duration: number }>;
  }> {
    const results: Record<string, { healthy: boolean; details?: any; duration: number }> = {};
    let overallHealthy = true;

    await Promise.all(
      this.checks.map(async (check) => {
        const start = performance.now();
        try {
          const result = await check.check();
          results[check.name] = {
            ...result,
            duration: performance.now() - start,
          };
          
          if (!result.healthy) {
            overallHealthy = false;
          }
        } catch (error) {
          results[check.name] = {
            healthy: false,
            details: { error: error instanceof Error ? error.message : String(error) },
            duration: performance.now() - start,
          };
          overallHealthy = false;
        }
      })
    );

    return { healthy: overallHealthy, checks: results };
  }
}

// Export singleton instances
export const logger = Logger.getInstance();
export const healthMonitor = new HealthMonitor();

// Setup default health checks
healthMonitor.addCheck({
  name: 'database',
  check: async () => {
    // This would check database connectivity
    // For now, just return healthy
    return { healthy: true, details: { connection: 'ok' } };
  },
});

healthMonitor.addCheck({
  name: 'external_apis',
  check: async () => {
    // This would check external API connectivity (Exa.ai, etc.)
    return { healthy: true, details: { exa_api: 'ok' } };
  },
});

// Utility functions
export function logApiCall(
  service: string,
  endpoint: string,
  method: string,
  duration: number,
  success: boolean,
  error?: Error
): void {
  const logger = Logger.getInstance();
  
  if (success) {
    logger.info(`API call successful: ${service}`, {
      component: 'external_api',
      action: 'api_call',
      duration,
      metadata: {
        service,
        endpoint,
        method,
        success: true,
      },
    });
  } else {
    logger.error(`API call failed: ${service}`, error, {
      component: 'external_api',
      action: 'api_call',
      duration,
      metadata: {
        service,
        endpoint,
        method,
        success: false,
      },
    });
  }

  // Update metrics
  MetricsCollector.increment(`api_calls_${service}_total`);
  MetricsCollector.increment(`api_calls_${service}_${success ? 'success' : 'error'}`);
  MetricsCollector.gauge(`api_calls_${service}_duration`, duration);
}