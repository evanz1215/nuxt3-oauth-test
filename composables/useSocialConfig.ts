import type { SocialConfig, SocialPlatform } from './types'
import { validatePlatformConfig } from './utils/validation'
import { createConfigError } from './utils/errors'

/**
 * Social login configuration management composable
 */
export const useSocialConfig = () => {
  const config = useRuntimeConfig()
  
  /**
   * Get the complete social configuration from runtime config
   */
  const getSocialConfig = (): SocialConfig => {
    return {
      google: {
        clientId: config.public.googleClientId,
        redirectUri: config.public.socialLogin.redirectUri
      },
      apple: {
        clientId: config.public.appleClientId,
        redirectUri: config.public.socialLogin.redirectUri
      },
      line: {
        clientId: config.public.lineClientId,
        redirectUri: config.public.socialLogin.redirectUri
      },
      telegram: {
        botToken: process.server ? config.telegramBotToken : '',
        botUsername: config.public.telegramBotUsername
      }
    }
  }

  /**
   * Get configuration for a specific platform
   */
  const getPlatformConfig = (platform: SocialPlatform) => {
    const socialConfig = getSocialConfig()
    
    switch (platform) {
      case 'google':
        return socialConfig.google
      case 'apple':
        return socialConfig.apple
      case 'line':
        return socialConfig.line
      case 'telegram':
        return socialConfig.telegram
      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }
  }

  /**
   * Validate configuration for a specific platform
   */
  const validateConfig = (platform: SocialPlatform): void => {
    const socialConfig = getSocialConfig()
    validatePlatformConfig(platform, socialConfig)
  }

  /**
   * Check if a platform is enabled and properly configured
   */
  const isPlatformEnabled = (platform: SocialPlatform): boolean => {
    try {
      const enabledPlatforms = config.public.socialLogin.enabledPlatforms
      
      // Check if platform is in enabled list
      if (!enabledPlatforms.includes(platform)) {
        return false
      }
      
      // Validate configuration
      validateConfig(platform)
      return true
    } catch {
      return false
    }
  }

  /**
   * Get list of all enabled and configured platforms
   */
  const getEnabledPlatforms = (): SocialPlatform[] => {
    const allPlatforms: SocialPlatform[] = ['google', 'apple', 'line', 'telegram']
    return allPlatforms.filter(platform => isPlatformEnabled(platform))
  }

  /**
   * Validate all enabled platforms configuration
   */
  const validateAllConfigs = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = []
    const enabledPlatforms = config.public.socialLogin.enabledPlatforms as SocialPlatform[]
    
    for (const platform of enabledPlatforms) {
      try {
        validateConfig(platform)
      } catch (error) {
        if (error instanceof Error) {
          errors.push(`${platform}: ${error.message}`)
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Get configuration validation status for debugging
   */
  const getConfigStatus = () => {
    const socialConfig = getSocialConfig()
    const enabledPlatforms = config.public.socialLogin.enabledPlatforms as SocialPlatform[]
    
    return {
      config: socialConfig,
      enabledPlatforms,
      validation: validateAllConfigs(),
      platformStatus: {
        google: isPlatformEnabled('google'),
        apple: isPlatformEnabled('apple'),
        line: isPlatformEnabled('line'),
        telegram: isPlatformEnabled('telegram')
      }
    }
  }

  return {
    getSocialConfig,
    getPlatformConfig,
    validateConfig,
    isPlatformEnabled,
    getEnabledPlatforms,
    validateAllConfigs,
    getConfigStatus
  }
}