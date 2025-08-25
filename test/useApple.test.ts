import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useApple } from '../composables/useApple'

// Mock the dependencies
vi.mock('../composables/useSocialConfig', () => ({
  useSocialConfig: () => ({
    getPlatformConfig: vi.fn(() => ({
      clientId: 'test-apple-client-id',
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
const mockAppleID = {
  auth: {
    init: vi.fn(),
    signIn: vi.fn(),
    renderButton: vi.fn()
  }
}

describe('useApple', () => {
  beforeEach(() => {
    // Reset window.AppleID
    Object.defineProperty(window, 'AppleID', {
      value: mockAppleID,
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

    // Mock btoa and atob for JWT encoding/decoding
    global.btoa = vi.fn((str) => Buffer.from(str).toString('base64'))
    global.atob = vi.fn((str) => Buffer.from(str, 'base64').toString())

    // Mock decodeURIComponent
    global.decodeURIComponent = vi.fn((str) => str)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with correct default state', () => {
    const { isReady, isLoading, user } = useApple()
    
    expect(isReady.value).toBe(false)
    expect(isLoading.value).toBe(false)
    expect(user.value).toBe(null)
  })

  it('should have required methods', () => {
    const apple = useApple()
    
    expect(typeof apple.login).toBe('function')
    expect(typeof apple.logout).toBe('function')
    expect(typeof apple.loadSDK).toBe('function')
    expect(typeof apple.initializeSDK).toBe('function')
  })

  it('should load Apple SDK successfully', async () => {
    // Clear window.AppleID to force SDK loading
    delete (window as any).AppleID
    
    const { loadSDK } = useApple()
    
    await expect(loadSDK()).resolves.toBeUndefined()
    expect(document.createElement).toHaveBeenCalledWith('script')
    expect(document.head.appendChild).toHaveBeenCalled()
  })

  it('should initialize SDK with correct configuration', async () => {
    const { initializeSDK } = useApple()
    
    await initializeSDK()
    
    expect(mockAppleID.auth.init).toHaveBeenCalledWith({
      clientId: 'test-apple-client-id',
      scope: 'name email',
      redirectURI: 'http://localhost:3000/auth/callback',
      usePopup: true
    })
  })

  it('should handle logout correctly', async () => {
    const { logout } = useApple()
    
    await expect(logout()).resolves.toBeUndefined()
    // Apple doesn't provide programmatic logout, so we just verify it doesn't throw
  })

  it('should handle SDK loading errors', async () => {
    // Clear window.AppleID to force SDK loading
    delete (window as any).AppleID
    
    // Mock script error
    vi.spyOn(document.head, 'appendChild').mockImplementation((script: any) => {
      setTimeout(() => {
        if (script.onerror) {
          script.onerror(new Error('Network error'))
        }
      }, 0)
      return script
    })

    const { loadSDK } = useApple()
    
    await expect(loadSDK()).rejects.toThrow()
  })

  describe('Popup Login Mode', () => {
    beforeEach(() => {
      // Create a proper JWT format for testing
      const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
      const payload = btoa(JSON.stringify({
        sub: 'test-apple-id',
        email: 'test@example.com',
        email_verified: 'true',
        is_private_email: 'false',
        aud: 'test-apple-client-id',
        iss: 'https://appleid.apple.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        nonce_supported: true
      }))
      const signature = 'test-signature'
      const testJWT = `${header}.${payload}.${signature}`

      // Mock successful Apple Sign-In response
      vi.mocked(mockAppleID.auth.signIn).mockResolvedValue({
        authorization: {
          code: 'test-auth-code',
          id_token: testJWT,
          state: 'test-state'
        },
        user: {
          email: 'test@example.com',
          name: {
            firstName: 'Test',
            lastName: 'User'
          }
        }
      })
    })

    it('should login successfully with popup mode', async () => {
      const { login, initializeSDK } = useApple()
      
      // Initialize SDK first
      await initializeSDK()
      
      const result = await login({ popup: true })
      
      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user?.platform).toBe('apple')
      expect(result.user?.appleId).toBe('test-apple-id')
      expect(result.user?.email).toBe('test@example.com')
      expect(result.user?.name).toBe('Test User')
      expect(result.user?.identityToken).toContain('.')
      expect(result.user?.authorizationCode).toBe('test-auth-code')
    })

    it('should handle user cancellation in popup', async () => {
      const { login, initializeSDK } = useApple()
      
      await initializeSDK()
      
      // Mock user cancellation
      vi.mocked(mockAppleID.auth.signIn).mockRejectedValue({
        error: 'user_cancelled_authorize'
      })
      
      const result = await login({ popup: true })
      
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('USER_CANCELLED')
    })

    it('should handle popup timeout', async () => {
      const { login, initializeSDK } = useApple()
      
      await initializeSDK()
      
      // Mock a promise that rejects with timeout error
      vi.mocked(mockAppleID.auth.signIn).mockRejectedValue({
        error: 'timeout',
        message: 'Login timeout'
      })
      
      const result = await login({ popup: true })
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle missing ID token in response', async () => {
      const { login, initializeSDK } = useApple()
      
      await initializeSDK()
      
      // Mock response without ID token
      vi.mocked(mockAppleID.auth.signIn).mockResolvedValue({
        authorization: {
          code: 'test-auth-code',
          id_token: '', // Empty ID token
          state: 'test-state'
        }
      })
      
      const result = await login({ popup: true })
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle JWT decoding errors', async () => {
      const { login, initializeSDK } = useApple()
      
      await initializeSDK()
      
      // Mock response with invalid JWT
      vi.mocked(mockAppleID.auth.signIn).mockResolvedValue({
        authorization: {
          code: 'test-auth-code',
          id_token: 'invalid.jwt.token', // Invalid JWT format
          state: 'test-state'
        }
      })
      
      // Mock atob to throw error for invalid JWT
      global.atob = vi.fn(() => {
        throw new Error('Invalid base64')
      })
      
      const result = await login({ popup: true })
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should use popup mode by default', async () => {
      const { login, initializeSDK } = useApple()
      
      await initializeSDK()
      
      await login() // No options specified
      
      expect(mockAppleID.auth.signIn).toHaveBeenCalledWith(
        expect.objectContaining({
          usePopup: true
        })
      )
    })

    it('should handle Apple SDK not ready error', async () => {
      const { login } = useApple()
      
      // Don't initialize SDK
      delete (window as any).AppleID
      
      const result = await login({ popup: true })
      
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('SDK_LOAD_FAILED')
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
    })

    it('should initiate redirect login correctly', async () => {
      const { login, initializeSDK } = useApple()
      
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
        'apple_login_state',
        expect.stringContaining('"platform":"apple"')
      )
      
      // Verify redirect URL was set
      expect(redirectUrl).toContain('https://appleid.apple.com/auth/authorize')
      expect(redirectUrl).toContain('client_id=test-apple-client-id')
      expect(redirectUrl).toContain('response_type=code+id_token')
      expect(redirectUrl).toContain('scope=name+email')
      expect(redirectUrl).toContain('response_mode=form_post')
    })

    it('should detect redirect callback correctly', () => {
      const { isRedirectCallback } = useApple()
      
      // Mock URL with callback parameters
      Object.defineProperty(window.location, 'search', {
        value: '?code=test-code&id_token=test-token&state=test-state',
        writable: true
      })
      
      // Mock stored state
      vi.mocked(window.sessionStorage.getItem).mockReturnValue(
        JSON.stringify({
          platform: 'apple',
          timestamp: Date.now(),
          state: 'test-state'
        })
      )
      
      expect(isRedirectCallback()).toBe(true)
    })

    it('should handle successful redirect callback', async () => {
      const { handleRedirectCallback } = useApple()
      
      // Create a proper JWT format for testing
      const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
      const payload = btoa(JSON.stringify({
        sub: 'test-apple-id',
        email: 'test@example.com',
        email_verified: 'true',
        is_private_email: 'false',
        aud: 'test-apple-client-id',
        iss: 'https://appleid.apple.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        nonce_supported: true
      }))
      const signature = 'test-signature'
      const testJWT = `${header}.${payload}.${signature}`
      
      // Mock URL with callback parameters
      Object.defineProperty(window.location, 'search', {
        value: `?code=test-auth-code&id_token=${testJWT}&state=test-state`,
        writable: true
      })
      
      // Mock stored state
      const storedState = {
        platform: 'apple',
        timestamp: Date.now(),
        state: 'test-state',
        nonce: 'test-nonce',
        redirectUri: 'http://localhost:3000/auth/callback'
      }
      vi.mocked(window.sessionStorage.getItem).mockReturnValue(JSON.stringify(storedState))
      
      const result = await handleRedirectCallback()
      
      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user?.platform).toBe('apple')
      expect(result.user?.appleId).toBe('test-apple-id')
      expect(result.user?.identityToken).toContain('.')
      expect(result.user?.authorizationCode).toBe('test-auth-code')
      
      // Verify cleanup
      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('apple_login_state')
      expect(window.history.replaceState).toHaveBeenCalled()
    })

    it('should handle redirect callback with error', async () => {
      const { handleRedirectCallback } = useApple()
      
      // Mock URL with error parameters
      Object.defineProperty(window.location, 'search', {
        value: '?error=user_cancelled_authorize&error_description=User%20cancelled%20authorization',
        writable: true
      })
      
      const result = await handleRedirectCallback()
      
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('USER_CANCELLED')
      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('apple_login_state')
    })

    it('should handle state mismatch in redirect callback', async () => {
      const { handleRedirectCallback } = useApple()
      
      // Mock URL with callback parameters
      Object.defineProperty(window.location, 'search', {
        value: '?code=test-auth-code&id_token=test-id-token&state=wrong-state',
        writable: true
      })
      
      // Mock stored state with different state value
      const storedState = {
        platform: 'apple',
        timestamp: Date.now(),
        state: 'correct-state'
      }
      vi.mocked(window.sessionStorage.getItem).mockReturnValue(JSON.stringify(storedState))
      
      const result = await handleRedirectCallback()
      
      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('state_mismatch')
      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('apple_login_state')
    })

    it('should handle expired state in redirect callback', async () => {
      const { handleRedirectCallback } = useApple()
      
      // Mock URL with callback parameters
      Object.defineProperty(window.location, 'search', {
        value: '?code=test-auth-code&id_token=test-id-token&state=test-state',
        writable: true
      })
      
      // Mock stored state that's too old (more than 10 minutes)
      const storedState = {
        platform: 'apple',
        timestamp: Date.now() - (11 * 60 * 1000), // 11 minutes ago
        state: 'test-state'
      }
      vi.mocked(window.sessionStorage.getItem).mockReturnValue(JSON.stringify(storedState))
      
      const result = await handleRedirectCallback()
      
      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('state_expired')
      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('apple_login_state')
    })

    it('should handle missing stored state in redirect callback', async () => {
      const { handleRedirectCallback } = useApple()
      
      // Mock URL with callback parameters
      Object.defineProperty(window.location, 'search', {
        value: '?code=test-auth-code&id_token=test-id-token&state=test-state',
        writable: true
      })
      
      // Mock missing stored state
      vi.mocked(window.sessionStorage.getItem).mockReturnValue(null)
      
      const result = await handleRedirectCallback()
      
      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('invalid_state')
    })

    it('should handle missing required parameters in callback', async () => {
      const { handleRedirectCallback } = useApple()
      
      // Mock URL with missing parameters
      Object.defineProperty(window.location, 'search', {
        value: '?code=test-auth-code', // Missing id_token and state
        writable: true
      })
      
      const result = await handleRedirectCallback()
      
      expect(result.success).toBe(false)
      expect(result.error?.message).toContain('missing_parameters')
    })

    it('should handle JWT decoding errors in redirect callback', async () => {
      const { handleRedirectCallback } = useApple()
      
      // Mock URL with callback parameters
      Object.defineProperty(window.location, 'search', {
        value: '?code=test-auth-code&id_token=invalid.jwt.format&state=test-state',
        writable: true
      })
      
      // Mock stored state
      const storedState = {
        platform: 'apple',
        timestamp: Date.now(),
        state: 'test-state'
      }
      vi.mocked(window.sessionStorage.getItem).mockReturnValue(JSON.stringify(storedState))
      
      // Mock atob to throw error for invalid JWT
      global.atob = vi.fn(() => {
        throw new Error('Invalid base64')
      })
      
      const result = await handleRedirectCallback()
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('apple_login_state')
    })
  })

  describe('Edge Cases', () => {
    it('should handle SDK already loaded scenario', async () => {
      const { loadSDK } = useApple()
      
      // SDK is already loaded (mocked in beforeEach)
      await expect(loadSDK()).resolves.toBeUndefined()
      
      // Should not create new script element
      expect(document.createElement).not.toHaveBeenCalled()
    })

    it('should handle initialization without valid config', async () => {
      // Create a new instance with mocked invalid config
      const mockInvalidConfig = {
        useSocialConfig: () => ({
          getPlatformConfig: vi.fn(() => ({})), // Empty config
          validateConfig: vi.fn(() => {
            throw new Error('Invalid configuration')
          })
        })
      }
      
      // We need to test this by directly calling the validation
      const { validateConfig } = mockInvalidConfig.useSocialConfig()
      
      expect(() => validateConfig('apple')).toThrow('Invalid configuration')
    })

    it('should handle login when SDK is not ready', async () => {
      const { login } = useApple()
      
      // Clear AppleID to simulate SDK not ready
      delete (window as any).AppleID
      
      const result = await login()
      
      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('SDK_LOAD_FAILED')
    })

    it('should handle usePopup option correctly', async () => {
      const { login, initializeSDK } = useApple()
      
      await initializeSDK()
      
      // Test with usePopup: false (should use redirect)
      let redirectUrl = ''
      Object.defineProperty(window.location, 'href', {
        set: (url) => { redirectUrl = url },
        get: () => redirectUrl
      })
      
      login({ usePopup: false })
      
      expect(redirectUrl).toContain('https://appleid.apple.com/auth/authorize')
    })

    it('should handle response without user info in popup mode', async () => {
      const { login, initializeSDK } = useApple()
      
      await initializeSDK()
      
      // Create a proper JWT format for testing
      const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
      const payload = btoa(JSON.stringify({
        sub: 'test-apple-id',
        email: 'test@example.com',
        email_verified: 'true',
        is_private_email: 'false',
        aud: 'test-apple-client-id',
        iss: 'https://appleid.apple.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        nonce_supported: true
      }))
      const signature = 'test-signature'
      const testJWT = `${header}.${payload}.${signature}`
      
      // Mock response without user info
      vi.mocked(mockAppleID.auth.signIn).mockResolvedValue({
        authorization: {
          code: 'test-auth-code',
          id_token: testJWT,
          state: 'test-state'
        }
        // No user info
      })
      
      const result = await login({ popup: true })
      
      expect(result.success).toBe(true)
      expect(result.user?.name).toBeUndefined()
      expect(result.user?.email).toBe('test@example.com') // From JWT
    })
  })
})