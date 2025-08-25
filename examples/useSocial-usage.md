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

### Platform-Specific Login

```typescript
// Login with Google
const loginWithGoogle = async () => {
  try {
    const result = await social.loginWithGoogle({
      popup: true,
      scopes: ['profile', 'email']
    })
    
    if (result.success) {
      console.log('Google login successful:', result.user)
    } else {
      console.error('Google login failed:', result.error)
    }
  } catch (error) {
    console.error('Login error:', error)
  }
}

// Login with Apple
const loginWithApple = async () => {
  const result = await social.loginWithApple({
    usePopup: true
  })
  
  if (result.success) {
    console.log('Apple login successful:', result.user)
  }
}

// Login with Line
const loginWithLine = async () => {
  const result = await social.loginWithLine({
    popup: true,
    botPrompt: 'aggressive'
  })
  
  if (result.success) {
    console.log('Line login successful:', result.user)
  }
}

// Login with Telegram
const loginWithTelegram = async () => {
  const result = await social.loginWithTelegram({
    size: 'large'
  })
  
  if (result.success) {
    console.log('Telegram login successful:', result.user)
  }
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

```vue
<template>
  <div class="social-login">
    <!-- Login buttons -->
    <div v-if="!social.isAuthenticated.value" class="login-buttons">
      <button 
        v-for="platform in social.getAvailablePlatforms()" 
        :key="platform"
        :disabled="social.isPlatformLoading(platform)"
        @click="loginWithPlatform(platform)"
        class="login-btn"
      >
        <span v-if="social.isPlatformLoading(platform)">
          Logging in with {{ platform }}...
        </span>
        <span v-else>
          Login with {{ platform }}
        </span>
      </button>
    </div>
    
    <!-- User info -->
    <div v-if="social.isAuthenticated.value" class="user-info">
      <h3>Welcome, {{ social.currentUser.value?.name }}!</h3>
      <p>Platform: {{ social.currentPlatform.value }}</p>
      <button @click="social.logout()" class="logout-btn">
        Logout
      </button>
    </div>
    
    <!-- Loading state -->
    <div v-if="social.loginState.value.isLoading" class="loading">
      Logging in...
    </div>
    
    <!-- Error state -->
    <div v-if="social.loginState.value.error" class="error">
      Login failed: {{ social.loginState.value.error.message }}
    </div>
  </div>
</template>
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