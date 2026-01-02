// Circuit breaker pattern implementation for API resilience
export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, requests are blocked
  HALF_OPEN = 'HALF_OPEN' // Testing if service has recovered
}

export interface CircuitBreakerOptions {
  failureThreshold: number;    // Number of failures before opening circuit
  recoveryTimeout: number;     // Time to wait before trying again (ms)
  monitoringPeriod: number;    // Time window for failure counting (ms)
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;
  private requestCount = 0;
  private readonly options: CircuitBreakerOptions;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      recoveryTimeout: options.recoveryTimeout || 300000, // 5 minutes
      monitoringPeriod: options.monitoringPeriod || 60000, // 1 minute
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Check if circuit should attempt reset
   */
  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime > this.options.recoveryTimeout;
  }

  /**
   * Handle successful request
   */
  private onSuccess(): void {
    this.successCount++;
    this.requestCount++;
    
    if (this.state === CircuitState.HALF_OPEN) {
      // If we get enough successes in half-open state, close the circuit
      if (this.successCount >= 3) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        console.log('Circuit breaker: Service recovered, circuit CLOSED');
      }
    } else {
      // Reset failure count on success
      this.failureCount = 0;
    }
  }

  /**
   * Handle failed request
   */
  private onFailure(): void {
    this.failureCount++;
    this.requestCount++;
    this.lastFailureTime = Date.now();

    // Check if we should open the circuit
    if (this.shouldOpenCircuit()) {
      this.state = CircuitState.OPEN;
      console.warn(`Circuit breaker: Circuit OPENED after ${this.failureCount} failures`);
    }
  }

  /**
   * Check if circuit should be opened
   */
  private shouldOpenCircuit(): boolean {
    // Open if failure rate is too high
    const failureRate = this.failureCount / this.requestCount;
    return failureRate > 0.5 && this.failureCount >= this.options.failureThreshold;
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    requestCount: number;
    failureRate: number;
    lastFailureTime: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      requestCount: this.requestCount,
      failureRate: this.requestCount > 0 ? this.failureCount / this.requestCount : 0,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.requestCount = 0;
    this.lastFailureTime = 0;
    console.log('Circuit breaker: Manually reset to CLOSED');
  }
}

// Export a default instance for Exa API
export const exaCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  recoveryTimeout: 300000, // 5 minutes
  monitoringPeriod: 60000,  // 1 minute
});


