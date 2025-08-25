import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useSocial } from '../composables/useSocial'
import { setupTestEnvironment, cleanupTestEnvironment, mockComposableDependencies, expectSuccessfulLogin, expectFailedLogin } from './utils/testHelpers'
import { mockUsers, mockErrors } from './mocks/socialSDKs'
import type { SocialLoginResult, SocialUser } from '../composables/types'

// Mock all platform composables
vi.mock('../composables/useGoogle')
vi.mock('../composables/useApple')
vi.mock('../composables/useLine')
vi.mock('../composables/useTelegram')
vi.mock('../composables/useSocialState')

describe('useSocial - Enhanced Tests', () => {
  let mockDeps: ReturnType<typeof mockComposableDependencies>
  let mockPlatformComposables: Record<string, any>

  beforeEach(() => {
    setupTestEnvironment()
    mockDeps = mockComposableDependencies()

    // Create mock platform composables
    mockPlatformComposables = {
      google: {
        isReady: { value: true },
        isLoading: { value: false },
        user: { value: null },
        login: vi.fn(),
        logout: vi.fn(),
        handleRedirectCallback: vi.fn(),
        isRedirectCallback: vi.fn(() => false)
      },
      apple: {
        isReady: { value: true },
        isLoading: { value: false },
        user: { value: null },
        login: vi.fn(),
        logout: vi.fn(),
        handleRedirectCallback: vi.fn(),
        isRedirectCallback: vi.fn(() => false)
      },
      line: {
        isReady: { value: true },
        isLoading: { value: false },
        user: { value: null },
        login: vi.fn(),
        logout: vi.fn(),
        handleRedirectCallback: vi.fn(),
        isRedirectCallback: vi.fn(() => false)
      },
      telegram: {
        isReady: { value: true },
        isLoading: { value: false },
        user: { value: null },
        login: vi.fn(),
        logout: vi.fn(),
        handleRedirectCallback: vi.fn(),
        isRedirectCallback: vi.fn(() => false)
      }
    }

    // Mock platform composable imports
    const { useGoogle } = await import('../composables/useGoogle')
    const { useApple } = await import('../composables/useApple')
    const { useLine } = await import('../composables/useLine')
    const { useTelegram } = await import('../composables/useTelegram')
    const { useSocialState } = await import('../composables/useSocialState')

    vi.mocked(useGoogle).mockReturnValue(mockPlatformComposables.google)
    vi.mocked(useApple).mockReturnValue(mockPlatformComposables.apple)
    vi.mocked(useLine).mockReturnValue(mockPlatformComposables.line)
    vi.mocked(useTelegram).mockReturnValue(mockPlatformComposables.telegram)
    vi.mocked(useSocialState).mockReturnValue(mockDeps.mockSocialState)
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('Initialization and Structure', () => {
    it('should initialize with correct interface', () => {
      const social = useSocial()

      // Check all required methods exist
      expect(typeof social.loginWithGoogle).toBe('function')
      expect(typeof social.loginWithApple).toBe('function')
      expect(typeof social.loginWithLine).toBe('function')
      expect(typeof social.loginWithTelegram).toBe('function')
      expect(typeof social.login).toBe('function')
      expect(typeof social.logout).toBe('function')
      expect(typeof social.validatePlatform).toBe('function')
      expect(typeof social.isPlatformReady).toBe('function')
      expect(typeof social.isPlatformLoading).toBe('function')
      expect(typeof social.getPlatformUser).toBe('function')
      expect(typeof social.getAllPlatformsStatus).toBe('function')
      expect(typeof social.getAvailablePlatforms).toBe('function')
      expect(typeof social.getDefaultPlatform).toBe('function')
      expect(typeof social.handleRedirectCallback).toBe('function')
      expect(typeof social.getPlatformComposable).toBe('function')

      // Check properties
      expect(Array.isArray(social.supportedPlatforms)).toBe(true)
      expect(social.supportedPlatforms).toEqual(['google', 'apple', 'line', 'telegram'])
    })

    it('should expose current user and authentication state', () => {
      const social = useSocial()

      expect(social.currentUser).toBeDefined()
      expect(social.isAuthenticated).toBeDefined()
      expect(social.loginState).toBeDefined()
      expect(social.authenticatedPlatforms).toBeDefined()
    })
  })

  describe('Platform Validation', () => {
    it('should validate supported platforms', () => {
      const social = useSocial()

      expect(() => social.validatePlatform('google')).not.toThrow()
      expect(() => social.validatePlatform('apple')).not.toThrow()
      expect(() => social.validatePlatform('line')).not.toThrow()
      expect(() => social.validatePlatform('telegram')).not.toThrow()
    })

    it('should throw error for unsupported platforms', () => {
      const social = useSocial()

      expect(() => social.validatePlatform('facebook' as any)).toThrow('Unsupported platform: facebook')
      expect(() => social.validatePlatform('twitter' as any)).toThrow('Unsupported platform: twitter')
      expect(() => social.validatePlatform('' as any)).toThrow('Unsupported platform: ')
    })

    it('should handle null and undefined platform validation', () => {
      const social = useSocial()

      expect(() => social.validatePlatform(null as any)).toThrow()
      expect(() => social.validatePlatform(undefined as any)).toThrow()
    })
  })

  describe('Google Login Integration', () => {
    it('should delegate Google login correctly', async () => {
      const social = useSocial()
      const mockResult: SocialLoginResult = {
        success: true,
        user: mockUsers.google,
        platform: 'google'
      }

      mockPlatformComposables.google.login.mockResolvedValue(mockResult)

      const result = await social.loginWithGoogle({ popup: true })

      expect(mockPlatformComposables.google.login).toHaveBeenCalledWith({ popup: true })
      expect(mockDeps.mockSocialState.setLoginState).toHaveBeenCalledWith({ isLoading: true, platform: 'google' })
      expect(mockDeps.mockSocialState.setUser).toHaveBeenCalledWith(mockResult.user)
      expectSuccessfulLogin(result, 'google')
    })

    it('should handle Google login errors', async () => {
      const social = useSocial()
      const mockError = new Error('Google login failed')
      
      mockPlatformComposables.google.login.mockRejectedValue(mockError)

      const result = await social.loginWithGoogle()

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.platform).toBe('google')
      expect(mockDeps.mockSocialState.setLoginState).toHaveBeenCalledWith({ 
        isLoading: false, 
        error: expect.any(Object) 
      })
    })

    it('should handle Google login with custom options', async () => {
      const social = useSocial()
      const options = { 
        popup: false, 
        scopes: ['profile', 'email', 'calendar'] 
      }
      
      mockPlatformComposables.google.login.mockResolvedValue({
        success: true,
        user: mockUsers.google,
        platform: 'google'
      })

      await social.loginWithGoogle(options)

      expect(mockPlatformComposables.google.login).toHaveBeenCalledWith(options)
    })
  })

  describe('Apple Login Integration', () => {
    it('should delegate Apple login correctly', async () => {
      const social = useSocial()
      const mockResult: SocialLoginResult = {
        success: true,
        user: mockUsers.apple,
        platform: 'apple'
      }

      mockPlatformComposables.apple.login.mockResolvedValue(mockResult)

      const result = await social.loginWithApple({ usePopup: true })

      expect(mockPlatformComposables.apple.login).toHaveBeenCalledWith({ usePopup: true })
      expectSuccessfulLogin(result, 'apple')
    })

    it('should handle Apple login errors', async () => {
      const social = useSocial()
      const mockError = new Error('Apple login failed')
      
      mockPlatformComposables.apple.login.mockRejectedValue(mockError)

      const result = await social.loginWithApple()

      expectFailedLogin(result, 'apple')
    })
  })

  describe('Line Login Integration', () => {
    it('should delegate Line login correctly', async () => {
      const social = useSocial()
      const mockResult: SocialLoginResult = {
        success: true,
        user: mockUsers.line,
        platform: 'line'
      }

      mockPlatformComposables.line.login.mockResolvedValue(mockResult)

      const result = await social.loginWithLine({ botPrompt: 'aggressive' })

      expect(mockPlatformComposables.line.login).toHaveBeenCalledWith({ botPrompt: 'aggressive' })
      expectSuccessfulLogin(result, 'line')
    })

    it('should handle Line login errors', async () => {
      const social = useSocial()
      const mockError = new Error('Line login failed')
      
      mockPlatformComposables.line.login.mockRejectedValue(mockError)

      const result = await social.loginWithLine()

      expectFailedLogin(result, 'line')
    })
  })

  describe('Telegram Login Integration', () => {
    it('should delegate Telegram login correctly', async () => {
      const social = useSocial()
      const mockResult: SocialLoginResult = {
        success: true,
        user: mockUsers.telegram,
        platform: 'telegram'
      }

      mockPlatformComposables.telegram.login.mockResolvedValue(mockResult)

      const result = await social.loginWithTelegram({ size: 'large' })

      expect(mockPlatformComposables.telegram.login).toHaveBeenCalledWith({ size: 'large' })
      expectSuccessfulLogin(result, 'telegram')
    })

    it('should handle Telegram login errors', async () => {
      const social = useSocial()
      const mockError = new Error('Telegram login failed')
      
      mockPlatformComposables.telegram.login.mockRejectedValue(mockError)

      const result = await social.loginWithTelegram()

      expectFailedLogin(result, 'telegram')
    })
  })

  describe('Generic Login Method', () => {
    it('should delegate to correct platform composable', async () => {
      const social = useSocial()
      const mockResult: SocialLoginResult = {
        success: true,
        user: mockUsers.google,
        platform: 'google'
      }

      mockPlatformComposables.google.login.mockResolvedValue(mockResult)

      const result = await social.login('google', { popup: true })

      expect(mockPlatformComposables.google.login).toHaveBeenCalledWith({ popup: true })
      expectSuccessfulLogin(result, 'google')
    })

    it('should handle all platforms through generic method', async () => {
      const social = useSocial()

      // Test each platform
      const platforms = ['google', 'apple', 'line', 'telegram'] as const
      
      for (const platform of platforms) {
        const mockResult: SocialLoginResult = {
          success: true,
          user: mockUsers[platform],
          platform
        }

        mockPlatformComposables[platform].login.mockResolvedValue(mockResult)

        const result = await social.login(platform)
        expectSuccessfulLogin(result, platform)
      }
    })

    it('should handle unsupported platform in generic login', async () => {
      const social = useSocial()

      const result = await social.login('facebook' as any)

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('Unsupported platform: facebook')
    })

    it('should pass options correctly to platform methods', async () => {
      const social = useSocial()
      
      mockPlatformComposables.google.login.mockResolvedValue({
        success: true,
        user: mockUsers.google,
        platform: 'google'
      })

      const options = { popup: false, redirectUrl: 'https://example.com/callback' }
      await social.login('google', options)

      expect(mockPlatformComposables.google.login).toHaveBeenCalledWith(options)
    })
  })

  describe('Logout Functionality', () => {
    beforeEach(() => {
      // Mock that platforms are authenticated
      mockDeps.mockSocialState.isPlatformAuthenticated.mockReturnValue(true)
    })

    it('should logout from specific platform', async () => {
      const social = useSocial()

      await social.logout('google')

      expect(mockPlatformComposables.google.logout).toHaveBeenCalled()
      expect(mockDeps.mockSocialState.logout).toHaveBeenCalledWith('google')
    })

    it('should logout from all platforms when no platform specified', async () => {
      const social = useSocial()

      await social.logout()

      expect(mockPlatformComposables.google.logout).toHaveBeenCalled()
      expect(mockPlatformComposables.apple.logout).toHaveBeenCalled()
      expect(mockPlatformComposables.line.logout).toHaveBeenCalled()
      expect(mockPlatformComposables.telegram.logout).toHaveBeenCalled()
      expect(mockDeps.mockSocialState.clearAuthState).toHaveBeenCalled()
    })

    it('should handle logout errors gracefully', async () => {
      const social = useSocial()
      
      mockPlatformComposables.google.logout.mockRejectedValue(new Error('Logout failed'))

      // Should not throw
      await expect(social.logout('google')).resolves.toBeUndefined()
    })

    it('should only logout authenticated platforms', async () => {
      const social = useSocial()
      
      // Mock only Google as authenticated
      mockDeps.mockSocialState.isPlatformAuthenticated.mockImplementation((platform) => platform === 'google')

      await social.logout()

      expect(mockPlatformComposables.google.logout).toHaveBeenCalled()
      expect(mockPlatformComposables.apple.logout).not.toHaveBeenCalled()
      expect(mockPlatformComposables.line.logout).not.toHaveBeenCalled()
      expect(mockPlatformComposables.telegram.logout).not.toHaveBeenCalled()
    })

    it('should handle logout from non-authenticated platform', async () => {
      const social = useSocial()
      
      mockDeps.mockSocialState.isPlatformAuthenticated.mockReturnValue(false)

      await social.logout('google')

      // Should still call platform logout for cleanup
      expect(mockPlatformComposables.google.logout).toHaveBeenCalled()
    })
  })

  describe('Platform Status Methods', () => {
    it('should check if platform is ready', () => {
      const social = useSocial()

      expect(social.isPlatformReady('google')).toBe(true)
      expect(social.isPlatformReady('apple')).toBe(true)

      // Test with platform not ready
      mockPlatformComposables.google.isReady.value = false
      expect(social.isPlatformReady('google')).toBe(false)
    })

    it('should check if platform is loading', () => {
      const social = useSocial()

      expect(social.isPlatformLoading('google')).toBe(false)

      // Test with platform loading
      mockPlatformComposables.google.isLoading.value = true
      expect(social.isPlatformLoading('google')).toBe(true)
    })

    it('should get platform user', () => {
      const social = useSocial()

      expect(social.getPlatformUser('google')).toBeNull()

      // Test with user set
      mockPlatformComposables.google.user.value = mockUsers.google
      expect(social.getPlatformUser('google')).toEqual(mockUsers.google)
    })

    it('should get all platforms status', () => {
      const social = useSocial()
      
      // Set up some test data
      mockPlatformComposables.google.user.value = mockUsers.google
      mockPlatformComposables.apple.isLoading.value = true
      mockDeps.mockSocialState.isPlatformAuthenticated.mockImplementation((platform) => platform === 'google')

      const status = social.getAllPlatformsStatus()

      expect(status).toHaveProperty('google')
      expect(status).toHaveProperty('apple')
      expect(status).toHaveProperty('line')
      expect(status).toHaveProperty('telegram')

      expect(status.google.isReady).toBe(true)
      expect(status.google.isLoading).toBe(false)
      expect(status.google.isAuthenticated).toBe(true)
      expect(status.google.user).toEqual(mockUsers.google)

      expect(status.apple.isLoading).toBe(true)
      expect(status.apple.isAuthenticated).toBe(false)
    })

    it('should get available platforms', () => {
      const social = useSocial()

      const available = social.getAvailablePlatforms()
      expect(available).toEqual(['google', 'apple', 'line', 'telegram'])

      // Test with some platforms not ready
      mockPlatformComposables.google.isReady.value = false
      mockPlatformComposables.apple.isReady.value = false

      const availableFiltered = social.getAvailablePlatforms()
      expect(availableFiltered).toEqual(['line', 'telegram'])
    })

    it('should get default platform', () => {
      const social = useSocial()

      expect(social.getDefaultPlatform()).toBe('google')

      // Test when Google is not available
      mockPlatformComposables.google.isReady.value = false
      expect(social.getDefaultPlatform()).toBe('apple')

      // Test when no platforms are available
      Object.values(mockPlatformComposables).forEach(composable => {
        composable.isReady.value = false
      })
      expect(social.getDefaultPlatform()).toBeNull()
    })
  })

  describe('Redirect Callback Handling', () => {
    it('should handle redirect callback for specific platform', async () => {
      const social = useSocial()
      const mockResult: SocialLoginResult = {
        success: true,
        user: mockUsers.google,
        platform: 'google'
      }

      mockPlatformComposables.google.isRedirectCallback.mockReturnValue(true)
      mockPlatformComposables.google.handleRedirectCallback.mockResolvedValue(mockResult)

      const result = await social.handleRedirectCallback('google')

      expect(mockPlatformComposables.google.isRedirectCallback).toHaveBeenCalled()
      expect(mockPlatformComposables.google.handleRedirectCallback).toHaveBeenCalled()
      expect(mockDeps.mockSocialState.setUser).toHaveBeenCalledWith(mockResult.user)
      expectSuccessfulLogin(result, 'google')
    })

    it('should auto-detect platform for redirect callback', async () => {
      const social = useSocial()
      const mockResult: SocialLoginResult = {
        success: true,
        user: mockUsers.apple,
        platform: 'apple'
      }

      // Mock Apple as having a callback
      mockPlatformComposables.apple.isRedirectCallback.mockReturnValue(true)
      mockPlatformComposables.apple.handleRedirectCallback.mockResolvedValue(mockResult)

      const result = await social.handleRedirectCallback()

      expect(result).toEqual(mockResult)
    })

    it('should return null if no platform is handling callback', async () => {
      const social = useSocial()

      // All platforms return false for isRedirectCallback
      Object.values(mockPlatformComposables).forEach(composable => {
        composable.isRedirectCallback.mockReturnValue(false)
      })

      const result = await social.handleRedirectCallback()
      expect(result).toBeNull()
    })

    it('should handle callback errors', async () => {
      const social = useSocial()

      mockPlatformComposables.google.isRedirectCallback.mockReturnValue(true)
      mockPlatformComposables.google.handleRedirectCallback.mockRejectedValue(new Error('Callback failed'))

      const result = await social.handleRedirectCallback('google')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Platform Composable Access', () => {
    it('should get platform composable', () => {
      const social = useSocial()

      const googleComposable = social.getPlatformComposable('google')
      expect(googleComposable).toBe(mockPlatformComposables.google)

      const appleComposable = social.getPlatformComposable('apple')
      expect(appleComposable).toBe(mockPlatformComposables.apple)
    })

    it('should throw error for invalid platform in getPlatformComposable', () => {
      const social = useSocial()

      expect(() => social.getPlatformComposable('invalid' as any)).toThrow('Unsupported platform: invalid')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent login attempts', async () => {
      const social = useSocial()

      mockPlatformComposables.google.login.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          success: true,
          user: mockUsers.google,
          platform: 'google'
        }), 100))
      )

      // Start multiple login attempts
      const promise1 = social.loginWithGoogle()
      const promise2 = social.loginWithGoogle()

      const [result1, result2] = await Promise.all([promise1, promise2])

      // Both should complete (the implementation should handle concurrency)
      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
    })

    it('should handle login state management correctly', async () => {
      const social = useSocial()

      mockPlatformComposables.google.login.mockResolvedValue({
        success: true,
        user: mockUsers.google,
        platform: 'google'
      })

      await social.loginWithGoogle()

      // Verify state management calls
      expect(mockDeps.mockSocialState.setLoginState).toHaveBeenCalledWith({ 
        isLoading: true, 
        platform: 'google' 
      })
      expect(mockDeps.mockSocialState.setLoginState).toHaveBeenCalledWith({ 
        isLoading: false 
      })
    })

    it('should handle platform not ready scenarios', async () => {
      const social = useSocial()

      mockPlatformComposables.google.isReady.value = false

      const result = await social.loginWithGoogle()

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('SDK_LOAD_FAILED')
    })

    it('should handle mixed platform states', () => {
      const social = useSocial()

      // Set up mixed states
      mockPlatformComposables.google.isReady.value = true
      mockPlatformComposables.google.user.value = mockUsers.google
      mockPlatformComposables.apple.isReady.value = false
      mockPlatformComposables.line.isLoading.value = true
      mockDeps.mockSocialState.isPlatformAuthenticated.mockImplementation((platform) => 
        platform === 'google' || platform === 'telegram'
      )

      const status = social.getAllPlatformsStatus()

      expect(status.google.isReady).toBe(true)
      expect(status.google.isAuthenticated).toBe(true)
      expect(status.apple.isReady).toBe(false)
      expect(status.line.isLoading).toBe(true)
      expect(status.telegram.isAuthenticated).toBe(true)
    })

    it('should handle empty or null options', async () => {
      const social = useSocial()

      mockPlatformComposables.google.login.mockResolvedValue({
        success: true,
        user: mockUsers.google,
        platform: 'google'
      })

      // Test with undefined options
      await social.loginWithGoogle(undefined)
      expect(mockPlatformComposables.google.login).toHaveBeenCalledWith(undefined)

      // Test with empty options
      await social.loginWithGoogle({})
      expect(mockPlatformComposables.google.login).toHaveBeenCalledWith({})
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle multi-platform authentication flow', async () => {
      const social = useSocial()

      // Login to Google first
      mockPlatformComposables.google.login.mockResolvedValue({
        success: true,
        user: mockUsers.google,
        platform: 'google'
      })

      const googleResult = await social.loginWithGoogle()
      expectSuccessfulLogin(googleResult, 'google')

      // Then login to Apple
      mockPlatformComposables.apple.login.mockResolvedValue({
        success: true,
        user: mockUsers.apple,
        platform: 'apple'
      })

      const appleResult = await social.loginWithApple()
      expectSuccessfulLogin(appleResult, 'apple')

      // Verify both platforms were handled
      expect(mockDeps.mockSocialState.setUser).toHaveBeenCalledWith(mockUsers.google)
      expect(mockDeps.mockSocialState.setUser).toHaveBeenCalledWith(mockUsers.apple)
    })

    it('should handle platform switching', async () => {
      const social = useSocial()

      // Start with Google
      mockDeps.mockSocialState.currentUser.value = mockUsers.google
      mockDeps.mockSocialState.isPlatformAuthenticated.mockImplementation((platform) => platform === 'google')

      // Switch to Apple
      mockPlatformComposables.apple.login.mockResolvedValue({
        success: true,
        user: mockUsers.apple,
        platform: 'apple'
      })

      await social.loginWithApple()

      expect(mockDeps.mockSocialState.setUser).toHaveBeenCalledWith(mockUsers.apple)
    })

    it('should handle logout from multiple platforms', async () => {
      const social = useSocial()

      // Mock multiple platforms as authenticated
      mockDeps.mockSocialState.isPlatformAuthenticated.mockImplementation((platform) => 
        ['google', 'apple'].includes(platform)
      )

      await social.logout()

      expect(mockPlatformComposables.google.logout).toHaveBeenCalled()
      expect(mockPlatformComposables.apple.logout).toHaveBeenCalled()
      expect(mockPlatformComposables.line.logout).not.toHaveBeenCalled()
      expect(mockPlatformComposables.telegram.logout).not.toHaveBeenCalled()
    })
  })
})