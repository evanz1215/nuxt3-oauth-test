import type { SocialPlatform, SocialError } from '../types'

/**
 * Custom error class for social login operations
 */
export class SocialLoginError extends Error {
  public readonly code: string
  public readonly platform: SocialPlatform
  public readonly details?: unknown

  constructor(
    code: string,
    platform: SocialPlatform,
    message: string,
    details?: unknown
  ) {
    super(message)
    this.name = 'SocialLoginError'
    this.code = code
    this.platform = platform
    this.details = details
  }

  /**
   * Convert to SocialError interface
   */
  toSocialError(): SocialError {
    return {
      code: this.code,
      message: this.message,
      platform: this.platform,
      details: this.details
    }
  }
}

/**
 * Error codes for different types of social login errors
 */
export const SocialErrorCodes = {
  // Configuration errors
  MISSING_CLIENT_ID: 'MISSING_CLIENT_ID',
  INVALID_CONFIG: 'INVALID_CONFIG',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR',
  
  // Authorization errors
  USER_CANCELLED: 'USER_CANCELLED',
  AUTHORIZATION_FAILED: 'AUTHORIZATION_FAILED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  
  // Platform specific errors
  SDK_LOAD_FAILED: 'SDK_LOAD_FAILED',
  SDK_NOT_READY: 'SDK_NOT_READY',
  
  // Popup errors
  POPUP_BLOCKED: 'POPUP_BLOCKED',
  POPUP_CLOSED: 'POPUP_CLOSED',
  
  // Generic errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR'
} as const

export type SocialErrorCode = typeof SocialErrorCodes[keyof typeof SocialErrorCodes]

/**
 * Type guard for error objects with common properties
 */
interface ErrorWithMessage {
  message?: string
  code?: string
}

interface PlatformError {
  error?: string
  error_description?: string
  description?: string
}

/**
 * Handle and normalize errors from different social platforms
 */
export const handleSocialError = (
  error: unknown,
  platform: SocialPlatform,
  defaultCode: SocialErrorCode = SocialErrorCodes.UNKNOWN_ERROR
): SocialError => {
  // If it's already a SocialLoginError, return its SocialError representation
  if (error instanceof SocialLoginError) {
    return error.toSocialError()
  }

  // Handle different error formats from various platforms
  let code = defaultCode
  let message = 'An unknown error occurred'
  const details = error

  if (error && typeof error === 'object') {
    const platformError = error as PlatformError
    const errorWithMessage = error as ErrorWithMessage
    
    // Google errors
    if (platformError.error && platform === 'google') {
      code = mapGoogleError(platformError.error)
      message = platformError.error_description || platformError.error
    }
    // Apple errors
    else if (platformError.error && platform === 'apple') {
      code = mapAppleError(platformError.error)
      message = platformError.error_description || platformError.error
    }
    // Line errors
    else if (platformError.error && platform === 'line') {
      code = mapLineError(platformError.error)
      message = platformError.error_description || platformError.error
    }
    // Telegram errors
    else if (platformError.error && platform === 'telegram') {
      code = mapTelegramError(platformError.error)
      message = platformError.description || platformError.error
    }
    // Generic error object
    else if (errorWithMessage.message) {
      message = errorWithMessage.message
      code = errorWithMessage.code || defaultCode
    }
  } else if (typeof error === 'string') {
    message = error
  }

  return {
    code,
    message,
    platform,
    details
  }
}

/**
 * Map Google-specific error codes to our standard error codes
 */
const mapGoogleError = (googleError: string): SocialErrorCode => {
  switch (googleError) {
    case 'popup_closed_by_user':
    case 'popup_closed':
      return SocialErrorCodes.USER_CANCELLED
    case 'popup_blocked_by_browser':
    case 'popup_blocked':
      return SocialErrorCodes.POPUP_BLOCKED
    case 'access_denied':
    case 'user_denied':
      return SocialErrorCodes.AUTHORIZATION_FAILED
    case 'invalid_client':
    case 'unauthorized_client':
      return SocialErrorCodes.INVALID_CONFIG
    case 'invalid_request':
      return SocialErrorCodes.INVALID_CONFIG
    case 'network_error':
      return SocialErrorCodes.NETWORK_ERROR
    case 'timeout':
      return SocialErrorCodes.TIMEOUT_ERROR
    default:
      return SocialErrorCodes.UNKNOWN_ERROR
  }
}

/**
 * Map Apple-specific error codes to our standard error codes
 */
const mapAppleError = (appleError: string): SocialErrorCode => {
  switch (appleError) {
    case 'user_cancelled_authorize':
      return SocialErrorCodes.USER_CANCELLED
    case 'popup_closed_by_user':
      return SocialErrorCodes.USER_CANCELLED
    case 'invalid_client':
      return SocialErrorCodes.INVALID_CONFIG
    default:
      return SocialErrorCodes.UNKNOWN_ERROR
  }
}

/**
 * Map Line-specific error codes to our standard error codes
 */
const mapLineError = (lineError: string): SocialErrorCode => {
  switch (lineError) {
    case 'access_denied':
      return SocialErrorCodes.USER_CANCELLED
    case 'invalid_client':
      return SocialErrorCodes.INVALID_CONFIG
    case 'server_error':
      return SocialErrorCodes.API_ERROR
    default:
      return SocialErrorCodes.UNKNOWN_ERROR
  }
}

/**
 * Map Telegram-specific error codes to our standard error codes
 */
const mapTelegramError = (telegramError: string): SocialErrorCode => {
  switch (telegramError) {
    case 'user_cancelled':
      return SocialErrorCodes.USER_CANCELLED
    case 'invalid_bot_token':
      return SocialErrorCodes.INVALID_CONFIG
    default:
      return SocialErrorCodes.UNKNOWN_ERROR
  }
}

/**
 * Create a standardized error for missing configuration
 */
export const createConfigError = (
  platform: SocialPlatform,
  missingField: string
): SocialLoginError => {
  return new SocialLoginError(
    SocialErrorCodes.MISSING_CLIENT_ID,
    platform,
    `Missing ${missingField} for ${platform} login. Please check your environment configuration.`,
    { missingField }
  )
}

/**
 * Create a standardized error for SDK loading failures
 */
export const createSDKError = (
  platform: SocialPlatform,
  details?: unknown
): SocialLoginError => {
  return new SocialLoginError(
    SocialErrorCodes.SDK_LOAD_FAILED,
    platform,
    `Failed to load ${platform} SDK. Please check your network connection and configuration.`,
    details
  )
}

/**
 * Retry configuration for different types of operations
 */
export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  retryableErrors: SocialErrorCode[]
}

/**
 * Default retry configurations for different operation types
 */
export const DEFAULT_RETRY_CONFIGS = {
  login: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableErrors: [
      SocialErrorCodes.NETWORK_ERROR,
      SocialErrorCodes.API_ERROR,
      SocialErrorCodes.TIMEOUT_ERROR,
      SocialErrorCodes.SDK_LOAD_FAILED
    ]
  },
  logout: {
    maxRetries: 2,
    baseDelay: 500,
    maxDelay: 5000,
    backoffMultiplier: 2,
    retryableErrors: [
      SocialErrorCodes.NETWORK_ERROR,
      SocialErrorCodes.API_ERROR
    ]
  },
  tokenRefresh: {
    maxRetries: 5,
    baseDelay: 2000,
    maxDelay: 30000,
    backoffMultiplier: 1.5,
    retryableErrors: [
      SocialErrorCodes.NETWORK_ERROR,
      SocialErrorCodes.API_ERROR,
      SocialErrorCodes.TIMEOUT_ERROR
    ]
  }
} as const

/**
 * Check if an error is retryable based on configuration
 */
export const isRetryableError = (error: SocialError, config: RetryConfig): boolean => {
  return config.retryableErrors.includes(error.code)
}

/**
 * Calculate delay for retry with exponential backoff
 */
export const calculateRetryDelay = (
  attempt: number,
  config: RetryConfig,
  jitter: boolean = true
): number => {
  const delay = Math.min(
    config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelay
  )
  
  // Add jitter to prevent thundering herd
  if (jitter) {
    return delay + Math.random() * 1000
  }
  
  return delay
}

/**
 * Sleep utility for retry delays
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Enhanced retry mechanism with exponential backoff and jitter
 */
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  onRetry?: (attempt: number, error: SocialError) => void
): Promise<T> => {
  let lastError: SocialError | null = null
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      const socialError = error instanceof SocialLoginError 
        ? error.toSocialError()
        : handleSocialError(error, 'unknown' as SocialPlatform)
      
      lastError = socialError
      
      // Don't retry on the last attempt or if error is not retryable
      if (attempt === config.maxRetries || !isRetryableError(socialError, config)) {
        break
      }
      
      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, socialError)
      }
      
      // Wait before retrying
      const delay = calculateRetryDelay(attempt, config)
      await sleep(delay)
    }
  }
  
  // If we get here, all retries failed
  throw new SocialLoginError(
    lastError?.code || SocialErrorCodes.UNKNOWN_ERROR,
    lastError?.platform || 'unknown' as SocialPlatform,
    `Operation failed after ${config.maxRetries} retries. Last error: ${lastError?.message}`,
    { originalError: lastError, retryCount: config.maxRetries }
  )
}

/**
 * Error recovery strategies
 */
export interface ErrorRecoveryStrategy {
  canRecover: (error: SocialError) => boolean
  recover: (error: SocialError) => Promise<void>
  description: string
}

/**
 * Built-in error recovery strategies
 */
export const ERROR_RECOVERY_STRATEGIES: Record<string, ErrorRecoveryStrategy> = {
  sdkReload: {
    canRecover: (error) => error.code === SocialErrorCodes.SDK_LOAD_FAILED,
    recover: async (error) => {
      // Force reload the SDK by clearing any cached instances
      if (typeof window !== 'undefined') {
        // Clear any cached SDK instances
        const platform = error.platform
        const sdkSelectors = {
          google: 'script[src*="accounts.google.com"]',
          apple: 'script[src*="appleid.cdn-apple.com"]',
          line: 'script[src*="static.line-scdn.net"]',
          telegram: 'script[src*="telegram.org"]'
        }
        
        const selector = sdkSelectors[platform]
        if (selector) {
          const existingScript = document.querySelector(selector)
          if (existingScript) {
            existingScript.remove()
          }
        }
      }
    },
    description: 'Reload SDK scripts and clear cache'
  },
  
  clearStorage: {
    canRecover: (error) => [
      SocialErrorCodes.INVALID_TOKEN,
      SocialErrorCodes.AUTHORIZATION_FAILED
    ].includes(error.code),
    recover: async (error) => {
      // Clear any stored tokens or auth data
      if (typeof window !== 'undefined' && window.localStorage) {
        const platform = error.platform
        const storageKeys = [
          `${platform}_token`,
          `${platform}_user`,
          `${platform}_auth`,
          `social_${platform}_data`
        ]
        
        storageKeys.forEach(key => {
          localStorage.removeItem(key)
        })
      }
    },
    description: 'Clear stored authentication data'
  },
  
  refreshPage: {
    canRecover: (error) => [
      SocialErrorCodes.SDK_NOT_READY,
      SocialErrorCodes.UNKNOWN_ERROR
    ].includes(error.code),
    recover: async () => {
      // This is a last resort - suggest page refresh
      if (typeof window !== 'undefined') {
        console.warn('Suggesting page refresh for error recovery')
        // Don't actually refresh automatically, just prepare for it
      }
    },
    description: 'Suggest page refresh as last resort'
  }
}

/**
 * Error logging and monitoring interface
 */
export interface ErrorLogger {
  logError: (error: SocialError, context?: Record<string, unknown>) => void
  logRetry: (error: SocialError, attempt: number, maxRetries: number) => void
  logRecovery: (error: SocialError, strategy: string, success: boolean) => void
  logMetrics: (error: SocialError, duration?: number) => void
}

/**
 * Default console-based error logger
 */
export class ConsoleErrorLogger implements ErrorLogger {
  private readonly prefix = '[SocialLogin]'

  logError(error: SocialError, context?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString()
    const logData = {
      timestamp,
      platform: error.platform,
      code: error.code,
      message: error.message,
      details: error.details,
      context
    }
    
    console.error(`${this.prefix} Error:`, logData)
    
    // Track error frequency for monitoring
    this.trackErrorFrequency(error)
  }

  logRetry(error: SocialError, attempt: number, maxRetries: number): void {
    console.warn(`${this.prefix} Retry ${attempt}/${maxRetries} for ${error.platform}:`, {
      code: error.code,
      message: error.message
    })
  }

  logRecovery(error: SocialError, strategy: string, success: boolean): void {
    const level = success ? 'info' : 'warn'
    console[level](`${this.prefix} Recovery ${success ? 'succeeded' : 'failed'}:`, {
      platform: error.platform,
      code: error.code,
      strategy,
      success
    })
  }

  logMetrics(error: SocialError, duration?: number): void {
    const metrics = {
      platform: error.platform,
      errorCode: error.code,
      timestamp: Date.now(),
      duration
    }
    
    console.debug(`${this.prefix} Metrics:`, metrics)
    
    // Store metrics for analysis (in a real app, this would go to analytics)
    this.storeMetrics(metrics)
  }

  private trackErrorFrequency(error: SocialError): void {
    if (typeof window !== 'undefined') {
      const key = `social_error_${error.platform}_${error.code}`
      const count = parseInt(sessionStorage.getItem(key) || '0') + 1
      sessionStorage.setItem(key, count.toString())
      
      // Alert if error frequency is high
      if (count >= 5) {
        console.warn(`${this.prefix} High error frequency detected:`, {
          platform: error.platform,
          code: error.code,
          count
        })
      }
    }
  }

  private storeMetrics(metrics: Record<string, unknown>): void {
    if (typeof window !== 'undefined') {
      try {
        const key = 'social_login_metrics'
        const existing = JSON.parse(localStorage.getItem(key) || '[]')
        existing.push(metrics)
        
        // Keep only last 100 metrics to prevent storage bloat
        if (existing.length > 100) {
          existing.splice(0, existing.length - 100)
        }
        
        localStorage.setItem(key, JSON.stringify(existing))
      } catch (e) {
        // Ignore storage errors
      }
    }
  }
}

/**
 * Global error logger instance
 */
export const errorLogger: ErrorLogger = new ConsoleErrorLogger()

/**
 * Set a custom error logger
 */
export const setErrorLogger = (logger: ErrorLogger): void => {
  Object.assign(errorLogger, logger)
}

/**
 * Enhanced error handling with logging
 */
export const handleSocialErrorWithLogging = (
  error: unknown,
  platform: SocialPlatform,
  context?: Record<string, unknown>,
  defaultCode: SocialErrorCode = SocialErrorCodes.UNKNOWN_ERROR
): SocialError => {
  const socialError = handleSocialError(error, platform, defaultCode)
  errorLogger.logError(socialError, context)
  return socialError
}

/**
 * Enhanced retry operation with logging and monitoring
 */
export const retryOperationWithLogging = async <T>(
  operation: () => Promise<T>,
  config: RetryConfig,
  platform: SocialPlatform,
  operationName: string = 'operation'
): Promise<T> => {
  const startTime = Date.now()
  let lastError: SocialError | null = null
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await operation()
      
      // Log success metrics if there were previous failures
      if (lastError) {
        errorLogger.logMetrics(lastError, Date.now() - startTime)
      }
      
      return result
    } catch (error) {
      const socialError = error instanceof SocialLoginError 
        ? error.toSocialError()
        : handleSocialError(error, platform)
      
      lastError = socialError
      
      // Log the error with context
      errorLogger.logError(socialError, {
        operation: operationName,
        attempt: attempt + 1,
        maxRetries: config.maxRetries
      })
      
      // Don't retry on the last attempt or if error is not retryable
      if (attempt === config.maxRetries || !isRetryableError(socialError, config)) {
        break
      }
      
      // Log retry attempt
      errorLogger.logRetry(socialError, attempt + 1, config.maxRetries)
      
      // Wait before retrying
      const delay = calculateRetryDelay(attempt, config)
      await sleep(delay)
    }
  }
  
  // Log final failure metrics
  if (lastError) {
    errorLogger.logMetrics(lastError, Date.now() - startTime)
  }
  
  // If we get here, all retries failed
  throw new SocialLoginError(
    lastError?.code || SocialErrorCodes.UNKNOWN_ERROR,
    lastError?.platform || platform,
    `${operationName} failed after ${config.maxRetries} retries. Last error: ${lastError?.message}`,
    { originalError: lastError, retryCount: config.maxRetries }
  )
}

/**
 * Attempt to recover from an error using available strategies
 */
export const attemptErrorRecovery = async (
  error: SocialError,
  strategies: ErrorRecoveryStrategy[] = Object.values(ERROR_RECOVERY_STRATEGIES)
): Promise<boolean> => {
  for (const strategy of strategies) {
    if (strategy.canRecover(error)) {
      try {
        await strategy.recover(error)
        errorLogger.logRecovery(error, strategy.description, true)
        return true
      } catch (recoveryError) {
        errorLogger.logRecovery(error, strategy.description, false)
        console.warn(`Recovery strategy failed: ${strategy.description}`, recoveryError)
      }
    }
  }
  
  return false
}

/**
 * Get error statistics for monitoring
 */
export const getErrorStatistics = (): Record<string, unknown> => {
  if (typeof window === 'undefined') {
    return {}
  }

  const stats: Record<string, unknown> = {}
  
  // Get error frequency data
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)
    if (key?.startsWith('social_error_')) {
      const count = parseInt(sessionStorage.getItem(key) || '0')
      stats[key] = count
    }
  }
  
  // Get metrics data
  try {
    const metrics = JSON.parse(localStorage.getItem('social_login_metrics') || '[]')
    stats.totalErrors = metrics.length
    stats.recentErrors = metrics.filter((m: any) => 
      Date.now() - m.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
    ).length
  } catch (e) {
    // Ignore parsing errors
  }
  
  return stats
}

/**
 * Clear error statistics (useful for testing or reset)
 */
export const clearErrorStatistics = (): void => {
  if (typeof window === 'undefined') {
    return
  }

  // Clear error frequency data
  const keysToRemove: string[] = []
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i)
    if (key?.startsWith('social_error_')) {
      keysToRemove.push(key)
    }
  }
  
  keysToRemove.forEach(key => sessionStorage.removeItem(key))
  
  // Clear metrics data
  localStorage.removeItem('social_login_metrics')
}
/**

 * Circuit breaker states
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Failing fast
  HALF_OPEN = 'half_open' // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number    // Number of failures before opening
  recoveryTimeout: number     // Time to wait before trying again (ms)
  monitoringPeriod: number    // Time window for failure counting (ms)
  successThreshold: number    // Successes needed to close from half-open
}

/**
 * Circuit breaker for preventing cascading failures
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED
  private failures: number = 0
  private successes: number = 0
  private lastFailureTime: number = 0
  private readonly config: CircuitBreakerConfig

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 300000, // 5 minutes
      successThreshold: 3,
      ...config
    }
  }

  /**
   * Execute an operation through the circuit breaker
   */
  async execute<T>(
    operation: () => Promise<T>,
    platform: SocialPlatform,
    operationName: string = 'operation'
  ): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() - this.lastFailureTime < this.config.recoveryTimeout) {
        throw new SocialLoginError(
          SocialErrorCodes.API_ERROR,
          platform,
          `Circuit breaker is OPEN for ${operationName}. Service temporarily unavailable.`,
          { circuitBreakerState: this.state }
        )
      } else {
        // Try to recover
        this.state = CircuitBreakerState.HALF_OPEN
        this.successes = 0
        errorLogger.logRecovery(
          { code: 'CIRCUIT_BREAKER', message: 'Attempting recovery', platform, details: {} },
          'circuit_breaker_recovery',
          true
        )
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  /**
   * Handle successful operation
   */
  private onSuccess(): void {
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successes++
      if (this.successes >= this.config.successThreshold) {
        this.state = CircuitBreakerState.CLOSED
        this.failures = 0
        this.successes = 0
      }
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Reset failure count on success in closed state
      this.failures = 0
    }
  }

  /**
   * Handle failed operation
   */
  private onFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Go back to open state
      this.state = CircuitBreakerState.OPEN
      this.successes = 0
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Check if we should open the circuit
      if (this.failures >= this.config.failureThreshold) {
        this.state = CircuitBreakerState.OPEN
      }
    }
  }

  /**
   * Get current circuit breaker status
   */
  getStatus(): {
    state: CircuitBreakerState
    failures: number
    successes: number
    lastFailureTime: number
  } {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime
    }
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED
    this.failures = 0
    this.successes = 0
    this.lastFailureTime = 0
  }
}

/**
 * Global circuit breakers for each platform
 */
const circuitBreakers: Record<SocialPlatform, CircuitBreaker> = {
  google: new CircuitBreaker(),
  apple: new CircuitBreaker(),
  line: new CircuitBreaker(),
  telegram: new CircuitBreaker()
}

/**
 * Execute operation with circuit breaker protection
 */
export const executeWithCircuitBreaker = async <T>(
  operation: () => Promise<T>,
  platform: SocialPlatform,
  operationName: string = 'operation'
): Promise<T> => {
  const circuitBreaker = circuitBreakers[platform]
  return circuitBreaker.execute(operation, platform, operationName)
}

/**
 * Get circuit breaker status for a platform
 */
export const getCircuitBreakerStatus = (platform: SocialPlatform) => {
  return circuitBreakers[platform].getStatus()
}

/**
 * Reset circuit breaker for a platform
 */
export const resetCircuitBreaker = (platform: SocialPlatform): void => {
  circuitBreakers[platform].reset()
}

/**
 * Get all circuit breaker statuses
 */
export const getAllCircuitBreakerStatuses = () => {
  const statuses: Record<SocialPlatform, ReturnType<CircuitBreaker['getStatus']>> = {} as unknown
  
  for (const platform of Object.keys(circuitBreakers) as SocialPlatform[]) {
    statuses[platform] = circuitBreakers[platform].getStatus()
  }
  
  return statuses
}

/**
 * Enhanced operation executor with full error handling, retry, and circuit breaker
 */
export const executeRobustOperation = async <T>(
  operation: () => Promise<T>,
  platform: SocialPlatform,
  operationName: string = 'operation',
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIGS.login,
  enableCircuitBreaker: boolean = true
): Promise<T> => {
  const wrappedOperation = enableCircuitBreaker
    ? () => executeWithCircuitBreaker(operation, platform, operationName)
    : operation

  try {
    return await retryOperationWithLogging(
      wrappedOperation,
      retryConfig,
      platform,
      operationName
    )
  } catch (error) {
    // Attempt error recovery as last resort
    if (error instanceof SocialLoginError) {
      const recovered = await attemptErrorRecovery(error.toSocialError())
      if (recovered) {
        // Try once more after recovery
        try {
          return await wrappedOperation()
        } catch (recoveryError) {
          // If still failing after recovery, throw original error
          throw error
        }
      }
    }
    
    throw error
  }
}