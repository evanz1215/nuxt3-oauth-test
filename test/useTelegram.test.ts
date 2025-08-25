import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useTelegram } from '../composables/useTelegram'

// Mock dependencies
vi.mock('../composables/useSocialConfig', () => ({
  useSocialConfig: () => ({
    getPlatformConfig: vi.fn(() => ({
      botToken: 'test_bot_token',
      botUsername: 'test_bot'
    })),
    validateConfig: vi.fn()
  })
}))

vi.mock('../composables/useSocialState', () => ({
  useSocialState: () => ({
    setUser: vi.fn(),
    setLoginState: vi.fn(),
    clearAuthState: vi.fn()
  })
}))

// Mock global objects
const mockTelegramAuthData = {
  id: 123456789,
  first_name: 'John',
  last_name: 'Doe',
  username: 'johndoe',
  photo_url: 'https://example.com/photo.jpg',
  auth_date: Math.floor(Date.now() / 1000),
  hash: 'test_hash_value'
}

describe('useTelegram', () => {
  let mockScript: HTMLScriptElement

  beforeEach(() => {
    // Mock DOM elements
    mockScript = {
      src: '',
      async: false,
      defer: false,
      setAttribute: vi.fn(),
      addEventListener: vi.fn(),
      click: vi.fn(),
      style: {},
      parentNode: null,
      onload: null,
      onerror: null
    } as any

    // Mock global window methods
    global.window = {
      ...global.window,
      document: {
        ...global.window?.document,
        createElement: vi.fn((tagName: string) => {
          if (tagName === 'script') {
            return mockScript
          }
          return {
            id: '',
            style: {},
            textContent: '',
            appendChild: vi.fn(),
            addEventListener: vi.fn(),
            setAttribute: vi.fn(),
            parentNode: null
          }
        }),
        head: {
          appendChild: vi.fn()
        },
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn()
        }
      },
      location: {
        href: 'https://example.com',
        origin: 'https://example.com',
        pathname: '/',
        search: ''
      },
      history: {
        replaceState: vi.fn()
      },
      setTimeout: vi.fn((fn, delay) => {
        if (delay === 100) {
          // Immediately execute for widget trigger
          fn()
        }
        return 123
      }),
      clearTimeout: vi.fn()
    } as any

    // Mock import.meta
    vi.stubGlobal('import', {
      meta: {
        client: true,
        vitest: true
      }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  describe('initialization', () => {
    it('should initialize with correct default state', () => {
      const { isReady, isLoading, user } = useTelegram()

      expect(isReady.value).toBe(false)
      expect(isLoading.value).toBe(false)
      expect(user.value).toBe(null)
    })

    it('should load SDK successfully', async () => {
      const { loadSDK } = useTelegram()

      // Mock successful script loading
      setTimeout(() => {
        if (mockScript.onload) {
          mockScript.onload({} as Event)
        }
      }, 0)

      await expect(loadSDK()).resolves.toBeUndefined()
      expect(window.document.createElement).toHaveBeenCalledWith('script')
    })

    it('should handle SDK load timeout', async () => {
      const { loadSDK } = useTelegram()

      // Mock timeout
      vi.mocked(window.setTimeout).mockImplementation((fn, delay) => {
        if (delay === 10000) { // SDK_LOAD timeout
          setTimeout(fn, 0)
        }
        return 123
      })

      await expect(loadSDK()).rejects.toThrow()
    })

    it('should handle SDK load error', async () => {
      const { loadSDK } = useTelegram()

      // Mock script error
      setTimeout(() => {
        if (mockScript.onerror) {
          mockScript.onerror({} as Event)
        }
      }, 0)

      await expect(loadSDK()).rejects.toThrow()
    })
  })

  describe('login functionality', () => {
    it('should handle successful widget login', async () => {
      const { login } = useTelegram()

      // Mock successful login flow
      const loginPromise = login({ size: 'large' })

      // Simulate Telegram callback
      setTimeout(() => {
        const callbackName = Object.keys(window).find(key => 
          key.startsWith('telegramCallback_')
        )
        if (callbackName && (window as any)[callbackName]) {
          ;(window as any)[callbackName](mockTelegramAuthData)
        }
      }, 50)

      const result = await loginPromise

      expect(result.success).toBe(true)
      expect(result.user).toBeDefined()
      expect(result.user?.telegramId).toBe(mockTelegramAuthData.id)
      expect(result.user?.firstName).toBe(mockTelegramAuthData.first_name)
      expect(result.platform).toBe('telegram')
    })

    it('should handle login timeout', async () => {
      const { login } = useTelegram()

      // Mock timeout
      vi.mocked(window.setTimeout).mockImplementation((fn, delay) => {
        if (delay === 300000) { // LOGIN_POPUP timeout
          setTimeout(fn, 0)
        } else if (delay === 100) {
          // Don't execute widget trigger
        }
        return 123
      })

      const result = await login()

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('TIMEOUT_ERROR')
    })

    it('should handle user cancellation', async () => {
      const { login } = useTelegram()

      const loginPromise = login()

      // Simulate user closing the widget
      setTimeout(() => {
        // Find and click close button
        const closeButtons = vi.mocked(window.document.createElement).mock.results
          .map(result => result.value)
          .filter(element => element.textContent === '×')
        
        if (closeButtons.length > 0) {
          const closeButton = closeButtons[0]
          const clickHandler = vi.mocked(closeButton.addEventListener).mock.calls
            .find(call => call[0] === 'click')?.[1]
          if (clickHandler) {
            clickHandler({} as Event)
          }
        }
      }, 50)

      const result = await loginPromise

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('USER_CANCELLED')
    })

    it('should handle invalid authentication data', async () => {
      const { login } = useTelegram()

      const loginPromise = login()

      // Simulate invalid auth data
      setTimeout(() => {
        const callbackName = Object.keys(window).find(key => 
          key.startsWith('telegramCallback_')
        )
        if (callbackName && (window as any)[callbackName]) {
          // Invalid data (missing required fields)
          ;(window as any)[callbackName]({
            id: 0, // Invalid ID
            first_name: '',
            auth_date: 0,
            hash: ''
          })
        }
      }, 50)

      const result = await loginPromise

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('AUTHORIZATION_FAILED')
    })

    it('should handle expired authentication data', async () => {
      const { login } = useTelegram()

      const loginPromise = login()

      // Simulate expired auth data
      setTimeout(() => {
        const callbackName = Object.keys(window).find(key => 
          key.startsWith('telegramCallback_')
        )
        if (callbackName && (window as any)[callbackName]) {
          const expiredAuthData = {
            ...mockTelegramAuthData,
            auth_date: Math.floor(Date.now() / 1000) - 400 // 400 seconds ago (expired)
          }
          ;(window as any)[callbackName](expiredAuthData)
        }
      }, 50)

      const result = await loginPromise

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('AUTHORIZATION_FAILED')
    })
  })

  describe('redirect callback handling', () => {
    it('should handle successful redirect callback', async () => {
      // Mock URL with Telegram auth parameters
      window.location.search = `?id=${mockTelegramAuthData.id}&first_name=${mockTelegramAuthData.first_name}&auth_date=${mockTelegramAuthData.auth_date}&hash=${mockTelegramAuthData.hash}`

      const { handleRedirectCallback, isRedirectCallback } = useTelegram()

      expect(isRedirectCallback()).toBe(true)

      const result = await handleRedirectCallback()

      expect(result.success).toBe(true)
      expect(result.user?.telegramId).toBe(mockTelegramAuthData.id)
    })

    it('should handle redirect callback with missing parameters', async () => {
      // Mock URL with missing parameters
      window.location.search = '?id=123'

      const { handleRedirectCallback, isRedirectCallback } = useTelegram()

      expect(isRedirectCallback()).toBe(false)

      const result = await handleRedirectCallback()

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('UNKNOWN_ERROR')
    })

    it('should handle redirect callback with invalid auth data', async () => {
      // Mock URL with invalid auth data
      window.location.search = '?id=0&first_name=&auth_date=0&hash='

      const { handleRedirectCallback } = useTelegram()

      const result = await handleRedirectCallback()

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('AUTHORIZATION_FAILED')
    })
  })

  describe('logout functionality', () => {
    it('should logout successfully', async () => {
      const { logout, user } = useTelegram()

      // Set a user first
      user.value = {
        id: '123',
        telegramId: 123,
        firstName: 'John',
        name: 'John Doe',
        platform: 'telegram',
        accessToken: 'test_token'
      } as any

      await logout()

      expect(user.value).toBe(null)
    })

    it('should handle logout errors gracefully', async () => {
      const { logout } = useTelegram()

      // Mock console.warn to verify error handling
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await expect(logout()).resolves.toBeUndefined()

      consoleSpy.mockRestore()
    })
  })

  describe('widget creation', () => {
    it('should create widget with correct attributes', () => {
      const { createTelegramWidget } = useTelegram() as any

      const widget = createTelegramWidget('test_bot', {
        size: 'medium',
        cornerRadius: 10
      }, 'testCallback')

      expect(widget.setAttribute).toHaveBeenCalledWith('data-telegram-login', 'test_bot')
      expect(widget.setAttribute).toHaveBeenCalledWith('data-size', 'medium')
      expect(widget.setAttribute).toHaveBeenCalledWith('data-radius', '10')
      expect(widget.setAttribute).toHaveBeenCalledWith('data-onauth', 'testCallback(user)')
    })

    it('should create widget with redirect URL when no callback', () => {
      const { createTelegramWidget } = useTelegram() as any

      const widget = createTelegramWidget('test_bot', {
        redirectUrl: 'https://example.com/callback'
      })

      expect(widget.setAttribute).toHaveBeenCalledWith('data-auth-url', 'https://example.com/callback')
    })

    it('should use default values for optional parameters', () => {
      const { createTelegramWidget } = useTelegram() as any

      const widget = createTelegramWidget('test_bot')

      expect(widget.setAttribute).toHaveBeenCalledWith('data-size', 'large')
      expect(widget.setAttribute).toHaveBeenCalledWith('data-auth-url', 'https://example.com')
    })
  })

  describe('authentication verification', () => {
    it('should verify valid authentication data', () => {
      const { verifyTelegramAuth } = useTelegram() as any

      const result = verifyTelegramAuth(mockTelegramAuthData, 'test_bot_token')

      expect(result).toBe(true)
    })

    it('should reject authentication data with missing fields', () => {
      const { verifyTelegramAuth } = useTelegram() as any

      const invalidData = {
        ...mockTelegramAuthData,
        id: 0 // Invalid ID
      }

      const result = verifyTelegramAuth(invalidData, 'test_bot_token')

      expect(result).toBe(false)
    })

    it('should reject expired authentication data', () => {
      const { verifyTelegramAuth } = useTelegram() as unknown

      const expiredData = {
        ...mockTelegramAuthData,
        auth_date: Math.floor(Date.now() / 1000) - 400 // 400 seconds ago
      }

      const result = verifyTelegramAuth(expiredData, 'test_bot_token')

      expect(result).toBe(false)
    })
  })
})