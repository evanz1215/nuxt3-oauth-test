import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock useRuntimeConfig
const mockRuntimeConfig = {
  public: {
    googleClientId: 'test-google-client-id',
    appleClientId: 'test-apple-client-id',
    lineClientId: 'test-line-client-id',
    telegramBotUsername: 'test-bot',
    socialLogin: {
      redirectUri: 'http://localhost:3000/auth/callback',
      enabledPlatforms: ['google', 'apple', 'line', 'telegram']
    }
  },
  telegramBotToken: 'test-telegram-token'
}

// Mock Nuxt runtime config globally
global.useRuntimeConfig = vi.fn(() => mockRuntimeConfig)

// Mock process.server
Object.defineProperty(global, 'process', {
  value: {
    server: false
  }
})

// Import after mocking
const { useSocialConfig } = await import('../composables/useSocialConfig')

describe('useSocialConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return complete social configuration', () => {
    const { getSocialConfig } = useSocialConfig()
    const config = getSocialConfig()

    expect(config).toEqual({
      google: {
        clientId: 'test-google-client-id',
        redirectUri: 'http://localhost:3000/auth/callback'
      },
      apple: {
        clientId: 'test-apple-client-id',
        redirectUri: 'http://localhost:3000/auth/callback'
      },
      line: {
        clientId: 'test-line-client-id',
        redirectUri: 'http://localhost:3000/auth/callback'
      },
      telegram: {
        botToken: '',
        botUsername: 'test-bot'
      }
    })
  })

  it('should get platform-specific configuration', () => {
    const { getPlatformConfig } = useSocialConfig()
    
    const googleConfig = getPlatformConfig('google')
    expect(googleConfig).toEqual({
      clientId: 'test-google-client-id',
      redirectUri: 'http://localhost:3000/auth/callback'
    })

    const telegramConfig = getPlatformConfig('telegram')
    expect(telegramConfig).toEqual({
      botToken: '',
      botUsername: 'test-bot'
    })
  })

  it('should validate platform configuration', () => {
    const { validateConfig } = useSocialConfig()
    
    // Should not throw for properly configured platforms
    expect(() => validateConfig('google')).not.toThrow()
    expect(() => validateConfig('apple')).not.toThrow()
    expect(() => validateConfig('line')).not.toThrow()
  })

  it('should check if platform is enabled', () => {
    const { isPlatformEnabled } = useSocialConfig()
    
    expect(isPlatformEnabled('google')).toBe(true)
    expect(isPlatformEnabled('apple')).toBe(true)
    expect(isPlatformEnabled('line')).toBe(true)
  })

  it('should get enabled platforms list', () => {
    const { getEnabledPlatforms } = useSocialConfig()
    const enabledPlatforms = getEnabledPlatforms()
    
    expect(enabledPlatforms).toContain('google')
    expect(enabledPlatforms).toContain('apple')
    expect(enabledPlatforms).toContain('line')
  })

  it('should validate all configurations', () => {
    const { validateAllConfigs } = useSocialConfig()
    const validation = validateAllConfigs()
    
    expect(validation).toHaveProperty('valid')
    expect(validation).toHaveProperty('errors')
    expect(Array.isArray(validation.errors)).toBe(true)
  })

  it('should provide configuration status', () => {
    const { getConfigStatus } = useSocialConfig()
    const status = getConfigStatus()
    
    expect(status).toHaveProperty('config')
    expect(status).toHaveProperty('enabledPlatforms')
    expect(status).toHaveProperty('validation')
    expect(status).toHaveProperty('platformStatus')
    
    expect(status.platformStatus).toHaveProperty('google')
    expect(status.platformStatus).toHaveProperty('apple')
    expect(status.platformStatus).toHaveProperty('line')
    expect(status.platformStatus).toHaveProperty('telegram')
  })
})