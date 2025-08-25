# Google Login Usage Examples

This document demonstrates how to use the `useGoogle` composable for Google OAuth authentication.

## Basic Setup

First, ensure you have configured your Google Client ID in your environment variables:

```bash
# .env
GOOGLE_CLIENT_ID=your_google_client_id
```

## Basic Usage

### Simple Login Component

```vue
<template>
  <div class="google-login">
    <button 
      @click="handleLogin"
      :disabled="isLoading || !isReady"
      class="google-login-btn"
    >
      <span v-if="isLoading">Logging in...</span>
      <span v-else-if="!isReady">Loading Google SDK...</span>
      <span v-else>Sign in with Google</span>
    </button>
    
    <div v-if="user" class="user-info">
      <h3>Welcome, {{ user.name }}!</h3>
      <p>Email: {{ user.email }}</p>
      <img :src="user.avatar" :alt="user.name" />
      <p>Google ID: {{ user.googleId }}</p>
      <button @click="handleLogout">Logout</button>
    </div>
    
    <div v-if="error" class="error">
      Error: {{ error.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
const { login, logout, isReady, isLoading, user } = useGoogle()
const error = ref(null)

const handleLogin = async () => {
  try {
    error.value = null
    const result = await login({ popup: true })
    
    if (result.success) {
      console.log('Login successful:', result.user)
    } else {
      error.value = result.error
    }
  } catch (err) {
    error.value = err
    console.error('Login failed:', err)
  }
}

const handleLogout = async () => {
  try {
    await logout()
    console.log('Logout successful')
  } catch (err) {
    console.error('Logout failed:', err)
  }
}
</script>

<style scoped>
.google-login-btn {
  background: #4285f4;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.google-login-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.user-info {
  margin-top: 20px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.user-info img {
  width: 50px;
  height: 50px;
  border-radius: 50%;
}

.error {
  color: red;
  margin-top: 10px;
}
</style>
```

## Popup Mode Login (Default)

```vue
<template>
  <div>
    <button @click="handlePopupLogin" :disabled="isLoading">
      Login with Google (Popup)
    </button>
  </div>
</template>

<script setup lang="ts">
const { login, isLoading } = useGoogle()

const handlePopupLogin = async () => {
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
</script>
```

## Redirect Mode Login

```vue
<template>
  <div>
    <button @click="handleRedirectLogin" :disabled="isLoading">
      Login with Google (Redirect)
    </button>
  </div>
</template>

<script setup lang="ts">
const { login, isLoading } = useGoogle()

const handleRedirectLogin = async () => {
  try {
    // This will redirect the user to Google's OAuth page
    const result = await login({ 
      popup: false,
      redirectUrl: 'http://localhost:3000/auth/callback'
    })
  } catch (error) {
    console.error('Redirect login failed:', error)
  }
}
</script>
```

## Advanced Usage

### Login with Custom Scopes

```vue
<script setup lang="ts">
const { login } = useGoogle()

const loginWithCustomScopes = async () => {
  try {
    const result = await login({
      popup: true,
      scopes: ['profile', 'email', 'https://www.googleapis.com/auth/calendar.readonly']
    })
    
    if (result.success) {
      console.log('Login with calendar access:', result.user)
      // Now you can access Google Calendar API with the access token
      console.log('Access token:', result.user.accessToken)
    }
  } catch (error) {
    console.error('Login failed:', error)
  }
}
</script>
```

### Redirect Mode Login

```vue
<script setup lang="ts">
const { login } = useGoogle()

const loginWithRedirect = async () => {
  try {
    // This will redirect the user to Google's OAuth page
    const result = await login({
      popup: false,
      redirectUrl: 'https://yourapp.com/auth/callback'
    })
  } catch (error) {
    console.error('Login failed:', error)
  }
}
</script>
```

### Checking Authentication Status

```vue
<script setup lang="ts">
const { user, isReady } = useGoogle()

// Watch for authentication changes
watch(user, (newUser) => {
  if (newUser) {
    console.log('User logged in:', newUser)
    // Redirect to dashboard or update UI
  } else {
    console.log('User logged out')
    // Redirect to login page or update UI
  }
})

// Check if user is authenticated
const isAuthenticated = computed(() => !!user.value)
</script>
```

## Configuration

Make sure your `.env` file contains the Google Client ID:

```env
GOOGLE_CLIENT_ID=your_google_client_id_here
```

And your `nuxt.config.ts` includes the runtime config:

```typescript
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      socialLogin: {
        redirectUri: process.env.SOCIAL_LOGIN_REDIRECT_URI || 'http://localhost:3000/auth/callback',
        enabledPlatforms: ['google']
      }
    }
  }
})
```

## Error Handling

The `useGoogle` composable provides comprehensive error handling:

```vue
<script setup lang="ts">
const { login } = useGoogle()

const handleLogin = async () => {
  try {
    const result = await login()
    
    if (!result.success && result.error) {
      switch (result.error.code) {
        case 'USER_CANCELLED':
          console.log('User cancelled the login')
          break
        case 'POPUP_BLOCKED':
          console.log('Popup was blocked by browser')
          // Fallback to redirect mode
          await login({ popup: false })
          break
        case 'MISSING_CLIENT_ID':
          console.error('Google Client ID not configured')
          break
        default:
          console.error('Unknown error:', result.error.message)
      }
    }
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}
</script>
```

## TypeScript Support

The composable provides full TypeScript support:

```typescript
import type { GoogleUser, GoogleLoginOptions, SocialLoginResult } from '~/composables/types'

const { login, user } = useGoogle()

// user is typed as ComputedRef<GoogleUser | null>
const userName = computed(() => user.value?.name || 'Guest')

// login options are fully typed
const loginOptions: GoogleLoginOptions = {
  popup: true,
  scopes: ['profile', 'email'],
  redirectUrl: 'https://yourapp.com/callback'
}
```