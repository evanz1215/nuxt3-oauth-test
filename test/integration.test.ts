import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setupTestEnvironment, cleanupTestEnvironment, mockComposableDependencies, expectSuccessfulLogin, expectFailedLogin, waitFor } from './utils/testHelpers'
import { mockUsers, mockErrors } from './mocks/socialSDKs'
import type { SocialLoginResult, SocialUser, SocialPlatform } from '../composables/types'

// Mock all platform composables and dependencies
vi.mock('../composables/useGoogle')
vi.mock('../composables/useApple')
vi.mock('../composables/useLine')
vi.mock('../composables/useTelegram')
vi.mock('../composables/useSocialState')
vi.mock('../composables/useSocialConfig')

describe('Social Login Integration Tests', () => {
  let mockDeps: ReturnType<typeof mockComposableDependencies>
  let mockPlatformComposables: Record<string, any>
  let useSocial: any

  beforeEach(async () => {
    setupTestEnvironment()
    mockDeps = mockComposableDependencies()

    // Create comprehensive mock platform composables
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
    const { useSocialConfig } = await import('../composables/useSocialConfig')

    vi.mocked(useGoogle).mockReturnValue(mockPlatformComposables.google)
    vi.mocked(useApple).mockReturnValue(mockPlatformComposables.apple)
    vi.mocked(useLine).mockReturnValue(mockPlatformComposables.line)
    vi.mocked(useTelegram).mockReturnValue(mockPlatformComposables.telegram)
    vi.mocked(useSocialState).mockReturnValue(mockDeps.mockSocialState)
    vi.mocked(useSocialConfig).mockReturnValue(mockDeps.mockSocialConfig)

    // Import useSocial after mocking dependencies
    const { useSocial: importedUseSocial } = await import('../composables/useSocial')
    useSocial = importedUseSocial
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('SDK Integration Tests', () => {
    describe('Google SDK Integration', () => {
      it('should integrate with Google SDK for popup login', async () => {
        const social = useSocial()
        const mockResult: SocialLoginResult = {
          success: true,
          user: mockUsers.google,
          platform: 'google'
        }

        mockPlatformComposables.google.login.mockResolvedValue(mockResult)

        const result = await social.loginWithGoogle({ popup: true })

        expect(mockPlatformComposables.google.login).toHaveBeenCalledWith({ popup: true })
        expectSuccessfulLogin(result, 'google')
        expect(mockDeps.mockSocialState.setUser).toHaveBeenCalledWith(mockResult.user)
      })

      it('should integrate with Google SDK for redirect login', async () => {
        const social = useSocial()
        const mockResult: SocialLoginResult = {
          success: true,
          user: mockUsers.google,
          platform: 'google'
        }

        mockPlatformComposables.google.login.mockResolvedValue(mockResult)

        const result = await social.loginWithGoogle({ popup: false })

        expect(mockPlatformComposables.google.login).toHaveBeenCalledWith({ popup: false })
        expectSuccessfulLogin(result, 'google')
      })

      it('should handle Google SDK errors correctly', async () => {
        const social = useSocial()
        const mockError = new Error('Google SDK error')
        
        mockPlatformComposables.google.login.mockRejectedValue(mockError)

        const result = await social.loginWithGoogle()

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
        expect(result.platform).toBe('google')
        expect(mockDeps.mockSocialState.setError).toHaveBeenCalled()
      })

      it('should handle Google redirect callback', async () => {
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
        expect(result).toEqual(mockResult)
      })
    })

    describe('Apple SDK Integration', () => {
      it('should integrate with Apple SDK for popup login', async () => {
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

      it('should handle Apple SDK identity token', async () => {
        const social = useSocial()
        const appleUser = {
          ...mockUsers.apple,
          identityToken: 'apple_identity_token_123',
          authorizationCode: 'apple_auth_code_123'
        }
        const mockResult: SocialLoginResult = {
          success: true,
          user: appleUser,
          platform: 'apple'
        }

        mockPlatformComposables.apple.login.mockResolvedValue(mockResult)

        const result = await social.loginWithApple()

        expectSuccessfulLogin(result, 'apple')
        expect(result.user?.identityToken).toBe('apple_identity_token_123')
        expect(result.user?.authorizationCode).toBe('apple_auth_code_123')
      })

      it('should handle Apple SDK errors', async () => {
        const social = useSocial()
        const mockError = new Error('Apple SDK error')
        
        mockPlatformComposables.apple.login.mockRejectedValue(mockError)

        const result = await social.loginWithApple()

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
        expect(result.platform).toBe('apple')
      })
    })

    describe('Line SDK Integration', () => {
      it('should integrate with Line SDK for login', async () => {
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

      it('should handle Line SDK bot prompt settings', async () => {
        const social = useSocial()
        const mockResult: SocialLoginResult = {
          success: true,
          user: mockUsers.line,
          platform: 'line'
        }

        mockPlatformComposables.line.login.mockResolvedValue(mockResult)

        await social.loginWithLine({ botPrompt: 'normal' })
        expect(mockPlatformComposables.line.login).toHaveBeenCalledWith({ botPrompt: 'normal' })

        await social.loginWithLine({ botPrompt: 'aggressive' })
        expect(mockPlatformComposables.line.login).toHaveBeenCalledWith({ botPrompt: 'aggressive' })
      })

      it('should handle Line SDK errors', async () => {
        const social = useSocial()
        const mockError = new Error('Line SDK error')
        
        mockPlatformComposables.line.login.mockRejectedValue(mockError)

        const result = await social.loginWithLine()

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
        expect(result.platform).toBe('line')
      })
    })

    describe('Telegram SDK Integration', () => {
      it('should integrate with Telegram Login Widget', async () => {
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

      it('should handle Telegram widget configuration', async () => {
        const social = useSocial()
        const mockResult: SocialLoginResult = {
          success: true,
          user: mockUsers.telegram,
          platform: 'telegram'
        }

        mockPlatformComposables.telegram.login.mockResolvedValue(mockResult)

        const options = { size: 'medium' as const, cornerRadius: 10 }
        await social.loginWithTelegram(options)

        expect(mockPlatformComposables.telegram.login).toHaveBeenCalledWith(options)
      })

      it('should handle Telegram bot verification', async () => {
        const social = useSocial()
        const telegramUser = {
          ...mockUsers.telegram,
          telegramId: 987654321,
          username: 'testuser'
        }
        const mockResult: SocialLoginResult = {
          success: true,
          user: telegramUser,
          platform: 'telegram'
        }

        mockPlatformComposables.telegram.login.mockResolvedValue(mockResult)

        const result = await social.loginWithTelegram()

        expectSuccessfulLogin(result, 'telegram')
        expect(result.user?.telegramId).toBe(987654321)
        expect(result.user?.username).toBe('testuser')
      })
    })
  })

  describe('State Management and Data Flow Tests', () => {
    describe('Global State Management', () => {
      it('should manage global authentication state correctly', async () => {
        const social = useSocial()
        const mockResult: SocialLoginResult = {
          success: true,
          user: mockUsers.google,
          platform: 'google'
        }

        mockPlatformComposables.google.login.mockResolvedValue(mockResult)

        await social.loginWithGoogle()

        // Verify state management calls
        expect(mockDeps.mockSocialState.setLoginState).toHaveBeenCalledWith({ 
          isLoading: true, 
          platform: 'google' 
        })
        expect(mockDeps.mockSocialState.setUser).toHaveBeenCalledWith(mockResult.user)
        expect(mockDeps.mockSocialState.setLoginState).toHaveBeenCalledWith({ 
          isLoading: false, 
          platform: 'google' 
        })
      })

      it('should track authenticated platforms correctly', async () => {
        const social = useSocial()
        
        // Mock multiple platform logins
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

        await social.loginWithGoogle()
        await social.loginWithApple()

        // Verify both platforms were set as authenticated
        expect(mockDeps.mockSocialState.setUser).toHaveBeenCalledWith(mockUsers.google)
        expect(mockDeps.mockSocialState.setUser).toHaveBeenCalledWith(mockUsers.apple)
      })

      it('should handle platform-specific loading states', async () => {
        const social = useSocial()
        
        // Mock slow login
        mockPlatformComposables.google.login.mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve({
            success: true,
            user: mockUsers.google,
            platform: 'google'
          }), 100))
        )

        const loginPromise = social.loginWithGoogle()

        // Verify loading state is set
        expect(mockDeps.mockSocialState.setPlatformLoading).toHaveBeenCalledWith('google', true)

        await loginPromise

        // Verify loading state is cleared
        expect(mockDeps.mockSocialState.setPlatformLoading).toHaveBeenCalledWith('google', false)
      })

      it('should manage error states across platforms', async () => {
        const social = useSocial()
        const googleError = new Error('Google error')
        const appleError = new Error('Apple error')

        mockPlatformComposables.google.login.mockRejectedValue(googleError)
        mockPlatformComposables.apple.login.mockRejectedValue(appleError)

        await social.loginWithGoogle()
        await social.loginWithApple()

        // Verify errors were set for both platforms
        expect(mockDeps.mockSocialState.setError).toHaveBeenCalledTimes(2)
      })

      it('should handle concurrent login attempts', async () => {
        const social = useSocial()

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

        // Start concurrent logins
        const [googleResult, appleResult] = await Promise.all([
          social.loginWithGoogle(),
          social.loginWithApple()
        ])

        expectSuccessfulLogin(googleResult, 'google')
        expectSuccessfulLogin(appleResult, 'apple')
      })
    })

    describe('User Data Flow', () => {
      it('should maintain user data consistency across platforms', async () => {
        const social = useSocial()
        
        // Login with Google first
        mockPlatformComposables.google.login.mockResolvedValue({
          success: true,
          user: mockUsers.google,
          platform: 'google'
        })

        await social.loginWithGoogle()
        expect(mockDeps.mockSocialState.setUser).toHaveBeenCalledWith(mockUsers.google)

        // Switch to Apple
        mockPlatformComposables.apple.login.mockResolvedValue({
          success: true,
          user: mockUsers.apple,
          platform: 'apple'
        })

        await social.loginWithApple()
        expect(mockDeps.mockSocialState.setUser).toHaveBeenCalledWith(mockUsers.apple)
      })

      it('should handle user data updates correctly', async () => {
        const social = useSocial()
        
        mockDeps.mockSocialState.currentUser.value = mockUsers.google

        social.updateCurrentUser({ name: 'Updated Name' })

        expect(mockDeps.mockSocialState.updatePlatformUser).toHaveBeenCalledWith(
          'google',
          { name: 'Updated Name' }
        )
      })

      it('should refresh user activity on successful login', async () => {
        const social = useSocial()
        const mockResult: SocialLoginResult = {
          success: true,
          user: mockUsers.google,
          platform: 'google'
        }

        mockPlatformComposables.google.login.mockResolvedValue(mockResult)

        await social.loginWithGoogle()

        expect(mockDeps.mockSocialState.refreshActivity).toHaveBeenCalled()
      })
    })

    describe('Session Management', () => {
      it('should handle logout from specific platform', async () => {
        const social = useSocial()
        
        mockDeps.mockSocialState.isPlatformAuthenticated.mockReturnValue(true)

        await social.logout('google')

        expect(mockPlatformComposables.google.logout).toHaveBeenCalled()
        expect(mockDeps.mockSocialState.logout).toHaveBeenCalledWith('google')
      })

      it('should handle logout from all platforms', async () => {
        const social = useSocial()
        
        mockDeps.mockSocialState.isPlatformAuthenticated.mockReturnValue(true)

        await social.logout()

        // Verify all platform logout methods were called
        expect(mockPlatformComposables.google.logout).toHaveBeenCalled()
        expect(mockPlatformComposables.apple.logout).toHaveBeenCalled()
        expect(mockPlatformComposables.line.logout).toHaveBeenCalled()
        expect(mockPlatformComposables.telegram.logout).toHaveBeenCalled()
        expect(mockDeps.mockSocialState.clearAuthState).toHaveBeenCalled()
      })

      it('should handle logout errors gracefully', async () => {
        const social = useSocial()
        
        mockDeps.mockSocialState.isPlatformAuthenticated.mockReturnValue(true)
        mockPlatformComposables.google.logout.mockRejectedValue(new Error('Logout failed'))

        // Should not throw
        await expect(social.logout('google')).resolves.toBeUndefined()
        expect(mockDeps.mockSocialState.logout).toHaveBeenCalledWith('google')
      })
    })
  })

  describe('Multi-Platform Login Scenarios', () => {
    describe('Platform Switching', () => {
      it('should handle switching between platforms seamlessly', async () => {
        const social = useSocial()

        // Start with Google
        mockPlatformComposables.google.login.mockResolvedValue({
          success: true,
          user: mockUsers.google,
          platform: 'google'
        })

        const googleResult = await social.loginWithGoogle()
        expectSuccessfulLogin(googleResult, 'google')

        // Switch to Apple
        mockPlatformComposables.apple.login.mockResolvedValue({
          success: true,
          user: mockUsers.apple,
          platform: 'apple'
        })

        const appleResult = await social.loginWithApple()
        expectSuccessfulLogin(appleResult, 'apple')

        // Verify both users were set
        expect(mockDeps.mockSocialState.setUser).toHaveBeenCalledWith(mockUsers.google)
        expect(mockDeps.mockSocialState.setUser).toHaveBeenCalledWith(mockUsers.apple)
      })

      it('should maintain separate platform states during switching', async () => {
        const social = useSocial()

        // Mock platform states
        mockDeps.mockSocialState.getPlatformState.mockImplementation((platform) => ({
          isAuthenticated: platform === 'google',
          user: platform === 'google' ? mockUsers.google : null,
          isLoading: false
        }))

        const googleState = social.getPlatformState('google')
        const appleState = social.getPlatformState('apple')

        expect(googleState.isAuthenticated).toBe(true)
        expect(googleState.user).toEqual(mockUsers.google)
        expect(appleState.isAuthenticated).toBe(false)
        expect(appleState.user).toBeNull()
      })
    })

    describe('Multi-Platform Authentication', () => {
      it('should support simultaneous authentication on multiple platforms', async () => {
        const social = useSocial()

        // Mock successful logins for all platforms
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

        mockPlatformComposables.line.login.mockResolvedValue({
          success: true,
          user: mockUsers.line,
          platform: 'line'
        })

        // Login to multiple platforms
        const results = await Promise.all([
          social.loginWithGoogle(),
          social.loginWithApple(),
          social.loginWithLine()
        ])

        results.forEach((result, index) => {
          const platforms: SocialPlatform[] = ['google', 'apple', 'line']
          expectSuccessfulLogin(result, platforms[index])
        })
      })

      it('should handle mixed success/failure scenarios', async () => {
        const social = useSocial()

        // Mock mixed results
        mockPlatformComposables.google.login.mockResolvedValue({
          success: true,
          user: mockUsers.google,
          platform: 'google'
        })

        mockPlatformComposables.apple.login.mockRejectedValue(new Error('Apple failed'))

        const [googleResult, appleResult] = await Promise.all([
          social.loginWithGoogle(),
          social.loginWithApple()
        ])

        expectSuccessfulLogin(googleResult, 'google')
        expect(appleResult.success).toBe(false)
        expect(appleResult.error).toBeDefined()
        expect(appleResult.platform).toBe('apple')
      })
    })

    describe('Platform Status Management', () => {
      it('should track all platform statuses correctly', () => {
        const social = useSocial()

        // Mock different platform states
        mockPlatformComposables.google.isReady.value = true
        mockPlatformComposables.google.isLoading.value = false
        mockPlatformComposables.apple.isReady.value = false
        mockPlatformComposables.line.isLoading.value = true

        mockDeps.mockSocialState.isPlatformAuthenticated.mockImplementation((platform) => 
          platform === 'google'
        )

        const status = social.getAllPlatformsStatus()

        expect(status.google.isReady).toBe(true)
        expect(status.google.isLoading).toBe(false)
        expect(status.google.isAuthenticated).toBe(true)
        expect(status.apple.isReady).toBe(false)
        expect(status.line.isLoading).toBe(true)
      })

      it('should identify available platforms correctly', () => {
        const social = useSocial()

        // Mock some platforms as ready
        mockPlatformComposables.google.isReady.value = true
        mockPlatformComposables.apple.isReady.value = false
        mockPlatformComposables.line.isReady.value = true
        mockPlatformComposables.telegram.isReady.value = true

        const available = social.getAvailablePlatforms()
        expect(available).toEqual(['google', 'line', 'telegram'])
      })

      it('should determine default platform correctly', () => {
        const social = useSocial()

        // Mock Google as not ready, Apple as ready
        mockPlatformComposables.google.isReady.value = false
        mockPlatformComposables.apple.isReady.value = true

        const defaultPlatform = social.getDefaultPlatform()
        expect(defaultPlatform).toBe('apple')
      })
    })

    describe('Redirect Callback Handling', () => {
      it('should auto-detect platform for redirect callbacks', async () => {
        const social = useSocial()

        // Mock Apple as handling callback
        mockPlatformComposables.apple.isRedirectCallback.mockReturnValue(true)
        mockPlatformComposables.apple.handleRedirectCallback.mockResolvedValue({
          success: true,
          user: mockUsers.apple,
          platform: 'apple'
        })

        const result = await social.handleRedirectCallback()

        expect(mockPlatformComposables.apple.isRedirectCallback).toHaveBeenCalled()
        expect(mockPlatformComposables.apple.handleRedirectCallback).toHaveBeenCalled()
        expectSuccessfulLogin(result!, 'apple')
      })

      it('should handle multiple platforms checking for callbacks', async () => {
        const social = useSocial()

        // Mock all platforms as not handling callback
        Object.values(mockPlatformComposables).forEach(composable => {
          composable.isRedirectCallback.mockReturnValue(false)
        })

        const result = await social.handleRedirectCallback()
        expect(result).toBeNull()

        // Verify all platforms were checked
        Object.values(mockPlatformComposables).forEach(composable => {
          expect(composable.isRedirectCallback).toHaveBeenCalled()
        })
      })

      it('should handle callback errors gracefully', async () => {
        const social = useSocial()

        mockPlatformComposables.google.isRedirectCallback.mockReturnValue(true)
        mockPlatformComposables.google.handleRedirectCallback.mockRejectedValue(
          new Error('Callback failed')
        )

        const result = await social.handleRedirectCallback('google')

        expect(result?.success).toBe(false)
        expect(result?.error).toBeDefined()
      })
    })

    describe('Error Recovery and Resilience', () => {
      it('should handle platform SDK failures gracefully', async () => {
        const social = useSocial()

        // Mock platform as not ready and login to fail appropriately
        mockPlatformComposables.google.isReady.value = false
        mockPlatformComposables.google.login.mockRejectedValue(new Error('SDK not ready'))

        const result = await social.loginWithGoogle()

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
        expect(result.platform).toBe('google')
      })

      it('should continue working when one platform fails', async () => {
        const social = useSocial()

        // Mock Google as failing, Apple as working
        mockPlatformComposables.google.login.mockRejectedValue(new Error('Google failed'))
        mockPlatformComposables.apple.login.mockResolvedValue({
          success: true,
          user: mockUsers.apple,
          platform: 'apple'
        })

        const googleResult = await social.loginWithGoogle()
        const appleResult = await social.loginWithApple()

        expect(googleResult.success).toBe(false)
        expect(googleResult.error).toBeDefined()
        expect(googleResult.platform).toBe('google')
        expectSuccessfulLogin(appleResult, 'apple')
      })

      it('should handle network errors during login', async () => {
        const social = useSocial()

        const networkError = new Error('Network error')
        mockPlatformComposables.google.login.mockRejectedValue(networkError)

        const result = await social.loginWithGoogle()

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
        expect(result.platform).toBe('google')
        expect(mockDeps.mockSocialState.setError).toHaveBeenCalled()
      })
    })

    describe('Generic Login Interface', () => {
      it('should delegate to correct platform through generic login', async () => {
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

        // Test generic login for each platform
        for (const platform of platforms) {
          const result = await social.login(platform)
          expectSuccessfulLogin(result, platform)
          expect(mockPlatformComposables[platform].login).toHaveBeenCalled()
        }
      })

      it('should pass options correctly through generic login', async () => {
        const social = useSocial()

        mockPlatformComposables.google.login.mockResolvedValue({
          success: true,
          user: mockUsers.google,
          platform: 'google'
        })

        const options = { popup: false, scopes: ['profile', 'email'] }
        await social.login('google', options)

        expect(mockPlatformComposables.google.login).toHaveBeenCalledWith(options)
      })

      it('should handle unsupported platform in generic login', async () => {
        const social = useSocial()

        const result = await social.login('facebook' as unknown)

        expectFailedLogin(result, 'facebook' as unknown)
        expect(result.error?.message).toContain('Unsupported platform: facebook')
      })
    })
  })

  describe('System Integration Tests', () => {
    it('should provide comprehensive system status', () => {
      const social = useSocial()

      // Mock comprehensive state
      mockDeps.mockSocialState.getComprehensiveAuthStatus.mockReturnValue({
        isAuthenticated: true,
        currentUser: mockUsers.google,
        authenticatedPlatforms: ['google', 'apple'],
        isAnyPlatformLoading: false
      })

      const status = social.getSystemStatus()

      expect(status.isAuthenticated).toBe(true)
      expect(status.currentUser).toEqual(mockUsers.google)
      expect(status.authenticatedPlatforms).toContain('google')
      expect(status.availablePlatforms).toBeDefined()
      expect(status.systemReady).toBeDefined()
    })

    it('should handle complete system reset', async () => {
      const social = useSocial()

      // Mock authenticated state
      mockDeps.mockSocialState.isPlatformAuthenticated.mockReturnValue(true)

      await social.logout()
      social.clearAllErrors()

      expect(mockDeps.mockSocialState.clearAuthState).toHaveBeenCalled()
      expect(mockDeps.mockSocialState.clearError).toHaveBeenCalled()
    })

    it('should maintain state consistency across operations', async () => {
      const social = useSocial()

      // Perform multiple operations
      mockPlatformComposables.google.login.mockResolvedValue({
        success: true,
        user: mockUsers.google,
        platform: 'google'
      })

      await social.loginWithGoogle()
      social.updateActivity()
      await social.logout('google')

      // Verify state management was called appropriately
      expect(mockDeps.mockSocialState.setUser).toHaveBeenCalled()
      expect(mockDeps.mockSocialState.refreshActivity).toHaveBeenCalled()
      expect(mockDeps.mockSocialState.logout).toHaveBeenCalledWith('google')
    })
  })
})