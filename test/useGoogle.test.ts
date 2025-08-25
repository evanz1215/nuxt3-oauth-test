import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useGoogle } from '../composables/useGoogle'

// Mock the dependencies
vi.mock('../composables/useSocialConfig', () => ({
  useSocialConfig: () => ({
    getPlatformConfig: vi.fn(() => ({
      clientId: 'test-google-client-id',
      redirectUri: 'http://localhost:3000/auth/callback'
    })),
    validateConfig: vi.fn()
  })
}))

vi.mock('../composables/useSocialState', () => ({
  useSocialState: () => ({
    setUser: vi.fn(),
    setLoginState: vi.fn(),
    clearUser: vi.fn(),
    clearAuthState: vi.fn()
  })
}))

// Mock global window object
const mockGoogle = {
  accounts: {
    id: {
      initialize: vi.fn(),
      prompt: vi.fn(),
      renderButton: vi.fn(),
      disableAutoSelect: vi.fn(),
      storeCredential: vi.fn(),
      cancel: vi.fn()
    },
    oauth2: {
      initTokenClient: vi.fn(() => ({
        callback: null,
        requestAccessToken: vi.fn()
      })),
      hasGrantedAllScopes: vi.fn(),
      hasGrantedAnyScope: vi.fn(),
      revoke: vi.fn()
    }
  }
}

describe('useGoogle', () => {
  beforeEach(() => {
    // Reset window.google
    Object.defineProperty(window, 'google', {
      value: mockGoogle,
      writable: true,
      configurable: true
    })
    
    // Mock document.createElement for script loading
    const mockScript = {
      src: '',
      async: false,
      defer: false,
      onload: null as any,
      onerror: null as any
    }
    
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'script') {
        return mockScript as any
      }
      return document.createElement(tagName)
    })
    
    vi.spyOn(document.head, 'appendChild').mockImplementation(() => {
      // Simulate successful script load
      setTimeout(() => {
        if (mockScript.onload) {
          mockScript.onload({} as any)
        }
      }, 0)
      return mockScript as any
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with correct default state', () => {
    const { isReady, isLoading, user } = useGoogle()
    
    expect(isReady.value).toBe(false)
    expect(isLoading.value).toBe(false)
    expect(user.value).toBe(null)
  })

  it('should have required methods', () => {
    const google = useGoogle()
    
    expect(typeof google.login).toBe('function')
    expect(typeof google.logout).toBe('function')
    expect(typeof google.loadSDK).toBe('function')
    expect(typeof google.initializeSDK).toBe('function')
  })

  it('should load Google SDK successfully', async () => {
    // Clear window.google to force SDK loading
    delete (window as any).google
    
    const { loadSDK } = useGoogle()
    
    await expect(loadSDK()).resolves.toBeUndefined()
    expect(document.createElement).toHaveBeenCalledWith('script')
    expect(document.head.appendChild).toHaveBeenCalled()
  })

  it('should initialize SDK with correct configuration', async () => {
    const { initializeSDK } = useGoogle()
    
    await initializeSDK()
    
    expect(mockGoogle.accounts.id.initialize).toHaveBeenCalledWith({
      client_id: 'test-google-client-id',
      callback: expect.any(Function),
      auto_select: false,
      cancel_on_tap_outside: true
    })
    
    expect(mockGoogle.accounts.oauth2.initTokenClient).toHaveBeenCalledWith({
      client_id: 'test-google-client-id',
      scope: 'profile email',
      callback: expect.any(Function)
    })
  })

  it('should handle logout correctly', async () => {
    const { logout } = useGoogle()
    
    await expect(logout()).resolves.toBeUndefined()
    expect(mockGoogle.accounts.id.disableAutoSelect).toHaveBeenCalled()
  })

  it('should handle SDK loading errors', async () => {
    // Clear window.google to force SDK loading
    delete (window as any).google
    
    // Mock script error
    vi.spyOn(document.head, 'appendChild').mockImplementation((script: unknown) => {
      setTimeout(() => {
        if (script.onerror) {
          script.onerror(new Error('Network error'))
        }
      }, 0)
      return script
    })

    const { loadSDK } = useGoogle()
    
    await expect(loadSDK()).rejects.toThrow()
  })

  describe('Popup Login Mode', () => {
    beforeEach(() => {
      // Mock window.open for popup tests
      vi.spyOn(window, 'open').mockImplementation(() => {
        const mockPopup = {
          close: vi.fn(),
          closed: false
        }
        return mockPopup as any
      })
      
      // Mock fetch for getUserInfo
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: '123456789',
            email: 'test@example.com',
            name: 'Test User',
            given_name: 'Test',
            family_name: 'User',
            picture: 'https://example.com/avatar.jpg'
          })
        })
      ) as any
    })

    it('should login successfully with popup mode', async () => {
      const { login, initializeSDK } = useGoogle()
      
      // Initialize SDK first
      await initializeSDK()
      
      // Mock successful token response
      const mockTokenClient = mockGoogle.accounts.oauth2.initTokenClient()
      
      // Start login
      const loginPromise = login({ popup: true })
      
      // Simulate successful token response
      setTimeout(() => {
        mockTokenClient.callback({
          access_token: 'test-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'profile email'
        })
      }, 100)
      
      const result = await loginPromise
      
      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user?.platform).toBe('google')
      expect(result.user?.accessToken).toBe('test-access-token')
    })

    it('should handle popup blocked error', async () => {
      // Mock popup blocked scenario
      vi.spyOn(window, 'open').mockImplementation(() => null)
      
      const { login, initializeSDK } = useGoogle()
      
      await initializeSDK()
      
      const result = await login({ popup: true })
      
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('POPUP_BLOCKED')
    })

    it('should handle user cancellation in popup', async () => {
      const { login, initializeSDK } = useGoogle()
      
      await initializeSDK()
      
      const mockTokenClient = mockGoogle.accounts.oauth2.initTokenClient()
      
      const loginPromise = login({ popup: true })
      
      // Simulate user cancellation
      setTimeout(() => {
        mockTokenClient.callback({
          error: 'popup_closed_by_user',
          error_description: 'User closed the popup'
        })
      }, 100)
      
      const result = await loginPromise
      
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('USER_CANCELLED')
    })

    it('should handle popup timeout', async () => {
      const { login, initializeSDK } = useGoogle()
      
      await initializeSDK()
      
      // Mock a very short timeout for testing
      vi.spyOn(Date, 'now').mockReturnValue(0)
      
      const result = await login({ popup: true })
      
      // Since we're not calling the callback, it should timeout
      // Note: This test might need adjustment based on actual timeout implementation
      expect(result.success).toBe(false)
    }, 10000) // Increase test timeout

    it('should handle network errors during user info fetch', async () => {
      // Mock fetch failure
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
      ) as unknown
      
      const { login, initializeSDK } = useGoogle()
      
      await initializeSDK()
      
      const mockTokenClient = mockGoogle.accounts.oauth2.initTokenClient()
      
      const loginPromise = login({ popup: true })
      
      // Simulate successful token response
      setTimeout(() => {
        mockTokenClient.callback({
          access_token: 'test-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'profile email'
        })
      }, 100)
      
      const result = await loginPromise
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Redirect Login Mode', () => {
    beforeEach(() => {
      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: {
          href: '',
          origin: 'http://localhost:3000',
          pathname: '/',
          search: '',
          hash: ''
        },
        writable: true,
        configurable: true
      })
      
      // Mock window.history
      Object.defineProperty(window, 'history', {
        value: {
          replaceState: vi.fn()
        },
        writable: true,
        configurable: true
      })
      
      // Mock sessionStorage
      const mockSessionStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      }
      Object.defineProperty(window, 'sessionStorage', {
        value: mockSessionStorage,
        writable: true,
        configurable: true
      })
      
      // Mock crypto.getRandomValues
      Object.defineProperty(window, 'crypto', {
        value: {
          getRandomValues: vi.fn((array) => {
            for (let i = 0; i < array.length; i++) {
              array[i] = Math.floor(Math.random() * 256)
            }
            return array
          })
        },
        writable: true,
        configurable: true
      })
      
      // Mock fetch for token exchange
      global.fetch = vi.fn()
    })

    it('should initiate redirect login correctly', async () => {
      const { login, initializeSDK } = useGoogle()
      
      await initializeSDK()
      
      // Mock the redirect by capturing the href assignment
      let redirectUrl = ''
      Object.defineProperty(window.location, 'href', {
        set: (url) => { redirectUrl = url },
        get: () => redirectUrl
      })
      
      // Start redirect login
      login({ popup: false })
      
      // Verify sessionStorage was used to store state
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        'google_login_state',
        expect.stringContaining('"platform":"google"')
      )
      
      // Verify redirect URL was set
      expect(redirectUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth')
      expect(redirectUrl).toContain('client_id=test-google-client-id')
      expect(redirectUrl).toContain('response_type=code')
      expect(redirectUrl).toContain('scope=profile%20email')
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
      
      // Mock URL with callback parameters
      Object.defineProperty(window.location, 'search', {
        value: '?code=test-auth-code&state=test-state',
        writable: true
      })
      
      // Mock stored state
      const storedState = {
        platform: 'google',
        timestamp: Date.now(),
        state: 'test-state',
        redirectUri: 'http://localhost:3000/auth/callback'
      }
      vi.mocked(window.sessionStorage.getItem).mockReturnValue(JSON.stringify(storedState))
      
      // Mock token exchange response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'test-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'test-refresh-token'
        })
      } as any)
      
      // Mock user info response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: '123456789',
          email: 'test@example.com',
          name: 'Test User',
          given_name: 'Test',
          family_name: 'User',
          picture: 'https://example.com/avatar.jpg'
        })
      } as any)
      
      const result = await handleRedirectCallback()
      
      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user?.platform).toBe('google')
      expect(result.user?.accessToken).toBe('test-access-token')
      expect(result.user?.refreshToken).toBe('test-refresh-token')
      
      // Verify cleanup
      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('google_login_state')
      expect(window.history.replaceState).toHaveBeenCalled()
    })

    it('should handle redirect callback with error', async () => {
      const { handleRedirectCallback } = useGoogle()
      
      // Mock URL with error parameters
      Object.defineProperty(window.location, 'search', {
        value: '?error=access_denied&error_description=User%20denied%20access',
        writable: true
      })
      
      const result = await handleRedirectCallback()
      
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('AUTHORIZATION_FAILED')
      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('google_login_state')
    })

    it('should handle state mismatch in redirect callback', async () => {
      const { handleRedirectCallback } = useGoogle()
      
      // Mock URL with callback parameters
      Object.defineProperty(window.location, 'search', {
        value: '?code=test-auth-code&state=wrong-state',
        writable: true
      })
      
      // Mock stored state with different state value
      const storedState = {
        platform: 'google',
        timestamp: Date.now(),
        state: 'correct-state'
      }
      vi.mocked(window.sessionStorage.getItem).mockReturnValue(JSON.stringify(storedState))
      
      const result = await handleRedirectCallback()
      
      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('state_mismatch')
      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('google_login_state')
    })

    it('should handle expired state in redirect callback', async () => {
      const { handleRedirectCallback } = useGoogle()
      
      // Mock URL with callback parameters
      Object.defineProperty(window.location, 'search', {
        value: '?code=test-auth-code&state=test-state',
        writable: true
      })
      
      // Mock stored state that's too old (more than 10 minutes)
      const storedState = {
        platform: 'google',
        timestamp: Date.now() - (11 * 60 * 1000), // 11 minutes ago
        state: 'test-state'
      }
      vi.mocked(window.sessionStorage.getItem).mockReturnValue(JSON.stringify(storedState))
      
      const result = await handleRedirectCallback()
      
      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('state_expired')
      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('google_login_state')
    })

    it('should handle missing stored state in redirect callback', async () => {
      const { handleRedirectCallback } = useGoogle()
      
      // Mock URL with callback parameters
      Object.defineProperty(window.location, 'search', {
        value: '?code=test-auth-code&state=test-state',
        writable: true
      })
      
      // Mock missing stored state
      vi.mocked(window.sessionStorage.getItem).mockReturnValue(null)
      
      const result = await handleRedirectCallback()
      
      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('invalid_state')
    })

    it('should handle token exchange failure', async () => {
      const { handleRedirectCallback } = useGoogle()
      
      // Mock URL with callback parameters
      Object.defineProperty(window.location, 'search', {
        value: '?code=test-auth-code&state=test-state',
        writable: true
      })
      
      // Mock stored state
      const storedState = {
        platform: 'google',
        timestamp: Date.now(),
        state: 'test-state'
      }
      vi.mocked(window.sessionStorage.getItem).mockReturnValue(JSON.stringify(storedState))
      
      // Mock token exchange failure
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      } as any)
      
      const result = await handleRedirectCallback()
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('google_login_state')
    })

    it('should handle user info fetch failure after token exchange', async () => {
      const { handleRedirectCallback } = useGoogle()
      
      // Mock URL with callback parameters
      Object.defineProperty(window.location, 'search', {
        value: '?code=test-auth-code&state=test-state',
        writable: true
      })
      
      // Mock stored state
      const storedState = {
        platform: 'google',
        timestamp: Date.now(),
        state: 'test-state'
      }
      vi.mocked(window.sessionStorage.getItem).mockReturnValue(JSON.stringify(storedState))
      
      // Mock successful token exchange
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'test-access-token',
          token_type: 'Bearer',
          expires_in: 3600
        })
      } as any)
      
      // Mock user info fetch failure
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      } as any)
      
      const result = await handleRedirectCallback()
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('google_login_state')
    })
  })
})