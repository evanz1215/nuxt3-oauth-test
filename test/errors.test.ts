import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  SocialLoginError,
  SocialErrorCodes,
  handleSocialError,
  handleSocialErrorWithLogging,
  retryOperation,
  retryOperationWithLogging,
  isRetryableError,
  calculateRetryDelay,
  attemptErrorRecovery,
  CircuitBreaker,
  CircuitBreakerState,
  executeWithCircuitBreaker,
  executeRobustOperation,
  DEFAULT_RETRY_CONFIGS,
  ConsoleErrorLogger,
  getErrorStatistics,
  clearErrorStatistics
} from '../composables/utils/errors'
import type { SocialPlatform, SocialError } from '../composables/types'

// Mock console methods
const mockConsole = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn()
}

// Mock console methods
Object.defineProperty(global, 'console', {
  value: mockConsole
})

// Mock storage
const mockStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  key: vi.fn(),
  length: 0
}

// Mock window and storage globals
Object.defineProperty(global, 'window', {
  value: {
    localStorage: mockStorage,
    sessionStorage: mockStorage
  },
  writable: true
})

Object.defineProperty(global, 'localStorage', {
  value: mockStorage,
  writable: true
})

Object.defineProperty(global, 'sessionStorage', {
  value: mockStorage,
  writable: true
})

describe('SocialLoginError', () => {
  it('should create error with correct properties', () => {
    const error = new SocialLoginError(
      SocialErrorCodes.USER_CANCELLED,
      'google',
      'User cancelled login',
      { extra: 'data' }
    )

    expect(error.code).toBe(SocialErrorCodes.USER_CANCELLED)
    expect(error.platform).toBe('google')
    expect(error.message).toBe('User cancelled login')
    expect(error.details).toEqual({ extra: 'data' })
    expect(error.name).toBe('SocialLoginError')
  })

  it('should convert to SocialError interface', () => {
    const error = new SocialLoginError(
      SocialErrorCodes.NETWORK_ERROR,
      'apple',
      'Network failed'
    )

    const socialError = error.toSocialError()
    expect(socialError).toEqual({
      code: SocialErrorCodes.NETWORK_ERROR,
      platform: 'apple',
      message: 'Network failed',
      details: undefined
    })
  })
})

describe('handleSocialError', () => {
  it('should handle SocialLoginError instances', () => {
    const originalError = new SocialLoginError(
      SocialErrorCodes.API_ERROR,
      'line',
      'API failed'
    )

    const result = handleSocialError(originalError, 'line')
    expect(result).toEqual(originalError.toSocialError())
  })

  it('should handle Google platform errors', () => {
    const googleError = {
      error: 'popup_closed_by_user',
      error_description: 'User closed popup'
    }

    const result = handleSocialError(googleError, 'google')
    expect(result.code).toBe(SocialErrorCodes.USER_CANCELLED)
    expect(result.message).toBe('User closed popup')
    expect(result.platform).toBe('google')
  })

  it('should handle Apple platform errors', () => {
    const appleError = {
      error: 'user_cancelled_authorize',
      error_description: 'User cancelled'
    }

    const result = handleSocialError(appleError, 'apple')
    expect(result.code).toBe(SocialErrorCodes.USER_CANCELLED)
    expect(result.message).toBe('User cancelled')
    expect(result.platform).toBe('apple')
  })

  it('should handle string errors', () => {
    const result = handleSocialError('Something went wrong', 'telegram')
    expect(result.message).toBe('Something went wrong')
    expect(result.platform).toBe('telegram')
    expect(result.code).toBe(SocialErrorCodes.UNKNOWN_ERROR)
  })

  it('should handle generic error objects', () => {
    const genericError = {
      message: 'Generic error',
      code: 'CUSTOM_ERROR'
    }

    const result = handleSocialError(genericError, 'line')
    expect(result.message).toBe('Generic error')
    expect(result.code).toBe('CUSTOM_ERROR')
    expect(result.platform).toBe('line')
  })
})

describe('retry mechanism', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should succeed on first try', async () => {
    const operation = vi.fn().mockResolvedValue('success')
    const config = DEFAULT_RETRY_CONFIGS.login

    const result = await retryOperation(operation, config)
    expect(result).toBe('success')
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('should retry on retryable errors', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new SocialLoginError(
        SocialErrorCodes.NETWORK_ERROR,
        'google',
        'Network failed'
      ))
      .mockResolvedValue('success')

    const config = DEFAULT_RETRY_CONFIGS.login

    const result = await retryOperation(operation, config)
    expect(result).toBe('success')
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it('should not retry on non-retryable errors', async () => {
    const operation = vi.fn().mockRejectedValue(new SocialLoginError(
      SocialErrorCodes.USER_CANCELLED,
      'google',
      'User cancelled'
    ))

    const config = DEFAULT_RETRY_CONFIGS.login

    await expect(retryOperation(operation, config)).rejects.toThrow('User cancelled')
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('should fail after max retries', async () => {
    const operation = vi.fn().mockRejectedValue(new SocialLoginError(
      SocialErrorCodes.NETWORK_ERROR,
      'google',
      'Network failed'
    ))

    const config = { ...DEFAULT_RETRY_CONFIGS.login, maxRetries: 2 }

    await expect(retryOperation(operation, config)).rejects.toThrow(/failed after 2 retries/)
    expect(operation).toHaveBeenCalledTimes(3) // Initial + 2 retries
  })
})

describe('isRetryableError', () => {
  it('should identify retryable errors', () => {
    const error: SocialError = {
      code: SocialErrorCodes.NETWORK_ERROR,
      message: 'Network failed',
      platform: 'google'
    }

    const config = DEFAULT_RETRY_CONFIGS.login
    expect(isRetryableError(error, config)).toBe(true)
  })

  it('should identify non-retryable errors', () => {
    const error: SocialError = {
      code: SocialErrorCodes.USER_CANCELLED,
      message: 'User cancelled',
      platform: 'google'
    }

    const config = DEFAULT_RETRY_CONFIGS.login
    expect(isRetryableError(error, config)).toBe(false)
  })
})

describe('calculateRetryDelay', () => {
  const config = DEFAULT_RETRY_CONFIGS.login

  it('should calculate exponential backoff', () => {
    const delay1 = calculateRetryDelay(0, config, false)
    const delay2 = calculateRetryDelay(1, config, false)
    const delay3 = calculateRetryDelay(2, config, false)

    expect(delay1).toBe(1000) // baseDelay
    expect(delay2).toBe(2000) // baseDelay * 2^1
    expect(delay3).toBe(4000) // baseDelay * 2^2
  })

  it('should respect max delay', () => {
    const delay = calculateRetryDelay(10, config, false)
    expect(delay).toBe(config.maxDelay)
  })

  it('should add jitter when enabled', () => {
    const delay1 = calculateRetryDelay(0, config, true)
    const delay2 = calculateRetryDelay(0, config, true)

    // With jitter, delays should be different
    expect(delay1).not.toBe(delay2)
    expect(delay1).toBeGreaterThanOrEqual(1000)
    expect(delay1).toBeLessThanOrEqual(2000)
  })
})

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      recoveryTimeout: 1000,
      successThreshold: 2
    })
  })

  it('should start in closed state', () => {
    const status = circuitBreaker.getStatus()
    expect(status.state).toBe(CircuitBreakerState.CLOSED)
    expect(status.failures).toBe(0)
  })

  it('should open after failure threshold', async () => {
    const failingOperation = vi.fn().mockRejectedValue(new Error('Failed'))

    // Fail 3 times to reach threshold
    for (let i = 0; i < 3; i++) {
      await expect(circuitBreaker.execute(failingOperation, 'google')).rejects.toThrow()
    }

    const status = circuitBreaker.getStatus()
    expect(status.state).toBe(CircuitBreakerState.OPEN)
    expect(status.failures).toBe(3)
  })

  it('should fail fast when open', async () => {
    const failingOperation = vi.fn().mockRejectedValue(new Error('Failed'))

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      await expect(circuitBreaker.execute(failingOperation, 'google')).rejects.toThrow()
    }

    // Should fail fast without calling operation
    await expect(circuitBreaker.execute(failingOperation, 'google')).rejects.toThrow(/Circuit breaker is OPEN/)
    expect(failingOperation).toHaveBeenCalledTimes(3) // Only the initial failures
  })

  it('should transition to half-open after recovery timeout', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('Failed'))
      .mockRejectedValueOnce(new Error('Failed'))
      .mockRejectedValueOnce(new Error('Failed'))
      .mockResolvedValue('success')

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      await expect(circuitBreaker.execute(operation, 'google')).rejects.toThrow()
    }

    // Wait for recovery timeout
    await new Promise(resolve => setTimeout(resolve, 1100))

    // Should try again and succeed
    const result = await circuitBreaker.execute(operation, 'google')
    expect(result).toBe('success')

    const status = circuitBreaker.getStatus()
    expect(status.state).toBe(CircuitBreakerState.HALF_OPEN)
  })

  it('should close after successful operations in half-open state', async () => {
    const operation = vi.fn().mockResolvedValue('success')

    // Manually set to half-open state
    circuitBreaker['state'] = CircuitBreakerState.HALF_OPEN

    // Execute successful operations
    await circuitBreaker.execute(operation, 'google')
    await circuitBreaker.execute(operation, 'google')

    const status = circuitBreaker.getStatus()
    expect(status.state).toBe(CircuitBreakerState.CLOSED)
  })
})

describe('ConsoleErrorLogger', () => {
  let logger: ConsoleErrorLogger

  beforeEach(() => {
    vi.clearAllMocks()
    logger = new ConsoleErrorLogger()
  })

  it('should log errors with context', () => {
    const error: SocialError = {
      code: SocialErrorCodes.NETWORK_ERROR,
      message: 'Network failed',
      platform: 'google'
    }

    const context = { userId: '123', action: 'login' }
    logger.logError(error, context)

    expect(mockConsole.error).toHaveBeenCalledWith(
      '[SocialLogin] Error:',
      expect.objectContaining({
        platform: 'google',
        code: SocialErrorCodes.NETWORK_ERROR,
        message: 'Network failed',
        context
      })
    )
  })

  it('should log retry attempts', () => {
    const error: SocialError = {
      code: SocialErrorCodes.NETWORK_ERROR,
      message: 'Network failed',
      platform: 'google'
    }

    logger.logRetry(error, 2, 3)

    expect(mockConsole.warn).toHaveBeenCalledWith(
      '[SocialLogin] Retry 2/3 for google:',
      expect.objectContaining({
        code: SocialErrorCodes.NETWORK_ERROR,
        message: 'Network failed'
      })
    )
  })

  it('should log recovery attempts', () => {
    const error: SocialError = {
      code: SocialErrorCodes.SDK_LOAD_FAILED,
      message: 'SDK failed',
      platform: 'apple'
    }

    logger.logRecovery(error, 'sdkReload', true)

    expect(mockConsole.info).toHaveBeenCalledWith(
      '[SocialLogin] Recovery succeeded:',
      expect.objectContaining({
        platform: 'apple',
        code: SocialErrorCodes.SDK_LOAD_FAILED,
        strategy: 'sdkReload',
        success: true
      })
    )
  })
})

describe('executeRobustOperation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should execute operation successfully', async () => {
    const operation = vi.fn().mockResolvedValue('success')

    const result = await executeRobustOperation(
      operation,
      'google',
      'test-operation'
    )

    expect(result).toBe('success')
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('should retry and recover from failures', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new SocialLoginError(
        SocialErrorCodes.NETWORK_ERROR,
        'google',
        'Network failed'
      ))
      .mockResolvedValue('success')

    const result = await executeRobustOperation(
      operation,
      'google',
      'test-operation',
      { ...DEFAULT_RETRY_CONFIGS.login, maxRetries: 1 }
    )

    expect(result).toBe('success')
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it('should use circuit breaker when enabled', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Always fails'))

    // Disable retries to test circuit breaker directly
    const config = { ...DEFAULT_RETRY_CONFIGS.login, maxRetries: 0 }

    // Fail enough times to open circuit breaker
    for (let i = 0; i < 5; i++) {
      await expect(executeRobustOperation(
        operation,
        'google',
        'test-operation',
        config,
        true
      )).rejects.toThrow()
    }

    // Should now fail fast due to circuit breaker
    await expect(executeRobustOperation(
      operation,
      'google',
      'test-operation',
      config,
      true
    )).rejects.toThrow(/Circuit breaker is OPEN/)
  })
})

describe('error statistics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset storage mock
    mockStorage.length = 0
    mockStorage.getItem.mockReturnValue(null)
    mockStorage.key.mockReturnValue(null)
  })

  it('should track error statistics', () => {
    // Mock sessionStorage to have error data
    mockStorage.getItem.mockImplementation((key) => {
      if (key === 'social_error_google_NETWORK_ERROR') return '3'
      return null
    })
    mockStorage.key.mockImplementation((index) => {
      if (index === 0) return 'social_error_google_NETWORK_ERROR'
      return null
    })
    mockStorage.length = 1

    const stats = getErrorStatistics()
    expect(stats['social_error_google_NETWORK_ERROR']).toBe(3)
  })

  it('should clear error statistics', () => {
    // Mock sessionStorage to have error data
    mockStorage.key.mockImplementation((index) => {
      if (index === 0) return 'social_error_google_NETWORK_ERROR'
      return null
    })
    mockStorage.length = 1

    clearErrorStatistics()

    expect(mockStorage.removeItem).toHaveBeenCalledWith('social_error_google_NETWORK_ERROR')
    expect(mockStorage.removeItem).toHaveBeenCalledWith('social_login_metrics')
  })

  it('should handle empty statistics gracefully', () => {
    mockStorage.length = 0
    mockStorage.getItem.mockReturnValue('[]')

    const stats = getErrorStatistics()
    expect(stats.totalErrors).toBe(0)
    expect(stats.recentErrors).toBe(0)
  })
})