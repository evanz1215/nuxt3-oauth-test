import type { SocialPlatform } from "../types";

/**
 * Supported social platforms
 */
export const SUPPORTED_PLATFORMS: readonly SocialPlatform[] = [
  "google",
  "apple",
  "line",
  "telegram",
] as const;

/**
 * Default scopes for each platform
 */
export const DEFAULT_SCOPES = {
  google: ["profile", "email"],
  apple: ["name", "email"],
  line: ["profile", "openid", "email"],
  telegram: [], // Telegram doesn't use scopes
} as const;

/**
 * SDK URLs for dynamic loading
 */
export const SDK_URLS = {
  google: "https://accounts.google.com/gsi/client",
  apple:
    "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js",
  line: "https://static.line-scdn.net/liff/edge/2/sdk.js",
  telegram: "https://telegram.org/js/telegram-widget.js",
} as const;

/**
 * Default popup dimensions
 */
export const POPUP_DIMENSIONS = {
  width: 500,
  height: 600,
  left: 0, // Will be calculated to center
  top: 0, // Will be calculated to center
} as const;

/**
 * Timeout values in milliseconds
 */
export const TIMEOUTS = {
  SDK_LOAD: 10000, // 10 seconds to load SDK
  LOGIN_POPUP: 300000, // 5 minutes for user to complete login
  API_REQUEST: 30000, // 30 seconds for API requests
} as const;

/**
 * Storage keys for persisting data
 */
export const STORAGE_KEYS = {
  USER: "social_login_user",
  PLATFORM: "social_login_platform",
  ACCESS_TOKEN: "social_login_access_token",
  REFRESH_TOKEN: "social_login_refresh_token",
} as const;
