# Line Login Usage Examples

This document demonstrates how to use the `useLine` composable for Line Login authentication.

## Basic Usage

### Simple Login Component

```vue
<template>
  <div class="line-login">
    <button 
      @click="handleLogin"
      :disabled="isLoading || !isReady"
      class="line-login-btn"
    >
      <span v-if="isLoading">Logging in...</span>
      <span v-else-if="!isReady">Loading Line SDK...</span>
      <span v-else>Sign in with Line</span>
    </button>
    
    <div v-if="user" class="user-info">
      <h3>Welcome, {{ user.displayName }}!</h3>
      <p>Line ID: {{ user.lineId }}</p>
      <img v-if="user.pictureUrl" :src="user.pictureUrl" :alt="user.displayName" />
      <p v-if="user.statusMessage">Status: {{ user.statusMessage }}</p>
      <button @click="handleLogout">Logout</button>
    </div>
    
    <div v-if="error" class="error">
      Error: {{ error.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
const { login, logout, isReady, isLoading, user } = useLine()
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
.line-login-btn {
  background: #00c300;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.line-login-btn:disabled {
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

## Advanced Usage

### Login with Bot Prompt Options

```vue
<script setup lang="ts">
const { login } = useLine()

const loginWithAggressivePrompt = async () => {
  try {
    const result = await login({
      popup: true,
      botPrompt: 'aggressive' // Encourages users to add the bot as a friend
    })
    
    if (result.success) {
      console.log('Login with aggressive bot prompt:', result.user)
    }
  } catch (error) {
    console.error('Login failed:', error)
  }
}

const loginWithNormalPrompt = async () => {
  try {
    const result = await login({
      popup: true,
      botPrompt: 'normal' // Default behavior
    })
    
    if (result.success) {
      console.log('Login with normal bot prompt:', result.user)
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
const { login } = useLine()

const loginWithRedirect = async () => {
  try {
    // This will redirect the user to Line's OAuth page
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
const { user, isReady } = useLine()

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

Make sure your `.env` file contains the Line Client ID:

```env
LINE_CLIENT_ID=your_line_client_id_here
```

And your `nuxt.config.ts` includes the runtime config:

```typescript
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      lineClientId: process.env.LINE_CLIENT_ID,
      socialLogin: {
        redirectUri: process.env.SOCIAL_LOGIN_REDIRECT_URI || 'http://localhost:3000/auth/callback',
        enabledPlatforms: ['line']
      }
    }
  }
})
```

## Error Handling

The `useLine` composable provides comprehensive error handling:

```vue
<script setup lang="ts">
const { login } = useLine()

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
          console.error('Line Client ID not configured')
          break
        case 'SDK_LOAD_FAILED':
          console.error('Failed to load Line SDK')
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

## Line-Specific Features

### Working with LIFF (Line Front-end Framework)

```vue
<script setup lang="ts">
const { user, isReady } = useLine()

// Check if running inside Line app
const isInLineApp = computed(() => {
  return window.liff?.isInClient() || false
})

// Handle Line-specific features
onMounted(async () => {
  if (isReady.value && isInLineApp.value) {
    console.log('Running inside Line app')
    // You can access additional LIFF features here
  }
})
</script>
```

### Handling Line Profile Information

```vue
<script setup lang="ts">
const { user } = useLine()

// Line provides rich profile information
const userProfile = computed(() => {
  if (!user.value) return null
  
  return {
    id: user.value.lineId,
    displayName: user.value.displayName,
    pictureUrl: user.value.pictureUrl,
    statusMessage: user.value.statusMessage,
    // Note: Email might not be available depending on user privacy settings
    email: user.value.email || 'Not provided'
  }
})
</script>
```

## TypeScript Support

The composable provides full TypeScript support:

```typescript
import type { LineUser, LineLoginOptions, SocialLoginResult } from '~/composables/types'

const { login, user } = useLine()

// user is typed as ComputedRef<LineUser | null>
const userName = computed(() => user.value?.displayName || 'Guest')

// login options are fully typed
const loginOptions: LineLoginOptions = {
  popup: true,
  botPrompt: 'aggressive',
  redirectUrl: 'https://yourapp.com/callback'
}
```

## Important Notes

1. **LIFF App Setup**: You need to create a LIFF app in the Line Developers Console and use the LIFF ID as your client ID.

2. **Privacy Considerations**: Line users can choose not to share their email address, so always handle cases where email might be undefined.

3. **Bot Integration**: The `botPrompt` option affects whether users are encouraged to add your Line bot as a friend during the login process.

4. **Line App Context**: The behavior might differ when your app is accessed from within the Line app versus a regular browser.

5. **Redirect URI**: Make sure your redirect URI is registered in your Line Login channel settings.