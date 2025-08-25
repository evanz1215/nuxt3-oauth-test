# useSocial Composable Usage Examples

The `useSocial` composable provides a unified interface for managing social login across all supported platforms (Google, Apple, Line, Telegram).

## Basic Usage

### Import and Initialize

```typescript
import { useSocial } from '~/composables'

export default defineNuxtPage({
  setup() {
    const social = useSocial()
    
    return {
      social
    }
  }
})
```

### Platform-Specific Login with Popup Mode

```typescript
// Login with Google (Popup)
const loginWithGooglePopup = async () => {
  try {
    const result = await social.loginWithGoogle({
      popup: true,
      scopes: ['profile', 'email']
    })
    
    if (result.success) {
      console.log('Google popup login successful:', result.user)
    } else {
      console.error('Google login failed:', result.error)
    }
  } catch (error) {
    console.error('Login error:', error)
  }
}

// Login with Apple (Popup)
const loginWithApplePopup = async () => {
  const result = await social.loginWithApple({
    popup: true,
    usePopup: true
  })
  
  if (result.success) {
    console.log('Apple popup login successful:', result.user)
  }
}

// Login with Line (Popup)
const loginWithLinePopup = async () => {
  const result = await social.loginWithLine({
    popup: true,
    botPrompt: 'aggressive'
  })
  
  if (result.success) {
    console.log('Line popup login successful:', result.user)
  }
}

// Login with Telegram (Widget - closest to popup)
const loginWithTelegramWidget = async () => {
  const result = await social.loginWithTelegram({
    size: 'large'
  })
  
  if (result.success) {
    console.log('Telegram widget login successful:', result.user)
  }
}
```

### Platform-Specific Login with Redirect Mode

```typescript
// Login with Google (Redirect)
const loginWithGoogleRedirect = async () => {
  try {
    const result = await social.loginWithGoogle({
      popup: false,
      redirectUrl: 'http://localhost:3000/auth/callback'
    })
  } catch (error) {
    console.error('Google redirect login failed:', error)
  }
}

// Login with Apple (Redirect)
const loginWithAppleRedirect = async () => {
  const result = await social.loginWithApple({
    popup: false,
    redirectUrl: 'http://localhost:3000/auth/callback'
  })
}

// Login with Line (Redirect)
const loginWithLineRedirect = async () => {
  const result = await social.loginWithLine({
    popup: false,
    redirectUrl: 'http://localhost:3000/auth/callback'
  })
}

// Login with Telegram (Redirect)
const loginWithTelegramRedirect = async () => {
  const result = await social.loginWithTelegram({
    popup: false,
    redirectUrl: 'http://localhost:3000/auth/callback'
  })
}
```

### Generic Login

```typescript
// Generic login method that delegates to the appropriate platform
const loginWithPlatform = async (platform: SocialPlatform) => {
  try {
    const result = await social.login(platform, {
      popup: true
    })
    
    if (result.success) {
      console.log(`${platform} login successful:`, result.user)
      // Handle successful login
      navigateTo('/dashboard')
    } else {
      console.error(`${platform} login failed:`, result.error)
      // Handle login error
    }
  } catch (error) {
    console.error('Login error:', error)
  }
}
```

### Logout

```typescript
// Logout from specific platform
const logoutFromGoogle = async () => {
  await social.logout('google')
  console.log('Logged out from Google')
}

// Logout from all platforms
const logoutFromAll = async () => {
  await social.logout()
  console.log('Logged out from all platforms')
}
```

## State Management

### Accessing Current State

```typescript
const {
  currentUser,
  loginState,
  authenticatedPlatforms,
  isAuthenticated,
  currentPlatform
} = social

// Watch for authentication changes
watch(isAuthenticated, (authenticated) => {
  if (authenticated) {
    console.log('User is now authenticated:', currentUser.value)
  } else {
    console.log('User is not authenticated')
  }
})

// Watch for login state changes
watch(loginState, (state) => {
  if (state.isLoading) {
    console.log(`Logging in with ${state.platform}...`)
  }
  
  if (state.error) {
    console.error('Login error:', state.error)
  }
})
```

### Platform Status

```typescript
// Check if platforms are ready
const checkPlatformStatus = () => {
  const availablePlatforms = social.getAvailablePlatforms()
  console.log('Available platforms:', availablePlatforms)
  
  // Check specific platform status
  const isGoogleReady = social.isPlatformReady('google')
  const isGoogleLoading = social.isPlatformLoading('google')
  const isGoogleAuthenticated = social.isPlatformAuthenticated('google')
  
  console.log('Google status:', {
    ready: isGoogleReady,
    loading: isGoogleLoading,
    authenticated: isGoogleAuthenticated
  })
  
  // Get all platforms status
  const allStatus = social.getAllPlatformsStatus()
  console.log('All platforms status:', allStatus)
}
```

## Advanced Usage

### Handling Redirect Callbacks

```typescript
// Handle OAuth redirect callbacks
onMounted(async () => {
  // Auto-detect which platform is handling the callback
  const result = await social.handleRedirectCallback()
  
  if (result) {
    if (result.success) {
      console.log('Redirect login successful:', result.user)
      // Redirect to dashboard or show success message
    } else {
      console.error('Redirect login failed:', result.error)
      // Show error message
    }
  }
})

// Handle callback for specific platform
const handleGoogleCallback = async () => {
  const result = await social.handleRedirectCallback('google')
  
  if (result?.success) {
    console.log('Google callback handled successfully')
  }
}
```

### Error Handling

```typescript
const handleLoginError = (error: SocialError) => {
  switch (error.code) {
    case 'POPUP_BLOCKED':
      // Fallback to redirect mode
      console.log('Popup blocked, trying redirect mode...')
      return social.login(error.platform, { popup: false })
      
    case 'USER_CANCELLED':
      console.log('User cancelled login')
      break
      
    case 'NETWORK_ERROR':
      console.error('Network error during login')
      break
      
    case 'CONFIGURATION_ERROR':
      console.error('Platform not configured properly')
      break
      
    default:
      console.error('Unknown login error:', error)
  }
}
```

### Multi-Platform Support

```typescript
// Login with multiple platforms
const loginWithMultiplePlatforms = async () => {
  const platforms: SocialPlatform[] = ['google', 'apple', 'line']
  
  for (const platform of platforms) {
    try {
      if (social.isPlatformReady(platform)) {
        const result = await social.login(platform)
        if (result.success) {
          console.log(`Successfully logged in with ${platform}`)
          break // Stop after first successful login
        }
      }
    } catch (error) {
      console.warn(`Failed to login with ${platform}:`, error)
      continue // Try next platform
    }
  }
}

// Check authentication across platforms
const checkMultiPlatformAuth = () => {
  const authenticatedPlatforms = social.authenticatedPlatforms.value
  
  if (authenticatedPlatforms.length > 0) {
    console.log('Authenticated with:', authenticatedPlatforms)
    
    // Get user info from each authenticated platform
    authenticatedPlatforms.forEach(platform => {
      const user = social.getPlatformUser(platform)
      console.log(`${platform} user:`, user)
    })
  }
}
```

## Vue Template Usage

### Complete Social Login Component with Popup and Redirect Modes

```vue
<template>
  <div class="social-login">
    <!-- Mode Selection -->
    <div v-if="!social.isAuthenticated.value" class="mode-selection">
      <h3>Choose Login Mode</h3>
      <div class="mode-buttons">
        <button 
          @click="loginMode = 'popup'" 
          :class="{ active: loginMode === 'popup' }"
          class="mode-btn"
        >
          Popup Mode
        </button>
        <button 
          @click="loginMode = 'redirect'" 
          :class="{ active: loginMode === 'redirect' }"
          class="mode-btn"
        >
          Redirect Mode
        </button>
      </div>
    </div>

    <!-- Login buttons -->
    <div v-if="!social.isAuthenticated.value" class="login-buttons">
      <h4>Login with {{ loginMode }} mode:</h4>
      
      <button 
        v-for="platform in social.getAvailablePlatforms()" 
        :key="platform"
        :disabled="social.isPlatformLoading(platform)"
        @click="loginWithPlatform(platform)"
        :class="`login-btn ${platform}-btn`"
      >
        <span v-if="social.isPlatformLoading(platform)">
          Logging in with {{ platform }}...
        </span>
        <span v-else>
          Login with {{ platform }} ({{ loginMode }})
        </span>
      </button>
    </div>
    
    <!-- User info -->
    <div v-if="social.isAuthenticated.value" class="user-info">
      <h3>Welcome, {{ social.currentUser.value?.name }}!</h3>
      <p>Platform: {{ social.currentPlatform.value }}</p>
      <p>Email: {{ social.currentUser.value?.email }}</p>
      <img 
        v-if="social.currentUser.value?.avatar" 
        :src="social.currentUser.value.avatar" 
        :alt="social.currentUser.value.name"
        class="avatar"
      />
      <button @click="social.logout()" class="logout-btn">
        Logout
      </button>
    </div>
    
    <!-- Loading state -->
    <div v-if="social.loginState.value.isLoading" class="loading">
      <div class="spinner"></div>
      <p>Logging in with {{ social.loginState.value.platform }}...</p>
    </div>
    
    <!-- Error state -->
    <div v-if="social.loginState.value.error" class="error">
      <h4>Login Failed</h4>
      <p><strong>Platform:</strong> {{ social.loginState.value.error.platform }}</p>
      <p><strong>Error:</strong> {{ social.loginState.value.error.message }}</p>
      <button @click="clearError" class="retry-btn">Try Again</button>
    </div>
  </div>
</template>

<script setup>
import { useSocial } from '~/composables/useSocial'

const social = useSocial()
const loginMode = ref('popup')

const loginWithPlatform = async (platform) => {
  try {
    const options = {
      popup: loginMode.value === 'popup',
      redirectUrl: loginMode.value === 'redirect' ? 'http://localhost:3000/auth/callback' : undefined
    }
    
    let result
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
    }
  } catch (error) {
    console.error(`${platform} login failed:`, error)
  }
}

const clearError = () => {
  // Clear error state
  social.loginState.value.error = null
}
</script>

<style scoped>
.social-login {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
}

.mode-selection {
  margin-bottom: 20px;
  text-align: center;
}

.mode-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 10px;
}

.mode-btn {
  padding: 8px 16px;
  border: 2px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
}

.mode-btn.active {
  border-color: #007bff;
  background: #007bff;
  color: white;
}

.login-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.login-btn {
  padding: 12px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: opacity 0.2s;
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.google-btn { background: #4285f4; color: white; }
.apple-btn { background: #000; color: white; }
.line-btn { background: #00c300; color: white; }
.telegram-btn { background: #0088cc; color: white; }

.user-info {
  text-align: center;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  margin: 10px 0;
}

.logout-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.loading {
  text-align: center;
  padding: 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 4px;
  padding: 15px;
  color: #c33;
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
</style>
```

## Configuration

Make sure your environment variables are properly configured:

```env
# .env
GOOGLE_CLIENT_ID=your_google_client_id
APPLE_CLIENT_ID=your_apple_client_id
LINE_CLIENT_ID=your_line_client_id
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_BOT_USERNAME=your_telegram_bot_username
```

## Best Practices

1. **Error Handling**: Always handle errors gracefully and provide fallback options
2. **Loading States**: Show loading indicators during login processes
3. **Platform Availability**: Check if platforms are ready before attempting login
4. **Popup Fallback**: Provide redirect mode as fallback when popups are blocked
5. **State Management**: Use reactive state to update UI based on authentication status
6. **Security**: Validate tokens on the server side for production applications