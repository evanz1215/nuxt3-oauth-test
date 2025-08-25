# Google Popup Login Usage Example

This example demonstrates how to use the Google popup login functionality.

## Basic Usage

```vue
<template>
  <div>
    <h2>Google Login Example</h2>
    
    <!-- Login Button -->
    <button 
      @click="handleLogin" 
      :disabled="isLoading"
      class="login-btn"
    >
      {{ isLoading ? 'Logging in...' : 'Login with Google' }}
    </button>
    
    <!-- User Info Display -->
    <div v-if="user" class="user-info">
      <h3>Welcome, {{ user.name }}!</h3>
      <img :src="user.avatar" :alt="user.name" class="avatar" />
      <p>Email: {{ user.email }}</p>
      <button @click="handleLogout" class="logout-btn">Logout</button>
    </div>
    
    <!-- Error Display -->
    <div v-if="error" class="error">
      <p>Error: {{ error.message }}</p>
      <button @click="clearError">Dismiss</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGoogle } from '~/composables/useGoogle'

const { login, logout, user, isLoading } = useGoogle()
const { loginState, clearError } = useSocialState()

const error = computed(() => loginState.value.error)

const handleLogin = async () => {
  try {
    const result = await login({ 
      popup: true,  // Use popup mode
      scopes: ['profile', 'email']  // Optional: request additional scopes
    })
    
    if (result.success) {
      console.log('Login successful:', result.user)
    } else {
      console.error('Login failed:', result.error)
    }
  } catch (err) {
    console.error('Login error:', err)
  }
}

const handleLogout = async () => {
  try {
    await logout()
    console.log('Logout successful')
  } catch (err) {
    console.error('Logout error:', err)
  }
}
</script>

<style scoped>
.login-btn, .logout-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.login-btn {
  background-color: #4285f4;
  color: white;
}

.login-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.logout-btn {
  background-color: #dc3545;
  color: white;
}

.user-info {
  margin-top: 20px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
}

.error {
  margin-top: 20px;
  padding: 10px;
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
}
</style>
```

## Advanced Usage with Error Handling

```vue
<template>
  <div>
    <h2>Advanced Google Login with Error Handling</h2>
    
    <button @click="handleAdvancedLogin" :disabled="isLoading">
      {{ isLoading ? 'Logging in...' : 'Login with Google (Advanced)' }}
    </button>
    
    <div v-if="loginStatus" class="status">
      <p>Status: {{ loginStatus }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGoogle } from '~/composables/useGoogle'
import { SocialErrorCodes } from '~/composables/utils/errors'

const { login, user, isLoading } = useGoogle()
const loginStatus = ref<string>('')

const handleAdvancedLogin = async () => {
  loginStatus.value = 'Starting login...'
  
  try {
    const result = await login({ popup: true })
    
    if (result.success) {
      loginStatus.value = `Login successful! Welcome ${result.user?.name}`
    } else {
      // Handle specific error cases
      switch (result.error?.code) {
        case SocialErrorCodes.POPUP_BLOCKED:
          loginStatus.value = 'Popup was blocked. Please allow popups and try again.'
          break
        case SocialErrorCodes.USER_CANCELLED:
          loginStatus.value = 'Login was cancelled by user.'
          break
        case SocialErrorCodes.NETWORK_ERROR:
          loginStatus.value = 'Network error. Please check your connection.'
          break
        case SocialErrorCodes.TIMEOUT_ERROR:
          loginStatus.value = 'Login timed out. Please try again.'
          break
        default:
          loginStatus.value = `Login failed: ${result.error?.message}`
      }
    }
  } catch (err) {
    loginStatus.value = `Unexpected error: ${err}`
  }
}
</script>
```

## Popup vs Redirect Mode

```typescript
// Popup mode (default)
const result = await login({ popup: true })

// Redirect mode
const result = await login({ popup: false })

// Auto-detect (popup if supported, redirect otherwise)
const result = await login()
```

## Error Handling

The popup login can encounter several types of errors:

1. **Popup Blocked**: Browser blocks the popup window
2. **User Cancelled**: User closes the popup without completing login
3. **Network Error**: Connection issues during authentication
4. **Timeout**: Login process takes too long
5. **Configuration Error**: Missing or invalid client ID

Each error type has a specific error code that you can handle appropriately in your application.

## Configuration

Make sure your `.env` file contains the Google client ID:

```env
GOOGLE_CLIENT_ID=your_google_client_id_here
```

And your `nuxt.config.ts` includes the social login configuration:

```typescript
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      socialLogin: {
        enabledPlatforms: ['google'],
        redirectUri: process.env.NUXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/auth/callback'
      }
    }
  }
})
```