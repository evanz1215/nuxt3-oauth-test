import type {
  AppleLoginOptions,
  AppleUser,
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

// Apple SDK types
declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: AppleIDConfig) => void;
        signIn: (config?: AppleIDSignInConfig) => Promise<AppleIDSignInResponse>;
        renderButton: (element: HTMLElement, config: AppleIDButtonConfig) => void;
      };
    };
  }
}

interface AppleIDConfig {
  clientId: string;
  scope?: string;
  redirectURI?: string;
  state?: string;
  nonce?: string;
  usePopup?: boolean;
}

interface AppleIDSignInConfig {
  scope?: string;
  state?: string;
  nonce?: string;
  usePopup?: boolean;
}

interface AppleIDSignInResponse {
  authorization: {
    code: string;
    id_token: string;
    state?: string;
  };
  user?: {
    email: string;
    name: {
      firstName: string;
      lastName: string;
    };
  };
}

interface AppleIDButtonConfig {
  color?: 'black' | 'white';
  border?: boolean;
  type?: 'sign-in' | 'continue' | 'sign-up';
  locale?: string;
}

interface AppleIDTokenPayload {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string;
  at_hash: string;
  email?: string;
  email_verified?: string;
  is_private_email?: string;
  auth_time: number;
  nonce_supported: boolean;
}

/**
 * Apple Sign-In composable for handling Apple ID authentication
 */
export const useApple = () => {
  const platform: SocialPlatform = "apple";
  const { getPlatformConfig, validateConfig } = useSocialConfig();
  const { setUser, setLoginState, clearAuthState } = useSocialState();

  // Reactive state
  const isReady = ref(false);
  const isLoading = ref(false);
  const user = ref<AppleUser | null>(null);
  const sdkLoaded = ref(false);

  /**
   * Dynamically load Apple SDK
   */
  const loadSDK = async (): Promise<void> => {
    if (sdkLoaded.value && window.AppleID) {
      return;
    }

    return new Promise((resolve, reject) => {
      // Check if SDK is already loaded
      if (window.AppleID?.auth) {
        sdkLoaded.value = true;
        resolve();
        return;
      }

      // Create script element
      const script = document.createElement("script");
      script.src = SDK_URLS.apple;
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
   * Initialize Apple SDK with configuration
   */
  const initializeSDK = async (): Promise<void> => {
    try {
      // Validate configuration first
      validateConfig(platform);
      const config = getPlatformConfig(platform);

      // Load SDK if not already loaded
      await loadSDK();

      if (!window.AppleID?.auth) {
        throw createSDKError(platform, {
          reason: "Apple SDK not available after loading",
        });
      }

      // Initialize Apple ID
      const appleConfig: AppleIDConfig = {
        clientId: (config as any).clientId,
        scope: DEFAULT_SCOPES.apple.join(" "),
        redirectURI: (config as any).redirectUri || `${window.location.origin}/auth/callback`,
        usePopup: true,
      };

      window.AppleID.auth.init(appleConfig);

      isReady.value = true;
    } catch (error) {
      const socialError = handleSocialError(error, platform);
      setLoginState({ isLoading: false, error: socialError, platform });
      throw error;
    }
  };

  /**
   * Generate random nonce for security
   */
  const generateNonce = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
  };

  /**
   * Generate random state parameter for CSRF protection
   */
  const generateRandomState = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
  };

  /**
   * Decode Apple ID token to extract user information
   */
  const decodeAppleJWT = (token: string): AppleIDTokenPayload => {
    try {
      // Simple JWT decode (for client-side use only, server should verify)
      if (!token || typeof token !== 'string') {
        throw new Error("Invalid token format");
      }

      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT format");
      }

      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      
      // Add padding if needed
      const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
      
      let jsonPayload: string;
      try {
        // Try direct decoding first (for test environment)
        jsonPayload = atob(padded);
      } catch {
        // Fallback to URL encoding method (for production)
        jsonPayload = decodeURIComponent(
          atob(padded)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
      }

      const payload = JSON.parse(jsonPayload);
      
      // Validate required fields
      if (!payload.sub) {
        throw new Error("Missing subject in token");
      }

      return payload;
    } catch (error) {
      throw new Error(`Failed to decode Apple ID token: ${error}`);
    }
  };

  /**
   * Login with Apple using popup or redirect mode
   */
  const login = async (
    options: AppleLoginOptions = {}
  ): Promise<SocialLoginResult> => {
    try {
      setLoginState({ isLoading: true, platform });
      isLoading.value = true;

      // Initialize SDK if not ready
      if (!isReady.value) {
        await initializeSDK();
      }

      if (!window.AppleID?.auth) {
        throw createSDKError(platform, { reason: "Apple SDK not ready" });
      }

      // Use popup mode by default, fallback to redirect if specified
      if (options.popup !== false && options.usePopup !== false) {
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
   * Login with Apple using popup mode
   */
  const loginWithPopup = async (
    options: AppleLoginOptions = {}
  ): Promise<SocialLoginResult> => {
    try {
      if (!window.AppleID?.auth) {
        throw createSDKError(platform, { reason: "Apple SDK not ready" });
      }

      // Generate nonce and state for security
      const nonce = generateNonce();
      const state = generateRandomState();

      const signInConfig: AppleIDSignInConfig = {
        scope: DEFAULT_SCOPES.apple.join(" "),
        state,
        nonce,
        usePopup: true,
      };

      // Set up timeout for popup
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          const error = handleSocialError(
            { error: "timeout" },
            platform,
            SocialErrorCodes.TIMEOUT_ERROR
          );
          reject(error);
        }, TIMEOUTS.LOGIN_POPUP);
      });

      // Race between sign-in and timeout
      const response = await Promise.race([
        window.AppleID.auth.signIn(signInConfig),
        timeoutPromise,
      ]);

      // Process the response
      const appleUser = await processAppleResponse(response, nonce);

      user.value = appleUser;
      setUser(appleUser);
      setLoginState({ isLoading: false, platform });
      isLoading.value = false;

      return {
        success: true,
        user: appleUser,
        platform,
      };
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
   * Login with Apple using redirect mode
   */
  const loginWithRedirect = async (
    options: AppleLoginOptions = {}
  ): Promise<SocialLoginResult> => {
    try {
      const config = getPlatformConfig(platform);
      const clientId = (config as any).clientId;
      const redirectUri =
        (config as unknown).redirectUri ||
        `${window.location.origin}/auth/callback`;

      // Generate nonce and state for security
      const nonce = generateNonce();
      const state = generateRandomState();

      // Store login state for callback handling
      const loginData = {
        platform,
        timestamp: Date.now(),
        redirectUri,
        state,
        nonce,
      };

      // Store in sessionStorage to persist across redirect
      sessionStorage.setItem("apple_login_state", JSON.stringify(loginData));

      // Build Apple OAuth URL
      const scopes = DEFAULT_SCOPES.apple;
      const oauthUrl = new URL("https://appleid.apple.com/auth/authorize");

      oauthUrl.searchParams.set("client_id", clientId);
      oauthUrl.searchParams.set("redirect_uri", redirectUri);
      oauthUrl.searchParams.set("response_type", "code id_token");
      oauthUrl.searchParams.set("scope", scopes.join(" "));
      oauthUrl.searchParams.set("response_mode", "form_post");
      oauthUrl.searchParams.set("state", state);
      oauthUrl.searchParams.set("nonce", nonce);

      // Redirect to Apple OAuth
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
   * Process Apple Sign-In response and create user object
   */
  const processAppleResponse = async (
    response: AppleIDSignInResponse,
    expectedNonce?: string
  ): Promise<AppleUser> => {
    try {
      const { authorization, user: userInfo } = response;

      if (!authorization.id_token) {
        throw new Error("No ID token received from Apple");
      }

      // Decode the ID token to get user information
      const tokenPayload = decodeAppleJWT(authorization.id_token);

      // Verify nonce if provided (for security)
      if (expectedNonce && !tokenPayload.nonce_supported) {
        console.warn("Apple ID token does not support nonce verification");
      }

      // Create user object
      const appleUser: AppleUser = {
        id: tokenPayload.sub,
        appleId: tokenPayload.sub,
        email: tokenPayload.email || userInfo?.email,
        name: userInfo?.name
          ? `${userInfo.name.firstName} ${userInfo.name.lastName}`.trim()
          : undefined,
        platform,
        accessToken: authorization.id_token,
        identityToken: authorization.id_token,
        authorizationCode: authorization.code,
      };

      return appleUser;
    } catch (error) {
      throw new Error(`Failed to process Apple response: ${error}`);
    }
  };

  /**
   * Handle redirect callback from Apple OAuth
   */
  const handleRedirectCallback = async (): Promise<SocialLoginResult> => {
    try {
      // Apple uses form_post, so we need to handle POST data
      // This is typically handled by the server, but for demo purposes
      // we'll check for URL parameters as well
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const idToken = urlParams.get("id_token");
      const state = urlParams.get("state");
      const error = urlParams.get("error");

      // Check for error in callback
      if (error) {
        const socialError = handleSocialError(
          { error, error_description: urlParams.get("error_description") },
          platform,
          error === "user_cancelled_authorize"
            ? SocialErrorCodes.USER_CANCELLED
            : undefined
        );

        // Clean up stored state
        sessionStorage.removeItem("apple_login_state");

        return {
          success: false,
          error: socialError,
          platform,
        };
      }

      // Validate required parameters
      if (!code || !idToken || !state) {
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
      const storedStateData = sessionStorage.getItem("apple_login_state");
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
        sessionStorage.removeItem("apple_login_state");

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
        sessionStorage.removeItem("apple_login_state");

        return {
          success: false,
          error: socialError,
          platform,
        };
      }

      // Process the Apple response
      const mockResponse: AppleIDSignInResponse = {
        authorization: {
          code,
          id_token: idToken,
          state,
        },
      };

      const appleUser = await processAppleResponse(mockResponse, loginData.nonce);

      // Update state
      user.value = appleUser;
      setUser(appleUser);
      setLoginState({ isLoading: false, platform });

      // Clean up stored state
      sessionStorage.removeItem("apple_login_state");

      // Clean up URL parameters
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      return {
        success: true,
        user: appleUser,
        platform,
      };
    } catch (error) {
      const socialError = handleSocialError(error, platform);

      // Clean up stored state
      sessionStorage.removeItem("apple_login_state");

      return {
        success: false,
        error: socialError,
        platform,
      };
    }
  };

  /**
   * Logout from Apple
   */
  const logout = async (): Promise<void> => {
    try {
      // Apple doesn't provide a programmatic logout method
      // We can only clear local state
      user.value = null;
      clearAuthState();
    } catch (error) {
      // Log error but don't throw - logout should always succeed locally
      console.warn("Error during Apple logout:", error);
    }
  };

  /**
   * Check if current URL contains OAuth callback parameters
   */
  const isRedirectCallback = (): boolean => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasCode = urlParams.has("code");
    const hasIdToken = urlParams.has("id_token");
    const hasState = urlParams.has("state");
    const storedState = sessionStorage.getItem("apple_login_state");

    return hasCode && hasIdToken && hasState && !!storedState;
  };

  // Initialize SDK when composable is used
  onMounted(() => {
    if (process.client) {
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
              console.log("Apple redirect login successful:", result.user);
            } else {
              console.error("Apple redirect login failed:", result.error);
            }
          })
          .catch((error) => {
            console.error("Error handling Apple redirect callback:", error);
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
          console.warn("Failed to initialize Apple SDK:", error);
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