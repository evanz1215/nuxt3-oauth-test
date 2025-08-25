import type {
  GoogleLoginOptions,
  GoogleUser,
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

// Google SDK types
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (callback?: (notification: any) => void) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          disableAutoSelect: () => void;
          storeCredential: (credential: unknown) => void;
          cancel: () => void;
        };
        oauth2: {
          initTokenClient: (config: any) => any;
          hasGrantedAllScopes: (token: any, ...scopes: string[]) => boolean;
          hasGrantedAnyScope: (token: any, ...scopes: string[]) => boolean;
          revoke: (token: string, callback?: () => void) => void;
        };
      };
    };
  }
}

interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleCredentialResponse {
  credential: string;
  select_by: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

/**
 * Google OAuth composable for handling Google Sign-In
 */
export const useGoogle = () => {
  const platform: SocialPlatform = "google";
  const { getPlatformConfig, validateConfig } = useSocialConfig();
  const { setUser, setLoginState, clearAuthState } = useSocialState();

  // Reactive state
  const isReady = ref(false);
  const isLoading = ref(false);
  const user = ref<GoogleUser | null>(null);
  const sdkLoaded = ref(false);

  let tokenClient: any = null;

  /**
   * Dynamically load Google SDK
   */
  const loadSDK = async (): Promise<void> => {
    if (sdkLoaded.value && window.google) {
      return;
    }

    return new Promise((resolve, reject) => {
      // Check if SDK is already loaded
      if (window.google?.accounts) {
        sdkLoaded.value = true;
        resolve();
        return;
      }

      // Create script element
      const script = document.createElement("script");
      script.src = SDK_URLS.google;
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
   * Initialize Google SDK with configuration
   */
  const initializeSDK = async (): Promise<void> => {
    try {
      // Validate configuration first
      validateConfig(platform);
      const config = getPlatformConfig(platform);

      // Load SDK if not already loaded
      await loadSDK();

      if (!window.google?.accounts) {
        throw createSDKError(platform, {
          reason: "Google SDK not available after loading",
        });
      }

      // Initialize Google Identity Services
      window.google.accounts.id.initialize({
        client_id: (config as any).clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Initialize OAuth2 token client for additional scopes
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: (config as any).clientId,
        scope: DEFAULT_SCOPES.google.join(" "),
        callback: handleTokenResponse,
      });

      isReady.value = true;
    } catch (error) {
      const socialError = handleSocialError(error, platform);
      setLoginState({ isLoading: false, error: socialError, platform });
      throw error;
    }
  };

  /**
   * Handle credential response from Google One Tap or ID token flow
   */
  const handleCredentialResponse = async (
    response: GoogleCredentialResponse
  ) => {
    try {
      setLoginState({ isLoading: true, platform });

      // Decode JWT token to get user info
      const userInfo = await decodeGoogleJWT(response.credential);

      const googleUser: GoogleUser = {
        id: userInfo.id,
        googleId: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        givenName: userInfo.given_name,
        familyName: userInfo.family_name,
        avatar: userInfo.picture,
        platform,
        accessToken: response.credential, // ID token serves as access token for basic info
      };

      user.value = googleUser;
      setUser(googleUser);
      setLoginState({ isLoading: false, platform });

      // Check if there's a pending login promise (for redirect mode)
      const loginPromise = (window as any).__googleLoginPromise;
      if (loginPromise) {
        clearTimeout(loginPromise.timeout);
        delete (window as any).__googleLoginPromise;

        loginPromise.resolve({
          success: true,
          user: googleUser,
          platform,
        });
      }
    } catch (error) {
      const socialError = handleSocialError(error, platform);
      setLoginState({ isLoading: false, error: socialError, platform });

      // Handle error for pending login promise
      const loginPromise = (window as any).__googleLoginPromise;
      if (loginPromise) {
        clearTimeout(loginPromise.timeout);
        delete (window as any).__googleLoginPromise;
        loginPromise.reject(socialError);
      }

      throw error;
    }
  };

  /**
   * Handle OAuth2 token response for additional scopes
   */
  const handleTokenResponse = (response: GoogleTokenResponse) => {
    if (response.error) {
      const socialError = handleSocialError(response, platform);
      setLoginState({ isLoading: false, error: socialError, platform });
      return;
    }

    // Update user with access token if we have a current user
    if (user.value) {
      const updatedUser: GoogleUser = {
        ...user.value,
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
      };

      user.value = updatedUser;
      setUser(updatedUser);
    }

    setLoginState({ isLoading: false, platform });
  };

  /**
   * Decode Google JWT token to extract user information
   */
  const decodeGoogleJWT = async (token: string): Promise<GoogleUserInfo> => {
    try {
      // Simple JWT decode (for client-side use only, server should verify)
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );

      return JSON.parse(jsonPayload);
    } catch (error) {
      throw new Error("Failed to decode Google JWT token");
    }
  };

  /**
   * Login with Google using popup or redirect mode
   */
  const login = async (
    options: GoogleLoginOptions = {}
  ): Promise<SocialLoginResult> => {
    try {
      setLoginState({ isLoading: true, platform });
      isLoading.value = true;

      // Initialize SDK if not ready
      if (!isReady.value) {
        await initializeSDK();
      }

      if (!window.google?.accounts) {
        throw createSDKError(platform, { reason: "Google SDK not ready" });
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
   * Login with Google using popup mode
   */
  const loginWithPopup = async (
    options: GoogleLoginOptions = {}
  ): Promise<SocialLoginResult> => {
    // Check if popup is supported before attempting
    if (!isPopupSupported()) {
      return handlePopupBlocked();
    }

    return new Promise((resolve, reject) => {
      if (!tokenClient) {
        const error = new Error("Token client not initialized");
        reject(error);
        return;
      }

      // Set up timeout for popup
      const timeout = setTimeout(() => {
        tokenClient.callback = originalCallback;
        const error = handleSocialError(
          { error: "timeout" },
          platform,
          SocialErrorCodes.TIMEOUT_ERROR
        );
        setLoginState({ isLoading: false, error, platform });
        isLoading.value = false;
        reject(error);
      }, TIMEOUTS.LOGIN_POPUP);

      // Store original callback
      const originalCallback = tokenClient.callback;

      // Track if callback was called to detect popup close
      let callbackCalled = false;

      // Set up our callback
      tokenClient.callback = async (response: GoogleTokenResponse) => {
        callbackCalled = true;
        // Restore original callback
        tokenClient.callback = originalCallback;
        clearTimeout(timeout);

        try {
          // Handle error response
          if (response.error) {
            let socialError: SocialError;

            // Map specific Google errors
            if (response.error === "popup_closed_by_user") {
              socialError = handleSocialError(
                response,
                platform,
                SocialErrorCodes.USER_CANCELLED
              );
            } else if (response.error === "access_denied") {
              socialError = handleSocialError(
                response,
                platform,
                SocialErrorCodes.AUTHORIZATION_FAILED
              );
            } else {
              socialError = handleSocialError(response, platform);
            }

            setLoginState({ isLoading: false, error: socialError, platform });
            isLoading.value = false;
            reject(socialError);
            return;
          }

          // Get user info with the access token
          const userInfo = await getUserInfo(response.access_token);

          const googleUser: GoogleUser = {
            id: userInfo.id,
            googleId: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            givenName: userInfo.given_name,
            familyName: userInfo.family_name,
            avatar: userInfo.picture,
            platform,
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
          };

          user.value = googleUser;
          setUser(googleUser);
          setLoginState({ isLoading: false, platform });
          isLoading.value = false;

          resolve({
            success: true,
            user: googleUser,
            platform,
          });
        } catch (error) {
          const socialError = handleSocialError(error, platform);
          setLoginState({ isLoading: false, error: socialError, platform });
          isLoading.value = false;
          reject(socialError);
        }
      };

      // Handle popup blocked or closed
      try {
        // Request access token with popup
        tokenClient.requestAccessToken({
          prompt: options.scopes ? "consent" : "",
          hint: options.scopes?.join(" ") || DEFAULT_SCOPES.google.join(" "),
        });

        // Set up a delayed check for popup close detection
        setTimeout(() => {
          if (!callbackCalled) {
            // Popup might have been closed without triggering callback
            clearTimeout(timeout);
            tokenClient.callback = originalCallback;

            const socialError = handleSocialError(
              { error: "popup_closed_by_user" },
              platform,
              SocialErrorCodes.USER_CANCELLED
            );
            setLoginState({ isLoading: false, error: socialError, platform });
            isLoading.value = false;
            reject(socialError);
          }
        }, 1000); // Check after 1 second
      } catch (error) {
        clearTimeout(timeout);
        tokenClient.callback = originalCallback;

        // Check if popup was blocked
        const socialError = handleSocialError(
          { error: "popup_blocked_by_browser" },
          platform,
          SocialErrorCodes.POPUP_BLOCKED
        );
        setLoginState({ isLoading: false, error: socialError, platform });
        isLoading.value = false;
        reject(socialError);
      }
    });
  };

  /**
   * Login with Google using redirect mode
   */
  const loginWithRedirect = async (
    options: GoogleLoginOptions = {}
  ): Promise<SocialLoginResult> => {
    try {
      const config = getPlatformConfig(platform);
      const clientId = (config as any).clientId;
      const redirectUri =
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
      };

      // Store in sessionStorage to persist across redirect
      sessionStorage.setItem("google_login_state", JSON.stringify(loginData));

      // Build OAuth URL
      const scopes = options.scopes || DEFAULT_SCOPES.google;
      const oauthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

      oauthUrl.searchParams.set("client_id", clientId);
      oauthUrl.searchParams.set("redirect_uri", redirectUri);
      oauthUrl.searchParams.set("response_type", "code");
      oauthUrl.searchParams.set("scope", scopes.join(" "));
      oauthUrl.searchParams.set("state", state);
      oauthUrl.searchParams.set("access_type", "offline");
      oauthUrl.searchParams.set("prompt", "consent");

      // Redirect to Google OAuth
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
   * Get user information using access token
   */
  const getUserInfo = async (accessToken: string): Promise<GoogleUserInfo> => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch user information: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to fetch user information from Google: ${error}`);
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
   * Exchange authorization code for access token
   */
  const exchangeCodeForToken = async (
    code: string,
    state: string
  ): Promise<GoogleTokenResponse> => {
    try {
      const config = getPlatformConfig(platform);
      const clientId = (config as any).clientId;
      const redirectUri =
        (config as unknown).redirectUri ||
        `${window.location.origin}/auth/callback`;

      // Note: In a real application, this should be done on the server side
      // for security reasons. This is a client-side implementation for demo purposes.
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
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
   * Handle redirect callback from Google OAuth
   */
  const handleRedirectCallback = async (): Promise<SocialLoginResult> => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const state = urlParams.get("state");
      const error = urlParams.get("error");

      // Check for error in callback
      if (error) {
        const socialError = handleSocialError(
          { error, error_description: urlParams.get("error_description") },
          platform,
          error === "access_denied"
            ? SocialErrorCodes.AUTHORIZATION_FAILED
            : undefined
        );

        // Clean up stored state
        sessionStorage.removeItem("google_login_state");

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
      const storedStateData = sessionStorage.getItem("google_login_state");
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
        sessionStorage.removeItem("google_login_state");

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
        sessionStorage.removeItem("google_login_state");

        return {
          success: false,
          error: socialError,
          platform,
        };
      }

      // Exchange authorization code for access token
      const tokenResponse = await exchangeCodeForToken(code, state);

      // Get user information
      const userInfo = await getUserInfo(tokenResponse.access_token);

      // Create user object
      const googleUser: GoogleUser = {
        id: userInfo.id,
        googleId: userInfo.id,
        email: userInfo.email,
        name: userInfo.name,
        givenName: userInfo.given_name,
        familyName: userInfo.family_name,
        avatar: userInfo.picture,
        platform,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
      };

      // Update state
      user.value = googleUser;
      setUser(googleUser);
      setLoginState({ isLoading: false, platform });

      // Clean up stored state
      sessionStorage.removeItem("google_login_state");

      // Clean up URL parameters
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      return {
        success: true,
        user: googleUser,
        platform,
      };
    } catch (error) {
      const socialError = handleSocialError(error, platform);

      // Clean up stored state
      sessionStorage.removeItem("google_login_state");

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
   * Logout from Google
   */
  const logout = async (): Promise<void> => {
    try {
      if (user.value?.accessToken && window.google?.accounts.oauth2) {
        // Revoke the access token
        window.google.accounts.oauth2.revoke(user.value.accessToken);
      }

      // Disable auto-select
      if (window.google?.accounts.id) {
        window.google.accounts.id.disableAutoSelect();
      }

      // Clear local state
      user.value = null;
      clearAuthState();
    } catch (error) {
      // Log error but don't throw - logout should always succeed locally
      console.warn("Error during Google logout:", error);
    }
  };

  /**
   * Check if current URL contains OAuth callback parameters
   */
  const isRedirectCallback = (): boolean => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasCode = urlParams.has("code");
    const hasState = urlParams.has("state");
    const storedState = sessionStorage.getItem("google_login_state");

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
              console.log("Google redirect login successful:", result.user);
            } else {
              console.error("Google redirect login failed:", result.error);
            }
          })
          .catch((error) => {
            console.error("Error handling Google redirect callback:", error);
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
          console.warn("Failed to initialize Google SDK:", error);
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
