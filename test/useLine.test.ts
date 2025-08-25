import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useLine } from '../composables/useLine'

// Mock the dependencies
vi.mock('../composables/useSocialConfig', () => ({
  useSocialConfig: () => ({
    getPlatformConfig: vi.fn(() => ({
      clientId: 'test-line-client-id',
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
const mockLiff = {
  init: vi.fn(() => Promise.resolve()),
  login: vi.fn(),
  logout: vi.fn(),
  isLoggedIn: vi.fn(() => false),
  getAccessToken: vi.fn(() => 'test-access-token'),
  getProfile: vi.fn(() => Promise.resolve({
    userId: 'test-user-id',
    displayName: 'Test User',
    pictureUrl: 'https://example.com/avatar.jpg',
    statusMessage: 'Hello World'
  })),
  getIDToken: vi.fn(() => 'test-id-token'),
  isInClient: vi.fn(() => false),
  ready: Promise.resolve()
}

describe('useLine', () => {
  beforeEach(() => {
    // Reset window.liff
    Object.defineProperty(window, 'liff', {
      value: mockLiff,
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

    // Mock import.meta.client
    Object.defineProperty(import.meta, 'client', {
      value: true,
      writable: true,
      configurable: true
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with correct default state', () => {
    const { isReady, isLoading, user } = useLine()
    
    expect(isReady.value).toBe(false)
    expect(isLoading.value).toBe(false)
    expect(user.value).toBe(null)
  })

  it('should have required methods', () => {
    const line = useLine()
    
    expect(typeof line.login).toBe('function')
    expect(typeof line.logout).toBe('function')
    expect(typeof line.loadSDK).toBe('function')
    expect(typeof line.initializeSDK).toBe('function')
  })

  it('should load Line SDK successfully', async () => {
    // Clear window.liff to force SDK loading
    delete (window as any).liff
    
    const { loadSDK } = useLine()
    
    await expect(loadSDK()).resolves.toBeUndefined()
    expect(document.createElement).toHaveBeenCalledWith('script')
    expect(document.head.appendChild).toHaveBeenCalled()
  })

  it('should initialize SDK with correct configuration', async () => {
    const { initializeSDK } = useLine()
    
    await initializeSDK()
    
    expect(mockLiff.init).toHaveBeenCalledWith({
      liffId: 'test-line-client-id',
      withLoginOnExternalBrowser: true
    })
  })

  it('should handle logout correctly', async () => {
    vi.mocked(mockLiff.isLoggedIn).mockReturnValue(true)
    
    const { logout } = useLine()
    
    await expect(logout()).resolves.toBeUndefined()
    expect(mockLiff.logout).toHaveBeenCalled()
  })

  it('should handle SDK loading errors', async () => {
    // Clear window.liff to force SDK loading
    delete (window as any).liff
    
    // Mock script error
    vi.spyOn(document.head, 'appendChild').mockImplementation((script: any) => {
      setTimeout(() => {
        if (script.onerror) {
          script.onerror(new Error('Network error'))
        }
      }, 0)
      return script
    })

    const { loadSDK } = useLine()
    
    await expect(loadSDK()).rejects.toThrow()
  })

  describe('Login with existing session', () => {
    beforeEach(() => {
      vi.mocked(mockLiff.isLoggedIn).mockReturnValue(true)
    })

    it('should return current user if already logged in', async () => {
      const { login, initializeSDK } = useLine()
      
      await initializeSDK()
      
      const result = await login()
      
      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user?.platform).toBe('line')
      expect(result.user?.lineId).toBe('test-user-id')
      expect(result.user?.displayName).toBe('Test User')
      expect(mockLiff.getProfile).toHaveBeenCalled()
      expect(mockLiff.getAccessToken).toHaveBeenCalled()
    })
  })

  describe('Popup Login Mode', () => {
    beforeEach(() => {
      vi.mocked(mockLiff.isLoggedIn).mockReturnValue(false)
    })

    it('should initiate popup login correctly', async () => {
      const { login, initializeSDK } = useLine()
      
      await initializeSDK()
      
      // Mock the login promise resolution
      setTimeout(() => {
        const loginPromise = (window as any).__lineLoginPromise
        if (loginPromise) {
          clearTimeout(loginPromise.timeout)
          delete (window as any).__lineLoginPromise
          
          // Simulate successful login by changing isLoggedIn state
          vi.mocked(mockLiff.isLoggedIn).mockReturnValue(true)
          
          loginPromise.resolve({
            success: true,
            user: {
              id: 'test-user-id',
              lineId: 'test-user-id',
              displayName: 'Test User',
              platform: 'line',
              accessToken: 'test-access-token'
            },
            platform: 'line'
          })
        }
      }, 100)
      
      const result = await login({ popup: true })
      
      expect(mockLiff.login).toHaveBeenCalledWith({
        redirectUri: expect.any(String),
        scope: 'profile openid email',
        botPrompt: 'normal'
      })
    })

    it('should handle popup timeout', async () => {
      const { login, initializeSDK } = useLine()
      
      await initializeSDK()
      
      // Don't resolve the login promise to simulate timeout
      const result = await login({ popup: true })
      
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('TIMEOUT_ERROR')
    }, 10000)

    it('should use custom botPrompt option', async () => {
      const { login, initializeSDK } = useLine()
      
      await initializeSDK()
      
      // Mock the login promise resolution
      setTimeout(() => {
        const loginPromise = (window as any).__lineLoginPromise
        if (loginPromise) {
          clearTimeout(loginPromise.timeout)
          delete (window as any).__lineLoginPromise
          loginPromise.resolve({
            success: true,
            user: { platform: 'line' },
            platform: 'line'
          })
        }
      }, 100)
      
      await login({ popup: true, botPrompt: 'aggressive' })
      
      expect(mockLiff.login).toHaveBeenCalledWith({
        redirectUri: expect.any(String),
        scope: 'profile openid email',
        botPrompt: 'aggressive'
      })
    })
  })

  describe('Redirect Login Mode', () => {
    beforeEach(() => {
      vi.mocked(mockLiff.isLoggedIn).mockReturnValue(false)
      
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
      const { login, initializeSDK } = useLine()
      
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
        'line_login_state',
        expect.stringContaining('"platform":"line"')
      )
      
      // Verify redirect URL was set
      expect(redirectUrl).toContain('https://access.line.me/oauth2/v2.1/authorize')
      expect(redirectUrl).toContain('client_id=test-line-client-id')
      expect(redirectUrl).toContain('response_type=code')
      expect(redirectUrl).toContain('scope=profile%20openid%20email')
    })

    it('should detect redirect callback correctly', () => {
      const { isRedirectCallback } = useLine()
      
      // Mock URL with callback parameters
      Object.defineProperty(window.location, 'search', {
        value: '?code=test-code&state=test-state',
        writable: true
      })
      
      // Mock stored state
      vi.mocked(window.sessionStorage.getItem).mockReturnValue(
        JSON.stringify({
          platform: 'line',
          timestamp: Date.now(),
          state: 'test-state'
        })
      )
      
      expect(isRedirectCallback()).toBe(true)
    })

    it('should handle successful redirect callback', async () => {
      const { handleRedirectCallback } = useLine()
      
      // Mock URL with callback parameters
      Object.defineProperty(window.location, 'search', {
        value: '?code=test-auth-code&state=test-state',
        writable: true
      })
      
      // Mock stored state
      const storedState = {
        platform: 'line',
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
          refresh_token: 'test-refresh-token',
          scope: 'profile openid email'
        })
      } as any)
      
      // Mock user info response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          userId: 'test-user-id',
          displayName: 'Test User',
          pictureUrl: 'https://example.com/avatar.jpg'
        })
      } as any)
      
      const result = await handleRedirectCallback()
      
      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user?.platform).toBe('line')
      expect(result.user?.lineId).toBe('test-user-id')
      expect(result.user?.accessToken).toBe('test-access-token')
      expect(result.user?.refreshToken).toBe('test-refresh-token')
      
      // Verify cleanup
      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('line_login_state')
      expect(window.history.replaceState).toHaveBeenCalled()
    })

    it('should handle redirect callback with error', async () => {
      const { handleRedirectCallback } = useLine()
      
      // Mock URL with error parameters
      Object.defineProperty(window.location, 'search', {
        value: '?error=access_denied&error_description=User%20denied%20access',
        writable: true
      })
      
      const result = await handleRedirectCallback()
      
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('USER_CANCELLED')
      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('line_login_state')
    })

    it('should handle state mismatch in redirect callback', async () => {
      const { handleRedirectCallback } = useLine()
      
      // Mock URL with callback parameters
      Object.defineProperty(window.location, 'search', {
        value: '?code=test-auth-code&state=wrong-state',
        writable: true
      })
      
      // Mock stored state with different state value
      const storedState = {
        platform: 'line',
        timestamp: Date.now(),
        state: 'correct-state'
      }
      vi.mocked(window.sessionStorage.getItem).mockReturnValue(JSON.stringify(storedState))
      
      const result = await handleRedirectCallback()
      
      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('state_mismatch')
      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('line_login_state')
    })

    it('should handle token exchange failure', async () => {
      const { handleRedirectCallback } = useLine()
      
      // Mock URL with callback parameters
      Object.defineProperty(window.location, 'search', {
        value: '?code=test-auth-code&state=test-state',
        writable: true
      })
      
      // Mock stored state
      const storedState = {
        platform: 'line',
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
      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('line_login_state')
    })
  })
})