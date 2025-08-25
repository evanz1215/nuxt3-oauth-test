import type { SocialUser, SocialPlatform, LoginState, SocialError } from './types'

/**
 * Enhanced multi-platform login state tracking
 */
interface PlatformState {
  isAuthenticated: boolean
  user: SocialUser | null
  lastLoginTime?: number
  isLoading: boolean
  error?: SocialError | null
}

/**
 * Global state management for social login system
 * Manages user authentication state, login status, and authenticated platforms
 * Enhanced for multi-platform support and comprehensive state tracking
 */
export const useSocialState = () => {
  // Global state using Nuxt's useState
  const currentUser = useState<SocialUser | null>('social.user', () => null)
  const loginState = useState<LoginState>('social.loginState', () => ({
    isLoading: false
  }))
  const authenticatedPlatforms = useState<SocialPlatform[]>('social.platforms', () => [])
  
  // Enhanced multi-platform state tracking
  const platformStates = useState<Record<SocialPlatform, PlatformState>>('social.platformStates', () => ({
    google: { isAuthenticated: false, user: null, isLoading: false },
    apple: { isAuthenticated: false, user: null, isLoading: false },
    line: { isAuthenticated: false, user: null, isLoading: false },
    telegram: { isAuthenticated: false, user: null, isLoading: false }
  }))
  
  // Global error state for better error tracking
  const globalError = useState<SocialError | null>('social.globalError', () => null)
  
  // Session management
  const sessionStartTime = useState<number | null>('social.sessionStart', () => null)
  const lastActivity = useState<number | null>('social.lastActivity', () => null)

  /**
   * Computed property to check if user is authenticated
   */
  const isAuthenticated = computed(() => currentUser.value !== null)

  /**
   * Computed property to get current platform if user is logged in
   */
  const currentPlatform = computed(() => currentUser.value?.platform)

  /**
   * Set the current user and update authenticated platforms
   * Enhanced with multi-platform state tracking
   */
  const setUser = (user: SocialUser | null) => {
    const now = Date.now()
    
    currentUser.value = user
    
    if (user) {
      // Add platform to authenticated platforms if not already present
      if (!authenticatedPlatforms.value.includes(user.platform)) {
        authenticatedPlatforms.value.push(user.platform)
      }
      
      // Update platform-specific state
      platformStates.value[user.platform] = {
        isAuthenticated: true,
        user,
        lastLoginTime: now,
        isLoading: false,
        error: null
      }
      
      // Update session tracking
      if (!sessionStartTime.value) {
        sessionStartTime.value = now
      }
      lastActivity.value = now
      
      // Clear global error on successful login
      globalError.value = null
    } else {
      // Clear authenticated platforms when user is null
      authenticatedPlatforms.value = []
      
      // Reset all platform states
      Object.keys(platformStates.value).forEach(platform => {
        platformStates.value[platform as SocialPlatform] = {
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null
        }
      })
      
      // Clear session tracking
      sessionStartTime.value = null
      lastActivity.value = null
    }
  }

  /**
   * Set login state (loading, error, etc.)
   * Enhanced with platform-specific state tracking
   */
  const setLoginState = (state: Partial<LoginState>) => {
    loginState.value = {
      ...loginState.value,
      ...state
    }
    
    // Update platform-specific loading state
    if (state.platform) {
      platformStates.value[state.platform] = {
        ...platformStates.value[state.platform],
        isLoading: state.isLoading ?? platformStates.value[state.platform].isLoading,
        error: state.error ?? platformStates.value[state.platform].error
      }
    }
    
    // Update global error if provided
    if (state.error) {
      globalError.value = state.error
    }
    
    // Update last activity
    if (!state.isLoading) {
      lastActivity.value = Date.now()
    }
  }

  /**
   * Set loading state for login process
   */
  const setLoading = (isLoading: boolean, platform?: SocialPlatform) => {
    setLoginState({
      isLoading,
      platform,
      error: isLoading ? undefined : loginState.value.error // Clear error when starting new login
    })
  }

  /**
   * Set error state
   * Enhanced with platform-specific error tracking
   */
  const setError = (error: SocialError | null, platform?: SocialPlatform) => {
    setLoginState({
      error,
      isLoading: false,
      platform
    })
    
    // Update global error
    globalError.value = error
    
    // Update platform-specific error if platform is specified
    if (platform && error) {
      platformStates.value[platform] = {
        ...platformStates.value[platform],
        error,
        isLoading: false
      }
    }
  }

  /**
   * Clear error state
   * Enhanced with platform-specific error clearing
   */
  const clearError = (platform?: SocialPlatform) => {
    if (platform) {
      // Clear error for specific platform
      platformStates.value[platform] = {
        ...platformStates.value[platform],
        error: null
      }
      
      // Clear global error if it matches the platform
      if (globalError.value?.platform === platform) {
        globalError.value = null
      }
    } else {
      // Clear all errors
      setError(null)
      
      // Clear platform-specific errors
      Object.keys(platformStates.value).forEach(p => {
        platformStates.value[p as SocialPlatform] = {
          ...platformStates.value[p as SocialPlatform],
          error: null
        }
      })
    }
  }

  /**
   * Check if a specific platform is authenticated
   */
  const isPlatformAuthenticated = (platform: SocialPlatform): boolean => {
    return authenticatedPlatforms.value.includes(platform)
  }

  /**
   * Add a platform to authenticated platforms list
   */
  const addAuthenticatedPlatform = (platform: SocialPlatform) => {
    if (!authenticatedPlatforms.value.includes(platform)) {
      authenticatedPlatforms.value.push(platform)
    }
  }

  /**
   * Remove a platform from authenticated platforms list
   */
  const removeAuthenticatedPlatform = (platform: SocialPlatform) => {
    const index = authenticatedPlatforms.value.indexOf(platform)
    if (index > -1) {
      authenticatedPlatforms.value.splice(index, 1)
    }
  }

  /**
   * Clear all authentication state
   * Enhanced with comprehensive state cleanup
   */
  const clearAuthState = () => {
    currentUser.value = null
    authenticatedPlatforms.value = []
    
    // Clear all platform states
    Object.keys(platformStates.value).forEach(platform => {
      platformStates.value[platform as SocialPlatform] = {
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null
      }
    })
    
    // Clear global state
    setLoginState({
      isLoading: false,
      error: null,
      platform: undefined
    })
    
    globalError.value = null
    sessionStartTime.value = null
    lastActivity.value = null
  }

  /**
   * Logout from a specific platform or all platforms
   * Enhanced with comprehensive state cleanup and multi-platform support
   */
  const logout = (platform?: SocialPlatform) => {
    if (platform) {
      // Logout from specific platform
      removeAuthenticatedPlatform(platform)
      
      // Clear platform-specific state
      platformStates.value[platform] = {
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null
      }
      
      // If current user is from this platform, clear current user
      if (currentUser.value?.platform === platform) {
        currentUser.value = null
        
        // If there are other authenticated platforms, switch to the first one
        const remainingPlatforms = authenticatedPlatforms.value.filter(p => p !== platform)
        if (remainingPlatforms.length > 0) {
          const nextPlatform = remainingPlatforms[0]
          const nextUser = platformStates.value[nextPlatform].user
          if (nextUser) {
            currentUser.value = nextUser
          }
        }
      }
      
      // Clear platform-specific error
      clearError(platform)
    } else {
      // Logout from all platforms
      clearAuthState()
    }
    
    // Update last activity
    lastActivity.value = Date.now()
  }

  /**
   * Update user information (for profile updates, token refresh, etc.)
   */
  const updateUser = (updates: Partial<SocialUser>) => {
    if (currentUser.value) {
      currentUser.value = {
        ...currentUser.value,
        ...updates
      }
    }
  }

  /**
   * Get authentication status summary
   */
  const getAuthStatus = () => {
    return {
      isAuthenticated: isAuthenticated.value,
      currentUser: currentUser.value,
      currentPlatform: currentPlatform.value,
      authenticatedPlatforms: authenticatedPlatforms.value,
      loginState: loginState.value
    }
  }

  /**
   * Reset state to initial values (useful for testing or cleanup)
   */
  const resetState = () => {
    clearAuthState()
  }

  /**
   * Get platform-specific state
   */
  const getPlatformState = (platform: SocialPlatform): PlatformState => {
    return platformStates.value[platform]
  }

  /**
   * Set platform-specific loading state
   */
  const setPlatformLoading = (platform: SocialPlatform, isLoading: boolean) => {
    platformStates.value[platform] = {
      ...platformStates.value[platform],
      isLoading
    }
    
    // Update global loading state if this is the current platform
    if (loginState.value.platform === platform) {
      setLoginState({ isLoading })
    }
  }

  /**
   * Get all platform states
   */
  const getAllPlatformStates = () => {
    return readonly(platformStates.value)
  }

  /**
   * Check if any platform is currently loading
   */
  const isAnyPlatformLoading = computed(() => {
    return Object.values(platformStates.value).some(state => state.isLoading)
  })

  /**
   * Get session duration in milliseconds
   */
  const getSessionDuration = computed(() => {
    if (!sessionStartTime.value) return 0
    return Date.now() - sessionStartTime.value
  })

  /**
   * Get time since last activity in milliseconds
   */
  const getTimeSinceLastActivity = computed(() => {
    if (!lastActivity.value) return 0
    return Date.now() - lastActivity.value
  })

  /**
   * Check if session is active (has activity within threshold)
   */
  const isSessionActive = (thresholdMs: number = 30 * 60 * 1000) => computed(() => {
    return getTimeSinceLastActivity.value < thresholdMs
  })

  /**
   * Get comprehensive authentication summary
   */
  const getComprehensiveAuthStatus = () => {
    return {
      isAuthenticated: isAuthenticated.value,
      currentUser: currentUser.value,
      currentPlatform: currentPlatform.value,
      authenticatedPlatforms: authenticatedPlatforms.value,
      loginState: loginState.value,
      platformStates: platformStates.value,
      globalError: globalError.value,
      sessionDuration: getSessionDuration.value,
      timeSinceLastActivity: getTimeSinceLastActivity.value,
      isSessionActive: isSessionActive().value,
      isAnyPlatformLoading: isAnyPlatformLoading.value
    }
  }

  /**
   * Refresh user activity timestamp
   */
  const refreshActivity = () => {
    lastActivity.value = Date.now()
  }

  /**
   * Handle platform-specific user updates
   */
  const updatePlatformUser = (platform: SocialPlatform, updates: Partial<SocialUser>) => {
    const platformState = platformStates.value[platform]
    if (platformState.user) {
      const updatedUser = { ...platformState.user, ...updates }
      
      // Update platform state
      platformStates.value[platform] = {
        ...platformState,
        user: updatedUser
      }
      
      // Update current user if it's the same platform
      if (currentUser.value?.platform === platform) {
        currentUser.value = updatedUser
      }
    }
  }

  return {
    // State
    currentUser: readonly(currentUser),
    loginState: readonly(loginState),
    authenticatedPlatforms: readonly(authenticatedPlatforms),
    platformStates: readonly(platformStates),
    globalError: readonly(globalError),
    sessionStartTime: readonly(sessionStartTime),
    lastActivity: readonly(lastActivity),
    
    // Computed
    isAuthenticated,
    currentPlatform,
    isAnyPlatformLoading,
    getSessionDuration,
    getTimeSinceLastActivity,
    
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
    getAuthStatus,
    getComprehensiveAuthStatus,
    resetState,
    
    // Enhanced platform management
    getPlatformState,
    setPlatformLoading,
    getAllPlatformStates,
    isSessionActive,
    refreshActivity
  }
}