# Social Login API Documentation

This document provides comprehensive API documentation for the social login system, including all composables, types, and configuration options.

## Table of Contents

1. [Core Composables](#core-composables)
2. [Platform-Specific Composables](#platform-specific-composables)
3. [Type Definitions](#type-definitions)
4. [Configuration](#configuration)
5. [Error Handling](#error-handling)
6. [Utilities](#utilities)

## Core Composables

### useSocial()

The main composable that provides a unified interface for all social login platforms.

#### Returns

```typescript
interface SocialComposable {
  // Authentication methods
  loginWithGoogle: (options?: GoogleLoginOptions) => Promise<SocialLoginResult>
  loginWithApple: (options?: AppleLoginOptions) => Promise<SocialLoginResult>
  loginWithLine: (options?: LineLoginOptions) => Promise<SocialLoginResult>
  loginWithTelegram: (options?: TelegramLoginOptions) => Promise<SocialLoginResult>
  login: (platform: SocialPlatform, options?: SocialLoginOptions) => Promise<SocialLoginResult>
  logout: (platform?: SocialPlatform) => Promise<void>
  
  // State management
  currentUser: ComputedRef<SocialUser | null>
  loginState: ComputedRef<LoginState>
  authenticatedPlatforms: ComputedRef<SocialPlatform[]>
  isAuthenticated: ComputedRef<boolean>
  currentPlatform: ComputedRef<SocialPlatform | null>
  
  // Platform utilities
  getAvailablePlatforms: () => SocialPlatform[]
  isPlatformReady: (platform: SocialPlatform) => boolean
  isPlatformLoading: (platform: SocialPlatform) => boolean
  isPlatformAuthenticated: (platform: SocialPlatform) => boolean
  getPlatformUser: (platform: SocialPlatform) => SocialUser | null
  getAllPlatformsStatus: () => Record<SocialPlatform, PlatformStatus>
  
  // Callback handling
  handleRedirectCallback: (platform?: SocialPlatform) => Promise<SocialLoginResult | null>
}
```

#### Example Usage

```typescript
const social = useSocial()

// Login with Google
const result = await social.loginWithGoogle({ popup: true })

// Check authentication status
if (social.isAuthenticated.value) {
  console.log('Current user:', social.currentUser.value)
}

// Logout from all platforms
await social.logout()
```

### useSocialState()

Manages global authentication state across all platforms.

#### Returns

```typescript
interface SocialStateComposable {
  currentUser: Ref<SocialUser | null>
  loginState: Ref<LoginState>
  authenticatedPlatforms: Ref<SocialPlatform[]>
  
  setCurrentUser: (user: SocialUser | null) => void
  setLoginState: (state: Partial<LoginState>) => void
  addAuthenticatedPlatform: (platform: SocialPlatform) => void
  removeAuthenticatedPlatform: (platform: SocialPlatform) => void
  clearAuthState: () => void
}
```

### useSocialConfig()

Handles configuration management and validation.

#### Returns

```typescript
interface SocialConfigComposable {
  getSocialConfig: () => SocialConfig
  getPlatformConfig: (platform: SocialPlatform) => PlatformConfig
  isPlatformEnabled: (platform: SocialPlatform) => boolean
  getEnabledPlatforms: () => SocialPlatform[]
  validateConfig: (platform: SocialPlatform) => void
  validateAllConfigs: () => ValidationResult
  getConfigStatus: () => ConfigStatus
}
```

## Platform-Specific Composables

### useGoogle()

Google OAuth authentication composable.

#### Returns

```typescript
interface GoogleComposable {
  login: (options?: GoogleLoginOptions) => Promise<SocialLoginResult>
  logout: () => Promise<void>
  isReady: ComputedRef<boolean>
  isLoading: ComputedRef<boolean>
  user: ComputedRef<GoogleUser | null>
  handleRedirectCallback: () => Promise<SocialLoginResult>
}
```

#### Options

```typescript
interface GoogleLoginOptions extends SocialLoginOptions {
  scopes?: string[]  // OAuth scopes to request
}
```

#### Example

```typescript
const google = useGoogle()

const result = await google.login({
  popup: true,
  scopes: ['profile', 'email', 'https://www.googleapis.com/auth/calendar.readonly']
})
```

### useApple()

Apple Sign-In authentication composable.

#### Returns

```typescript
interface AppleComposable {
  login: (options?: AppleLoginOptions) => Promise<SocialLoginResult>
  logout: () => Promise<void>
  isReady: ComputedRef<boolean>
  isLoading: ComputedRef<boolean>
  user: ComputedRef<AppleUser | null>
  handleRedirectCallback: () => Promise<SocialLoginResult>
}
```

#### Options

```typescript
interface AppleLoginOptions extends SocialLoginOptions {
  usePopup?: boolean  // Force popup mode
}
```

#### Example

```typescript
const apple = useApple()

const result = await apple.login({
  popup: true,
  usePopup: true
})
```

### useLine()

LINE Login authentication composable.

#### Returns

```typescript
interface LineComposable {
  login: (options?: LineLoginOptions) => Promise<SocialLoginResult>
  logout: () => Promise<void>
  isReady: ComputedRef<boolean>
  isLoading: ComputedRef<boolean>
  user: ComputedRef<LineUser | null>
  handleRedirectCallback: () => Promise<SocialLoginResult>
}
```

#### Options

```typescript
interface LineLoginOptions extends SocialLoginOptions {
  botPrompt?: 'normal' | 'aggressive'  // Bot friend request behavior
}
```

#### Example

```typescript
const line = useLine()

const result = await line.login({
  popup: true,
  botPrompt: 'aggressive'
})
```

### useTelegram()

Telegram Login Widget authentication composable.

#### Returns

```typescript
interface TelegramComposable {
  login: (options?: TelegramLoginOptions) => Promise<SocialLoginResult>
  logout: () => Promise<void>
  isReady: ComputedRef<boolean>
  isLoading: ComputedRef<boolean>
  user: ComputedRef<TelegramUser | null>
  handleRedirectCallback: () => Promise<SocialLoginResult>
}
```

#### Options

```typescript
interface TelegramLoginOptions extends SocialLoginOptions {
  size?: 'large' | 'medium' | 'small'  // Widget size
  cornerRadius?: number  // Widget corner radius in pixels
}
```

#### Example

```typescript
const telegram = useTelegram()

const result = await telegram.login({
  size: 'large',
  cornerRadius: 8
})
```

## Type Definitions

### Core Types

```typescript
type SocialPlatform = 'google' | 'apple' | 'line' | 'telegram'

interface SocialLoginOptions {
  popup?: boolean
  redirectUrl?: string
}

interface SocialLoginResult {
  success: boolean
  user?: SocialUser
  error?: SocialError
  platform: SocialPlatform
}

interface SocialUser {
  id: string
  email?: string
  name?: string
  avatar?: string
  platform: SocialPlatform
  accessToken: string
  refreshToken?: string
}

interface SocialError {
  code: string
  message: string
  platform: SocialPlatform
  details?: any
}

interface LoginState {
  isLoading: boolean
  platform?: SocialPlatform
  error?: SocialError
}
```

### Platform-Specific User Types

```typescript
interface GoogleUser extends SocialUser {
  googleId: string
  familyName?: string
  givenName?: string
}

interface AppleUser extends SocialUser {
  appleId: string
  identityToken: string
  authorizationCode: string
}

interface LineUser extends SocialUser {
  lineId: string
  displayName?: string
  pictureUrl?: string
  statusMessage?: string
}

interface TelegramUser extends SocialUser {
  telegramId: number
  username?: string
  firstName?: string
  lastName?: string
  photoUrl?: string
}
```

### Configuration Types

```typescript
interface SocialConfig {
  google: GoogleConfig
  apple: AppleConfig
  line: LineConfig
  telegram: TelegramConfig
}

interface GoogleConfig {
  clientId: string
  redirectUri?: string
}

interface AppleConfig {
  clientId: string
  redirectUri?: string
}

interface LineConfig {
  clientId: string
  redirectUri?: string
}

interface TelegramConfig {
  botToken: string
  botUsername: string
}
```

### Error Codes

```typescript
enum SocialErrorCodes {
  // Configuration errors
  MISSING_CLIENT_ID = 'MISSING_CLIENT_ID',
  INVALID_CONFIG = 'INVALID_CONFIG',
  
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // User interaction errors
  USER_CANCELLED = 'USER_CANCELLED',
  AUTHORIZATION_FAILED = 'AUTHORIZATION_FAILED',
  
  // Token errors
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // SDK errors
  SDK_LOAD_FAILED = 'SDK_LOAD_FAILED',
  SDK_NOT_READY = 'SDK_NOT_READY',
  
  // Popup errors
  POPUP_BLOCKED = 'POPUP_BLOCKED',
  POPUP_CLOSED = 'POPUP_CLOSED',
  
  // Generic errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}
```

## Configuration

### Environment Variables

```bash
# Required for each platform you want to use
GOOGLE_CLIENT_ID=your_google_client_id
APPLE_CLIENT_ID=your_apple_client_id
LINE_CLIENT_ID=your_line_client_id
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_BOT_USERNAME=your_telegram_bot_username

# Optional global settings
SOCIAL_LOGIN_REDIRECT_URI=http://localhost:3000/auth/callback
ENABLED_PLATFORMS=google,apple,line,telegram
```

### Nuxt Configuration

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    // Private (server-side only)
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    
    // Public (client-side accessible)
    public: {
      googleClientId: process.env.GOOGLE_CLIENT_ID || '',
      appleClientId: process.env.APPLE_CLIENT_ID || '',
      lineClientId: process.env.LINE_CLIENT_ID || '',
      telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME || '',
      socialLogin: {
        redirectUri: process.env.SOCIAL_LOGIN_REDIRECT_URI || 'http://localhost:3000/auth/callback',
        enabledPlatforms: process.env.ENABLED_PLATFORMS?.split(',') || ['google', 'apple', 'line', 'telegram']
      }
    }
  }
})
```

## Error Handling

### Error Recovery Strategies

```typescript
interface ErrorRecoveryStrategy {
  canRecover: (error: SocialError) => boolean
  recover: (error: SocialError) => Promise<boolean>
  description: string
}

// Built-in recovery strategies
const ERROR_RECOVERY_STRATEGIES = {
  popupFallback: {
    canRecover: (error) => error.code === 'POPUP_BLOCKED',
    recover: async (error) => {
      // Fallback to redirect mode
      return true
    },
    description: 'Fallback to redirect mode when popup is blocked'
  },
  
  sdkReload: {
    canRecover: (error) => error.code === 'SDK_LOAD_FAILED',
    recover: async (error) => {
      // Attempt to reload the SDK
      return true
    },
    description: 'Reload SDK when loading fails'
  },
  
  configRefresh: {
    canRecover: (error) => error.code === 'INVALID_CONFIG',
    recover: async (error) => {
      // Refresh configuration
      return true
    },
    description: 'Refresh configuration when invalid'
  }
}
```

### Retry Configuration

```typescript
interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  retryableErrors: string[]
}

const DEFAULT_RETRY_CONFIGS = {
  login: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryableErrors: ['NETWORK_ERROR', 'API_ERROR', 'TIMEOUT_ERROR']
  },
  
  sdk: {
    maxRetries: 2,
    baseDelay: 2000,
    maxDelay: 8000,
    backoffMultiplier: 2,
    retryableErrors: ['SDK_LOAD_FAILED']
  }
}
```

### Circuit Breaker

```typescript
interface CircuitBreakerConfig {
  failureThreshold: number
  resetTimeout: number
  monitoringPeriod: number
}

interface CircuitBreakerStatus {
  state: 'closed' | 'open' | 'half-open'
  failureCount: number
  lastFailureTime?: number
  nextAttemptTime?: number
}
```

## Utilities

### Token Management

```typescript
// Token validation
const validateToken = async (platform: SocialPlatform, token: string): Promise<boolean>

// Token refresh
const refreshToken = async (platform: SocialPlatform): Promise<string | null>

// Token storage
const storeToken = (platform: SocialPlatform, token: string, expiresIn: number): void
const getToken = (platform: SocialPlatform): string | null
const removeToken = (platform: SocialPlatform): void
```

### CSRF Protection

```typescript
// State parameter generation and validation
const generateState = (platform: SocialPlatform): string
const validateState = (state: string, platform: SocialPlatform): boolean
```

### Analytics Integration

```typescript
interface AnalyticsEvent {
  event: string
  platform: SocialPlatform
  success: boolean
  error?: string
  duration?: number
}

// Track login events
const trackLogin = (platform: SocialPlatform, success: boolean, error?: string): void
const trackLogout = (platform: SocialPlatform): void
const trackError = (platform: SocialPlatform, error: SocialError): void
```

## Best Practices

### 1. Error Handling

Always handle errors gracefully and provide fallback options:

```typescript
try {
  const result = await social.loginWithGoogle({ popup: true })
  
  if (!result.success && result.error?.code === 'POPUP_BLOCKED') {
    // Fallback to redirect mode
    await social.loginWithGoogle({ popup: false })
  }
} catch (error) {
  console.error('Login failed:', error)
}
```

### 2. Loading States

Show appropriate loading indicators during authentication:

```typescript
const isLoading = computed(() => social.loginState.value.isLoading)

// In template
<button :disabled="isLoading">
  {{ isLoading ? 'Signing in...' : 'Sign in with Google' }}
</button>
```

### 3. Platform Availability

Check if platforms are ready before attempting login:

```typescript
const availablePlatforms = social.getAvailablePlatforms()

// Only show buttons for available platforms
<button 
  v-for="platform in availablePlatforms" 
  :key="platform"
  @click="login(platform)"
>
  Login with {{ platform }}
</button>
```

### 4. Security

- Always validate tokens on the server side
- Use HTTPS in production
- Implement proper CSRF protection
- Store tokens securely
- Implement token refresh logic

### 5. Performance

- Preload SDKs for better user experience
- Use lazy loading for less common platforms
- Implement proper caching strategies
- Monitor and optimize bundle sizes

### 6. User Experience

- Provide clear error messages
- Implement fallback authentication methods
- Show loading states and progress indicators
- Remember user preferences
- Support both popup and redirect modes