# Error Handling Usage Examples

This document demonstrates how to use the enhanced error handling and retry mechanisms in the social login system.

## Basic Error Handling

```typescript
import { useSocial } from '~/composables/useSocial'
import { SocialErrorCodes } from '~/composables/utils/errors'

const { loginWithGoogle } = useSocial()

try {
  const result = await loginWithGoogle({ popup: true })
  if (result.success) {
    console.log('Login successful:', result.user)
  }
} catch (error) {
  if (error.code === SocialErrorCodes.USER_CANCELLED) {
    console.log('User cancelled the login')
  } else if (error.code === SocialErrorCodes.POPUP_BLOCKED) {
    console.log('Popup was blocked, try redirect mode')
    // Retry with redirect mode
    const retryResult = await loginWithGoogle({ popup: false })
  } else {
    console.error('Login failed:', error.message)
  }
}
```

## Custom Retry Configuration

```typescript
import { useSocial } from '~/composables/useSocial'
import { SocialErrorCodes } from '~/composables/utils/errors'

const { loginWithGoogle } = useSocial()

// Custom retry configuration for more aggressive retries
const customRetryConfig = {
  maxRetries: 5,
  baseDelay: 2000,
  maxDelay: 30000,
  backoffMultiplier: 1.5,
  retryableErrors: [
    SocialErrorCodes.NETWORK_ERROR,
    SocialErrorCodes.API_ERROR,
    SocialErrorCodes.TIMEOUT_ERROR,
    SocialErrorCodes.SDK_LOAD_FAILED
  ]
}

try {
  const result = await loginWithGoogle({ 
    popup: true,
    retryConfig: customRetryConfig
  })
  console.log('Login successful with custom retry:', result.user)
} catch (error) {
  console.error('Login failed after custom retries:', error)
}
```

## Using Circuit Breaker

```typescript
import { 
  executeWithCircuitBreaker,
  getCircuitBreakerStatus,
  resetCircuitBreaker
} from '~/composables/utils/errors'

// Check circuit breaker status before attempting login
const status = getCircuitBreakerStatus('google')
if (status.state === 'open') {
  console.warn('Google login service is temporarily unavailable')
  // Show alternative login options or retry later message
} else {
  try {
    const result = await executeWithCircuitBreaker(
      () => loginWithGoogle({ popup: true }),
      'google',
      'google-login'
    )
    console.log('Login successful:', result)
  } catch (error) {
    console.error('Login failed:', error)
  }
}

// Reset circuit breaker if needed (e.g., after service recovery)
resetCircuitBreaker('google')
```

## Robust Operation Execution

```typescript
import { executeRobustOperation, DEFAULT_RETRY_CONFIGS } from '~/composables/utils/errors'

// Execute login with full error handling, retry, and circuit breaker protection
try {
  const result = await executeRobustOperation(
    () => loginWithGoogle({ popup: true }),
    'google',
    'google-popup-login',
    DEFAULT_RETRY_CONFIGS.login,
    true // Enable circuit breaker
  )
  console.log('Robust login successful:', result)
} catch (error) {
  console.error('All recovery attempts failed:', error)
  // Show user-friendly error message
}
```

## Custom Error Logger

```typescript
import { setErrorLogger, type ErrorLogger } from '~/composables/utils/errors'

// Custom logger that sends errors to analytics service
class AnalyticsErrorLogger implements ErrorLogger {
  logError(error: SocialError, context?: Record<string, unknown>): void {
    // Send to analytics service
    analytics.track('social_login_error', {
      platform: error.platform,
      code: error.code,
      message: error.message,
      context
    })
    
    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[SocialLogin] Error:', error)
    }
  }

  logRetry(error: SocialError, attempt: number, maxRetries: number): void {
    analytics.track('social_login_retry', {
      platform: error.platform,
      code: error.code,
      attempt,
      maxRetries
    })
  }

  logRecovery(error: SocialError, strategy: string, success: boolean): void {
    analytics.track('social_login_recovery', {
      platform: error.platform,
      code: error.code,
      strategy,
      success
    })
  }

  logMetrics(error: SocialError, duration?: number): void {
    analytics.track('social_login_metrics', {
      platform: error.platform,
      errorCode: error.code,
      duration
    })
  }
}

// Set the custom logger
setErrorLogger(new AnalyticsErrorLogger())
```

## Error Recovery Strategies

```typescript
import { 
  attemptErrorRecovery,
  ERROR_RECOVERY_STRATEGIES,
  type ErrorRecoveryStrategy
} from '~/composables/utils/errors'

// Custom recovery strategy
const customRecoveryStrategy: ErrorRecoveryStrategy = {
  canRecover: (error) => error.code === SocialErrorCodes.INVALID_CONFIG,
  recover: async (error) => {
    // Attempt to reload configuration
    await refreshSocialConfig()
  },
  description: 'Reload social configuration'
}

// Use recovery strategies
try {
  const result = await loginWithGoogle({ popup: true })
} catch (error) {
  console.log('Login failed, attempting recovery...')
  
  const recovered = await attemptErrorRecovery(
    error.toSocialError(),
    [customRecoveryStrategy, ...Object.values(ERROR_RECOVERY_STRATEGIES)]
  )
  
  if (recovered) {
    console.log('Recovery successful, retrying login...')
    try {
      const retryResult = await loginWithGoogle({ popup: true })
      console.log('Retry after recovery successful:', retryResult)
    } catch (retryError) {
      console.error('Retry after recovery failed:', retryError)
    }
  } else {
    console.error('Recovery failed, showing error to user')
  }
}
```

## Error Statistics and Monitoring

```typescript
import { 
  getErrorStatistics,
  clearErrorStatistics,
  getAllCircuitBreakerStatuses
} from '~/composables/utils/errors'

// Get error statistics for monitoring dashboard
const errorStats = getErrorStatistics()
console.log('Error statistics:', errorStats)

// Get circuit breaker statuses
const circuitBreakerStatuses = getAllCircuitBreakerStatuses()
console.log('Circuit breaker statuses:', circuitBreakerStatuses)

// Clear statistics (useful for testing or periodic cleanup)
clearErrorStatistics()
```

## Handling Specific Error Scenarios

### Popup Blocked Scenario

```typescript
import { SocialErrorCodes } from '~/composables/utils/errors'

try {
  const result = await loginWithGoogle({ popup: true })
} catch (error) {
  if (error.code === SocialErrorCodes.POPUP_BLOCKED) {
    // Show user instructions and retry with redirect
    showPopupBlockedMessage()
    const redirectResult = await loginWithGoogle({ popup: false })
    return redirectResult
  }
  throw error
}
```

### Network Error with Exponential Backoff

```typescript
import { retryOperationWithLogging, DEFAULT_RETRY_CONFIGS } from '~/composables/utils/errors'

const networkRetryConfig = {
  ...DEFAULT_RETRY_CONFIGS.login,
  maxRetries: 5,
  baseDelay: 1000,
  backoffMultiplier: 2
}

try {
  const result = await retryOperationWithLogging(
    () => loginWithGoogle({ popup: true }),
    networkRetryConfig,
    'google',
    'google-network-retry'
  )
} catch (error) {
  console.error('Network retry failed:', error)
}
```

### SDK Loading Failure Recovery

```typescript
import { SocialErrorCodes, ERROR_RECOVERY_STRATEGIES } from '~/composables/utils/errors'

try {
  const result = await loginWithGoogle({ popup: true })
} catch (error) {
  if (error.code === SocialErrorCodes.SDK_LOAD_FAILED) {
    console.log('SDK loading failed, attempting recovery...')
    
    // Use the built-in SDK reload recovery strategy
    const recovered = await ERROR_RECOVERY_STRATEGIES.sdkReload.recover(error.toSocialError())
    
    if (recovered) {
      // Wait a bit for SDK to reload, then retry
      await new Promise(resolve => setTimeout(resolve, 2000))
      const retryResult = await loginWithGoogle({ popup: true })
      return retryResult
    }
  }
  throw error
}
```

## Best Practices

1. **Always handle specific error codes** rather than generic error handling
2. **Use appropriate retry configurations** for different operations
3. **Monitor circuit breaker states** to detect service issues early
4. **Implement custom error logging** for production monitoring
5. **Provide fallback options** when primary login methods fail
6. **Clear error statistics periodically** to prevent storage bloat
7. **Test error scenarios** thoroughly in development

## Error Code Reference

- `MISSING_CLIENT_ID`: Configuration missing
- `INVALID_CONFIG`: Invalid configuration
- `NETWORK_ERROR`: Network connectivity issues
- `API_ERROR`: API service errors
- `USER_CANCELLED`: User cancelled the operation
- `AUTHORIZATION_FAILED`: Authorization was denied
- `INVALID_TOKEN`: Token is invalid or expired
- `SDK_LOAD_FAILED`: Failed to load platform SDK
- `SDK_NOT_READY`: SDK not ready for use
- `POPUP_BLOCKED`: Popup was blocked by browser
- `POPUP_CLOSED`: Popup was closed by user
- `UNKNOWN_ERROR`: Unidentified error
- `TIMEOUT_ERROR`: Operation timed out