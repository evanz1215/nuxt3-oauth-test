import type {
  LineLoginOptions,
  LineUser,
  SocialLoginResult,
  SocialPlatform,
  SocialError,
} from "./types";
import { SDK_URLS, TIMEOUTS, DEFAULT_SCOPES } from "./constants";
import { useSocialConfig } from "./useSocialConfig";
import { useSocialState } from "./useSocialState";
import {
  handleSocialError,
  createSDKError,
  SocialErrorCodes,
} from "./utils/errors";

// Line SDK types
declare global {
  interface Window {
    liff?: {
      init: (config: LiffConfig) => Promise<void>;
      login: (config?: LiffLoginConfig) => void;
      logout: () => void;
      isLoggedIn: () => boolean;
      getProfile: () => Promise<LiffProfile>;
      getAccessToken: () => string;
      getIDToken: () => string | null;
      isInClient: () => boolean;
      ready: Promise<void>;
    };
  }
}

interface LiffConfig {
  liffId: string;
  withLoginOnExternalBrowser?: boolean;
}

interface LiffLoginConfig {
  redirectUri?: string;
  scope?: string;
  prompt?: string;
  botPrompt?: 'normal' | 'aggressive';
}

interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

interface LineOAuthConfig {
  client_id: string;
  redirect_uri: string;
  state: string;
  scope: string;
  response_type: 'code';
  bot_prompt?: 'normal' | 'aggressive';
}

interface LineTokenResponse {
  access_token: string;
  expires_in: number;
  id_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
}

interface LineUserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

/**
 * Line Login composable for handling Line authentication
 */
export const useLine = () => {
  const platform: SocialPlatform = "line";
  const { getPlatformConfig, validateConfig } = useSocialConfig();
  const { setUser, setLoginState, clearAuthState } = useSocialState();

  // Reactive state
  const isReady = ref(false);
  const isLoading = ref(false);
  const user = ref<LineUser | null>(null);
  const sdkLoaded = ref(false);

  /**
   * Dynamically load Line SDK
   */
  const loadSDK = async (): Promise<void> => {
    if (sdkLoaded.value && window.liff) {
      return;
    }

    return new Promise((resolve, reject) => {
      // Check if SDK is already loaded
      if (window.liff) {
        sdkLoaded.value = true;
        resolve();
        return;
      }

      // Create script element
      const script = document.createElement("script");
      script.src = SDK_URLS.line;
      script.async = true;
      script.defer = true;

      // Set up timeout
      const timeout = setTimeout(() => {
        reject(createSDKError(platform, { reason: "SDK load timeout" }));
      }, TIMEOUTS.SDK_LOAD);

      script.onload = () => {
        clearTimeout(timeout);
        sdkLoaded.value = true;
        resolve();
      };

      script.onerror = (error) => {
        clearTimeout(timeout);
        reject(createSDKError(platform, { error }));
      };

      // Add script to document
      document.head.appendChild(script);
    });
  };

  /**
   * Initialize Line SDK with configuration
   */
  const initializeSDK = async (): Promise<void> => {
    try {
      // Validate configuration first
      validateConfig(platform);
      const config = getPlatformConfig(platform);

      // Load SDK if not already loaded
      await loadSDK();

      if (!window.liff) {
        throw createSDKError(platform, {
          reason: "Line SDK not available after loading",
        });
      }

      // Initialize LIFF (Line Front-end Framework)
      // Note: In a real application, you would need a LIFF ID from Line Developers Console
      // For now, we'll prepare for both LIFF and web-based OAuth flows
      const liffId = (config as any).liffId;
      
      if (liffId) {
        // Initialize LIFF if LIFF ID is provided
        await window.liff.init({
          liffId,
          withLoginOnExternalBrowser: true,
        });
      }

      isReady.value = true;
    } catch (error) {
      const socialError = handleSocialError(error, platform);
      setLoginState({ isLoading: false, error: socialError, platform });
      throw error;
    }
  };

  /**
   * Generate random state parameter for CSRF protection
   */
  const generateRandomState = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  };

  /**
   * Login with Line using popup or redirect mode
   */
  const login = async (
    options: LineLoginOptions = {}
  ): Promise<SocialLoginResult> => {
    try {
      setLoginState({ isLoading: true, platform });
      isLoading.value = true;

      // Initialize SDK if not ready
      if (!isReady.value) {
        await initializeSDK();
      }

      // Check if we're in LIFF environment
      if (window.liff && (await isLiffEnvironment())) {
        return await loginWithLiff(options);
      }

      // Use popup mode by default, fallback to redirect if specified
      if (options.popup !== false) {
        return await loginWithPopup(options);
      } else {
        return await loginWithRedirect(options);
      }
    } catch (error) {
      const socialError = handleSocialError(error, platform);
      setLoginState({ isLoading: false, error: socialError, platform });
      isLoading.value = false;

      return {
        success: false,
        error: socialError,
        platform,
      };
    }
  };

  /**
   * Check if we're in LIFF environment
   */
  const isLiffEnvironment = async (): Promise<boolean> => {
    try {
      if (!window.liff) return false;
      
      // Wait for LIFF to be ready
      await window.liff.ready;
      return window.liff.isInClient();
    } catch {
      return false;
    }
  };

  /**
   * Login with Line using LIFF (Line Front-end Framework)
   */
  const loginWithLiff = async (
    options: LineLoginOptions = {}
  ): Promise<SocialLoginResult> => {
    try {
      if (!window.liff) {
        throw createSDKError(platform, { reason: "LIFF SDK not ready" });
      }

      // Wait for LIFF to be ready
      await window.liff.ready;

      // Check if already logged in
      if (window.liff.isLoggedIn()) {
        // Get user profile
        const profile = await window.liff.getProfile();
        const accessToken = window.liff.getAccessToken();

        const lineUser: LineUser = {
          id: profile.userId,
          lineId: profile.userId,
          displayName: profile.displayName,
          name: profile.displayName,
          avatar: profile.pictureUrl,
          pictureUrl: profile.pictureUrl,
          statusMessage: profile.statusMessage,
          platform,
          accessToken,
        };

        user.value = lineUser;
        setUser(lineUser);
        setLoginState({ isLoading: false, platform });
        isLoading.value = false;

        return {
          success: true,
          user: lineUser,
          platform,
        };
      }

      // Login with LIFF
      const loginConfig: LiffLoginConfig = {
        redirectUri: options.redirectUrl,
        scope: DEFAULT_SCOPES.line.join(" "),
        botPrompt: options.botPrompt || 'normal',
      };

      window.liff.login(loginConfig);

      // This will redirect, so we return a pending promise
      return new Promise(() => {});
    } catch (error) {
      const socialError = handleSocialError(error, platform);
      setLoginState({ isLoading: false, error: socialError, platform });
      isLoading.value = false;

      return {
        success: false,
        error: socialError,
        platform,
      };
    }
  };

  /**
   * Login with Line using popup mode
   */
  const loginWithPopup = async (
    options: LineLoginOptions = {}
  ): Promise<SocialLoginResult> => {
    // Check if popup is supported before attempting
    if (!isPopupSupported()) {
      return handlePopupBlocked();
    }

    return new Promise((resolve, reject) => {
      try {
        const config = getPlatformConfig(platform);
        const clientId = (config as any).clientId;
        const redirectUri = 
          options.redirectUrl || 
          (config as any).redirectUri || 
          `${window.location.origin}/auth/callback`;

        // Generate state parameter for CSRF protection
        const state = generateRandomState();

        // Store login state for callback handling
        const loginData = {
          platform,
          timestamp: Date.now(),
          redirectUri,
          state,
          mode: 'popup',
        };

        // Store in sessionStorage
        sessionStorage.setItem("line_login_state", JSON.stringify(loginData));

        // Build Line OAuth URL
        const scopes = DEFAULT_SCOPES.line;
        const oauthUrl = new URL("https://access.line.me/oauth2/v2.1/authorize");

        oauthUrl.searchParams.set("response_type", "code");
        oauthUrl.searchParams.set("client_id", clientId);
        oauthUrl.searchParams.set("redirect_uri", redirectUri);
        oauthUrl.searchParams.set("state", state);
        oauthUrl.searchParams.set("scope", scopes.join(" "));
        
        if (options.botPrompt) {
          oauthUrl.searchParams.set("bot_prompt", options.botPrompt);
        }

        // Open popup window
        const popup = window.open(
          oauthUrl.toString(),
          "line_login",
          "width=500,height=600,scrollbars=yes,resizable=yes"
        );

        if (!popup) {
          throw new Error("Popup blocked by browser");
        }

        // Set up timeout for popup
        const timeout = setTimeout(() => {
          popup.close();
          sessionStorage.removeItem("line_login_state");
          
          const error = handleSocialError(
            { error: "timeout" },
            platform,
            SocialErrorCodes.TIMEOUT_ERROR
          );
          setLoginState({ isLoading: false, error, platform });
          isLoading.value = false;
          reject(error);
        }, TIMEOUTS.LOGIN_POPUP);

        // Monitor popup for completion
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            clearTimeout(timeout);

            // Check if login was successful by looking for stored result
            const result = sessionStorage.getItem("line_login_result");
            if (result) {
              const loginResult = JSON.parse(result);
              sessionStorage.removeItem("line_login_result");
              sessionStorage.removeItem("line_login_state");

              if (loginResult.success) {
                user.value = loginResult.user;
                setUser(loginResult.user);
                setLoginState({ isLoading: false, platform });
                isLoading.value = false;
                resolve(loginResult);
              } else {
                setLoginState({ isLoading: false, error: loginResult.error, platform });
                isLoading.value = false;
                reject(loginResult.error);
              }
            } else {
              // Popup was closed without completing login
              sessionStorage.removeItem("line_login_state");
              
              const socialError = handleSocialError(
                { error: "popup_closed_by_user" },
                platform,
                SocialErrorCodes.USER_CANCELLED
              );
              setLoginState({ isLoading: false, error: socialError, platform });
              isLoading.value = false;
              reject(socialError);
            }
          }
        }, 1000);

      } catch (error) {
        const socialError = handleSocialError(error, platform);
        setLoginState({ isLoading: false, error: socialError, platform });
        isLoading.value = false;
        reject(socialError);
      }
    });
  };

  /**
   * Login with Line using redirect mode
   */
  const loginWithRedirect = async (
    options: LineLoginOptions = {}
  ): Promise<SocialLoginResult> => {
    try {
      const config = getPlatformConfig(platform);
      const clientId = (config as any).clientId;
      const redirectUri =
        options.redirectUrl ||
        (config as any).redirectUri ||
        `${window.location.origin}/auth/callback`;

      // Generate state parameter for CSRF protection
      const state = generateRandomState();

      // Store login state for callback handling
      const loginData = {
        platform,
        timestamp: Date.now(),
        redirectUri,
        state,
        mode: 'redirect',
      };

      // Store in sessionStorage to persist across redirect
      sessionStorage.setItem("line_login_state", JSON.stringify(loginData));

      // Build Line OAuth URL
      const scopes = DEFAULT_SCOPES.line;
      const oauthUrl = new URL("https://access.line.me/oauth2/v2.1/authorize");

      oauthUrl.searchParams.set("response_type", "code");
      oauthUrl.searchParams.set("client_id", clientId);
      oauthUrl.searchParams.set("redirect_uri", redirectUri);
      oauthUrl.searchParams.set("state", state);
      oauthUrl.searchParams.set("scope", scopes.join(" "));
      
      if (options.botPrompt) {
        oauthUrl.searchParams.set("bot_prompt", options.botPrompt);
      }

      // Redirect to Line OAuth
      window.location.href = oauthUrl.toString();

      // This promise will never resolve as we're redirecting away
      // The actual resolution happens in handleRedirectCallback
      return new Promise(() => {});
    } catch (error) {
      const socialError = handleSocialError(error, platform);
      setLoginState({ isLoading: false, error: socialError, platform });
      isLoading.value = false;

      return {
        success: false,
        error: socialError,
        platform,
      };
    }
  };

  /**
   * Exchange authorization code for access token
   */
  const exchangeCodeForToken = async (
    code: string,
    state: string
  ): Promise<LineTokenResponse> => {
    try {
      const config = getPlatformConfig(platform);
      const clientId = (config as any).clientId;
      const clientSecret = (config as any).clientSecret;
      const redirectUri = 
        (config as any).redirectUri || 
        `${window.location.origin}/auth/callback`;

      // Note: In a real application, this should be done on the server side
      // for security reasons. This is a client-side implementation for demo purposes.
      const response = await fetch("https://api.line.me/oauth2/v2.1/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Token exchange failed: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to exchange code for token: ${error}`);
    }
  };

  /**
   * Get user profile using access token
   */
  const getUserProfile = async (accessToken: string): Promise<LineUserProfile> => {
    try {
      const response = await fetch("https://api.line.me/v2/profile", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch user profile: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to fetch user profile from Line: ${error}`);
    }
  };

  /**
   * Handle redirect callback from Line OAuth
   */
  const handleRedirectCallback = async (): Promise<SocialLoginResult> => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const state = urlParams.get("state");
      const error = urlParams.get("error");
      const errorDescription = urlParams.get("error_description");

      // Check for error in callback
      if (error) {
        const socialError = handleSocialError(
          { error, error_description: errorDescription },
          platform,
          error === "access_denied"
            ? SocialErrorCodes.USER_CANCELLED
            : undefined
        );

        // Clean up stored state
        sessionStorage.removeItem("line_login_state");

        return {
          success: false,
          error: socialError,
          platform,
        };
      }

      // Validate required parameters
      if (!code || !state) {
        const socialError = handleSocialError(
          { error: "missing_parameters" },
          platform
        );

        return {
          success: false,
          error: socialError,
          platform,
        };
      }

      // Retrieve and validate stored state
      const storedStateData = sessionStorage.getItem("line_login_state");
      if (!storedStateData) {
        const socialError = handleSocialError(
          { error: "invalid_state" },
          platform
        );

        return {
          success: false,
          error: socialError,
          platform,
        };
      }

      const loginData = JSON.parse(storedStateData);

      // Validate state parameter (CSRF protection)
      if (loginData.state !== state) {
        const socialError = handleSocialError(
          { error: "state_mismatch" },
          platform
        );

        // Clean up stored state
        sessionStorage.removeItem("line_login_state");

        return {
          success: false,
          error: socialError,
          platform,
        };
      }

      // Check if state is not too old (prevent replay attacks)
      const stateAge = Date.now() - loginData.timestamp;
      if (stateAge > 10 * 60 * 1000) {
        // 10 minutes
        const socialError = handleSocialError(
          { error: "state_expired" },
          platform
        );

        // Clean up stored state
        sessionStorage.removeItem("line_login_state");

        return {
          success: false,
          error: socialError,
          platform,
        };
      }

      // Exchange authorization code for access token
      const tokenResponse = await exchangeCodeForToken(code, state);

      // Get user profile
      const userProfile = await getUserProfile(tokenResponse.access_token);

      // Create user object
      const lineUser: LineUser = {
        id: userProfile.userId,
        lineId: userProfile.userId,
        displayName: userProfile.displayName,
        name: userProfile.displayName,
        avatar: userProfile.pictureUrl,
        pictureUrl: userProfile.pictureUrl,
        statusMessage: userProfile.statusMessage,
        platform,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
      };

      // Update state
      user.value = lineUser;
      setUser(lineUser);
      setLoginState({ isLoading: false, platform });

      // Clean up stored state
      sessionStorage.removeItem("line_login_state");

      // If this was a popup callback, store result for parent window
      if (loginData.mode === 'popup') {
        sessionStorage.setItem("line_login_result", JSON.stringify({
          success: true,
          user: lineUser,
          platform,
        }));
        
        // Close popup window
        window.close();
        return { success: true, user: lineUser, platform };
      }

      // Clean up URL parameters for redirect mode
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      return {
        success: true,
        user: lineUser,
        platform,
      };
    } catch (error) {
      const socialError = handleSocialError(error, platform);

      // Clean up stored state
      sessionStorage.removeItem("line_login_state");

      // If this was a popup callback, store error for parent window
      const storedStateData = sessionStorage.getItem("line_login_state");
      if (storedStateData) {
        const loginData = JSON.parse(storedStateData);
        if (loginData.mode === 'popup') {
          sessionStorage.setItem("line_login_result", JSON.stringify({
            success: false,
            error: socialError,
            platform,
          }));
          
          // Close popup window
          window.close();
        }
      }

      return {
        success: false,
        error: socialError,
        platform,
      };
    }
  };

  /**
   * Check if popup is supported and not blocked
   */
  const isPopupSupported = (): boolean => {
    try {
      // Try to open a test popup
      const testPopup = window.open("", "_blank", "width=1,height=1");
      if (testPopup) {
        testPopup.close();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  /**
   * Handle popup blocked scenario
   */
  const handlePopupBlocked = (): SocialLoginResult => {
    const error = handleSocialError(
      { error: "popup_blocked_by_browser" },
      platform,
      SocialErrorCodes.POPUP_BLOCKED
    );
    setLoginState({ isLoading: false, error, platform });
    isLoading.value = false;

    return {
      success: false,
      error,
      platform,
    };
  };

  /**
   * Logout from Line
   */
  const logout = async (): Promise<void> => {
    try {
      // If in LIFF environment, use LIFF logout
      if (window.liff && (await isLiffEnvironment())) {
        window.liff.logout();
      }

      // Clear local state
      user.value = null;
      clearAuthState();
    } catch (error) {
      // Log error but don't throw - logout should always succeed locally
      console.warn("Error during Line logout:", error);
    }
  };

  /**
   * Check if current URL contains OAuth callback parameters
   */
  const isRedirectCallback = (): boolean => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasCode = urlParams.has("code");
    const hasState = urlParams.has("state");
    const storedState = sessionStorage.getItem("line_login_state");

    return hasCode && hasState && !!storedState;
  };

  // Initialize SDK when composable is used
  onMounted(() => {
    if (import.meta.client) {
      // Check if we're handling a redirect callback
      if (isRedirectCallback()) {
        setLoginState({ isLoading: true, platform });
        isLoading.value = true;

        handleRedirectCallback()
          .then((result) => {
            setLoginState({ isLoading: false, platform });
            isLoading.value = false;

            // Emit callback result event for parent components to handle
            if (result.success) {
              console.log("Line redirect login successful:", result.user);
            } else {
              console.error("Line redirect login failed:", result.error);
            }
          })
          .catch((error) => {
            console.error("Error handling Line redirect callback:", error);
            setLoginState({
              isLoading: false,
              error: handleSocialError(error, platform),
              platform,
            });
            isLoading.value = false;
          });
      } else {
        // Normal initialization
        initializeSDK().catch((error) => {
          console.warn("Failed to initialize Line SDK:", error);
        });
      }
    }
  });

  return {
    // State
    isReady: readonly(isReady),
    isLoading: readonly(isLoading),
    user: readonly(user),

    // Methods
    login,
    logout,
    handleRedirectCallback,
    isRedirectCallback,

    // Internal methods (exposed for testing)
    loadSDK,
    initializeSDK,
  };
};