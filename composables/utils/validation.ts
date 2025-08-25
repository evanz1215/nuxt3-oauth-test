import type { SocialPlatform, SocialConfig } from '../types'
import { createConfigError } from './errors'

/**
 * Validate that required configuration exists for a platform
 */
export const validatePlatformConfig = (
  platform: SocialPlatform,
  config: Partial<SocialConfig>
): void => {
  switch (platform) {
    case 'google':
      if (!config.google?.clientId) {
        throw createConfigError(platform, 'GOOGLE_CLIENT_ID')
      }
      break
    
    case 'apple':
      if (!config.apple?.clientId) {
        throw createConfigError(platform, 'APPLE_CLIENT_ID')
      }
      break
    
    case 'line':
      if (!config.line?.clientId) {
        throw createConfigError(platform, 'LINE_CLIENT_ID')
      }
      break
    
    case 'telegram':
      if (!config.telegram?.botToken) {
        throw createConfigError(platform, 'TELEGRAM_BOT_TOKEN')
      }
      if (!config.telegram?.botUsername) {
        throw createConfigError(platform, 'TELEGRAM_BOT_USERNAME')
      }
      break
    
    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
}

/**
 * Check if a platform supports popup mode
 */
export const supportsPlatformPopup = (platform: SocialPlatform): boolean => {
  // Telegram doesn't support popup mode, only widget mode
  return platform !== 'telegram'
}

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Sanitize user input to prevent XSS
 */
export const sanitizeString = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim()
}