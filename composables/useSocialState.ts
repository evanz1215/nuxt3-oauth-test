import type { SocialUser, SocialPlatform, LoginState, SocialError } from './types'

/**
 * Global state management for social login system
 * Manages user authentication state, login status, and authenticated platforms
 */
export const useSocialState = () => {
  // Global state using Nuxt's useState
  const currentUser = useState<SocialUser | null>('social.user', () => null)
  const loginState = useState<LoginState>('social.loginState', () => ({
    isLoading: false
  }))
  const authenticatedPlatforms = useState<SocialPlatform[]>('social.platforms', () => [])

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
   */
  const setUser = (user: SocialUser | null) => {
    currentUser.value = user
    
    if (user) {
      // Add platform to authenticated platforms if not already present
      if (!authenticatedPlatforms.value.includes(user.platform)) {
        authenticatedPlatforms.value.push(user.platform)
      }
    } else {
      // Clear authenticated platforms when user is null
      authenticatedPlatforms.value = []
    }
  }

  /**
   * Set login state (loading, error, etc.)
   */
  const setLoginState = (state: Partial<LoginState>) => {
    loginState.value = {
      ...loginState.value,
      ...state
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
   */
  const setError = (error: SocialError | null) => {
    setLoginState({
      error,
      isLoading: false
    })
  }

  /**
   * Clear error state
   */
  const clearError = () => {
    setError(null)
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
   */
  const clearAuthState = () => {
    currentUser.value = null
    authenticatedPlatforms.value = []
    setLoginState({
      isLoading: false,
      error: null,
      platform: undefined
    })
  }

  /**
   * Logout from a specific platform or all platforms
   */
  const logout = (platform?: SocialPlatform) => {
    if (platform) {
      // Logout from specific platform
      removeAuthenticatedPlatform(platform)
      
      // If current user is from this platform, clear current user
      if (currentUser.value?.platform === platform) {
        currentUser.value = null
      }
    } else {
      // Logout from all platforms
      clearAuthState()
    }
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

  return {
    // State
    currentUser: readonly(currentUser),
    loginState: readonly(loginState),
    authenticatedPlatforms: readonly(authenticatedPlatforms),
    
    // Computed
    isAuthenticated,
    currentPlatform,
    
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
    getAuthStatus,
    resetState
  }
}