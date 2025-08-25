import type { SocialPlatform, SocialError } from '../types'

/**
 * Custom error class for social login operations
 */
export class SocialLoginError extends Error {
  public readonly code: string
  public readonly platform: SocialPlatform
  public readonly details?: any

  constructor(
    code: string,
    platform: SocialPlatform,
    message: string,
    details?: any
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
 * Handle and normalize errors from different social platforms
 */
export const handleSocialError = (
  error: any,
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
  let details = error

  if (error && typeof error === 'object') {
    // Google errors
    if (error.error && platform === 'google') {
      code = mapGoogleError(error.error)
      message = error.error_description || error.error
    }
    // Apple errors
    else if (error.error && platform === 'apple') {
      code = mapAppleError(error.error)
      message = error.error_description || error.error
    }
    // Line errors
    else if (error.error && platform === 'line') {
      code = mapLineError(error.error)
      message = error.error_description || error.error
    }
    // Telegram errors
    else if (error.error && platform === 'telegram') {
      code = mapTelegramError(error.error)
      message = error.description || error.error
    }
    // Generic error object
    else if (error.message) {
      message = error.message
      code = error.code || defaultCode
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