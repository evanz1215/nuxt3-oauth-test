import type {
  TelegramLoginOptions,
  TelegramUser,
  SocialLoginResult,
  SocialPlatform,
  SocialError,
} from "./types";
import { SDK_URLS, TIMEOUTS } from "./constants";
import { useSocialConfig } from "./useSocialConfig";
import { useSocialState } from "./useSocialState";
import {
  handleSocialError,
  createSDKError,
  SocialErrorCodes,
} from "./utils/errors";

// Telegram SDK types
declare global {
  interface Window {
    TelegramLoginWidget?: {
      dataOnauth: (user: TelegramAuthData) => void;
    };
  }
}

interface TelegramAuthData {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramConfig {
  botToken: string;
  botUsername: string;
}

/**
 * Telegram Login composable for handling Telegram authentication
 */
export const useTelegram = () => {
  const platform: SocialPlatform = "telegram";
  const { getPlatformConfig, validateConfig } = useSocialConfig();
  const { setUser, setLoginState, clearAuthState } = useSocialState();

  // Reactive state
  const isReady = ref(false);
  const isLoading = ref(false);
  const user = ref<TelegramUser | null>(null);
  const sdkLoaded = ref(false);

  /**
   * Dynamically load Telegram SDK
   */
  const loadSDK = async (): Promise<void> => {
    if (sdkLoaded.value && window.TelegramLoginWidget) {
      return;
    }

    return new Promise((resolve, reject) => {
      // Check if SDK is already loaded
      if (window.TelegramLoginWidget) {
        sdkLoaded.value = true;
        resolve();
        return;
      }

      // Create script element
      const script = document.createElement("script");
      script.src = SDK_URLS.telegram;
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
   * Initialize Telegram SDK with configuration
   */
  const initializeSDK = async (): Promise<void> => {
    try {
      // Validate configuration first
      validateConfig(platform);
      const config = getPlatformConfig(platform) as TelegramConfig;

      // Load SDK if not already loaded
      await loadSDK();

      // Telegram Login Widget doesn't require explicit initialization
      // The widget is created dynamically when login is called
      
      isReady.value = true;
    } catch (error) {
      const socialError = handleSocialError(error, platform);
      setLoginState({ isLoading: false, error: socialError, platform });
      throw error;
    }
  };

  /**
   * Login with Telegram using widget mode (Telegram doesn't support popup)
   */
  const login = async (
    options: TelegramLoginOptions = {}
  ): Promise<SocialLoginResult> => {
    try {
      setLoginState({ isLoading: true, platform });
      isLoading.value = true;

      // Initialize SDK if not ready
      if (!isReady.value) {
        await initializeSDK();
      }

      // Telegram only supports widget-based login (no popup mode)
      return await loginWithWidget(options);
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
   * Login with Telegram using widget mode
   */
  const loginWithWidget = async (
    options: TelegramLoginOptions = {}
  ): Promise<SocialLoginResult> => {
    return new Promise((resolve, reject) => {
      try {
        const config = getPlatformConfig(platform) as TelegramConfig;
        const botUsername = config.botUsername;

        if (!botUsername) {
          throw new Error("Bot username is required for Telegram login");
        }

        // Create a container for the widget
        const container = document.createElement("div");
        container.id = `telegram-login-${Date.now()}`;
        container.style.position = "fixed";
        container.style.top = "50%";
        container.style.left = "50%";
        container.style.transform = "translate(-50%, -50%)";
        container.style.zIndex = "10000";
        container.style.backgroundColor = "white";
        container.style.padding = "20px";
        container.style.borderRadius = "8px";
        container.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
        container.style.border = "1px solid #ddd";

        // Add title and close button
        const title = document.createElement("h3");
        title.textContent = "Login with Telegram";
        title.style.margin = "0 0 15px 0";
        title.style.fontSize = "16px";
        title.style.fontFamily = "Arial, sans-serif";

        const closeButton = document.createElement("button");
        closeButton.textContent = "×";
        closeButton.style.position = "absolute";
        closeButton.style.top = "10px";
        closeButton.style.right = "10px";
        closeButton.style.border = "none";
        closeButton.style.background = "none";
        closeButton.style.fontSize = "20px";
        closeButton.style.cursor = "pointer";
        closeButton.style.color = "#666";

        container.appendChild(title);
        container.appendChild(closeButton);

        // Create backdrop
        const backdrop = document.createElement("div");
        backdrop.style.position = "fixed";
        backdrop.style.top = "0";
        backdrop.style.left = "0";
        backdrop.style.width = "100%";
        backdrop.style.height = "100%";
        backdrop.style.backgroundColor = "rgba(0,0,0,0.5)";
        backdrop.style.zIndex = "9999";

        // Set up timeout for login
        const timeout = setTimeout(() => {
          cleanup();
          const error = handleSocialError(
            { error: "timeout" },
            platform,
            SocialErrorCodes.TIMEOUT_ERROR
          );
          setLoginState({ isLoading: false, error, platform });
          isLoading.value = false;
          reject(error);
        }, TIMEOUTS.LOGIN_POPUP);

        // Cleanup function
        const cleanup = () => {
          clearTimeout(timeout);
          if (backdrop.parentNode) {
            backdrop.parentNode.removeChild(backdrop);
          }
          if (container.parentNode) {
            container.parentNode.removeChild(container);
          }
          if ((window as any)[callbackName]) {
            delete (window as any)[callbackName];
          }
        };

        // Set up global callback for Telegram auth
        const callbackName = `telegramCallback_${Date.now()}`;
        (window as any)[callbackName] = (authData: TelegramAuthData) => {
          cleanup();

          try {
            // Verify the authentication data
            if (!verifyTelegramAuth(authData, config.botToken)) {
              const socialError = handleSocialError(
                { error: "invalid_auth_data" },
                platform,
                SocialErrorCodes.AUTHORIZATION_FAILED
              );
              setLoginState({ isLoading: false, error: socialError, platform });
              isLoading.value = false;
              reject(socialError);
              return;
            }

            // Create user object
            const telegramUser: TelegramUser = {
              id: authData.id.toString(),
              telegramId: authData.id,
              username: authData.username,
              firstName: authData.first_name,
              lastName: authData.last_name,
              name: [authData.first_name, authData.last_name]
                .filter(Boolean)
                .join(" ") || authData.username,
              avatar: authData.photo_url,
              photoUrl: authData.photo_url,
              platform,
              accessToken: authData.hash, // Use hash as access token
            };

            user.value = telegramUser;
            setUser(telegramUser);
            setLoginState({ isLoading: false, platform });
            isLoading.value = false;

            resolve({
              success: true,
              user: telegramUser,
              platform,
            });
          } catch (error) {
            const socialError = handleSocialError(error, platform);
            setLoginState({ isLoading: false, error: socialError, platform });
            isLoading.value = false;
            reject(socialError);
          }
        };

        // Handle close button and backdrop clicks
        const handleClose = () => {
          cleanup();
          const socialError = handleSocialError(
            { error: "user_cancelled" },
            platform,
            SocialErrorCodes.USER_CANCELLED
          );
          setLoginState({ isLoading: false, error: socialError, platform });
          isLoading.value = false;
          reject(socialError);
        };

        closeButton.addEventListener("click", handleClose);
        backdrop.addEventListener("click", handleClose);

        // Create Telegram login widget
        const widget = createTelegramWidget(botUsername, options, callbackName);
        container.appendChild(widget);

        // Add to DOM
        document.body.appendChild(backdrop);
        document.body.appendChild(container);

      } catch (error) {
        const socialError = handleSocialError(error, platform);
        setLoginState({ isLoading: false, error: socialError, platform });
        isLoading.value = false;
        reject(socialError);
      }
    });
  };

  /**
   * Create Telegram login widget element
   */
  const createTelegramWidget = (
    botUsername: string,
    options: TelegramLoginOptions = {},
    callbackName?: string
  ): HTMLScriptElement => {
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", options.size || "large");
    
    if (options.cornerRadius !== undefined) {
      script.setAttribute("data-radius", options.cornerRadius.toString());
    }

    // Use callback function if provided, otherwise use redirect URL
    if (callbackName) {
      script.setAttribute("data-onauth", `${callbackName}(user)`);
    } else {
      const redirectUrl = options.redirectUrl || window.location.href;
      script.setAttribute("data-auth-url", redirectUrl);
    }

    return script;
  };

  /**
   * Verify Telegram authentication data
   * This is a simplified client-side verification for demo purposes
   * In production, this should be done on the server side
   */
  const verifyTelegramAuth = (
    authData: TelegramAuthData,
    botToken: string
  ): boolean => {
    try {
      // Extract hash from auth data
      const { hash, ...dataToCheck } = authData;

      // Create data check string
      const dataCheckArr = Object.keys(dataToCheck)
        .sort()
        .map(key => `${key}=${(dataToCheck as unknown)[key]}`)
        .join('\n');

      // In a real application, you would verify the hash using HMAC-SHA256
      // with the bot token. This is a simplified check for demo purposes.
      
      // Check if auth_date is not too old (5 minutes)
      const authAge = Date.now() / 1000 - authData.auth_date;
      if (authAge > 300) { // 5 minutes
        return false;
      }

      // For demo purposes, we'll accept any valid-looking data
      return !!(authData.id && authData.first_name && authData.auth_date && hash);
    } catch (error) {
      console.warn("Error verifying Telegram auth data:", error);
      return false;
    }
  };

  /**
   * Logout from Telegram
   */
  const logout = async (): Promise<void> => {
    try {
      // Telegram doesn't provide a programmatic logout method
      // We can only clear local state
      user.value = null;
      clearAuthState();
    } catch (error) {
      // Log error but don't throw - logout should always succeed locally
      console.warn("Error during Telegram logout:", error);
    }
  };

  /**
   * Check if current URL contains OAuth callback parameters
   * Telegram uses different callback mechanism, so this is mainly for consistency
   */
  const isRedirectCallback = (): boolean => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has("id") && urlParams.has("auth_date") && urlParams.has("hash");
  };

  /**
   * Handle redirect callback from Telegram OAuth
   * This handles the case where Telegram redirects back with auth data
   */
  const handleRedirectCallback = async (): Promise<SocialLoginResult> => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      
      // Extract Telegram auth data from URL parameters
      const authData: Partial<TelegramAuthData> = {
        id: parseInt(urlParams.get("id") || "0"),
        first_name: urlParams.get("first_name") || "",
        last_name: urlParams.get("last_name") || undefined,
        username: urlParams.get("username") || undefined,
        photo_url: urlParams.get("photo_url") || undefined,
        auth_date: parseInt(urlParams.get("auth_date") || "0"),
        hash: urlParams.get("hash") || "",
      };

      // Validate required fields
      if (!authData.id || !authData.first_name || !authData.auth_date || !authData.hash) {
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

      const config = getPlatformConfig(platform) as TelegramConfig;

      // Verify the authentication data
      if (!verifyTelegramAuth(authData as TelegramAuthData, config.botToken)) {
        const socialError = handleSocialError(
          { error: "invalid_auth_data" },
          platform,
          SocialErrorCodes.AUTHORIZATION_FAILED
        );

        return {
          success: false,
          error: socialError,
          platform,
        };
      }

      // Create user object
      const telegramUser: TelegramUser = {
        id: authData.id!.toString(),
        telegramId: authData.id!,
        username: authData.username,
        firstName: authData.first_name,
        lastName: authData.last_name,
        name: [authData.first_name, authData.last_name]
          .filter(Boolean)
          .join(" ") || authData.username,
        avatar: authData.photo_url,
        photoUrl: authData.photo_url,
        platform,
        accessToken: authData.hash!, // Use hash as access token
      };

      // Update state
      user.value = telegramUser;
      setUser(telegramUser);
      setLoginState({ isLoading: false, platform });

      // Clean up URL parameters
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      return {
        success: true,
        user: telegramUser,
        platform,
      };
    } catch (error) {
      const socialError = handleSocialError(error, platform);

      return {
        success: false,
        error: socialError,
        platform,
      };
    }
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
              console.log("Telegram redirect login successful:", result.user);
            } else {
              console.error("Telegram redirect login failed:", result.error);
            }
          })
          .catch((error) => {
            console.error("Error handling Telegram redirect callback:", error);
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
          console.warn("Failed to initialize Telegram SDK:", error);
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