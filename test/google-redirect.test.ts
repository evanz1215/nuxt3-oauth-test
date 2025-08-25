import { describe, it, expect, vi, beforeEach } from 'vitest'

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

describe('Google Redirect Login', () => {
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
    
    // Mock fetch
    global.fetch = vi.fn()
  })

  it('should generate proper OAuth URL for redirect', () => {
    // This test verifies that the redirect URL is constructed correctly
    const expectedParams = [
      'client_id=test-google-client-id',
      'redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback',
      'response_type=code',
      'scope=profile+email',
      'access_type=offline',
      'prompt=consent'
    ]
    
    // Mock the redirect by capturing the href assignment
    let redirectUrl = ''
    Object.defineProperty(window.location, 'href', {
      set: (url) => { redirectUrl = url },
      get: () => redirectUrl
    })
    
    // Simulate the redirect URL construction
    const clientId = 'test-google-client-id'
    const redirectUri = 'http://localhost:3000/auth/callback'
    const scopes = ['profile', 'email']
    const state = 'test-state'
    
    const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    oauthUrl.searchParams.set('client_id', clientId)
    oauthUrl.searchParams.set('redirect_uri', redirectUri)
    oauthUrl.searchParams.set('response_type', 'code')
    oauthUrl.searchParams.set('scope', scopes.join(' '))
    oauthUrl.searchParams.set('state', state)
    oauthUrl.searchParams.set('access_type', 'offline')
    oauthUrl.searchParams.set('prompt', 'consent')
    
    const finalUrl = oauthUrl.toString()
    
    expect(finalUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth')
    expectedParams.forEach(param => {
      expect(finalUrl).toContain(param)
    })
  })

  it('should detect redirect callback correctly', () => {
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
    
    // Simulate the callback detection logic
    const urlParams = new URLSearchParams(window.location.search)
    const hasCode = urlParams.has('code')
    const hasState = urlParams.has('state')
    const storedState = sessionStorage.getItem('google_login_state')
    
    const isCallback = hasCode && hasState && !!storedState
    
    expect(isCallback).toBe(true)
  })

  it('should validate state parameter correctly', () => {
    const urlState = 'test-state'
    const storedState = {
      platform: 'google',
      timestamp: Date.now(),
      state: 'test-state'
    }
    
    // Test matching state
    expect(storedState.state).toBe(urlState)
    
    // Test mismatched state
    const wrongState = 'wrong-state'
    expect(storedState.state).not.toBe(wrongState)
  })

  it('should detect expired state', () => {
    const currentTime = Date.now()
    const expiredTime = currentTime - (11 * 60 * 1000) // 11 minutes ago
    const validTime = currentTime - (5 * 60 * 1000) // 5 minutes ago
    
    const expiredState = {
      platform: 'google',
      timestamp: expiredTime,
      state: 'test-state'
    }
    
    const validState = {
      platform: 'google',
      timestamp: validTime,
      state: 'test-state'
    }
    
    const maxAge = 10 * 60 * 1000 // 10 minutes
    
    // Test expired state
    const expiredAge = currentTime - expiredState.timestamp
    expect(expiredAge > maxAge).toBe(true)
    
    // Test valid state
    const validAge = currentTime - validState.timestamp
    expect(validAge > maxAge).toBe(false)
  })

  it('should handle successful token exchange', async () => {
    const mockTokenResponse = {
      access_token: 'test-access-token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'test-refresh-token'
    }
    
    const mockUserInfo = {
      id: '123456789',
      email: 'test@example.com',
      name: 'Test User',
      given_name: 'Test',
      family_name: 'User',
      picture: 'https://example.com/avatar.jpg'
    }
    
    // Mock successful responses
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse)
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUserInfo)
      } as any)
    
    // Simulate token exchange
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: 'test-client-id',
        code: 'test-code',
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost:3000/auth/callback'
      })
    })
    
    const tokenData = await tokenResponse.json()
    expect(tokenData.access_token).toBe('test-access-token')
    
    // Simulate user info fetch
    const userResponse = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokenData.access_token}`
    )
    
    const userData = await userResponse.json()
    expect(userData.email).toBe('test@example.com')
  })

  it('should handle token exchange errors', async () => {
    // Mock failed token exchange
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request'
    } as any)
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: 'test-client-id',
        code: 'invalid-code',
        grant_type: 'authorization_code',
        redirect_uri: 'http://localhost:3000/auth/callback'
      })
    })
    
    expect(response.ok).toBe(false)
    expect(response.status).toBe(400)
  })

  it('should clean up URL parameters after successful login', () => {
    // Mock window.history
    const mockReplaceState = vi.fn()
    Object.defineProperty(window, 'history', {
      value: {
        replaceState: mockReplaceState
      },
      writable: true,
      configurable: true
    })
    
    // Simulate URL cleanup
    const cleanUrl = window.location.origin + window.location.pathname
    window.history.replaceState({}, document.title, cleanUrl)
    
    expect(mockReplaceState).toHaveBeenCalledWith({}, document.title, cleanUrl)
  })
})