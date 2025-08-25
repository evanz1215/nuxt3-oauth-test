import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setupTestEnvironment, cleanupTestEnvironment, waitFor } from './utils/testHelpers'
import { mockUsers } from './mocks/socialSDKs'
import type { SocialLoginResult, SocialUser, SocialPlatform } from '../composables/types'

// This test file focuses on comprehensive integration scenarios
// that test the actual integration between components and state management

describe('Comprehensive Social Login Integration', () => {
  let mockSocialState: any
  let mockPlatformComposables: Record<string, any>
  let useSocial: any

  beforeEach(async () => {
    setupTestEnvironment()

    // Create a more realistic mock social state
    mockSocialState = {
      currentUser: { value: null },
      loginState: { value: { isLoading: false } },
      authenticatedPlatforms: { value: [] },
      platformStates: { value: {} },
      isAuthenticated: { value: false },
      currentPlatform: { value: null },
      isAnyPlatformLoading: { value: false },
      setUser: vi.fn((user) => {
        mockSocialState.currentUser.value = user
        mockSocialState.isAuthenticated.value = !!user
        if (user) {
          mockSocialState.currentPlatform.value = user.platform
          if (!mockSocialState.authenticatedPlatforms.value.includes(user.platform)) {
            mockSocialState.authenticatedPlatforms.value.push(user.platform)
          }
        }
      }),
      setLoginState: vi.fn((state) => {
        mockSocialState.loginState.value = { ...mockSocialState.loginState.value, ...state }
      }),
      setLoading: vi.fn(),
      setError: vi.fn(),
      clearError: vi.fn(),
      isPlatformAuthenticated: vi.fn((platform) => 
        mockSocialState.authenticatedPlatforms.value.includes(platform)
      ),
      addAuthenticatedPlatform: vi.fn(),
      removeAuthenticatedPlatform: vi.fn(),
      clearAuthState: vi.fn(() => {
        mockSocialState.currentUser.value = null
        mockSocialState.isAuthenticated.value = false
        mockSocialState.authenticatedPlatforms.value = []
        mockSocialState.currentPlatform.value = null
      }),
      logout: vi.fn((platform) => {
        if (platform) {
          const index = mockSocialState.authenticatedPlatforms.value.indexOf(platform)
          if (index > -1) {
            mockSocialState.authenticatedPlatforms.value.splice(index, 1)
          }
          if (mockSocialState.currentUser.value?.platform === platform) {
            mockSocialState.currentUser.value = null
            mockSocialState.isAuthenticated.value = false
            mockSocialState.currentPlatform.value = null
          }
        } else {
          mockSocialState.clearAuthState()
        }
      }),
      updateUser: vi.fn(),
      getAuthStatus: vi.fn(),
      resetState: vi.fn(),
      getPlatformState: vi.fn(() => ({ isAuthenticated: false, user: null, isLoading: false })),
      setPlatformLoading: vi.fn(),
      getAllPlatformStates: vi.fn(() => ({})),
      getComprehensiveAuthStatus: vi.fn(() => ({
        isAuthenticated: mockSocialState.isAuthenticated.value,
        currentUser: mockSocialState.currentUser.value,
        authenticatedPlatforms: mockSocialState.authenticatedPlatforms.value
      })),
      refreshActivity: vi.fn(),
      updatePlatformUser: vi.fn()
    }

    // Create realistic platform composables
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

    // Mock the composables
    vi.doMock('../composables/useGoogle', () => ({
      useGoogle: () => mockPlatformComposables.google
    }))
    vi.doMock('../composables/useApple', () => ({
      useApple: () => mockPlatformComposables.apple
    }))
    vi.doMock('../composables/useLine', () => ({
      useLine: () => mockPlatformComposables.line
    }))
    vi.doMock('../composables/useTelegram', () => ({
      useTelegram: () => mockPlatformComposables.telegram
    }))
    vi.doMock('../composables/useSocialState', () => ({
      useSocialState: () => mockSocialState
    }))
    vi.doMock('../composables/useSocialConfig', () => ({
      useSocialConfig: () => ({
        getSocialConfig: vi.fn(),
        getPlatformConfig: vi.fn(),
        isPlatformEnabled: vi.fn(() => true)
      })
    }))

    // Import useSocial after mocking
    const { useSocial: importedUseSocial } = await import('../composables/useSocial')
    useSocial = importedUseSocial
  })

  afterEach(() => {
    cleanupTestEnvironment()
    vi.clearAllMocks()
  })

  describe('End-to-End Login Flow Integration', () => {
    it('should complete full Google login flow with state management', async () => {
      const social = useSocial()
      
      // Mock successful Google login
      const mockResult: SocialLoginResult = {
        success: true,
        user: mockUsers.google,
        platform: 'google'
      }
      mockPlatformComposables.google.login.mockResolvedValue(mockResult)

      // Execute login
      const result = await social.loginWithGoogle({ popup: true })

      // Verify the complete flow
      expect(result.success).toBe(true)
      expect(result.user).toEqual(mockUsers.google)
      expect(result.platform).toBe('google')

      // Verify state was updated
      expect(mockSocialState.setUser).toHaveBeenCalledWith(mockUsers.google)
      expect(mockSocialState.currentUser.value).toEqual(mockUsers.google)
      expect(mockSocialState.isAuthenticated.value).toBe(true)
      expect(mockSocialState.authenticatedPlatforms.value).toContain('google')

      // Verify platform composable was called correctly
      expect(mockPlatformComposables.google.login).toHaveBeenCalledWith({ popup: true })
    })

    it('should handle complete multi-platform authentication flow', async () => {
      const social = useSocial()

      // Mock successful logins for multiple platforms
      mockPlatformComposables.google.login.mockResolvedValue({
        success: true,
        user: mockUsers.google,
        platform: 'google'
      })
      mockPlatformComposables.apple.login.mockResolvedValue({
        success: true,
        user: mockUsers.apple,
        platform: 'apple'
      })

      // Login to Google first
      const googleResult = await social.loginWithGoogle()
      expect(googleResult.success).toBe(true)
      expect(mockSocialState.authenticatedPlatforms.value).toContain('google')

      // Login to Apple
      const appleResult = await social.loginWithApple()
      expect(appleResult.success).toBe(true)
      expect(mockSocialState.authenticatedPlatforms.value).toContain('apple')

      // Verify both platforms are authenticated
      expect(mockSocialState.authenticatedPlatforms.value).toEqual(['google', 'apple'])
      expect(mockSocialState.currentUser.value).toEqual(mockUsers.apple) // Last login wins
    })

    it('should handle complete logout flow with state cleanup', async () => {
      const social = useSocial()

      // Setup authenticated state
      mockSocialState.currentUser.value = mockUsers.google
      mockSocialState.isAuthenticated.value = true
      mockSocialState.authenticatedPlatforms.value = ['google']
      mockSocialState.isPlatformAuthenticated.mockReturnValue(true)

      // Execute logout
      await social.logout('google')

      // Verify platform logout was called
      expect(mockPlatformComposables.google.logout).toHaveBeenCalled()

      // Verify state was cleaned up
      expect(mockSocialState.logout).toHaveBeenCalledWith('google')
    })
  })

  describe('State Management Integration', () => {
    it('should maintain consistent state across platform switches', async () => {
      const social = useSocial()

      // Mock platform logins
      mockPlatformComposables.google.login.mockResolvedValue({
        success: true,
        user: mockUsers.google,
        platform: 'google'
      })
      mockPlatformComposables.line.login.mockResolvedValue({
        success: true,
        user: mockUsers.line,
        platform: 'line'
      })

      // Login to Google
      await social.loginWithGoogle()
      expect(mockSocialState.currentUser.value).toEqual(mockUsers.google)
      expect(mockSocialState.currentPlatform.value).toBe('google')

      // Switch to Line
      await social.loginWithLine()
      expect(mockSocialState.currentUser.value).toEqual(mockUsers.line)
      expect(mockSocialState.currentPlatform.value).toBe('line')

      // Both platforms should be authenticated
      expect(mockSocialState.authenticatedPlatforms.value).toContain('google')
      expect(mockSocialState.authenticatedPlatforms.value).toContain('line')
    })

    it('should handle loading states correctly during login', async () => {
      const social = useSocial()

      // Mock slow login
      let resolveLogin: (value: SocialLoginResult) => void
      const loginPromise = new Promise<SocialLoginResult>((resolve) => {
        resolveLogin = resolve
      })
      mockPlatformComposables.google.login.mockReturnValue(loginPromise)

      // Start login
      const resultPromise = social.loginWithGoogle()

      // Verify loading state is set
      expect(mockSocialState.setLoginState).toHaveBeenCalledWith({ 
        isLoading: true, 
        platform: 'google' 
      })

      // Complete login
      resolveLogin!({
        success: true,
        user: mockUsers.google,
        platform: 'google'
      })

      const result = await resultPromise

      // Verify loading state is cleared
      expect(mockSocialState.setLoginState).toHaveBeenCalledWith({ 
        isLoading: false, 
        platform: 'google' 
      })
      expect(result.success).toBe(true)
    })

    it('should handle error states correctly', async () => {
      const social = useSocial()

      const mockError = new Error('Login failed')
      mockPlatformComposables.google.login.mockRejectedValue(mockError)

      const result = await social.loginWithGoogle()

      // Verify error handling
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.platform).toBe('google')

      // Verify error state was set
      expect(mockSocialState.setError).toHaveBeenCalled()
      expect(mockSocialState.setLoginState).toHaveBeenCalledWith(
        expect.objectContaining({ isLoading: false })
      )
    })
  })

  describe('Platform SDK Integration', () => {
    it('should integrate with Google SDK popup mode', async () => {
      const social = useSocial()

      mockPlatformComposables.google.login.mockResolvedValue({
        success: true,
        user: mockUsers.google,
        platform: 'google'
      })

      const result = await social.loginWithGoogle({ popup: true, scopes: ['profile', 'email'] })

      expect(mockPlatformComposables.google.login).toHaveBeenCalledWith({ 
        popup: true, 
        scopes: ['profile', 'email'] 
      })
      expect(result.success).toBe(true)
    })

    it('should integrate with Apple SDK with identity token', async () => {
      const social = useSocial()

      const appleUser = {
        ...mockUsers.apple,
        identityToken: 'apple_identity_token',
        authorizationCode: 'apple_auth_code'
      }

      mockPlatformComposables.apple.login.mockResolvedValue({
        success: true,
        user: appleUser,
        platform: 'apple'
      })

      const result = await social.loginWithApple({ usePopup: false })

      expect(mockPlatformComposables.apple.login).toHaveBeenCalledWith({ usePopup: false })
      expect(result.success).toBe(true)
      expect(result.user?.identityToken).toBe('apple_identity_token')
    })

    it('should integrate with Line SDK bot prompt', async () => {
      const social = useSocial()

      mockPlatformComposables.line.login.mockResolvedValue({
        success: true,
        user: mockUsers.line,
        platform: 'line'
      })

      await social.loginWithLine({ botPrompt: 'aggressive' })

      expect(mockPlatformComposables.line.login).toHaveBeenCalledWith({ botPrompt: 'aggressive' })
    })

    it('should integrate with Telegram widget configuration', async () => {
      const social = useSocial()

      mockPlatformComposables.telegram.login.mockResolvedValue({
        success: true,
        user: mockUsers.telegram,
        platform: 'telegram'
      })

      await social.loginWithTelegram({ size: 'large', cornerRadius: 15 })

      expect(mockPlatformComposables.telegram.login).toHaveBeenCalledWith({ 
        size: 'large', 
        cornerRadius: 15 
      })
    })
  })

  describe('Redirect Callback Integration', () => {
    it('should handle redirect callback detection and processing', async () => {
      const social = useSocial()

      // Mock Google as handling callback
      mockPlatformComposables.google.isRedirectCallback.mockReturnValue(true)
      mockPlatformComposables.google.handleRedirectCallback.mockResolvedValue({
        success: true,
        user: mockUsers.google,
        platform: 'google'
      })

      const result = await social.handleRedirectCallback()

      expect(mockPlatformComposables.google.isRedirectCallback).toHaveBeenCalled()
      expect(mockPlatformComposables.google.handleRedirectCallback).toHaveBeenCalled()
      expect(result?.success).toBe(true)
      expect(mockSocialState.setUser).toHaveBeenCalledWith(mockUsers.google)
    })

    it('should auto-detect platform for callback handling', async () => {
      const social = useSocial()

      // Mock Apple as handling callback (not Google)
      mockPlatformComposables.google.isRedirectCallback.mockReturnValue(false)
      mockPlatformComposables.apple.isRedirectCallback.mockReturnValue(true)
      mockPlatformComposables.apple.handleRedirectCallback.mockResolvedValue({
        success: true,
        user: mockUsers.apple,
        platform: 'apple'
      })

      const result = await social.handleRedirectCallback()

      expect(mockPlatformComposables.google.isRedirectCallback).toHaveBeenCalled()
      expect(mockPlatformComposables.apple.isRedirectCallback).toHaveBeenCalled()
      expect(mockPlatformComposables.apple.handleRedirectCallback).toHaveBeenCalled()
      expect(result?.success).toBe(true)
      expect(result?.platform).toBe('apple')
    })
  })

  describe('Error Recovery and Resilience', () => {
    it('should handle platform SDK not ready', async () => {
      const social = useSocial()

      // Mock Google SDK as not ready and login to fail appropriately
      mockPlatformComposables.google.isReady.value = false
      mockPlatformComposables.google.login.mockRejectedValue(new Error('SDK not ready'))

      const result = await social.loginWithGoogle()

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.platform).toBe('google')
    })

    it('should continue working when one platform fails', async () => {
      const social = useSocial()

      // Mock Google as failing
      mockPlatformComposables.google.login.mockRejectedValue(new Error('Google failed'))
      
      // Mock Apple as working
      mockPlatformComposables.apple.login.mockResolvedValue({
        success: true,
        user: mockUsers.apple,
        platform: 'apple'
      })

      const [googleResult, appleResult] = await Promise.all([
        social.loginWithGoogle(),
        social.loginWithApple()
      ])

      expect(googleResult.success).toBe(false)
      expect(appleResult.success).toBe(true)
      expect(mockSocialState.setUser).toHaveBeenCalledWith(mockUsers.apple)
    })

    it('should handle logout errors gracefully', async () => {
      const social = useSocial()

      mockSocialState.isPlatformAuthenticated.mockReturnValue(true)
      mockPlatformComposables.google.logout.mockRejectedValue(new Error('Logout failed'))

      // Should not throw
      await expect(social.logout('google')).resolves.toBeUndefined()
      
      // State should still be cleaned up
      expect(mockSocialState.logout).toHaveBeenCalledWith('google')
    })
  })

  describe('Generic Interface Integration', () => {
    it('should delegate correctly through generic login interface', async () => {
      const social = useSocial()

      const platforms: SocialPlatform[] = ['google', 'apple', 'line', 'telegram']
      
      // Mock all platforms
      platforms.forEach(platform => {
        mockPlatformComposables[platform].login.mockResolvedValue({
          success: true,
          user: mockUsers[platform],
          platform
        })
      })

      // Test each platform through generic interface
      for (const platform of platforms) {
        const result = await social.login(platform, { popup: true })
        
        expect(result.success).toBe(true)
        expect(result.platform).toBe(platform)
        expect(mockPlatformComposables[platform].login).toHaveBeenCalledWith({ popup: true })
      }
    })

    it('should handle unsupported platform gracefully', async () => {
      const social = useSocial()

      const result = await social.login('facebook' as unknown)

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('Unsupported platform: facebook')
      expect(result.platform).toBe('facebook')
    })
  })

  describe('System Status Integration', () => {
    it('should provide accurate system status', () => {
      const social = useSocial()

      // Mock system state
      mockSocialState.currentUser.value = mockUsers.google
      mockSocialState.isAuthenticated.value = true
      mockSocialState.authenticatedPlatforms.value = ['google', 'apple']

      const status = social.getSystemStatus()

      expect(status.isAuthenticated).toBe(true)
      expect(status.currentUser).toEqual(mockUsers.google)
      expect(status.authenticatedPlatforms).toEqual(['google', 'apple'])
    })

    it('should track platform availability correctly', () => {
      const social = useSocial()

      // Mock some platforms as not ready
      mockPlatformComposables.google.isReady.value = true
      mockPlatformComposables.apple.isReady.value = false
      mockPlatformComposables.line.isReady.value = true
      mockPlatformComposables.telegram.isReady.value = false

      const available = social.getAvailablePlatforms()
      expect(available).toEqual(['google', 'line'])

      const defaultPlatform = social.getDefaultPlatform()
      expect(defaultPlatform).toBe('google')
    })
  })

  describe('Performance and Concurrency', () => {
    it('should handle concurrent login attempts correctly', async () => {
      const social = useSocial()

      // Mock different platforms
      mockPlatformComposables.google.login.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          success: true,
          user: mockUsers.google,
          platform: 'google'
        }), 50))
      )

      mockPlatformComposables.apple.login.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          success: true,
          user: mockUsers.apple,
          platform: 'apple'
        }), 30))
      )

      // Start concurrent logins
      const [googleResult, appleResult] = await Promise.all([
        social.loginWithGoogle(),
        social.loginWithApple()
      ])

      expect(googleResult.success).toBe(true)
      expect(appleResult.success).toBe(true)
      expect(mockSocialState.setUser).toHaveBeenCalledTimes(2)
    })

    it('should handle rapid successive operations', async () => {
      const social = useSocial()

      mockPlatformComposables.google.login.mockResolvedValue({
        success: true,
        user: mockUsers.google,
        platform: 'google'
      })

      // Rapid operations
      await social.loginWithGoogle()
      social.updateActivity()
      social.clearAllErrors()
      await social.logout('google')

      // All operations should complete without issues
      expect(mockSocialState.setUser).toHaveBeenCalled()
      expect(mockSocialState.refreshActivity).toHaveBeenCalled()
      expect(mockSocialState.clearError).toHaveBeenCalled()
      expect(mockSocialState.logout).toHaveBeenCalled()
    })
  })
})