import type {
  SocialLoginOptions,
  SocialLoginResult,
  SocialPlatform,
  SocialUser,
  SocialError,
  GoogleLoginOptions,
  AppleLoginOptions,
  LineLoginOptions,
  TelegramLoginOptions,
} from "./types";
import { SUPPORTED_PLATFORMS } from "./constants";
import { useSocialState } from "./useSocialState";
import { useGoogle } from "./useGoogle";
import { useApple } from "./useApple";
import { useLine } from "./useLine";
import { useTelegram } from "./useTelegram";
import { 
  handleSocialError, 
  SocialErrorCodes, 
  retryOperation, 
  DEFAULT_RETRY_CONFIGS, 
  attemptErrorRecovery,
  type RetryConfig 
} from "./utils/errors";

/**
 * Unified social login composable that provides a consistent interface
 * for all supported social platforms (Google, Apple, Line, Telegram)
 */
export const useSocial = () => {
  // Get enhanced global state management
  const {
    currentUser,
    loginState,
    authenticatedPlatforms,
    isAuthenticated,
    currentPlatform,
    setUser,
    setLoginState,
    clearAuthState,
    logout: globalLogout,
    isPlatformAuthenticated,
    getPlatformState,
    setPlatformLoading,
    getAllPlatformStates,
    isAnyPlatformLoading,
    getComprehensiveAuthStatus,
    refreshActivity,
    clearError,
    setError,
    updatePlatformUser,
  } = useSocialState();

  // Initialize individual platform composables
  const googleComposable = useGoogle();
  const appleComposable = useApple();
  const lineComposable = useLine();
  const telegramComposable = useTelegram();

  /**
   * Get the appropriate composable for a given platform
   */
  const getPlatformComposable = (platform: SocialPlatform) => {
    switch (platform) {
      case "google":
        return googleComposable;
      case "apple":
        return appleComposable;
      case "line":
        return lineComposable;
      case "telegram":
        return telegramComposable;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  };

  /**
   * Validate that the platform is supported
   */
  const validatePlatform = (platform: SocialPlatform): void => {
    if (!SUPPORTED_PLATFORMS.includes(platform)) {
      throw new Error(
        `Unsupported platform: ${platform}. Supported platforms: ${SUPPORTED_PLATFORMS.join(", ")}`
      );
    }
  };

  /**
   * Enhanced login with Google including retry mechanism and error recovery
   */
  const loginWithGoogle = async (
    options: GoogleLoginOptions = {}
  ): Promise<SocialLoginResult> => {
    const platform = "google";
    
    try {
      validatePlatform(platform);
      setLoginState({ isLoading: true, platform });
      setPlatformLoading(platform, true);
      clearError(platform);

      // Use retry mechanism for login operation
      const result = await retryOperation(
        () => googleComposable.login(options),
        options.retryConfig || DEFAULT_RETRY_CONFIGS.login,
        (attempt, error) => {
          console.warn(`Google login attempt ${attempt} failed:`, error);
          setError(error, platform);
        }
      );

      if (result.success && result.user) {
        setUser(result.user);
        refreshActivity();
      }

      setLoginState({ isLoading: false, platform });
      setPlatformLoading(platform, false);
      return result;
    } catch (error) {
      const socialError = handleSocialError(error, platform);
      
      // Attempt error recovery
      const recovered = await attemptErrorRecovery(socialError);
      if (recovered) {
        console.info("Error recovery successful, retrying login...");
        // Retry once after recovery
        try {
          return await googleComposable.login(options);
        } catch (retryError) {
          // If retry after recovery fails, proceed with error handling
        }
      }
      
      setLoginState({ isLoading: false, error: socialError, platform });
      setPlatformLoading(platform, false);
      setError(socialError, platform);
      
      return {
        success: false,
        error: socialError,
        platform,
      };
    }
  };

  /**
   * Enhanced login with Apple including retry mechanism and error recovery
   */
  const loginWithApple = async (
    options: AppleLoginOptions = {}
  ): Promise<SocialLoginResult> => {
    const platform = "apple";
    
    try {
      validatePlatform(platform);
      setLoginState({ isLoading: true, platform });
      setPlatformLoading(platform, true);
      clearError(platform);

      const result = await retryOperation(
        () => appleComposable.login(options),
        options.retryConfig || DEFAULT_RETRY_CONFIGS.login,
        (attempt, error) => {
          console.warn(`Apple login attempt ${attempt} failed:`, error);
          setError(error, platform);
        }
      );

      if (result.success && result.user) {
        setUser(result.user);
        refreshActivity();
      }

      setLoginState({ isLoading: false, platform });
      setPlatformLoading(platform, false);
      return result;
    } catch (error) {
      const socialError = handleSocialError(error, platform);
      
      const recovered = await attemptErrorRecovery(socialError);
      if (recovered) {
        console.info("Error recovery successful, retrying login...");
        try {
          return await appleComposable.login(options);
        } catch (retryError) {
          // Proceed with error handling
        }
      }
      
      setLoginState({ isLoading: false, error: socialError, platform });
      setPlatformLoading(platform, false);
      setError(socialError, platform);
      
      return {
        success: false,
        error: socialError,
        platform,
      };
    }
  };

  /**
   * Enhanced login with Line including retry mechanism and error recovery
   */
  const loginWithLine = async (
    options: LineLoginOptions = {}
  ): Promise<SocialLoginResult> => {
    const platform = "line";
    
    try {
      validatePlatform(platform);
      setLoginState({ isLoading: true, platform });
      setPlatformLoading(platform, true);
      clearError(platform);

      const result = await retryOperation(
        () => lineComposable.login(options),
        options.retryConfig || DEFAULT_RETRY_CONFIGS.login,
        (attempt, error) => {
          console.warn(`Line login attempt ${attempt} failed:`, error);
          setError(error, platform);
        }
      );

      if (result.success && result.user) {
        setUser(result.user);
        refreshActivity();
      }

      setLoginState({ isLoading: false, platform });
      setPlatformLoading(platform, false);
      return result;
    } catch (error) {
      const socialError = handleSocialError(error, platform);
      
      const recovered = await attemptErrorRecovery(socialError);
      if (recovered) {
        console.info("Error recovery successful, retrying login...");
        try {
          return await lineComposable.login(options);
        } catch (retryError) {
          // Proceed with error handling
        }
      }
      
      setLoginState({ isLoading: false, error: socialError, platform });
      setPlatformLoading(platform, false);
      setError(socialError, platform);
      
      return {
        success: false,
        error: socialError,
        platform,
      };
    }
  };

  /**
   * Enhanced login with Telegram including retry mechanism and error recovery
   */
  const loginWithTelegram = async (
    options: TelegramLoginOptions = {}
  ): Promise<SocialLoginResult> => {
    const platform = "telegram";
    
    try {
      validatePlatform(platform);
      setLoginState({ isLoading: true, platform });
      setPlatformLoading(platform, true);
      clearError(platform);

      const result = await retryOperation(
        () => telegramComposable.login(options),
        options.retryConfig || DEFAULT_RETRY_CONFIGS.login,
        (attempt, error) => {
          console.warn(`Telegram login attempt ${attempt} failed:`, error);
          setError(error, platform);
        }
      );

      if (result.success && result.user) {
        setUser(result.user);
        refreshActivity();
      }

      setLoginState({ isLoading: false, platform });
      setPlatformLoading(platform, false);
      return result;
    } catch (error) {
      const socialError = handleSocialError(error, platform);
      
      const recovered = await attemptErrorRecovery(socialError);
      if (recovered) {
        console.info("Error recovery successful, retrying login...");
        try {
          return await telegramComposable.login(options);
        } catch (retryError) {
          // Proceed with error handling
        }
      }
      
      setLoginState({ isLoading: false, error: socialError, platform });
      setPlatformLoading(platform, false);
      setError(socialError, platform);
      
      return {
        success: false,
        error: socialError,
        platform,
      };
    }
  };

  /**
   * Generic login method that delegates to the appropriate platform composable
   */
  const login = async (
    platform: SocialPlatform,
    options: SocialLoginOptions = {}
  ): Promise<SocialLoginResult> => {
    try {
      validatePlatform(platform);

      switch (platform) {
        case "google":
          return await loginWithGoogle(options as GoogleLoginOptions);
        case "apple":
          return await loginWithApple(options as AppleLoginOptions);
        case "line":
          return await loginWithLine(options as LineLoginOptions);
        case "telegram":
          return await loginWithTelegram(options as TelegramLoginOptions);
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
    } catch (error) {
      const socialError = handleSocialError(error, platform);
      setLoginState({ isLoading: false, error: socialError, platform });
      return {
        success: false,
        error: socialError,
        platform,
      };
    }
  };

  /**
   * Enhanced logout from a specific platform or all platforms with retry mechanism
   */
  const logout = async (platform?: SocialPlatform, options?: { force?: boolean }): Promise<void> => {
    const { force = false } = options || {};
    
    try {
      if (platform) {
        // Logout from specific platform
        validatePlatform(platform);
        setPlatformLoading(platform, true);
        
        try {
          const platformComposable = getPlatformComposable(platform);
          
          if (!force) {
            // Use retry mechanism for logout
            await retryOperation(
              () => platformComposable.logout(),
              DEFAULT_RETRY_CONFIGS.logout,
              (attempt, error) => {
                console.warn(`Logout attempt ${attempt} failed for ${platform}:`, error);
              }
            );
          } else {
            // Force logout without retry
            await platformComposable.logout();
          }
        } catch (error) {
          if (!force) {
            console.warn(`Platform logout failed for ${platform}, forcing local logout:`, error);
          }
        } finally {
          // Always clear local state
          setPlatformLoading(platform, false);
          globalLogout(platform);
          clearError(platform);
          refreshActivity();
        }
      } else {
        // Logout from all platforms
        const logoutPromises = SUPPORTED_PLATFORMS.map(async (p) => {
          try {
            if (isPlatformAuthenticated(p)) {
              setPlatformLoading(p, true);
              const platformComposable = getPlatformComposable(p);
              
              if (!force) {
                await retryOperation(
                  () => platformComposable.logout(),
                  DEFAULT_RETRY_CONFIGS.logout
                );
              } else {
                await platformComposable.logout();
              }
            }
          } catch (error) {
            console.warn(`Error logging out from ${p}:`, error);
          } finally {
            setPlatformLoading(p, false);
          }
        });

        await Promise.allSettled(logoutPromises);
        
        // Clear all global state
        clearAuthState();
        refreshActivity();
      }
    } catch (error) {
      // Log error but don't throw - logout should always succeed locally
      console.warn("Error during logout:", error);
      
      // Still clear local state even if platform logout fails
      if (platform) {
        setPlatformLoading(platform, false);
        globalLogout(platform);
        clearError(platform);
      } else {
        clearAuthState();
      }
      refreshActivity();
    }
  };

  /**
   * Check if a specific platform is ready for login
   */
  const isPlatformReady = (platform: SocialPlatform): boolean => {
    try {
      validatePlatform(platform);
      const platformComposable = getPlatformComposable(platform);
      return platformComposable.isReady.value;
    } catch (error) {
      console.warn(`Error checking platform readiness for ${platform}:`, error);
      return false;
    }
  };

  /**
   * Check if a specific platform is currently loading
   */
  const isPlatformLoading = (platform: SocialPlatform): boolean => {
    try {
      validatePlatform(platform);
      const platformComposable = getPlatformComposable(platform);
      return platformComposable.isLoading.value;
    } catch (error) {
      console.warn(`Error checking platform loading state for ${platform}:`, error);
      return false;
    }
  };

  /**
   * Get user information for a specific platform
   */
  const getPlatformUser = (platform: SocialPlatform): SocialUser | null => {
    try {
      validatePlatform(platform);
      const platformComposable = getPlatformComposable(platform);
      return platformComposable.user.value;
    } catch (error) {
      console.warn(`Error getting platform user for ${platform}:`, error);
      return null;
    }
  };

  /**
   * Get readiness status for all platforms
   */
  const getAllPlatformsStatus = () => {
    return SUPPORTED_PLATFORMS.reduce((status, platform) => {
      status[platform] = {
        isReady: isPlatformReady(platform),
        isLoading: isPlatformLoading(platform),
        isAuthenticated: isPlatformAuthenticated(platform),
        user: getPlatformUser(platform),
      };
      return status;
    }, {} as Record<SocialPlatform, {
      isReady: boolean;
      isLoading: boolean;
      isAuthenticated: boolean;
      user: SocialUser | null;
    }>);
  };

  /**
   * Handle redirect callbacks for platforms that support it
   */
  const handleRedirectCallback = async (
    platform?: SocialPlatform
  ): Promise<SocialLoginResult | null> => {
    try {
      // If platform is specified, handle callback for that platform
      if (platform) {
        validatePlatform(platform);
        const platformComposable = getPlatformComposable(platform);
        
        if (platformComposable.isRedirectCallback && platformComposable.isRedirectCallback()) {
          const result = await platformComposable.handleRedirectCallback();
          
          if (result.success && result.user) {
            setUser(result.user);
          }
          
          return result;
        }
        
        return null;
      }

      // Auto-detect which platform is handling the callback
      for (const p of SUPPORTED_PLATFORMS) {
        try {
          const platformComposable = getPlatformComposable(p);
          
          if (platformComposable.isRedirectCallback && platformComposable.isRedirectCallback()) {
            const result = await platformComposable.handleRedirectCallback();
            
            if (result.success && result.user) {
              setUser(result.user);
            }
            
            return result;
          }
        } catch (error) {
          // Continue checking other platforms
          console.warn(`Error checking redirect callback for ${p}:`, error);
        }
      }

      return null;
    } catch (error) {
      const socialError = handleSocialError(error, platform || "unknown" as SocialPlatform);
      return {
        success: false,
        error: socialError,
        platform: platform || "unknown" as SocialPlatform,
      };
    }
  };

  /**
   * Get available platforms (those that are configured and ready)
   */
  const getAvailablePlatforms = (): SocialPlatform[] => {
    return SUPPORTED_PLATFORMS.filter(platform => {
      try {
        return isPlatformReady(platform);
      } catch {
        return false;
      }
    });
  };



  /**
   * Get the first available platform (useful for default login)
   */
  const getDefaultPlatform = (): SocialPlatform | null => {
    const available = getAvailablePlatforms();
    return available.length > 0 ? available[0] : null;
  };

  /**
   * Force logout from all platforms (bypasses retry mechanism)
   */
  const forceLogout = async (platform?: SocialPlatform): Promise<void> => {
    return logout(platform, { force: true });
  };

  /**
   * Get comprehensive authentication and error status
   */
  const getSystemStatus = () => {
    return {
      ...getComprehensiveAuthStatus(),
      platformStates: getAllPlatformStates(),
      availablePlatforms: getAvailablePlatforms(),
      defaultPlatform: getDefaultPlatform(),
      systemReady: getAvailablePlatforms().length > 0
    };
  };

  /**
   * Refresh user activity and update timestamps
   */
  const updateActivity = () => {
    refreshActivity();
  };

  /**
   * Clear all errors across all platforms
   */
  const clearAllErrors = () => {
    clearError(); // Clear global errors
    SUPPORTED_PLATFORMS.forEach(platform => {
      clearError(platform);
    });
  };

  /**
   * Update user information for current platform
   */
  const updateCurrentUser = (updates: Partial<SocialUser>) => {
    if (currentUser.value) {
      updatePlatformUser(currentUser.value.platform, updates);
    }
  };

  return {
    // Enhanced State
    currentUser,
    loginState,
    authenticatedPlatforms,
    isAuthenticated,
    currentPlatform,
    isAnyPlatformLoading,

    // Platform-specific login methods (enhanced)
    loginWithGoogle,
    loginWithApple,
    loginWithLine,
    loginWithTelegram,

    // Generic methods (enhanced)
    login,
    logout,
    forceLogout,

    // Platform status methods
    isPlatformReady,
    isPlatformLoading,
    isPlatformAuthenticated,
    getPlatformUser,
    getAllPlatformsStatus,
    getAvailablePlatforms,
    getDefaultPlatform,

    // Enhanced state management
    getPlatformState,
    getAllPlatformStates: () => getAllPlatformStates(),
    getSystemStatus,
    getComprehensiveAuthStatus: () => getComprehensiveAuthStatus(),

    // Activity and session management
    updateActivity,
    refreshActivity,

    // Error management
    clearAllErrors,
    clearError,
    setError,

    // User management
    updateCurrentUser,
    updatePlatformUser,

    // Callback handling
    handleRedirectCallback,

    // Utility
    validatePlatform,
    getPlatformComposable,

    // Constants
    supportedPlatforms: SUPPORTED_PLATFORMS,
  };
};