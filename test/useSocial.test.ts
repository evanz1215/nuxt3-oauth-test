import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSocial } from '../composables/useSocial'
import type { SocialLoginResult, SocialUser } from '../composables/types'

// Create mock functions that will be reused
const mockGoogleLogin = vi.fn()
const mockAppleLogin = vi.fn()
const mockLineLogin = vi.fn()
const mockTelegramLogin = vi.fn()
const mockGoogleLogout = vi.fn()
const mockAppleLogout = vi.fn()
const mockLineLogout = vi.fn()
const mockTelegramLogout = vi.fn()
const mockGoogleIsRedirectCallback = vi.fn(() => false)
const mockGoogleHandleRedirectCallback = vi.fn()
const mockSetUser = vi.fn()
const mockSetLoginState = vi.fn()
const mockClearAuthState = vi.fn()
const mockGlobalLogout = vi.fn()
const mockIsPlatformAuthenticated = vi.fn(() => false)

// Mock the individual platform composables
vi.mock('../composables/useGoogle', () => ({
  useGoogle: vi.fn(() => ({
    isReady: { value: true },
    isLoading: { value: false },
    user: { value: null },
    login: mockGoogleLogin,
    logout: mockGoogleLogout,
    handleRedirectCallback: mockGoogleHandleRedirectCallback,
    isRedirectCallback: mockGoogleIsRedirectCallback,
  }))
}))

vi.mock('../composables/useApple', () => ({
  useApple: vi.fn(() => ({
    isReady: { value: true },
    isLoading: { value: false },
    user: { value: null },
    login: mockAppleLogin,
    logout: mockAppleLogout,
    handleRedirectCallback: vi.fn(),
    isRedirectCallback: vi.fn(() => false),
  }))
}))

vi.mock('../composables/useLine', () => ({
  useLine: vi.fn(() => ({
    isReady: { value: true },
    isLoading: { value: false },
    user: { value: null },
    login: mockLineLogin,
    logout: mockLineLogout,
    handleRedirectCallback: vi.fn(),
    isRedirectCallback: vi.fn(() => false),
  }))
}))

vi.mock('../composables/useTelegram', () => ({
  useTelegram: vi.fn(() => ({
    isReady: { value: true },
    isLoading: { value: false },
    user: { value: null },
    login: mockTelegramLogin,
    logout: mockTelegramLogout,
    handleRedirectCallback: vi.fn(),
    isRedirectCallback: vi.fn(() => false),
  }))
}))

// Mock the state management
vi.mock('../composables/useSocialState', () => ({
  useSocialState: vi.fn(() => ({
    currentUser: { value: null },
    loginState: { value: { isLoading: false } },
    authenticatedPlatforms: { value: [] },
    isAuthenticated: { value: false },
    currentPlatform: { value: null },
    setUser: mockSetUser,
    setLoginState: mockSetLoginState,
    clearAuthState: mockClearAuthState,
    logout: mockGlobalLogout,
    isPlatformAuthenticated: mockIsPlatformAuthenticated,
    // Enhanced state management methods
    getPlatformState: vi.fn(() => ({ isAuthenticated: false, user: null, isLoading: false })),
    setPlatformLoading: vi.fn(),
    getAllPlatformStates: vi.fn(() => ({})),
    isAnyPlatformLoading: { value: false },
    getComprehensiveAuthStatus: vi.fn(() => ({})),
    refreshActivity: vi.fn(),
    clearError: vi.fn(),
    setError: vi.fn(),
    updatePlatformUser: vi.fn(),
  }))
}))

describe('useSocial', () => {
  let social: ReturnType<typeof useSocial>

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Get fresh instance
    social = useSocial()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Platform Validation', () => {
    it('should validate supported platforms', () => {
      expect(() => social.validatePlatform('google')).not.toThrow()
      expect(() => social.validatePlatform('apple')).not.toThrow()
      expect(() => social.validatePlatform('line')).not.toThrow()
      expect(() => social.validatePlatform('telegram')).not.toThrow()
    })

    it('should throw error for unsupported platforms', () => {
      expect(() => social.validatePlatform('facebook' as any)).toThrow('Unsupported platform: facebook')
    })
  })

  describe('Google Login', () => {
    it('should delegate to Google composable for login', async () => {
      const mockResult: SocialLoginResult = {
        success: true,
        user: {
          id: '123',
          name: 'Test User',
          email: 'test@example.com',
          platform: 'google',
          accessToken: 'token123'
        },
        platform: 'google'
      }

      mockGoogleLogin.mockResolvedValue(mockResult)

      const result = await social.loginWithGoogle({ popup: true })

      expect(mockGoogleLogin).toHaveBeenCalledWith({ popup: true })
      expect(mockSetLoginState).toHaveBeenCalledWith({ isLoading: true, platform: 'google' })
      expect(mockSetUser).toHaveBeenCalledWith(mockResult.user)
      expect(result).toEqual(mockResult)
    })

    it('should handle Google login errors', async () => {
      const mockError = new Error('Google login failed')
      mockGoogleLogin.mockRejectedValue(mockError)

      const result = await social.loginWithGoogle()

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.platform).toBe('google')
    })
  })

  describe('Apple Login', () => {
    it('should delegate to Apple composable for login', async () => {
      const mockResult: SocialLoginResult = {
        success: true,
        user: {
          id: '456',
          name: 'Apple User',
          email: 'apple@example.com',
          platform: 'apple',
          accessToken: 'apple_token'
        },
        platform: 'apple'
      }

      mockAppleLogin.mockResolvedValue(mockResult)

      const result = await social.loginWithApple({ usePopup: true })

      expect(mockAppleLogin).toHaveBeenCalledWith({ usePopup: true })
      expect(mockSetLoginState).toHaveBeenCalledWith({ isLoading: true, platform: 'apple' })
      expect(mockSetUser).toHaveBeenCalledWith(mockResult.user)
      expect(result).toEqual(mockResult)
    })

    it('should handle Apple login errors', async () => {
      const mockError = new Error('Apple login failed')
      mockAppleLogin.mockRejectedValue(mockError)

      const result = await social.loginWithApple()

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.platform).toBe('apple')
    })
  })

  describe('Line Login', () => {
    it('should delegate to Line composable for login', async () => {
      const mockResult: SocialLoginResult = {
        success: true,
        user: {
          id: '789',
          name: 'Line User',
          platform: 'line',
          accessToken: 'line_token'
        },
        platform: 'line'
      }

      mockLineLogin.mockResolvedValue(mockResult)

      const result = await social.loginWithLine({ botPrompt: 'aggressive' })

      expect(mockLineLogin).toHaveBeenCalledWith({ botPrompt: 'aggressive' })
      expect(mockSetLoginState).toHaveBeenCalledWith({ isLoading: true, platform: 'line' })
      expect(mockSetUser).toHaveBeenCalledWith(mockResult.user)
      expect(result).toEqual(mockResult)
    })

    it('should handle Line login errors', async () => {
      const mockError = new Error('Line login failed')
      mockLineLogin.mockRejectedValue(mockError)

      const result = await social.loginWithLine()

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.platform).toBe('line')
    })
  })

  describe('Telegram Login', () => {
    it('should delegate to Telegram composable for login', async () => {
      const mockResult: SocialLoginResult = {
        success: true,
        user: {
          id: '101112',
          name: 'Telegram User',
          platform: 'telegram',
          accessToken: 'telegram_token'
        },
        platform: 'telegram'
      }

      mockTelegramLogin.mockResolvedValue(mockResult)

      const result = await social.loginWithTelegram({ size: 'large' })

      expect(mockTelegramLogin).toHaveBeenCalledWith({ size: 'large' })
      expect(mockSetLoginState).toHaveBeenCalledWith({ isLoading: true, platform: 'telegram' })
      expect(mockSetUser).toHaveBeenCalledWith(mockResult.user)
      expect(result).toEqual(mockResult)
    })

    it('should handle Telegram login errors', async () => {
      const mockError = new Error('Telegram login failed')
      mockTelegramLogin.mockRejectedValue(mockError)

      const result = await social.loginWithTelegram()

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.platform).toBe('telegram')
    })
  })

  describe('Generic Login', () => {
    it('should delegate to correct platform composable', async () => {
      const mockResult: SocialLoginResult = {
        success: true,
        user: {
          id: '123',
          name: 'Test User',
          platform: 'google',
          accessToken: 'token'
        },
        platform: 'google'
      }

      mockGoogleLogin.mockResolvedValue(mockResult)

      const result = await social.login('google', { popup: true })

      expect(mockGoogleLogin).toHaveBeenCalledWith({ popup: true })
      expect(result).toEqual(mockResult)
    })

    it('should handle unsupported platform in generic login', async () => {
      const result = await social.login('facebook' as any)

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('Unsupported platform: facebook')
    })
  })

  describe('Logout', () => {
    it('should logout from specific platform', async () => {
      await social.logout('google')

      expect(mockGoogleLogout).toHaveBeenCalled()
      expect(mockGlobalLogout).toHaveBeenCalledWith('google')
    })

    it('should logout from all platforms', async () => {
      // Mock that all platforms are authenticated
      mockIsPlatformAuthenticated.mockReturnValue(true)
      
      await social.logout()

      expect(mockGoogleLogout).toHaveBeenCalled()
      expect(mockAppleLogout).toHaveBeenCalled()
      expect(mockLineLogout).toHaveBeenCalled()
      expect(mockTelegramLogout).toHaveBeenCalled()
      expect(mockClearAuthState).toHaveBeenCalled()
    })

    it('should handle logout errors gracefully', async () => {
      mockGoogleLogout.mockRejectedValue(new Error('Logout failed'))

      // Should not throw
      await expect(social.logout('google')).resolves.toBeUndefined()
    })
  })

  describe('Platform Status', () => {
    it('should check if platform is ready', () => {
      const isReady = social.isPlatformReady('google')
      expect(typeof isReady).toBe('boolean')
    })

    it('should check if platform is loading', () => {
      const isLoading = social.isPlatformLoading('google')
      expect(typeof isLoading).toBe('boolean')
    })

    it('should get platform user', () => {
      const user = social.getPlatformUser('google')
      expect(user).toBeNull() // Based on our mock
    })

    it('should get all platforms status', () => {
      const status = social.getAllPlatformsStatus()
      
      expect(status).toHaveProperty('google')
      expect(status).toHaveProperty('apple')
      expect(status).toHaveProperty('line')
      expect(status).toHaveProperty('telegram')
      
      expect(status.google).toHaveProperty('isReady')
      expect(status.google).toHaveProperty('isLoading')
      expect(status.google).toHaveProperty('isAuthenticated')
      expect(status.google).toHaveProperty('user')
    })

    it('should get available platforms', () => {
      const available = social.getAvailablePlatforms()
      expect(Array.isArray(available)).toBe(true)
      // Based on our mocks, all platforms should be ready
      expect(available).toEqual(['google', 'apple', 'line', 'telegram'])
    })

    it('should get default platform', () => {
      const defaultPlatform = social.getDefaultPlatform()
      expect(defaultPlatform).toBe('google') // First available platform
    })
  })

  describe('Redirect Callback Handling', () => {
    it('should handle redirect callback for specific platform', async () => {
      const mockResult: SocialLoginResult = {
        success: true,
        user: {
          id: '123',
          name: 'Test User',
          platform: 'google',
          accessToken: 'token'
        },
        platform: 'google'
      }

      mockGoogleIsRedirectCallback.mockReturnValue(true)
      mockGoogleHandleRedirectCallback.mockResolvedValue(mockResult)

      const result = await social.handleRedirectCallback('google')

      expect(mockGoogleIsRedirectCallback).toHaveBeenCalled()
      expect(mockGoogleHandleRedirectCallback).toHaveBeenCalled()
      expect(mockSetUser).toHaveBeenCalledWith(mockResult.user)
      expect(result).toEqual(mockResult)
    })

    it('should auto-detect platform for redirect callback', async () => {
      const mockResult: SocialLoginResult = {
        success: true,
        user: {
          id: '123',
          name: 'Test User',
          platform: 'google',
          accessToken: 'token'
        },
        platform: 'google'
      }

      mockGoogleIsRedirectCallback.mockReturnValue(true)
      mockGoogleHandleRedirectCallback.mockResolvedValue(mockResult)

      const result = await social.handleRedirectCallback()

      expect(result).toEqual(mockResult)
    })

    it('should return null if no platform is handling callback', async () => {
      // Reset the mock to return false (no callback)
      mockGoogleIsRedirectCallback.mockReturnValue(false)
      
      const result = await social.handleRedirectCallback()
      expect(result).toBeNull()
    })
  })

  describe('Utility Methods', () => {
    it('should expose supported platforms', () => {
      expect(social.supportedPlatforms).toEqual(['google', 'apple', 'line', 'telegram'])
    })

    it('should get platform composable', () => {
      const googleComposable = social.getPlatformComposable('google')
      expect(googleComposable).toBeDefined()
      expect(googleComposable.login).toBeDefined()
    })

    it('should throw error for invalid platform in getPlatformComposable', () => {
      expect(() => social.getPlatformComposable('invalid' as any)).toThrow('Unsupported platform: invalid')
    })
  })
})