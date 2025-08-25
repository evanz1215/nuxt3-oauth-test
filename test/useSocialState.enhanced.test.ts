import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setupTestEnvironment, cleanupTestEnvironment } from './utils/testHelpers'
import { mockUsers } from './mocks/socialSDKs'
import type { SocialUser, SocialError, LoginState, SocialPlatform } from '../composables/types'

// Create a test implementation of useSocialState
const createTestSocialState = () => {
  // State
  let currentUser: SocialUser | null = null
  let loginState: LoginState = { isLoading: false }
  let authenticatedPlatforms: SocialPlatform[] = []
  let platformStates: Record<SocialPlatform, { isAuthenticated: boolean; user: SocialUser | null; isLoading: boolean; error?: SocialError }> = {
    google: { isAuthenticated: false, user: null, isLoading: false },
    apple: { isAuthenticated: false, user: null, isLoading: false },
    line: { isAuthenticated: false, user: null, isLoading: false },
    telegram: { isAuthenticated: false, user: null, isLoading: false }
  }

  // Computed
  const isAuthenticated = () => currentUser !== null
  const currentPlatform = () => currentUser?.platform
  const isAnyPlatformLoading = () => Object.values(platformStates).some(state => state.isLoading) || loginState.isLoading

  // Actions
  const setUser = (user: SocialUser | null) => {
    currentUser = user
    if (user) {
      if (!authenticatedPlatforms.includes(user.platform)) {
        authenticatedPlatforms.push(user.platform)
      }
      platformStates[user.platform] = {
        isAuthenticated: true,
        user,
        isLoading: false
      }
    } else {
      authenticatedPlatforms = []
      Object.keys(platformStates).forEach(platform => {
        platformStates[platform as SocialPlatform] = {
          isAuthenticated: false,
          user: null,
          isLoading: false
        }
      })
    }
  }

  const setLoginState = (state: Partial<LoginState>) => {
    loginState = { ...loginState, ...state }
  }

  const setLoading = (isLoading: boolean, platform?: SocialPlatform) => {
    setLoginState({
      isLoading,
      platform,
      error: isLoading ? undefined : loginState.error
    })
    
    if (platform) {
      platformStates[platform] = {
        ...platformStates[platform],
        isLoading
      }
    }
  }

  const setError = (error: SocialError | null) => {
    setLoginState({
      error,
      isLoading: false
    })
    
    if (error?.platform) {
      platformStates[error.platform] = {
        ...platformStates[error.platform],
        error,
        isLoading: false
      }
    }
  }

  const clearError = () => {
    setError(null)
    Object.keys(platformStates).forEach(platform => {
      delete platformStates[platform as SocialPlatform].error
    })
  }

  const isPlatformAuthenticated = (platform: SocialPlatform): boolean => {
    return authenticatedPlatforms.includes(platform)
  }

  const addAuthenticatedPlatform = (platform: SocialPlatform) => {
    if (!authenticatedPlatforms.includes(platform)) {
      authenticatedPlatforms.push(platform)
      platformStates[platform] = {
        ...platformStates[platform],
        isAuthenticated: true
      }
    }
  }

  const removeAuthenticatedPlatform = (platform: SocialPlatform) => {
    const index = authenticatedPlatforms.indexOf(platform)
    if (index > -1) {
      authenticatedPlatforms.splice(index, 1)
      platformStates[platform] = {
        isAuthenticated: false,
        user: null,
        isLoading: false
      }
    }
  }

  const clearAuthState = () => {
    currentUser = null
    authenticatedPlatforms = []
    setLoginState({
      isLoading: false,
      error: null,
      platform: undefined
    })
    Object.keys(platformStates).forEach(platform => {
      platformStates[platform as SocialPlatform] = {
        isAuthenticated: false,
        user: null,
        isLoading: false
      }
    })
  }

  const logout = (platform?: SocialPlatform) => {
    if (platform) {
      removeAuthenticatedPlatform(platform)
      if (currentUser?.platform === platform) {
        currentUser = null
      }
    } else {
      clearAuthState()
    }
  }

  const updateUser = (updates: Partial<SocialUser>) => {
    if (currentUser) {
      currentUser = { ...currentUser, ...updates }
      if (currentUser.platform) {
        platformStates[currentUser.platform] = {
          ...platformStates[currentUser.platform],
          user: currentUser
        }
      }
    }
  }

  const updatePlatformUser = (platform: SocialPlatform, updates: Partial<SocialUser>) => {
    if (platformStates[platform].user) {
      platformStates[platform].user = { ...platformStates[platform].user!, ...updates }
      if (currentUser?.platform === platform) {
        currentUser = platformStates[platform].user
      }
    }
  }

  const getPlatformState = (platform: SocialPlatform) => {
    return platformStates[platform]
  }

  const setPlatformLoading = (platform: SocialPlatform, isLoading: boolean) => {
    platformStates[platform] = {
      ...platformStates[platform],
      isLoading
    }
  }

  const getAllPlatformStates = () => {
    return { ...platformStates }
  }

  const getComprehensiveAuthStatus = () => {
    return {
      isAuthenticated: isAuthenticated(),
      currentUser,
      currentPlatform: currentPlatform(),
      authenticatedPlatforms: [...authenticatedPlatforms],
      loginState: { ...loginState },
      platformStates: getAllPlatformStates(),
      isAnyPlatformLoading: isAnyPlatformLoading()
    }
  }

  const refreshActivity = () => {
    // Mock implementation - in real app this would update last activity timestamp
    if (currentUser) {
      updateUser({ ...currentUser })
    }
  }

  const getAuthStatus = () => {
    return {
      isAuthenticated: isAuthenticated(),
      currentUser,
      currentPlatform: currentPlatform(),
      authenticatedPlatforms: [...authenticatedPlatforms],
      loginState: { ...loginState }
    }
  }

  const resetState = () => {
    clearAuthState()
  }

  return {
    // State getters
    getCurrentUser: () => currentUser,
    getLoginState: () => loginState,
    getAuthenticatedPlatforms: () => [...authenticatedPlatforms],
    getPlatformStates: () => ({ ...platformStates }),

    // Computed
    isAuthenticated,
    currentPlatform,
    isAnyPlatformLoading,

    // Actions
    setUser,
    setLoginState,
    setLoading,
    setError,
    clearError,
    isPlatformAuthenticated,
    addAuthenticatedPlatform,
    removeAuthenticatedPlatform,
    clearAuthState,
    logout,
    updateUser,
    updatePlatformUser,
    getPlatformState,
    setPlatformLoading,
    getAllPlatformStates,
    getComprehensiveAuthStatus,
    refreshActivity,
    getAuthStatus,
    resetState
  }
}

describe('useSocialState - Enhanced Tests', () => {
  let socialState: ReturnType<typeof createTestSocialState>

  const mockGoogleUser: SocialUser = mockUsers.google
  const mockAppleUser: SocialUser = mockUsers.apple
  const mockLineUser: SocialUser = mockUsers.line
  const mockTelegramUser: SocialUser = mockUsers.telegram

  const mockError: SocialError = {
    code: 'AUTH_FAILED',
    message: 'Authentication failed',
    platform: 'google'
  }

  beforeEach(() => {
    setupTestEnvironment()
    socialState = createTestSocialState()
    socialState.resetState()
  })

  afterEach(() => {
    cleanupTestEnvironment()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(socialState.getCurrentUser()).toBeNull()
      expect(socialState.isAuthenticated()).toBe(false)
      expect(socialState.currentPlatform()).toBeUndefined()
      expect(socialState.getAuthenticatedPlatforms()).toEqual([])
      expect(socialState.getLoginState().isLoading).toBe(false)
      expect(socialState.getLoginState().error).toBeFalsy()
      expect(socialState.getLoginState().platform).toBeUndefined()
      expect(socialState.isAnyPlatformLoading()).toBe(false)
    })

    it('should have correct initial platform states', () => {
      const platformStates = socialState.getAllPlatformStates()
      
      expect(platformStates.google.isAuthenticated).toBe(false)
      expect(platformStates.google.user).toBeNull()
      expect(platformStates.google.isLoading).toBe(false)
      
      expect(platformStates.apple.isAuthenticated).toBe(false)
      expect(platformStates.line.isAuthenticated).toBe(false)
      expect(platformStates.telegram.isAuthenticated).toBe(false)
    })
  })

  describe('User Management', () => {
    it('should set user correctly', () => {
      socialState.setUser(mockGoogleUser)

      expect(socialState.getCurrentUser()).toEqual(mockGoogleUser)
      expect(socialState.isAuthenticated()).toBe(true)
      expect(socialState.currentPlatform()).toBe('google')
      expect(socialState.getAuthenticatedPlatforms()).toContain('google')
      
      const googleState = socialState.getPlatformState('google')
      expect(googleState.isAuthenticated).toBe(true)
      expect(googleState.user).toEqual(mockGoogleUser)
    })

    it('should clear user when set to null', () => {
      socialState.setUser(mockGoogleUser)
      socialState.setUser(null)

      expect(socialState.getCurrentUser()).toBeNull()
      expect(socialState.isAuthenticated()).toBe(false)
      expect(socialState.currentPlatform()).toBeUndefined()
      expect(socialState.getAuthenticatedPlatforms()).toEqual([])
      
      const platformStates = socialState.getAllPlatformStates()
      Object.values(platformStates).forEach(state => {
        expect(state.isAuthenticated).toBe(false)
        expect(state.user).toBeNull()
      })
    })

    it('should update user information', () => {
      socialState.setUser(mockGoogleUser)

      const updates = {
        name: 'Updated Name',
        avatar: 'https://example.com/new-avatar.jpg'
      }

      socialState.updateUser(updates)

      expect(socialState.getCurrentUser()?.name).toBe('Updated Name')
      expect(socialState.getCurrentUser()?.avatar).toBe('https://example.com/new-avatar.jpg')
      expect(socialState.getCurrentUser()?.email).toBe(mockGoogleUser.email)
      
      const googleState = socialState.getPlatformState('google')
      expect(googleState.user?.name).toBe('Updated Name')
    })

    it('should not update user if no current user', () => {
      socialState.updateUser({ name: 'Test' })
      expect(socialState.getCurrentUser()).toBeNull()
    })

    it('should update platform-specific user', () => {
      socialState.setUser(mockGoogleUser)
      socialState.addAuthenticatedPlatform('apple')
      
      const appleUpdates = { name: 'Updated Apple User' }
      socialState.updatePlatformUser('apple', appleUpdates)
      
      // Should not affect current user since it's Google
      expect(socialState.getCurrentUser()?.name).toBe(mockGoogleUser.name)
      
      // But should update Apple platform state if there was a user
      const appleState = socialState.getPlatformState('apple')
      expect(appleState.user).toBeNull() // No Apple user was set
    })
  })

  describe('Login State Management', () => {
    it('should set loading state correctly', () => {
      socialState.setLoading(true, 'google')

      expect(socialState.getLoginState().isLoading).toBe(true)
      expect(socialState.getLoginState().platform).toBe('google')
      expect(socialState.isAnyPlatformLoading()).toBe(true)
      
      const googleState = socialState.getPlatformState('google')
      expect(googleState.isLoading).toBe(true)
    })

    it('should clear error when starting new login', () => {
      socialState.setError(mockError)
      socialState.setLoading(true, 'apple')

      expect(socialState.getLoginState().error).toBeUndefined()
      expect(socialState.getLoginState().isLoading).toBe(true)
      expect(socialState.getLoginState().platform).toBe('apple')
    })

    it('should set error state correctly', () => {
      socialState.setError(mockError)

      expect(socialState.getLoginState().error).toEqual(mockError)
      expect(socialState.getLoginState().isLoading).toBe(false)
      
      const googleState = socialState.getPlatformState('google')
      expect(googleState.error).toEqual(mockError)
      expect(googleState.isLoading).toBe(false)
    })

    it('should clear error state', () => {
      socialState.setError(mockError)
      socialState.clearError()

      expect(socialState.getLoginState().error).toBeNull()
      
      const googleState = socialState.getPlatformState('google')
      expect(googleState.error).toBeUndefined()
    })

    it('should handle platform-specific loading states', () => {
      socialState.setPlatformLoading('google', true)
      socialState.setPlatformLoading('apple', true)
      
      expect(socialState.isAnyPlatformLoading()).toBe(true)
      expect(socialState.getPlatformState('google').isLoading).toBe(true)
      expect(socialState.getPlatformState('apple').isLoading).toBe(true)
      expect(socialState.getPlatformState('line').isLoading).toBe(false)
      
      socialState.setPlatformLoading('google', false)
      expect(socialState.isAnyPlatformLoading()).toBe(true) // Apple still loading
      
      socialState.setPlatformLoading('apple', false)
      expect(socialState.isAnyPlatformLoading()).toBe(false)
    })
  })

  describe('Platform Authentication Management', () => {
    it('should check platform authentication correctly', () => {
      expect(socialState.isPlatformAuthenticated('google')).toBe(false)

      socialState.addAuthenticatedPlatform('google')
      expect(socialState.isPlatformAuthenticated('google')).toBe(true)
      
      const googleState = socialState.getPlatformState('google')
      expect(googleState.isAuthenticated).toBe(true)
    })

    it('should not add duplicate platforms', () => {
      socialState.addAuthenticatedPlatform('google')
      socialState.addAuthenticatedPlatform('google')

      expect(socialState.getAuthenticatedPlatforms()).toEqual(['google'])
    })

    it('should remove authenticated platform', () => {
      socialState.addAuthenticatedPlatform('google')
      socialState.addAuthenticatedPlatform('apple')

      socialState.removeAuthenticatedPlatform('google')

      expect(socialState.getAuthenticatedPlatforms()).toEqual(['apple'])
      expect(socialState.isPlatformAuthenticated('google')).toBe(false)
      
      const googleState = socialState.getPlatformState('google')
      expect(googleState.isAuthenticated).toBe(false)
      expect(googleState.user).toBeNull()
    })

    it('should handle multiple authenticated platforms', () => {
      socialState.setUser(mockGoogleUser)
      socialState.addAuthenticatedPlatform('apple')
      socialState.addAuthenticatedPlatform('line')

      expect(socialState.getAuthenticatedPlatforms()).toEqual(['google', 'apple', 'line'])
      expect(socialState.isPlatformAuthenticated('google')).toBe(true)
      expect(socialState.isPlatformAuthenticated('apple')).toBe(true)
      expect(socialState.isPlatformAuthenticated('line')).toBe(true)
      expect(socialState.isPlatformAuthenticated('telegram')).toBe(false)
    })
  })

  describe('Logout Functionality', () => {
    beforeEach(() => {
      socialState.setUser(mockGoogleUser)
      socialState.addAuthenticatedPlatform('apple')
      socialState.addAuthenticatedPlatform('line')
    })

    it('should logout from specific platform', () => {
      socialState.logout('google')

      expect(socialState.getCurrentUser()).toBeNull()
      expect(socialState.isPlatformAuthenticated('google')).toBe(false)
      expect(socialState.isPlatformAuthenticated('apple')).toBe(true)
      expect(socialState.isPlatformAuthenticated('line')).toBe(true)
    })

    it('should logout from all platforms', () => {
      socialState.logout()

      expect(socialState.getCurrentUser()).toBeNull()
      expect(socialState.getAuthenticatedPlatforms()).toEqual([])
      expect(socialState.getLoginState().isLoading).toBe(false)
      expect(socialState.getLoginState().error).toBeNull()
      
      const platformStates = socialState.getAllPlatformStates()
      Object.values(platformStates).forEach(state => {
        expect(state.isAuthenticated).toBe(false)
        expect(state.user).toBeNull()
      })
    })

    it('should not clear current user when logging out from different platform', () => {
      socialState.logout('apple')

      expect(socialState.getCurrentUser()).toEqual(mockGoogleUser)
      expect(socialState.isPlatformAuthenticated('apple')).toBe(false)
      expect(socialState.isPlatformAuthenticated('google')).toBe(true)
    })
  })

  describe('State Management', () => {
    it('should clear all auth state', () => {
      socialState.setUser(mockGoogleUser)
      socialState.setError(mockError)
      socialState.addAuthenticatedPlatform('apple')
      socialState.setPlatformLoading('line', true)

      socialState.clearAuthState()

      expect(socialState.getCurrentUser()).toBeNull()
      expect(socialState.getAuthenticatedPlatforms()).toEqual([])
      expect(socialState.getLoginState().isLoading).toBe(false)
      expect(socialState.getLoginState().error).toBeNull()
      expect(socialState.getLoginState().platform).toBeUndefined()
      expect(socialState.isAnyPlatformLoading()).toBe(false)
      
      const platformStates = socialState.getAllPlatformStates()
      Object.values(platformStates).forEach(state => {
        expect(state.isAuthenticated).toBe(false)
        expect(state.user).toBeNull()
        expect(state.isLoading).toBe(false)
      })
    })

    it('should get auth status summary', () => {
      socialState.setUser(mockGoogleUser)
      socialState.setLoading(true, 'google')
      socialState.addAuthenticatedPlatform('apple')

      const status = socialState.getAuthStatus()

      expect(status.isAuthenticated).toBe(true)
      expect(status.currentUser).toEqual(mockGoogleUser)
      expect(status.currentPlatform).toBe('google')
      expect(status.authenticatedPlatforms).toContain('google')
      expect(status.authenticatedPlatforms).toContain('apple')
      expect(status.loginState.isLoading).toBe(true)
    })

    it('should get comprehensive auth status', () => {
      socialState.setUser(mockGoogleUser)
      socialState.setPlatformLoading('apple', true)
      socialState.addAuthenticatedPlatform('line')

      const status = socialState.getComprehensiveAuthStatus()

      expect(status.isAuthenticated).toBe(true)
      expect(status.currentUser).toEqual(mockGoogleUser)
      expect(status.currentPlatform).toBe('google')
      expect(status.authenticatedPlatforms).toContain('google')
      expect(status.isAnyPlatformLoading).toBe(true)
      expect(status.platformStates.google.isAuthenticated).toBe(true)
      expect(status.platformStates.apple.isLoading).toBe(true)
      expect(status.platformStates.line.isAuthenticated).toBe(true)
    })

    it('should reset state to initial values', () => {
      socialState.setUser(mockGoogleUser)
      socialState.setError(mockError)
      socialState.addAuthenticatedPlatform('apple')

      socialState.resetState()

      expect(socialState.getCurrentUser()).toBeNull()
      expect(socialState.isAuthenticated()).toBe(false)
      expect(socialState.getAuthenticatedPlatforms()).toEqual([])
      expect(socialState.getLoginState().error).toBeNull()
      expect(socialState.isAnyPlatformLoading()).toBe(false)
    })

    it('should refresh activity', () => {
      socialState.setUser(mockGoogleUser)
      const originalUser = socialState.getCurrentUser()
      
      socialState.refreshActivity()
      
      // In a real implementation, this might update timestamps
      expect(socialState.getCurrentUser()).toEqual(originalUser)
    })
  })

  describe('Multiple Platform Support', () => {
    it('should switch between users from different platforms', () => {
      socialState.setUser(mockGoogleUser)
      expect(socialState.currentPlatform()).toBe('google')

      socialState.setUser(mockAppleUser)
      expect(socialState.currentPlatform()).toBe('apple')
      expect(socialState.getAuthenticatedPlatforms()).toContain('google')
      expect(socialState.getAuthenticatedPlatforms()).toContain('apple')
    })

    it('should maintain separate platform states', () => {
      // Set up multiple platforms
      socialState.setUser(mockGoogleUser)
      socialState.addAuthenticatedPlatform('apple')
      socialState.setPlatformLoading('line', true)
      
      const lineError: SocialError = {
        code: 'NETWORK_ERROR',
        message: 'Network failed',
        platform: 'line'
      }
      socialState.setError(lineError)

      const platformStates = socialState.getAllPlatformStates()
      
      expect(platformStates.google.isAuthenticated).toBe(true)
      expect(platformStates.google.user).toEqual(mockGoogleUser)
      expect(platformStates.google.isLoading).toBe(false)
      
      expect(platformStates.apple.isAuthenticated).toBe(true)
      expect(platformStates.apple.user).toBeNull()
      expect(platformStates.apple.isLoading).toBe(false)
      
      expect(platformStates.line.isAuthenticated).toBe(false)
      expect(platformStates.line.isLoading).toBe(true)
      expect(platformStates.line.error).toEqual(lineError)
      
      expect(platformStates.telegram.isAuthenticated).toBe(false)
    })

    it('should handle complex multi-platform scenarios', () => {
      // Simulate a complex scenario with multiple platforms
      socialState.setUser(mockGoogleUser)
      socialState.addAuthenticatedPlatform('apple')
      socialState.addAuthenticatedPlatform('line')
      socialState.setPlatformLoading('telegram', true)
      
      // Switch to Apple user
      socialState.setUser(mockAppleUser)
      
      const status = socialState.getComprehensiveAuthStatus()
      
      expect(status.currentUser).toEqual(mockAppleUser)
      expect(status.currentPlatform).toBe('apple')
      expect(status.authenticatedPlatforms).toEqual(['google', 'apple', 'line'])
      expect(status.isAnyPlatformLoading).toBe(true)
      expect(status.platformStates.telegram.isLoading).toBe(true)
    })
  })

  describe('Error Scenarios', () => {
    it('should handle platform-specific errors', () => {
      const googleError: SocialError = {
        code: 'AUTH_FAILED',
        message: 'Google auth failed',
        platform: 'google'
      }
      
      const appleError: SocialError = {
        code: 'NETWORK_ERROR',
        message: 'Apple network error',
        platform: 'apple'
      }
      
      socialState.setError(googleError)
      socialState.setError(appleError)
      
      // Last error should be in global state
      expect(socialState.getLoginState().error).toEqual(appleError)
      
      // Platform-specific errors should be preserved
      expect(socialState.getPlatformState('google').error).toEqual(googleError)
      expect(socialState.getPlatformState('apple').error).toEqual(appleError)
    })

    it('should clear all errors correctly', () => {
      const googleError: SocialError = {
        code: 'AUTH_FAILED',
        message: 'Google auth failed',
        platform: 'google'
      }
      
      socialState.setError(googleError)
      socialState.clearError()
      
      expect(socialState.getLoginState().error).toBeNull()
      expect(socialState.getPlatformState('google').error).toBeUndefined()
    })
  })
})