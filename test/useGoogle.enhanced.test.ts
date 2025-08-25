import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useGoogle } from '../composables/useGoogle'
import { setupTestEnvironment, cleanupTestEnvironment, mockComposableDependencies, createMockPopup, mockFetchSuccess, mockFetchError, waitFor } from './utils/testHelpers'
import { mockGoogleSDK, mockUsers, mockErrors, createMockJWT } from './mocks/socialSDKs'

// Mock dependencies
vi.mock('../composables/useSocialConfig')
vi.mock('../composables/useSocialState')

describe('useGoogle - Enhanced Tests', () => {
  let mockDeps: ReturnType<typeof mockComposableDependencies>

  beforeEach(() => {
    setupTestEnvironment()
    mockDeps = mockComposableDependencies()
    
    // Setup mock implementations
    const { useSocialConfig } = await import('../composables/useSocialConfig')
    const { useSocialState } = await import('../composables/useSocialState')
    
    vi.mocked(useSocialConfig).mockReturnValue(mockDeps.mockSocialConfig)
    vi.mocked(useSocialState).mockReturnValue(mockDeps.mockSocialState)
    
    // Mock platform config
    mockDeps.mockSocialConfig.getPlatformConfig.mockReturnValue({
      clientId: 'test-google-client-id',
      redirectUri: 'http://localhost:3000/auth/callback'
    })

    // Setup Google SDK mock
    Object.defineProperty(window, 'google', {
      value: mockGoogleSDK,
      writable: true,
      configurable: true
    })
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('Initialization and SDK Loading', () => {
    it('should initialize with correct default state', () => {
      const { isReady, isLoading, user } = useGoogle()
      
      expect(isReady.value).toBe(false)
      expect(isLoading.value).toBe(false)
      expect(user.value).toBe(null)
    })

    it('should load SDK when not already present', async () => {
      // Remove Google SDK to force loading
      delete (window as any).google
      
      const { loadSDK } = useGoogle()
      
      await loadSDK()
      
      expect(document.createElement).toHaveBeenCalledWith('script')
      expect(document.head.appendChild).toHaveBeenCalled()
    })

    it('should not reload SDK if already present', async () => {
      const { loadSDK } = useGoogle()
      
      // First call
      await loadSDK()
      const firstCallCount = vi.mocked(document.createElement).mock.calls.length
      
      // Second call
      await loadSDK()
      const secondCallCount = vi.mocked(document.createElement).mock.calls.length
      
      expect(secondCallCount).toBe(firstCallCount)
    })

    it('should handle SDK loading timeout', async () => {
      delete (window as any).google
      
      // Mock timeout scenario
      vi.spyOn(document.head, 'appendChild').mockImplementation(() => {
        // Don't call onload to simulate timeout
        return {} as any
      })
      
      const { loadSDK } = useGoogle()
      
      await expect(loadSDK()).rejects.toThrow()
    })

    it('should initialize SDK with correct configuration', async () => {
      const { initializeSDK } = useGoogle()
      
      await initializeSDK()
      
      expect(mockGoogleSDK.accounts.id.initialize).toHaveBeenCalledWith({
        client_id: 'test-google-client-id',
        callback: expect.any(Function),
        auto_select: false,
        cancel_on_tap_outside: true
      })
      
      expect(mockGoogleSDK.accounts.oauth2.initTokenClient).toHaveBeenCalledWith({
        client_id: 'test-google-client-id',
        scope: 'profile email',
        callback: expect.any(Function)
      })
    })

    it('should handle initialization errors', async () => {
      mockGoogleSDK.accounts.id.initialize.mockImplementation(() => {
        throw new Error('Initialization failed')
      })
      
      const { initializeSDK } = useGoogle()
      
      await expect(initializeSDK()).rejects.toThrow()
    })
  })

  describe('Popup Login Mode', () => {
    beforeEach(async () => {
      const { initializeSDK } = useGoogle()
      await initializeSDK()
      
      // Mock successful user info fetch
      mockFetchSuccess(mockUsers.google)
    })

    it('should perform successful popup login', async () => {
      const mockPopup = createMockPopup()
      const { login } = useGoogle()
      
      const loginPromise = login({ popup: true })
      
      // Simulate successful token response
      const mockTokenClient = mockGoogleSDK.accounts.oauth2.initTokenClient()
      setTimeout(() => {
        mockTokenClient.callback({
          access_token: 'test-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'profile email'
        })
      }, 10)
      
      const result = await loginPromise
      
      expect(result.success).toBe(true)
      expect(result.user?.platform).toBe('google')
      expect(result.user?.accessToken).toBe('test-access-token')
      expect(mockDeps.mockSocialState.setUser).toHaveBeenCalled()
    })

    it('should handle popup blocked error', async () => {
      // Mock popup blocked
      vi.spyOn(window, 'open').mockReturnValue(null)
      
      const { login } = useGoogle()
      const result = await login({ popup: true })
      
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('POPUP_BLOCKED')
    })

    it('should handle user cancellation', async () => {
      createMockPopup()
      const { login } = useGoogle()
      
      const loginPromise = login({ popup: true })
      
      // Simulate user cancellation
      const mockTokenClient = mockGoogleSDK.accounts.oauth2.initTokenClient()
      setTimeout(() => {
        mockTokenClient.callback(mockErrors.google.userCancelled)
      }, 10)
      
      const result = await loginPromise
      
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('USER_CANCELLED')
    })

    it('should handle network errors during user info fetch', async () => {
      createMockPopup()
      mockFetchError(500, 'Internal Server Error')
      
      const { login } = useGoogle()
      
      const loginPromise = login({ popup: true })
      
      // Simulate successful token response
      const mockTokenClient = mockGoogleSDK.accounts.oauth2.initTokenClient()
      setTimeout(() => {
        mockTokenClient.callback({
          access_token: 'test-access-token',
          token_type: 'Bearer',
          expires_in: 3600
        })
      }, 10)
      
      const result = await loginPromise
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle popup timeout', async () => {
      const mockPopup = createMockPopup()
      const { login } = useGoogle()
      
      // Don't trigger callback to simulate timeout
      const result = await login({ popup: true })
      
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('TIMEOUT_ERROR')
    })

    it('should handle invalid token response', async () => {
      createMockPopup()
      const { login } = useGoogle()
      
      const loginPromise = login({ popup: true })
      
      // Simulate invalid token response
      const mockTokenClient = mockGoogleSDK.accounts.oauth2.initTokenClient()
      setTimeout(() => {
        mockTokenClient.callback({
          error: 'invalid_request',
          error_description: 'Invalid request'
        })
      }, 10)
      
      const result = await loginPromise
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Redirect Login Mode', () => {
    beforeEach(() => {
      // Mock sessionStorage for state management
      vi.mocked(window.sessionStorage.getItem).mockReturnValue(null)
      vi.mocked(window.sessionStorage.setItem).mockImplementation(() => {})
      vi.mocked(window.sessionStorage.removeItem).mockImplementation(() => {})
    })

    it('should initiate redirect login correctly', async () => {
      const { login, initializeSDK } = useGoogle()
      
      await initializeSDK()
      
      // Mock redirect URL capture
      let redirectUrl = ''
      Object.defineProperty(window.location, 'href', {
        set: (url) => { redirectUrl = url },
        get: () => redirectUrl
      })
      
      login({ popup: false })
      
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        'google_login_state',
        expect.stringContaining('"platform":"google"')
      )
      
      expect(redirectUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth')
      expect(redirectUrl).toContain('client_id=test-google-client-id')
    })

    it('should detect redirect callback correctly', () => {
      const { isRedirectCallback } = useGoogle()
      
      // Mock URL with callback parameters
      Object.defineProperty(window.location, 'search', {
        value: '?code=test-code&state=test-state',
        writable: true
      })
      
      // Mock stored state
      vi.mocked(window.sessionStorage.getItem).mockReturnValue(
        JSON.stringify({
          platform: 'google',
          timestamp: Date.now(),
          state: 'test-state'
        })
      )
      
      expect(isRedirectCallback()).toBe(true)
    })

    it('should handle successful redirect callback', async () => {
      const { handleRedirectCallback } = useGoogle()
      
      // Mock URL parameters
      Object.defineProperty(window.location, 'search', {
        value: '?code=test-auth-code&state=test-state',
        writable: true
      })
      
      // Mock stored state
      vi.mocked(window.sessionStorage.getItem).mockReturnValue(
        JSON.stringify({
          platform: 'google',
          timestamp: Date.now(),
          state: 'test-state',
          redirectUri: 'http://localhost:3000/auth/callback'
        })
      )
      
      // Mock successful token exchange and user info
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            access_token: 'test-access-token',
            token_type: 'Bearer',
            expires_in: 3600,
            refresh_token: 'test-refresh-token'
          })
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockUsers.google)
        } as any)
      
      const result = await handleRedirectCallback()
      
      expect(result.success).toBe(true)
      expect(result.user?.platform).toBe('google')
      expect(result.user?.accessToken).toBe('test-access-token')
      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('google_login_state')
    })

    it('should handle redirect callback with error', async () => {
      const { handleRedirectCallback } = useGoogle()
      
      // Mock URL with error
      Object.defineProperty(window.location, 'search', {
        value: '?error=access_denied&error_description=User%20denied%20access',
        writable: true
      })
      
      const result = await handleRedirectCallback()
      
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('AUTHORIZATION_FAILED')
    })

    it('should handle state mismatch', async () => {
      const { handleRedirectCallback } = useGoogle()
      
      Object.defineProperty(window.location, 'search', {
        value: '?code=test-code&state=wrong-state',
        writable: true
      })
      
      vi.mocked(window.sessionStorage.getItem).mockReturnValue(
        JSON.stringify({
          platform: 'google',
          timestamp: Date.now(),
          state: 'correct-state'
        })
      )
      
      const result = await handleRedirectCallback()
      
      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('state_mismatch')
    })

    it('should handle expired state', async () => {
      const { handleRedirectCallback } = useGoogle()
      
      Object.defineProperty(window.location, 'search', {
        value: '?code=test-code&state=test-state',
        writable: true
      })
      
      // Mock expired state (11 minutes old)
      vi.mocked(window.sessionStorage.getItem).mockReturnValue(
        JSON.stringify({
          platform: 'google',
          timestamp: Date.now() - (11 * 60 * 1000),
          state: 'test-state'
        })
      )
      
      const result = await handleRedirectCallback()
      
      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('state_expired')
    })

    it('should handle token exchange failure', async () => {
      const { handleRedirectCallback } = useGoogle()
      
      Object.defineProperty(window.location, 'search', {
        value: '?code=test-code&state=test-state',
        writable: true
      })
      
      vi.mocked(window.sessionStorage.getItem).mockReturnValue(
        JSON.stringify({
          platform: 'google',
          timestamp: Date.now(),
          state: 'test-state'
        })
      )
      
      // Mock failed token exchange
      mockFetchError(400, 'Bad Request')
      
      const result = await handleRedirectCallback()
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Logout Functionality', () => {
    it('should logout successfully', async () => {
      const { logout } = useGoogle()
      
      await logout()
      
      expect(mockGoogleSDK.accounts.id.disableAutoSelect).toHaveBeenCalled()
      expect(mockDeps.mockSocialState.clearAuthState).toHaveBeenCalled()
    })

    it('should handle logout errors gracefully', async () => {
      mockGoogleSDK.accounts.id.disableAutoSelect.mockImplementation(() => {
        throw new Error('Logout failed')
      })
      
      const { logout } = useGoogle()
      
      // Should not throw
      await expect(logout()).resolves.toBeUndefined()
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle login when SDK is not ready', async () => {
      delete (window as any).google
      
      const { login } = useGoogle()
      const result = await login()
      
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('SDK_LOAD_FAILED')
    })

    it('should handle malformed user info response', async () => {
      createMockPopup()
      const { login, initializeSDK } = useGoogle()
      
      await initializeSDK()
      
      // Mock malformed user info
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ invalid: 'data' })
      } as any)
      
      const loginPromise = login({ popup: true })
      
      const mockTokenClient = mockGoogleSDK.accounts.oauth2.initTokenClient()
      setTimeout(() => {
        mockTokenClient.callback({
          access_token: 'test-access-token',
          token_type: 'Bearer',
          expires_in: 3600
        })
      }, 10)
      
      const result = await loginPromise
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle concurrent login attempts', async () => {
      createMockPopup()
      const { login, initializeSDK } = useGoogle()
      
      await initializeSDK()
      mockFetchSuccess(mockUsers.google)
      
      // Start multiple login attempts
      const promise1 = login({ popup: true })
      const promise2 = login({ popup: true })
      
      // Simulate token response for first login
      const mockTokenClient = mockGoogleSDK.accounts.oauth2.initTokenClient()
      setTimeout(() => {
        mockTokenClient.callback({
          access_token: 'test-access-token',
          token_type: 'Bearer',
          expires_in: 3600
        })
      }, 10)
      
      const [result1, result2] = await Promise.all([promise1, promise2])
      
      // One should succeed, one should fail due to concurrent login
      expect(result1.success || result2.success).toBe(true)
      expect(result1.success && result2.success).toBe(false)
    })

    it('should handle custom scopes', async () => {
      createMockPopup()
      const { login, initializeSDK } = useGoogle()
      
      await initializeSDK()
      
      await login({ 
        popup: true, 
        scopes: ['profile', 'email', 'https://www.googleapis.com/auth/calendar.readonly']
      })
      
      expect(mockGoogleSDK.accounts.oauth2.initTokenClient).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'profile email https://www.googleapis.com/auth/calendar.readonly'
        })
      )
    })

    it('should validate configuration before login', async () => {
      // Mock invalid configuration
      mockDeps.mockSocialConfig.validateConfig.mockImplementation(() => {
        throw new Error('Invalid configuration')
      })
      
      const { login } = useGoogle()
      const result = await login()
      
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('CONFIGURATION_ERROR')
    })
  })
})