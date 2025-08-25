# Multi-Platform Integration Usage Examples

This document demonstrates advanced usage patterns for integrating multiple social login platforms in a single application.

## Complete Multi-Platform Login Component

```vue
<template>
  <div class="multi-platform-login">
    <div class="login-container">
      <h2>Sign in to Your Account</h2>
      
      <!-- Platform Selection -->
      <div v-if="!isAuthenticated" class="platform-grid">
        <button
          v-for="platform in enabledPlatforms"
          :key="platform"
          @click="initiateLogin(platform)"
          :disabled="isLoading || !isPlatformReady(platform)"
          :class="`platform-btn ${platform}-btn`"
        >
          <div class="btn-content">
            <div :class="`platform-icon ${platform}-icon`"></div>
            <span v-if="isLoading && currentLoginPlatform === platform">
              Signing in...
            </span>
            <span v-else-if="!isPlatformReady(platform)">
              Loading {{ platform }}...
            </span>
            <span v-else>
              Continue with {{ platformNames[platform] }}
            </span>
          </div>
        </button>
      </div>
      
      <!-- User Profile Display -->
      <div v-if="isAuthenticated" class="user-profile">
        <div class="profile-header">
          <img 
            v-if="currentUser?.avatar" 
            :src="currentUser.avatar" 
            :alt="currentUser.name"
            class="profile-avatar"
          />
          <div class="profile-info">
            <h3>{{ currentUser?.name || 'User' }}</h3>
            <p class="platform-badge">
              Signed in with {{ platformNames[currentUser?.platform] }}
            </p>
            <p v-if="currentUser?.email" class="user-email">
              {{ currentUser.email }}
            </p>
          </div>
        </div>
        
        <div class="profile-actions">
          <button @click="showProfile = !showProfile" class="toggle-btn">
            {{ showProfile ? 'Hide' : 'Show' }} Profile Details
          </button>
          <button @click="handleLogout" class="logout-btn">
            Sign Out
          </button>
        </div>
        
        <!-- Detailed Profile Information -->
        <div v-if="showProfile" class="profile-details">
          <h4>Profile Information</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Platform:</label>
              <span>{{ platformNames[currentUser?.platform] }}</span>
            </div>
            <div class="detail-item">
              <label>User ID:</label>
              <span>{{ getPlatformUserId(currentUser) }}</span>
            </div>
            <div class="detail-item" v-if="currentUser?.email">
              <label>Email:</label>
              <span>{{ currentUser.email }}</span>
            </div>
            <div class="detail-item" v-if="currentUser?.accessToken">
              <label>Access Token:</label>
              <span class="token-preview">{{ tokenPreview }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Error Display -->
      <div v-if="loginError" class="error-display">
        <div class="error-header">
          <h4>Sign In Failed</h4>
          <button @click="clearError" class="close-btn">×</button>
        </div>
        <div class="error-content">
          <p><strong>Platform:</strong> {{ platformNames[loginError.platform] }}</p>
          <p><strong>Error:</strong> {{ loginError.message }}</p>
          <div v-if="loginError.code === 'POPUP_BLOCKED'" class="error-suggestion">
            <p>💡 <strong>Suggestion:</strong> Your browser blocked the popup. Try:</p>
            <ul>
              <li>Allow popups for this site</li>
              <li>Or use redirect mode instead</li>
            </ul>
            <button @click="retryWithRedirect(loginError.platform)" class="retry-btn">
              Try Redirect Mode
            </button>
          </div>
          <div v-else-if="loginError.code === 'USER_CANCELLED'" class="error-suggestion">
            <p>You cancelled the sign-in process. You can try again anytime.</p>
          </div>
          <div v-else class="error-suggestion">
            <button @click="retryLogin(loginError.platform)" class="retry-btn">
              Try Again
            </button>
          </div>
        </div>
      </div>
      
      <!-- Loading Overlay -->
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-content">
          <div class="spinner"></div>
          <p>Signing in with {{ platformNames[currentLoginPlatform] }}...</p>
          <p class="loading-tip">This may take a few seconds</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useSocial } from '~/composables/useSocial'
import { useGoogle } from '~/composables/useGoogle'
import { useApple } from '~/composables/useApple'
import { useLine } from '~/composables/useLine'
import { useTelegram } from '~/composables/useTelegram'

// Composables
const social = useSocial()
const google = useGoogle()
const apple = useApple()
const line = useLine()
const telegram = useTelegram()

// Reactive state
const showProfile = ref(false)
const currentLoginPlatform = ref(null)
const loginError = ref(null)

// Platform configuration
const platformNames = {
  google: 'Google',
  apple: 'Apple',
  line: 'LINE',
  telegram: 'Telegram'
}

// Computed properties
const isAuthenticated = computed(() => social.isAuthenticated.value)
const currentUser = computed(() => social.currentUser.value)
const isLoading = computed(() => social.loginState.value.isLoading)

const enabledPlatforms = computed(() => {
  return ['google', 'apple', 'line', 'telegram'].filter(platform => 
    isPlatformReady(platform)
  )
})

const tokenPreview = computed(() => {
  const token = currentUser.value?.accessToken
  return token ? `${token.substring(0, 20)}...` : 'N/A'
})

// Methods
const isPlatformReady = (platform) => {
  switch (platform) {
    case 'google': return google.isReady.value
    case 'apple': return apple.isReady.value
    case 'line': return line.isReady.value
    case 'telegram': return telegram.isReady.value
    default: return false
  }
}

const getPlatformUserId = (user) => {
  if (!user) return 'N/A'
  
  switch (user.platform) {
    case 'google': return user.googleId
    case 'apple': return user.appleId
    case 'line': return user.lineId
    case 'telegram': return user.telegramId
    default: return user.id
  }
}

const initiateLogin = async (platform) => {
  currentLoginPlatform.value = platform
  loginError.value = null
  
  try {
    let result
    
    // Use platform-specific options
    const options = getLoginOptions(platform)
    
    switch (platform) {
      case 'google':
        result = await social.loginWithGoogle(options)
        break
      case 'apple':
        result = await social.loginWithApple(options)
        break
      case 'line':
        result = await social.loginWithLine(options)
        break
      case 'telegram':
        result = await social.loginWithTelegram(options)
        break
    }
    
    if (result?.success) {
      console.log(`${platform} login successful:`, result.user)
      // Optional: Track login analytics
      trackLoginSuccess(platform)
    } else if (result?.error) {
      loginError.value = result.error
      trackLoginError(platform, result.error)
    }
  } catch (error) {
    loginError.value = {
      platform,
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred'
    }
    trackLoginError(platform, error)
  } finally {
    currentLoginPlatform.value = null
  }
}

const getLoginOptions = (platform) => {
  const baseOptions = {
    popup: true // Default to popup mode
  }
  
  switch (platform) {
    case 'google':
      return {
        ...baseOptions,
        scopes: ['profile', 'email']
      }
    case 'apple':
      return {
        ...baseOptions,
        usePopup: true
      }
    case 'line':
      return {
        ...baseOptions,
        botPrompt: 'normal'
      }
    case 'telegram':
      return {
        ...baseOptions,
        size: 'large',
        cornerRadius: 8
      }
    default:
      return baseOptions
  }
}

const retryWithRedirect = async (platform) => {
  loginError.value = null
  
  try {
    const options = {
      ...getLoginOptions(platform),
      popup: false,
      redirectUrl: `${window.location.origin}/auth/callback`
    }
    
    switch (platform) {
      case 'google':
        await social.loginWithGoogle(options)
        break
      case 'apple':
        await social.loginWithApple(options)
        break
      case 'line':
        await social.loginWithLine(options)
        break
      case 'telegram':
        await social.loginWithTelegram(options)
        break
    }
  } catch (error) {
    loginError.value = {
      platform,
      code: 'REDIRECT_FAILED',
      message: 'Redirect mode also failed. Please try again later.'
    }
  }
}

const retryLogin = (platform) => {
  initiateLogin(platform)
}

const clearError = () => {
  loginError.value = null
}

const handleLogout = async () => {
  try {
    await social.logout()
    showProfile.value = false
    trackLogout(currentUser.value?.platform)
  } catch (error) {
    console.error('Logout failed:', error)
  }
}

// Analytics tracking (optional)
const trackLoginSuccess = (platform) => {
  // Implement your analytics tracking here
  console.log(`Analytics: Login success - ${platform}`)
}

const trackLoginError = (platform, error) => {
  // Implement your analytics tracking here
  console.log(`Analytics: Login error - ${platform}:`, error)
}

const trackLogout = (platform) => {
  // Implement your analytics tracking here
  console.log(`Analytics: Logout - ${platform}`)
}

// Handle redirect callback on mount
onMounted(async () => {
  try {
    const result = await social.handleRedirectCallback()
    if (result?.success) {
      console.log('Redirect callback successful:', result.user)
    }
  } catch (error) {
    console.error('Redirect callback failed:', error)
  }
})
</script>

<style scoped>
.multi-platform-login {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
}

.login-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  padding: 30px;
  position: relative;
}

.login-container h2 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
  font-weight: 600;
}

.platform-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.platform-btn {
  border: none;
  border-radius: 8px;
  padding: 16px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 16px;
  font-weight: 500;
  position: relative;
  overflow: hidden;
}

.platform-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.platform-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.platform-icon {
  width: 20px;
  height: 20px;
  border-radius: 4px;
}

.google-btn {
  background: #4285f4;
  color: white;
}

.apple-btn {
  background: #000;
  color: white;
}

.line-btn {
  background: #00c300;
  color: white;
}

.telegram-btn {
  background: #0088cc;
  color: white;
}

.user-profile {
  text-align: center;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.profile-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
}

.profile-info {
  flex: 1;
  text-align: left;
}

.profile-info h3 {
  margin: 0 0 5px 0;
  color: #333;
}

.platform-badge {
  background: #007bff;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  display: inline-block;
  margin: 5px 0;
}

.user-email {
  color: #666;
  font-size: 14px;
  margin: 5px 0 0 0;
}

.profile-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-bottom: 20px;
}

.toggle-btn, .logout-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.toggle-btn {
  background: #6c757d;
  color: white;
}

.logout-btn {
  background: #dc3545;
  color: white;
}

.profile-details {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  text-align: left;
}

.profile-details h4 {
  margin: 0 0 15px 0;
  color: #333;
}

.detail-grid {
  display: grid;
  gap: 10px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #dee2e6;
}

.detail-item label {
  font-weight: 600;
  color: #495057;
}

.token-preview {
  font-family: monospace;
  font-size: 12px;
  color: #6c757d;
}

.error-display {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
}

.error-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.error-header h4 {
  margin: 0;
  color: #721c24;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #721c24;
}

.error-content {
  color: #721c24;
}

.error-suggestion {
  margin-top: 15px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 4px;
}

.error-suggestion ul {
  margin: 10px 0;
  padding-left: 20px;
}

.retry-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.loading-content {
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-tip {
  color: #666;
  font-size: 14px;
  margin-top: 10px;
}
</style>
```

## Advanced State Management

### Cross-Platform User Session Management

```javascript
// composables/useAdvancedSocialState.js
export const useAdvancedSocialState = () => {
  const social = useSocial()
  
  // Enhanced state management
  const sessionHistory = useState('social.sessionHistory', () => [])
  const loginPreferences = useState('social.preferences', () => ({
    preferredPlatform: null,
    preferredMode: 'popup',
    rememberChoice: false
  }))
  
  // Session management
  const addSessionEntry = (user, platform) => {
    const entry = {
      id: Date.now(),
      platform,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      },
      loginTime: new Date().toISOString(),
      isActive: true
    }
    
    // Mark previous sessions as inactive
    sessionHistory.value.forEach(session => {
      session.isActive = false
    })
    
    sessionHistory.value.unshift(entry)
    
    // Keep only last 10 sessions
    if (sessionHistory.value.length > 10) {
      sessionHistory.value = sessionHistory.value.slice(0, 10)
    }
  }
  
  const getActiveSession = () => {
    return sessionHistory.value.find(session => session.isActive)
  }
  
  const clearSessionHistory = () => {
    sessionHistory.value = []
  }
  
  // Preference management
  const setPreferredPlatform = (platform) => {
    loginPreferences.value.preferredPlatform = platform
    if (process.client) {
      localStorage.setItem('socialLoginPreferences', JSON.stringify(loginPreferences.value))
    }
  }
  
  const loadPreferences = () => {
    if (process.client) {
      const saved = localStorage.getItem('socialLoginPreferences')
      if (saved) {
        try {
          loginPreferences.value = { ...loginPreferences.value, ...JSON.parse(saved) }
        } catch (error) {
          console.warn('Failed to load login preferences:', error)
        }
      }
    }
  }
  
  // Auto-login with preferred platform
  const autoLogin = async () => {
    const { preferredPlatform, rememberChoice } = loginPreferences.value
    
    if (preferredPlatform && rememberChoice && !social.isAuthenticated.value) {
      try {
        console.log(`Attempting auto-login with ${preferredPlatform}`)
        
        const options = {
          popup: loginPreferences.value.preferredMode === 'popup'
        }
        
        let result
        switch (preferredPlatform) {
          case 'google':
            result = await social.loginWithGoogle(options)
            break
          case 'apple':
            result = await social.loginWithApple(options)
            break
          case 'line':
            result = await social.loginWithLine(options)
            break
          case 'telegram':
            result = await social.loginWithTelegram(options)
            break
        }
        
        if (result?.success) {
          addSessionEntry(result.user, preferredPlatform)
          return result
        }
      } catch (error) {
        console.warn('Auto-login failed:', error)
      }
    }
    
    return null
  }
  
  // Watch for authentication changes
  watch(() => social.currentUser.value, (newUser) => {
    if (newUser) {
      addSessionEntry(newUser, newUser.platform)
    }
  })
  
  // Initialize preferences on client
  onMounted(() => {
    loadPreferences()
  })
  
  return {
    sessionHistory: readonly(sessionHistory),
    loginPreferences: readonly(loginPreferences),
    addSessionEntry,
    getActiveSession,
    clearSessionHistory,
    setPreferredPlatform,
    loadPreferences,
    autoLogin
  }
}
```

## Performance Optimization Examples

### Lazy Loading and SDK Management

```javascript
// composables/useOptimizedSocialLogin.js
export const useOptimizedSocialLogin = () => {
  const loadedSDKs = ref(new Set())
  const sdkLoadPromises = ref(new Map())
  
  // Preload SDKs based on user behavior
  const preloadSDK = async (platform) => {
    if (loadedSDKs.value.has(platform)) {
      return true
    }
    
    if (sdkLoadPromises.value.has(platform)) {
      return await sdkLoadPromises.value.get(platform)
    }
    
    const loadPromise = loadPlatformSDK(platform)
    sdkLoadPromises.value.set(platform, loadPromise)
    
    try {
      await loadPromise
      loadedSDKs.value.add(platform)
      return true
    } catch (error) {
      sdkLoadPromises.value.delete(platform)
      console.error(`Failed to preload ${platform} SDK:`, error)
      return false
    }
  }
  
  const loadPlatformSDK = async (platform) => {
    switch (platform) {
      case 'google':
        const { useGoogle } = await import('~/composables/useGoogle')
        return useGoogle()
      case 'apple':
        const { useApple } = await import('~/composables/useApple')
        return useApple()
      case 'line':
        const { useLine } = await import('~/composables/useLine')
        return useLine()
      case 'telegram':
        const { useTelegram } = await import('~/composables/useTelegram')
        return useTelegram()
      default:
        throw new Error(`Unknown platform: ${platform}`)
    }
  }
  
  // Intelligent preloading based on user interaction
  const handlePlatformHover = (platform) => {
    // Preload SDK when user hovers over button
    preloadSDK(platform)
  }
  
  const handlePlatformFocus = (platform) => {
    // Preload SDK when user focuses on button
    preloadSDK(platform)
  }
  
  // Batch preload popular platforms
  const preloadPopularPlatforms = async () => {
    const popularPlatforms = ['google', 'apple'] // Most commonly used
    
    await Promise.allSettled(
      popularPlatforms.map(platform => preloadSDK(platform))
    )
  }
  
  return {
    preloadSDK,
    handlePlatformHover,
    handlePlatformFocus,
    preloadPopularPlatforms,
    loadedSDKs: readonly(loadedSDKs)
  }
}
```

### Optimized Login Component

```vue
<template>
  <div class="optimized-login">
    <div class="platform-buttons">
      <button
        v-for="platform in platforms"
        :key="platform"
        @click="handleLogin(platform)"
        @mouseenter="optimized.handlePlatformHover(platform)"
        @focus="optimized.handlePlatformFocus(platform)"
        :disabled="isLoading"
        :class="`platform-btn ${platform}-btn`"
      >
        <span class="btn-icon">
          <component :is="getPlatformIcon(platform)" />
        </span>
        <span class="btn-text">
          {{ getPlatformText(platform) }}
        </span>
        <span v-if="optimized.loadedSDKs.value.has(platform)" class="ready-indicator">
          ✓
        </span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { useOptimizedSocialLogin } from '~/composables/useOptimizedSocialLogin'
import { useSocial } from '~/composables/useSocial'

const social = useSocial()
const optimized = useOptimizedSocialLogin()

const platforms = ['google', 'apple', 'line', 'telegram']
const isLoading = computed(() => social.loginState.value.isLoading)

const handleLogin = async (platform) => {
  // Ensure SDK is loaded before attempting login
  await optimized.preloadSDK(platform)
  
  // Proceed with login
  let result
  switch (platform) {
    case 'google':
      result = await social.loginWithGoogle({ popup: true })
      break
    case 'apple':
      result = await social.loginWithApple({ popup: true })
      break
    case 'line':
      result = await social.loginWithLine({ popup: true })
      break
    case 'telegram':
      result = await social.loginWithTelegram()
      break
  }
  
  if (result?.success) {
    console.log(`${platform} login successful`)
  }
}

const getPlatformIcon = (platform) => {
  // Return appropriate icon component
  const icons = {
    google: 'GoogleIcon',
    apple: 'AppleIcon',
    line: 'LineIcon',
    telegram: 'TelegramIcon'
  }
  return icons[platform]
}

const getPlatformText = (platform) => {
  const texts = {
    google: 'Continue with Google',
    apple: 'Continue with Apple',
    line: 'Continue with LINE',
    telegram: 'Continue with Telegram'
  }
  return texts[platform]
}

// Preload popular platforms on mount
onMounted(() => {
  optimized.preloadPopularPlatforms()
})
</script>

<style scoped>
.platform-btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
}

.ready-indicator {
  position: absolute;
  top: 4px;
  right: 4px;
  color: #28a745;
  font-size: 12px;
}

.btn-icon {
  width: 20px;
  height: 20px;
}

.btn-text {
  flex: 1;
  text-align: left;
}
</style>
```

## Security Best Practices Implementation

### Token Security and Validation

```javascript
// utils/tokenSecurity.js
export class TokenSecurityManager {
  constructor() {
    this.tokenStorage = new Map()
    this.refreshTimers = new Map()
  }
  
  // Secure token storage with encryption
  storeToken(platform, token, expiresIn) {
    const encryptedToken = this.encryptToken(token)
    const expiryTime = Date.now() + (expiresIn * 1000)
    
    this.tokenStorage.set(platform, {
      token: encryptedToken,
      expiryTime,
      createdAt: Date.now()
    })
    
    // Set up automatic refresh
    this.scheduleTokenRefresh(platform, expiresIn)
  }
  
  // Retrieve and decrypt token
  getToken(platform) {
    const tokenData = this.tokenStorage.get(platform)
    
    if (!tokenData) {
      return null
    }
    
    if (Date.now() > tokenData.expiryTime) {
      this.removeToken(platform)
      return null
    }
    
    return this.decryptToken(tokenData.token)
  }
  
  // Validate token integrity
  async validateToken(platform, token) {
    try {
      switch (platform) {
        case 'google':
          return await this.validateGoogleToken(token)
        case 'apple':
          return await this.validateAppleToken(token)
        case 'line':
          return await this.validateLineToken(token)
        case 'telegram':
          return await this.validateTelegramToken(token)
        default:
          return false
      }
    } catch (error) {
      console.error(`Token validation failed for ${platform}:`, error)
      return false
    }
  }
  
  // Platform-specific token validation
  async validateGoogleToken(token) {
    const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`)
    return response.ok
  }
  
  async validateAppleToken(token) {
    // Implement Apple token validation
    // This typically involves JWT verification with Apple's public keys
    return true // Simplified for example
  }
  
  async validateLineToken(token) {
    const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `access_token=${token}`
    })
    return response.ok
  }
  
  async validateTelegramToken(token) {
    // Implement Telegram token validation
    return true // Simplified for example
  }
  
  // Simple encryption (use proper encryption in production)
  encryptToken(token) {
    // This is a simplified example - use proper encryption in production
    return btoa(token)
  }
  
  decryptToken(encryptedToken) {
    // This is a simplified example - use proper decryption in production
    return atob(encryptedToken)
  }
  
  // Schedule automatic token refresh
  scheduleTokenRefresh(platform, expiresIn) {
    // Clear existing timer
    if (this.refreshTimers.has(platform)) {
      clearTimeout(this.refreshTimers.get(platform))
    }
    
    // Schedule refresh 5 minutes before expiry
    const refreshTime = (expiresIn - 300) * 1000
    
    if (refreshTime > 0) {
      const timer = setTimeout(() => {
        this.refreshToken(platform)
      }, refreshTime)
      
      this.refreshTimers.set(platform, timer)
    }
  }
  
  // Refresh token
  async refreshToken(platform) {
    try {
      // Implement platform-specific token refresh logic
      console.log(`Refreshing token for ${platform}`)
      
      // This would typically involve calling the platform's refresh endpoint
      // and updating the stored token
      
    } catch (error) {
      console.error(`Token refresh failed for ${platform}:`, error)
      this.removeToken(platform)
    }
  }
  
  // Remove token and cleanup
  removeToken(platform) {
    this.tokenStorage.delete(platform)
    
    if (this.refreshTimers.has(platform)) {
      clearTimeout(this.refreshTimers.get(platform))
      this.refreshTimers.delete(platform)
    }
  }
  
  // Clear all tokens
  clearAllTokens() {
    this.tokenStorage.clear()
    this.refreshTimers.forEach(timer => clearTimeout(timer))
    this.refreshTimers.clear()
  }
}

// Global instance
export const tokenSecurity = new TokenSecurityManager()
```

### CSRF Protection Implementation

```javascript
// utils/csrfProtection.js
export class CSRFProtection {
  constructor() {
    this.stateStorage = new Map()
  }
  
  // Generate secure state parameter
  generateState(platform) {
    const state = this.generateSecureRandomString(32)
    const timestamp = Date.now()
    const expiryTime = timestamp + (10 * 60 * 1000) // 10 minutes
    
    this.stateStorage.set(state, {
      platform,
      timestamp,
      expiryTime,
      used: false
    })
    
    return state
  }
  
  // Validate state parameter
  validateState(state, platform) {
    const stateData = this.stateStorage.get(state)
    
    if (!stateData) {
      console.error('Invalid state: not found')
      return false
    }
    
    if (stateData.used) {
      console.error('Invalid state: already used')
      return false
    }
    
    if (Date.now() > stateData.expiryTime) {
      console.error('Invalid state: expired')
      this.stateStorage.delete(state)
      return false
    }
    
    if (stateData.platform !== platform) {
      console.error('Invalid state: platform mismatch')
      return false
    }
    
    // Mark as used
    stateData.used = true
    
    return true
  }
  
  // Generate cryptographically secure random string
  generateSecureRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(length)
      crypto.getRandomValues(array)
      
      for (let i = 0; i < length; i++) {
        result += chars[array[i] % chars.length]
      }
    } else {
      // Fallback for environments without crypto.getRandomValues
      for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)]
      }
    }
    
    return result
  }
  
  // Cleanup expired states
  cleanupExpiredStates() {
    const now = Date.now()
    
    for (const [state, data] of this.stateStorage.entries()) {
      if (now > data.expiryTime) {
        this.stateStorage.delete(state)
      }
    }
  }
  
  // Clear all states
  clearAllStates() {
    this.stateStorage.clear()
  }
}

// Global instance
export const csrfProtection = new CSRFProtection()

// Cleanup expired states every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    csrfProtection.cleanupExpiredStates()
  }, 5 * 60 * 1000)
}
```

This completes the advanced usage examples and best practices for the social login system. The examples cover multi-platform integration, performance optimization, security best practices, and advanced state management patterns.