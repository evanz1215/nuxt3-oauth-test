# Popup vs Redirect Mode Usage Examples

This document demonstrates the differences between popup and redirect modes for social login, and provides examples for both approaches.

## Overview

The social login system supports two authentication modes:

- **Popup Mode**: Opens authentication in a popup window, keeps user on the current page
- **Redirect Mode**: Redirects user to the authentication provider's page, then back to your app

## Mode Comparison

| Feature | Popup Mode | Redirect Mode |
|---------|------------|---------------|
| User Experience | Stays on page | Page redirect |
| Mobile Support | Limited | Better |
| Popup Blockers | May be blocked | Not affected |
| Browser Compatibility | Modern browsers | Universal |
| Implementation | More complex | Simpler |
| Recommended For | Desktop web apps | Mobile apps, PWAs |

## Basic Usage Examples

### Google Login - Both Modes

```vue
<template>
  <div class="login-demo">
    <h3>Google Login Examples</h3>
    
    <!-- Popup Mode -->
    <button @click="loginGooglePopup" :disabled="isLoading">
      Google Login (Popup)
    </button>
    
    <!-- Redirect Mode -->
    <button @click="loginGoogleRedirect" :disabled="isLoading">
      Google Login (Redirect)
    </button>
    
    <div v-if="user" class="user-info">
      <p>Logged in as: {{ user.name }}</p>
      <button @click="logout">Logout</button>
    </div>
  </div>
</template>

<script setup>
import { useGoogle } from '~/composables/useGoogle'

const { login, logout, user, isLoading } = useGoogle()

const loginGooglePopup = async () => {
  try {
    const result = await login({ 
      popup: true,
      scopes: ['profile', 'email']
    })
    
    if (result.success) {
      console.log('Popup login successful:', result.user)
    }
  } catch (error) {
    console.error('Popup login failed:', error)
  }
}

const loginGoogleRedirect = async () => {
  try {
    await login({ 
      popup: false,
      redirectUrl: `${window.location.origin}/auth/callback`
    })
    // User will be redirected, no result handling needed here
  } catch (error) {
    console.error('Redirect login failed:', error)
  }
}
</script>
```

### Apple Login - Both Modes

```vue
<template>
  <div class="apple-login-demo">
    <h3>Apple Login Examples</h3>
    
    <!-- Popup Mode -->
    <button @click="loginApplePopup" :disabled="isLoading">
      Apple Login (Popup)
    </button>
    
    <!-- Redirect Mode -->
    <button @click="loginAppleRedirect" :disabled="isLoading">
      Apple Login (Redirect)
    </button>
  </div>
</template>

<script setup>
import { useApple } from '~/composables/useApple'

const { login, isLoading } = useApple()

const loginApplePopup = async () => {
  try {
    const result = await login({ 
      popup: true,
      usePopup: true
    })
    
    if (result.success) {
      console.log('Apple popup login successful:', result.user)
    }
  } catch (error) {
    console.error('Apple popup login failed:', error)
  }
}

const loginAppleRedirect = async () => {
  try {
    await login({ 
      popup: false,
      redirectUrl: `${window.location.origin}/auth/callback`
    })
  } catch (error) {
    console.error('Apple redirect login failed:', error)
  }
}
</script>
```

### Line Login - Both Modes

```vue
<template>
  <div class="line-login-demo">
    <h3>Line Login Examples</h3>
    
    <!-- Popup Mode -->
    <button @click="loginLinePopup" :disabled="isLoading">
      Line Login (Popup)
    </button>
    
    <!-- Redirect Mode -->
    <button @click="loginLineRedirect" :disabled="isLoading">
      Line Login (Redirect)
    </button>
  </div>
</template>

<script setup>
import { useLine } from '~/composables/useLine'

const { login, isLoading } = useLine()

const loginLinePopup = async () => {
  try {
    const result = await login({ 
      popup: true,
      botPrompt: 'normal'
    })
    
    if (result.success) {
      console.log('Line popup login successful:', result.user)
    }
  } catch (error) {
    console.error('Line popup login failed:', error)
  }
}

const loginLineRedirect = async () => {
  try {
    await login({ 
      popup: false,
      redirectUrl: `${window.location.origin}/auth/callback`
    })
  } catch (error) {
    console.error('Line redirect login failed:', error)
  }
}
</script>
```

### Telegram Login - Widget and Redirect Modes

```vue
<template>
  <div class="telegram-login-demo">
    <h3>Telegram Login Examples</h3>
    
    <!-- Widget Mode (Telegram's version of popup) -->
    <button @click="loginTelegramWidget" :disabled="isLoading">
      Telegram Login (Widget)
    </button>
    
    <!-- Redirect Mode -->
    <button @click="loginTelegramRedirect" :disabled="isLoading">
      Telegram Login (Redirect)
    </button>
  </div>
</template>

<script setup>
import { useTelegram } from '~/composables/useTelegram'

const { login, isLoading } = useTelegram()

const loginTelegramWidget = async () => {
  try {
    const result = await login({ 
      size: 'large',
      cornerRadius: 8
    })
    
    if (result.success) {
      console.log('Telegram widget login successful:', result.user)
    }
  } catch (error) {
    console.error('Telegram widget login failed:', error)
  }
}

const loginTelegramRedirect = async () => {
  try {
    await login({ 
      popup: false,
      redirectUrl: `${window.location.origin}/auth/callback`
    })
  } catch (error) {
    console.error('Telegram redirect login failed:', error)
  }
}
</script>
```

## Unified Interface Examples

### Using useSocial with Mode Selection

```vue
<template>
  <div class="unified-login-demo">
    <h3>Unified Social Login with Mode Selection</h3>
    
    <!-- Mode Toggle -->
    <div class="mode-selector">
      <label>
        <input 
          type="radio" 
          v-model="loginMode" 
          value="popup"
        />
        Popup Mode
      </label>
      <label>
        <input 
          type="radio" 
          v-model="loginMode" 
          value="redirect"
        />
        Redirect Mode
      </label>
    </div>
    
    <!-- Platform Buttons -->
    <div class="platform-buttons">
      <button 
        v-for="platform in availablePlatforms" 
        :key="platform"
        @click="loginWithPlatform(platform)"
        :disabled="isLoading"
        :class="`${platform}-btn`"
      >
        Login with {{ platform }} ({{ loginMode }})
      </button>
    </div>
    
    <!-- Status Display -->
    <div v-if="loginStatus" class="status">
      {{ loginStatus }}
    </div>
  </div>
</template>

<script setup>
import { useSocial } from '~/composables/useSocial'

const social = useSocial()
const loginMode = ref('popup')
const loginStatus = ref('')
const isLoading = ref(false)

const availablePlatforms = ['google', 'apple', 'line', 'telegram']

const loginWithPlatform = async (platform) => {
  isLoading.value = true
  loginStatus.value = `Logging in with ${platform} (${loginMode.value} mode)...`
  
  try {
    const options = {
      popup: loginMode.value === 'popup',
      redirectUrl: loginMode.value === 'redirect' 
        ? `${window.location.origin}/auth/callback` 
        : undefined
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
      loginStatus.value = `Successfully logged in with ${platform}!`
    } else if (result?.error) {
      loginStatus.value = `Login failed: ${result.error.message}`
    }
  } catch (error) {
    loginStatus.value = `Login error: ${error.message}`
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.unified-login-demo {
  max-width: 500px;
  margin: 0 auto;
  padding: 20px;
}

.mode-selector {
  margin-bottom: 20px;
  display: flex;
  gap: 20px;
  justify-content: center;
}

.mode-selector label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

.platform-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.platform-buttons button {
  padding: 12px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  color: white;
}

.google-btn { background: #4285f4; }
.apple-btn { background: #000; }
.line-btn { background: #00c300; }
.telegram-btn { background: #0088cc; }

.platform-buttons button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status {
  padding: 10px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  text-align: center;
}
</style>
```

## Handling Redirect Callbacks

### Universal Callback Handler

Create a callback page at `pages/auth/callback.vue`:

```vue
<template>
  <div class="callback-handler">
    <div v-if="isProcessing" class="processing">
      <div class="spinner"></div>
      <p>Processing login...</p>
    </div>
    
    <div v-else-if="loginResult?.success" class="success">
      <h2>Login Successful!</h2>
      <p>Welcome, {{ loginResult.user?.name }}!</p>
      <p>Platform: {{ loginResult.platform }}</p>
      <button @click="goToDashboard">Continue to App</button>
    </div>
    
    <div v-else-if="loginResult?.error" class="error">
      <h2>Login Failed</h2>
      <p>Platform: {{ loginResult.platform }}</p>
      <p>Error: {{ loginResult.error.message }}</p>
      <button @click="goHome">Back to Home</button>
    </div>
    
    <div v-else class="no-callback">
      <h2>No Login Data</h2>
      <p>This page is for handling login callbacks.</p>
      <button @click="goHome">Go to Home</button>
    </div>
  </div>
</template>

<script setup>
import { useSocial } from '~/composables/useSocial'

const social = useSocial()
const router = useRouter()
const route = useRoute()

const isProcessing = ref(true)
const loginResult = ref(null)

onMounted(async () => {
  try {
    // Auto-detect which platform is handling the callback
    const result = await social.handleRedirectCallback()
    
    if (result) {
      loginResult.value = result
      
      if (result.success) {
        // Auto-redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      }
    } else {
      // No callback data found
      loginResult.value = { error: { message: 'No callback data found' } }
    }
  } catch (error) {
    loginResult.value = { 
      error: { message: 'Failed to process callback' },
      platform: 'unknown'
    }
  } finally {
    isProcessing.value = false
  }
})

const goToDashboard = () => {
  router.push('/dashboard')
}

const goHome = () => {
  router.push('/')
}
</script>

<style scoped>
.callback-handler {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
}

.processing, .success, .error, .no-callback {
  text-align: center;
  max-width: 400px;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.success {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

.error, .no-callback {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.processing {
  background: #fff;
  border: 1px solid #ddd;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

button {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 20px;
}

button:hover {
  background: #0056b3;
}
</style>
```

## Error Handling for Different Modes

### Popup Mode Error Handling

```vue
<script setup>
const handlePopupLogin = async (platform) => {
  try {
    const result = await social.loginWithGoogle({ popup: true })
    
    if (!result.success && result.error) {
      switch (result.error.code) {
        case 'POPUP_BLOCKED':
          // Fallback to redirect mode
          console.log('Popup blocked, trying redirect mode...')
          await social.loginWithGoogle({ popup: false })
          break
          
        case 'POPUP_CLOSED':
          console.log('User closed the popup')
          break
          
        case 'USER_CANCELLED':
          console.log('User cancelled login')
          break
          
        default:
          console.error('Popup login failed:', result.error.message)
      }
    }
  } catch (error) {
    console.error('Unexpected popup error:', error)
  }
}
</script>
```

### Redirect Mode Error Handling

```vue
<script setup>
const handleRedirectLogin = async (platform) => {
  try {
    await social.loginWithGoogle({ 
      popup: false,
      redirectUrl: `${window.location.origin}/auth/callback`
    })
    // User will be redirected, so this code won't execute
  } catch (error) {
    // This would only happen if redirect setup fails
    console.error('Redirect setup failed:', error)
    
    // Could fallback to popup mode
    try {
      const result = await social.loginWithGoogle({ popup: true })
      if (result.success) {
        console.log('Fallback to popup successful')
      }
    } catch (popupError) {
      console.error('Both redirect and popup failed:', popupError)
    }
  }
}
</script>
```

## Best Practices

### 1. Mode Detection and Fallback

```javascript
const smartLogin = async (platform) => {
  // Try popup first, fallback to redirect if blocked
  try {
    const result = await social.loginWithGoogle({ popup: true })
    
    if (!result.success && result.error?.code === 'POPUP_BLOCKED') {
      console.log('Popup blocked, falling back to redirect...')
      await social.loginWithGoogle({ popup: false })
    }
    
    return result
  } catch (error) {
    console.error('Smart login failed:', error)
    throw error
  }
}
```

### 2. Mobile Detection

```javascript
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

const loginWithBestMode = async (platform) => {
  const useRedirect = isMobile()
  
  const options = {
    popup: !useRedirect,
    redirectUrl: useRedirect ? `${window.location.origin}/auth/callback` : undefined
  }
  
  return await social.loginWithGoogle(options)
}
```

### 3. User Preference Storage

```javascript
const getPreferredMode = () => {
  return localStorage.getItem('preferredLoginMode') || 'popup'
}

const setPreferredMode = (mode) => {
  localStorage.setItem('preferredLoginMode', mode)
}

const loginWithPreferredMode = async (platform) => {
  const mode = getPreferredMode()
  
  const options = {
    popup: mode === 'popup',
    redirectUrl: mode === 'redirect' ? `${window.location.origin}/auth/callback` : undefined
  }
  
  return await social.loginWithGoogle(options)
}
```

## Configuration

Make sure your environment variables are set up correctly:

```env
# .env
GOOGLE_CLIENT_ID=your_google_client_id
APPLE_CLIENT_ID=your_apple_client_id
LINE_CLIENT_ID=your_line_client_id
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_BOT_USERNAME=your_telegram_bot_username

# Optional: Default redirect URI
SOCIAL_LOGIN_REDIRECT_URI=http://localhost:3000/auth/callback
```

And configure your OAuth applications with the correct redirect URIs:
- Development: `http://localhost:3000/auth/callback`
- Production: `https://yourdomain.com/auth/callback`