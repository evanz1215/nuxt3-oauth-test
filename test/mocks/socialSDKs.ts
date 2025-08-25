import { vi } from 'vitest'

// Mock Google SDK
export const mockGoogleSDK = {
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

// Mock Apple SDK
export const mockAppleSDK = {
  auth: {
    init: vi.fn(),
    signIn: vi.fn(),
    renderButton: vi.fn()
  }
}

// Mock Line SDK (LIFF)
export const mockLineSDK = {
  init: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  isLoggedIn: vi.fn(),
  getProfile: vi.fn(),
  getAccessToken: vi.fn(),
  getIDToken: vi.fn(),
  isInClient: vi.fn(),
  ready: Promise.resolve()
}

// Mock Telegram Auth Data
export const mockTelegramAuthData = {
  id: 123456789,
  first_name: 'John',
  last_name: 'Doe',
  username: 'johndoe',
  photo_url: 'https://example.com/photo.jpg',
  auth_date: Math.floor(Date.now() / 1000),
  hash: 'test_hash_value'
}

// Mock user data for each platform
export const mockUsers = {
  google: {
    id: 'google123',
    email: 'test@gmail.com',
    name: 'Google User',
    avatar: 'https://lh3.googleusercontent.com/avatar.jpg',
    platform: 'google' as const,
    accessToken: 'google_access_token',
    refreshToken: 'google_refresh_token'
  },
  apple: {
    id: 'apple456',
    email: 'test@icloud.com',
    name: 'Apple User',
    platform: 'apple' as const,
    accessToken: 'apple_access_token',
    appleId: 'apple456',
    identityToken: 'apple_identity_token',
    authorizationCode: 'apple_auth_code'
  },
  line: {
    id: 'line789',
    name: 'Line User',
    platform: 'line' as const,
    accessToken: 'line_access_token',
    lineId: 'line789',
    displayName: 'Line User',
    pictureUrl: 'https://profile.line-scdn.net/avatar.jpg'
  },
  telegram: {
    id: '123456789',
    name: 'John Doe',
    platform: 'telegram' as const,
    accessToken: 'telegram_access_token',
    telegramId: 123456789,
    firstName: 'John',
    lastName: 'Doe',
    username: 'johndoe',
    photoUrl: 'https://example.com/photo.jpg'
  }
}

// Mock error responses for each platform
export const mockErrors = {
  google: {
    userCancelled: {
      error: 'popup_closed_by_user',
      error_description: 'User closed popup'
    },
    networkError: {
      error: 'network_error',
      error_description: 'Network connection failed'
    },
    invalidClient: {
      error: 'invalid_client',
      error_description: 'Invalid client ID'
    }
  },
  apple: {
    userCancelled: {
      error: 'user_cancelled_authorize',
      error_description: 'User cancelled authorization'
    },
    invalidClient: {
      error: 'invalid_client',
      error_description: 'Invalid client ID'
    }
  },
  line: {
    userCancelled: {
      error: 'access_denied',
      error_description: 'User denied access'
    },
    networkError: {
      error: 'server_error',
      error_description: 'Server error occurred'
    }
  },
  telegram: {
    invalidAuth: {
      error: 'invalid_auth',
      error_description: 'Invalid authentication data'
    }
  }
}

// Helper to create JWT tokens for testing
export const createMockJWT = (payload: Record<string, any>) => {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const encodedPayload = btoa(JSON.stringify(payload))
  const signature = 'mock-signature'
  return `${header}.${encodedPayload}.${signature}`
}

// Mock fetch responses
export const mockFetchResponses = {
  googleTokenExchange: {
    success: {
      access_token: 'google_access_token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'google_refresh_token'
    },
    error: {
      error: 'invalid_grant',
      error_description: 'Invalid authorization code'
    }
  },
  googleUserInfo: {
    success: {
      id: 'google123',
      email: 'test@gmail.com',
      name: 'Google User',
      given_name: 'Google',
      family_name: 'User',
      picture: 'https://lh3.googleusercontent.com/avatar.jpg'
    },
    error: {
      error: {
        code: 401,
        message: 'Invalid credentials'
      }
    }
  },
  lineTokenExchange: {
    success: {
      access_token: 'line_access_token',
      token_type: 'Bearer',
      expires_in: 2592000,
      refresh_token: 'line_refresh_token'
    }
  },
  lineUserInfo: {
    success: {
      userId: 'line789',
      displayName: 'Line User',
      pictureUrl: 'https://profile.line-scdn.net/avatar.jpg',
      statusMessage: 'Hello World'
    }
  }
}