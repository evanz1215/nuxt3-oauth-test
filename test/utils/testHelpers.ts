import { vi } from 'vitest'
import type { SocialPlatform, SocialLoginResult, SocialUser } from '../../composables/types'

// Test environment setup helpers
export const setupTestEnvironment = () => {
  // Mock window.location
  const mockLocation = {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: '',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn()
  }
  
  Object.defineProperty(window, 'location', {
    value: mockLocation,
    writable: true,
    configurable: true
  })

  // Mock window.history
  const mockHistory = {
    replaceState: vi.fn(),
    pushState: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    go: vi.fn()
  }
  
  Object.defineProperty(window, 'history', {
    value: mockHistory,
    writable: true,
    configurable: true
  })

  // Mock sessionStorage
  const mockSessionStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0
  }
  
  Object.defineProperty(window, 'sessionStorage', {
    value: mockSessionStorage,
    writable: true,
    configurable: true
  })

  // Mock localStorage
  Object.defineProperty(window, 'localStorage', {
    value: mockSessionStorage, // Use same mock for simplicity
    writable: true,
    configurable: true
  })

  // Mock crypto.getRandomValues
  Object.defineProperty(window, 'crypto', {
    value: {
      getRandomValues: vi.fn((array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256)
        }
        return array
      })
    },
    writable: true,
    configurable: true
  })

  // Mock btoa and atob
  global.btoa = vi.fn((str: string) => Buffer.from(str).toString('base64'))
  global.atob = vi.fn((str: string) => Buffer.from(str, 'base64').toString())

  // Mock fetch
  global.fetch = vi.fn()

  // Mock console methods
  const mockConsole = {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
  }
  
  Object.defineProperty(global, 'console', {
    value: mockConsole,
    writable: true
  })

  return {
    mockLocation,
    mockHistory,
    mockSessionStorage,
    mockConsole
  }
}

// Mock script loading
export const setupScriptMocking = () => {
  const mockScript = {
    src: '',
    async: false,
    defer: false,
    onload: null as ((this: GlobalEventHandlers, ev: Event) => void) | null,
    onerror: null as ((this: GlobalEventHandlers, ev: Event | string) => void) | null,
    setAttribute: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }

  vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    if (tagName === 'script') {
      return mockScript as any
    }
    return document.createElement(tagName)
  })

  vi.spyOn(document.head, 'appendChild').mockImplementation((element: any) => {
    // Simulate successful script load after a short delay
    setTimeout(() => {
      if (element.onload) {
        element.onload({} as Event)
      }
    }, 0)
    return element
  })

  return mockScript
}

// Create mock popup window
export const createMockPopup = (shouldClose = false) => {
  const mockPopup = {
    closed: shouldClose,
    close: vi.fn(() => {
      mockPopup.closed = true
    }),
    focus: vi.fn(),
    blur: vi.fn(),
    location: {
      href: 'about:blank'
    },
    postMessage: vi.fn()
  }

  vi.spyOn(window, 'open').mockReturnValue(mockPopup as any)
  
  return mockPopup
}

// Simulate successful login result
export const createSuccessResult = (platform: SocialPlatform, user: Partial<SocialUser>): SocialLoginResult => ({
  success: true,
  user: {
    id: `${platform}123`,
    name: `${platform} User`,
    platform,
    accessToken: `${platform}_access_token`,
    ...user
  } as SocialUser,
  platform
})

// Simulate error login result
export const createErrorResult = (platform: SocialPlatform, code: string, message: string): SocialLoginResult => ({
  success: false,
  error: {
    code,
    message,
    platform
  },
  platform
})

// Wait for async operations
export const waitFor = (ms: number = 0) => new Promise(resolve => setTimeout(resolve, ms))

// Mock URL parameters
export const mockUrlParams = (params: Record<string, string>) => {
  const searchParams = new URLSearchParams(params)
  Object.defineProperty(window.location, 'search', {
    value: `?${searchParams.toString()}`,
    writable: true
  })
}

// Mock stored state in sessionStorage
export const mockStoredState = (platform: SocialPlatform, state: Record<string, any>) => {
  const stateData = {
    platform,
    timestamp: Date.now(),
    ...state
  }
  
  vi.mocked(window.sessionStorage.getItem).mockReturnValue(JSON.stringify(stateData))
  return stateData
}

// Simulate network error
export const simulateNetworkError = () => {
  vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'))
}

// Simulate successful fetch response
export const mockFetchSuccess = (data: any, status = 200) => {
  vi.mocked(global.fetch).mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data))
  } as any)
}

// Simulate fetch error response
export const mockFetchError = (status = 400, statusText = 'Bad Request') => {
  vi.mocked(global.fetch).mockResolvedValue({
    ok: false,
    status,
    statusText,
    json: () => Promise.reject(new Error('Invalid JSON')),
    text: () => Promise.resolve(statusText)
  } as any)
}

// Test timeout helper
export const withTimeout = async <T>(promise: Promise<T>, timeoutMs = 5000): Promise<T> => {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Test timeout after ${timeoutMs}ms`)), timeoutMs)
  })
  
  return Promise.race([promise, timeout])
}

// Cleanup helper
export const cleanupTestEnvironment = () => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  
  // Reset window properties
  delete (window as any).google
  delete (window as any).AppleID
  delete (window as any).liff
  
  // Clear any global callbacks
  Object.keys(window).forEach(key => {
    if (key.startsWith('telegramCallback_')) {
      delete (window as any)[key]
    }
  })
}

// Assert helpers
export const expectSuccessfulLogin = (result: SocialLoginResult, platform: SocialPlatform) => {
  expect(result.success).toBe(true)
  expect(result.user).toBeDefined()
  expect(result.user?.platform).toBe(platform)
  expect(result.user?.accessToken).toBeDefined()
  expect(result.platform).toBe(platform)
}

export const expectFailedLogin = (result: SocialLoginResult, platform: SocialPlatform, errorCode?: string) => {
  expect(result.success).toBe(false)
  expect(result.error).toBeDefined()
  expect(result.error?.platform).toBe(platform)
  expect(result.platform).toBe(platform)
  
  if (errorCode) {
    expect(result.error?.code).toBe(errorCode)
  }
}

// Mock composable dependencies
export const mockComposableDependencies = () => {
  const mockSocialConfig = {
    getSocialConfig: vi.fn(),
    getPlatformConfig: vi.fn(),
    isPlatformEnabled: vi.fn(() => true),
    getEnabledPlatforms: vi.fn(() => ['google', 'apple', 'line', 'telegram']),
    validateConfig: vi.fn(),
    validateAllConfigs: vi.fn(() => ({ valid: true, errors: [] })),
    getConfigStatus: vi.fn(() => ({
      config: {},
      enabledPlatforms: ['google', 'apple', 'line', 'telegram'],
      validation: { valid: true, errors: [] },
      platformStatus: {}
    }))
  }

  const mockSocialState = {
    currentUser: { value: null },
    loginState: { value: { isLoading: false } },
    authenticatedPlatforms: { value: [] },
    platformStates: { value: {} },
    isAuthenticated: { value: false },
    currentPlatform: { value: null },
    isAnyPlatformLoading: { value: false },
    setUser: vi.fn(),
    setLoginState: vi.fn(),
    setLoading: vi.fn(),
    setError: vi.fn(),
    clearError: vi.fn(),
    isPlatformAuthenticated: vi.fn(() => false),
    addAuthenticatedPlatform: vi.fn(),
    removeAuthenticatedPlatform: vi.fn(),
    clearAuthState: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    getAuthStatus: vi.fn(),
    resetState: vi.fn(),
    getPlatformState: vi.fn(() => ({ isAuthenticated: false, user: null, isLoading: false })),
    setPlatformLoading: vi.fn(),
    getAllPlatformStates: vi.fn(() => ({})),
    getComprehensiveAuthStatus: vi.fn(() => ({})),
    refreshActivity: vi.fn(),
    updatePlatformUser: vi.fn()
  }

  return { mockSocialConfig, mockSocialState }
}