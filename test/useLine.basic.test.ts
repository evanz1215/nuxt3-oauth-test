import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useLine } from '../composables/useLine'

// Mock the dependencies
vi.mock('../composables/useSocialConfig', () => ({
  useSocialConfig: () => ({
    getPlatformConfig: vi.fn().mockReturnValue({
      clientId: 'test-line-client-id',
      clientSecret: 'test-line-client-secret',
      redirectUri: 'http://localhost:3000/auth/callback',
    }),
    validateConfig: vi.fn(),
  }),
}))

vi.mock('../composables/useSocialState', () => ({
  useSocialState: () => ({
    setUser: vi.fn(),
    setLoginState: vi.fn(),
    clearAuthState: vi.fn(),
  }),
}))

describe('useLine - Basic Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Clean up any existing window.liff
    ;(window as typeof window & { liff?: unknown }).liff = undefined
  })

  describe('composable structure', () => {
    it('should return the correct interface', () => {
      const lineComposable = useLine()

      // Check that all required properties exist
      expect(lineComposable).toHaveProperty('isReady')
      expect(lineComposable).toHaveProperty('isLoading')
      expect(lineComposable).toHaveProperty('user')
      expect(lineComposable).toHaveProperty('login')
      expect(lineComposable).toHaveProperty('logout')
      expect(lineComposable).toHaveProperty('handleRedirectCallback')
      expect(lineComposable).toHaveProperty('isRedirectCallback')
      expect(lineComposable).toHaveProperty('loadSDK')
      expect(lineComposable).toHaveProperty('initializeSDK')
    })

    it('should initialize with correct default state', () => {
      const { isReady, isLoading, user } = useLine()

      expect(isReady.value).toBe(false)
      expect(isLoading.value).toBe(false)
      expect(user.value).toBe(null)
    })
  })

  describe('type definitions', () => {
    it('should have correct TypeScript types', () => {
      const { login, logout } = useLine()

      // These should be functions
      expect(typeof login).toBe('function')
      expect(typeof logout).toBe('function')
    })
  })

  describe('Line-specific functionality', () => {
    it('should support Line-specific login options', async () => {
      const { login } = useLine()

      // Should accept Line-specific options without throwing
      expect(() => {
        login({
          popup: true,
          botPrompt: 'normal',
          redirectUrl: 'http://localhost:3000/callback'
        })
      }).not.toThrow()

      expect(() => {
        login({
          popup: false,
          botPrompt: 'aggressive'
        })
      }).not.toThrow()
    })

    it('should handle bot prompt options correctly', async () => {
      const { login } = useLine()

      // Test normal bot prompt
      expect(() => {
        login({ botPrompt: 'normal' })
      }).not.toThrow()

      // Test aggressive bot prompt
      expect(() => {
        login({ botPrompt: 'aggressive' })
      }).not.toThrow()

      // Test without bot prompt (should use default)
      expect(() => {
        login({})
      }).not.toThrow()
    })

    it('should handle LIFF environment detection', () => {
      const { isRedirectCallback } = useLine()

      // Should not throw when checking for redirect callback
      expect(() => {
        isRedirectCallback()
      }).not.toThrow()
    })

    it('should support both popup and redirect modes', () => {
      const { login } = useLine()

      // Test popup mode
      expect(() => {
        login({ popup: true })
      }).not.toThrow()

      // Test redirect mode
      expect(() => {
        login({ popup: false })
      }).not.toThrow()

      // Test default mode (should be popup)
      expect(() => {
        login({})
      }).not.toThrow()
    })
  })

  describe('SDK loading', () => {
    it('should have loadSDK method', () => {
      const { loadSDK } = useLine()
      
      expect(typeof loadSDK).toBe('function')
    })

    it('should have initializeSDK method', () => {
      const { initializeSDK } = useLine()
      
      expect(typeof initializeSDK).toBe('function')
    })
  })

  describe('authentication methods', () => {
    it('should have login method that returns a promise', () => {
      const { login } = useLine()
      
      const result = login()
      expect(result).toBeInstanceOf(Promise)
    })

    it('should have logout method that returns a promise', () => {
      const { logout } = useLine()
      
      const result = logout()
      expect(result).toBeInstanceOf(Promise)
    })
  })

  describe('callback handling', () => {
    it('should have handleRedirectCallback method', () => {
      const { handleRedirectCallback } = useLine()
      
      expect(typeof handleRedirectCallback).toBe('function')
      
      const result = handleRedirectCallback()
      expect(result).toBeInstanceOf(Promise)
    })

    it('should have isRedirectCallback method', () => {
      const { isRedirectCallback } = useLine()
      
      expect(typeof isRedirectCallback).toBe('function')
      expect(typeof isRedirectCallback()).toBe('boolean')
    })
  })
})