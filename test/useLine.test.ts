import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useLine } from '../composables/useLine'
import { useSocialConfig } from '../composables/useSocialConfig'
import { useSocialState } from '../composables/useSocialState'

// Mock the dependencies
vi.mock('../composables/useSocialConfig')
vi.mock('../composables/useSocialState')

// Mock global objects
const mockLiff = {
  init: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  isLoggedIn: vi.fn(),
  getProfile: vi.fn(),
  getAccessToken: vi.fn(),
  getIDToken: vi.fn(),
  isInClient: vi.fn(),
  ready: Promise.resolve(),
}

describe('useLine', () => {
  const mockConfig = {
    clientId: 'test-line-client-id',
    clientSecret: 'test-line-client-secret',
    redirectUri: 'http://localhost:3000/auth/callback',
    liffId: 'test-liff-id',
  }

  const mockSocialConfig = {
    getPlatformConfig: vi.fn(),
    validateConfig: vi.fn(),
  }

  const mockSocialState = {
    setUser: vi.fn(),
    setLoginState: vi.fn(),
    clearAuthState: vi.fn(),
  }

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    
    // Setup mock implementations
    mockSocialConfig.getPlatformConfig.mockReturnValue(mockConfig)
    vi.mocked(useSocialConfig).mockReturnValue(mockSocialConfig as ReturnType<typeof useSocialConfig>)
    vi.mocked(useSocialState).mockReturnValue(mockSocialState as ReturnType<typeof useSocialState>)

    // Mock window.liff
    Object.defineProperty(window, 'liff', {
      value: mockLiff,
      writable: true,
    })

    // Mock document.createElement for script loading
    const mockScript = {
      src: '',
      async: false,
      defer: false,
      onload: null as ((this: GlobalEventHandlers, ev: Event) => void) | null,
      onerror: null as ((this: GlobalEventHandlers, ev: Event | string) => void) | null,
    }
    
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'script') {
        return mockScript as HTMLScriptElement
      }
      return document.createElement(tagName)
    })

    vi.spyOn(document.head, 'appendChild').mockImplementation(() => {
      // Simulate successful script load
      setTimeout(() => {
        if (mockScript.onload) {
          mockScript.onload({} as Event)
        }
      }, 0)
      return mockScript as HTMLScriptElement
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // Set liff to undefined instead of deleting
    ;(window as unknown).liff = undefined
  })

  describe('initialization', () => {
    it('should initialize with correct default state', () => {
      const { isReady, isLoading, user } = useLine()

      expect(isReady.value).toBe(false)
      expect(isLoading.value).toBe(false)
      expect(user.value).toBe(null)
    })

    it('should validate config on initialization', async () => {
      const { initializeSDK } = useLine()
      
      await initializeSDK()

      expect(mockSocialConfig.validateConfig).toHaveBeenCalledWith('line')
      expect(mockSocialConfig.getPlatformConfig).toHaveBeenCalledWith('line')
    })
  })

  describe('SDK loading', () => {
    it('should load Line SDK successfully', async () => {
      const { loadSDK } = useLine()

      await loadSDK()

      expect(document.createElement).toHaveBeenCalledWith('script')
      expect(document.head.appendChild).toHaveBeenCalled()
    })

    it('should not reload SDK if already loaded', async () => {
      const { loadSDK } = useLine()

      // First load
      await loadSDK()
      const firstCallCount = vi.mocked(document.createElement).mock.calls.length

      // Second load
      await loadSDK()
      const secondCallCount = vi.mocked(document.createElement).mock.calls.length

      expect(secondCallCount).toBe(firstCallCount)
    })

    it('should handle SDK load timeout', async () => {
      const { loadSDK } = useLine()

      // Mock timeout scenario
      vi.spyOn(document.head, 'appendChild').mockImplementation(() => {
        // Don't call onload to simulate timeout
        return {} as HTMLScriptElement
      })

      vi.useFakeTimers()
      
      const loadPromise = loadSDK()
      
      // Fast-forward time to trigger timeout
      vi.advanceTimersByTime(10000)

      await expect(loadPromise).rejects.toThrow()
      
      vi.useRealTimers()
    })
  })

  describe('login functionality', () => {
    it('should handle LIFF login when in LIFF environment', async () => {
      mockLiff.isInClient.mockReturnValue(true)
      mockLiff.isLoggedIn.mockReturnValue(true)
      mockLiff.getProfile.mockResolvedValue({
        userId: 'test-user-id',
        displayName: 'Test User',
        pictureUrl: 'https://example.com/avatar.jpg',
        statusMessage: 'Hello World',
      })
      mockLiff.getAccessToken.mockReturnValue('test-access-token')

      const { login } = useLine()
      const result = await login()

      expect(result.success).toBe(true)
      expect(result.user).toMatchObject({
        id: 'test-user-id',
        lineId: 'test-user-id',
        displayName: 'Test User',
        platform: 'line',
        accessToken: 'test-access-token',
      })
    })

    it('should handle login with popup mode', async () => {
      mockLiff.isInClient.mockReturnValue(false)

      // Mock window.open
      const mockPopup = {
        closed: false,
        close: vi.fn(),
      }
      vi.spyOn(window, 'open').mockReturnValue(mockPopup as Window)

      const { login } = useLine()
      
      // Start login (this will be async and won't complete in test)
      const _loginPromise = login({ popup: true })

      // Verify popup was opened with correct URL
      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining('https://access.line.me/oauth2/v2.1/authorize'),
        'line_login',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      )

      // Clean up
      mockPopup.closed = true
    })

    it('should handle popup blocked scenario', async () => {
      mockLiff.isInClient.mockReturnValue(false)
      
      // Mock popup blocked
      vi.spyOn(window, 'open').mockReturnValue(null)

      const { login } = useLine()
      const result = await login({ popup: true })

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('POPUP_BLOCKED')
    })

    it('should handle redirect mode', async () => {
      mockLiff.isInClient.mockReturnValue(false)

      // Mock window.location
      const mockLocation = {
        href: '',
        origin: 'http://localhost:3000',
        pathname: '/',
      }
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      })

      const { login } = useLine()
      
      // This will redirect, so we can't await it
      login({ popup: false })

      // Verify redirect URL was set
      expect(mockLocation.href).toContain('https://access.line.me/oauth2/v2.1/authorize')
    })

    it('should include bot prompt in OAuth URL when specified', async () => {
      mockLiff.isInClient.mockReturnValue(false)

      // Mock window.location
      const mockLocation = {
        href: '',
        origin: 'http://localhost:3000',
        pathname: '/',
      }
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      })

      const { login } = useLine()
      
      // Test with aggressive bot prompt
      login({ popup: false, botPrompt: 'aggressive' })

      // Verify bot_prompt parameter is included in URL
      expect(mockLocation.href).toContain('bot_prompt=aggressive')
    })

    it('should include bot prompt in popup OAuth URL when specified', async () => {
      mockLiff.isInClient.mockReturnValue(false)

      // Mock popup
      const mockPopup = {
        closed: false,
        close: vi.fn(),
      }
      vi.spyOn(window, 'open').mockReturnValue(mockPopup as Window)

      const { login } = useLine()
      
      // Start login with normal bot prompt
      const _loginPromise = login({ popup: true, botPrompt: 'normal' })

      // Verify popup was opened with bot_prompt parameter
      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining('bot_prompt=normal'),
        'line_login',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      )

      // Clean up
      mockPopup.closed = true
    })

    it('should handle LIFF login with bot prompt', async () => {
      mockLiff.isInClient.mockReturnValue(true)
      mockLiff.isLoggedIn.mockReturnValue(false)

      const { login } = useLine()
      
      // This will call liff.login, so we can't await it
      login({ botPrompt: 'aggressive' })

      // Verify LIFF login was called with correct config
      expect(mockLiff.login).toHaveBeenCalledWith(
        expect.objectContaining({
          botPrompt: 'aggressive'
        })
      )
    })
  })

  describe('logout functionality', () => {
    it('should logout successfully', async () => {
      const { logout } = useLine()

      await logout()

      expect(mockSocialState.clearAuthState).toHaveBeenCalled()
    })

    it('should use LIFF logout when in LIFF environment', async () => {
      mockLiff.isInClient.mockReturnValue(true)

      const { logout } = useLine()

      await logout()

      expect(mockLiff.logout).toHaveBeenCalled()
      expect(mockSocialState.clearAuthState).toHaveBeenCalled()
    })
  })

  describe('callback handling', () => {
    it('should detect redirect callback correctly', () => {
      // Mock URL with callback parameters
      Object.defineProperty(window, 'location', {
        value: {
          search: '?code=test-code&state=test-state',
        },
        writable: true,
      })

      // Mock sessionStorage
      const mockSessionStorage = {
        getItem: vi.fn().mockReturnValue(JSON.stringify({
          platform: 'line',
          state: 'test-state',
        })),
      }
      Object.defineProperty(window, 'sessionStorage', {
        value: mockSessionStorage,
        writable: true,
      })

      const { isRedirectCallback } = useLine()
      
      expect(isRedirectCallback()).toBe(true)
    })

    it('should not detect callback without proper parameters', () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: '',
        },
        writable: true,
      })

      const { isRedirectCallback } = useLine()
      
      expect(isRedirectCallback()).toBe(false)
    })
  })
})