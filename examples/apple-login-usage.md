# Apple Login Usage Examples

This document provides examples of how to use the Apple login functionality in your Nuxt application.

## Basic Setup

First, ensure you have configured your Apple Client ID in your environment variables:

```bash
# .env
APPLE_CLIENT_ID=your_apple_client_id
APPLE_REDIRECT_URI=http://localhost:3000/auth/callback  # Optional
```

## Basic Apple Login (Popup Mode)

```vue
<template>
  <div>
    <button 
      @click="handleAppleLogin" 
      :disabled="!isReady || isLoading"
      class="apple-login-btn"
    >
      <span v-if="isLoading">Signing in...</span>
      <span v-else>Sign in with Apple</span>
    </button>
    
    <div v-if="user" class="user-info">
      <h3>Welcome, {{ user.name || user.email }}!</h3>
      <p>Apple ID: {{ user.appleId }}</p>
      <p>Email: {{ user.email }}</p>
      <button @click="handleLogout">Sign Out</button>
    </div>
    
    <div v-if="error" class="error">
      Error: {{ error.message }}
    </div>
  </div>
</template>

<script setup>
import { useApple } from '~/composables/useApple'

const { login, logout, isReady, isLoading, user } = useApple()
const error = ref(null)

const handleAppleLogin = async () => {
  try {
    error.value = null
    const result = await login({ popup: true })
    
    if (!result.success) {
      error.value = result.error
    }
  } catch (err) {
    error.value = { message: 'Login failed' }
  }
}

const handleLogout = async () => {
  try {
    await logout()
    error.value = null
  } catch (err) {
    error.value = { message: 'Logout failed' }
  }
}
</script>

<style scoped>
.apple-login-btn {
  background: #000;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.apple-login-btn:hover:not(:disabled) {
  background: #333;
}

.apple-login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.user-info {
  margin-top: 20px;
  padding: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.error {
  margin-top: 20px;
  padding: 12px;
  background: #fee;
  border: 1px solid #fcc;
  border-radius: 4px;
  color: #c33;
}
</style>
```

## Apple Login with Redirect Mode

```vue
<template>
  <div>
    <button 
      @click="handleAppleRedirectLogin" 
      :disabled="!isReady || isLoading"
      class="apple-login-btn"
    >
      Sign in with Apple (Redirect)
    </button>
  </div>
</template>

<script setup>
import { useApple } from '~/composables/useApple'

const { login, isReady, isLoading } = useApple()

const handleAppleRedirectLogin = async () => {
  try {
    // This will redirect the user to Apple's login page
    await login({ 
      popup: false,
      redirectUrl: 'http://localhost:3000/auth/callback'
    })
  } catch (err) {
    console.error('Apple redirect login failed:', err)
  }
}
</script>
```

## Handling Redirect Callback

Create a callback page to handle the redirect response:

```vue
<!-- pages/auth/callback.vue -->
<template>
  <div>
    <div v-if="isLoading" class="loading">
      Processing Apple login...
    </div>
    
    <div v-else-if="user" class="success">
      <h2>Login Successful!</h2>
      <p>Welcome, {{ user.name || user.email }}!</p>
      <button @click="goHome">Continue to App</button>
    </div>
    
    <div v-else-if="error" class="error">
      <h2>Login Failed</h2>
      <p>{{ error.message }}</p>
      <button @click="goHome">Back to Home</button>
    </div>
  </div>
</template>

<script setup>
import { useApple } from '~/composables/useApple'

const { handleRedirectCallback, isLoading, user } = useApple()
const router = useRouter()
const error = ref(null)

// Handle the callback when the page loads
onMounted(async () => {
  try {
    const result = await handleRedirectCallback()
    
    if (!result.success) {
      error.value = result.error
    } else {
      // Redirect to home page after successful login
      setTimeout(() => {
        router.push('/')
      }, 2000)
    }
  } catch (err) {
    error.value = { message: 'Failed to process login callback' }
  }
})

const goHome = () => {
  router.push('/')
}
</script>

<style scoped>
.loading, .success, .error {
  text-align: center;
  padding: 40px 20px;
}

.success {
  color: #2d5a27;
}

.error {
  color: #c33;
}
</style>
```

## Advanced Usage with Custom Options

```vue
<template>
  <div>
    <button @click="handleAdvancedLogin">
      Advanced Apple Login
    </button>
  </div>
</template>

<script setup>
import { useApple } from '~/composables/useApple'

const { login } = useApple()

const handleAdvancedLogin = async () => {
  try {
    const result = await login({
      popup: true,
      usePopup: true, // Force popup mode
      redirectUrl: 'https://myapp.com/auth/callback'
    })
    
    if (result.success) {
      console.log('Apple login successful:', result.user)
      
      // Access Apple-specific data
      console.log('Identity Token:', result.user.identityToken)
      console.log('Authorization Code:', result.user.authorizationCode)
      
      // Send tokens to your backend for verification
      await $fetch('/api/auth/apple', {
        method: 'POST',
        body: {
          identityToken: result.user.identityToken,
          authorizationCode: result.user.authorizationCode,
          user: result.user
        }
      })
    }
  } catch (err) {
    console.error('Apple login failed:', err)
  }
}
</script>
```

## Error Handling

```vue
<script setup>
import { useApple } from '~/composables/useApple'

const { login } = useApple()

const handleLoginWithErrorHandling = async () => {
  try {
    const result = await login({ popup: true })
    
    if (!result.success) {
      // Handle different error types
      switch (result.error?.code) {
        case 'USER_CANCELLED':
          console.log('User cancelled the login')
          break
        case 'POPUP_BLOCKED':
          console.log('Popup was blocked, try redirect mode')
          // Fallback to redirect mode
          await login({ popup: false })
          break
        case 'TIMEOUT_ERROR':
          console.log('Login timed out, please try again')
          break
        case 'SDK_LOAD_FAILED':
          console.log('Failed to load Apple SDK')
          break
        default:
          console.error('Unknown error:', result.error)
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err)
  }
}
</script>
```

## Integration with Unified Social Login

```vue
<template>
  <div>
    <button @click="handleUnifiedLogin">
      Sign in with Apple (Unified)
    </button>
  </div>
</template>

<script setup>
import { useSocial } from '~/composables/useSocial'

const { loginWithApple } = useSocial()

const handleUnifiedLogin = async () => {
  try {
    const result = await loginWithApple({ popup: true })
    
    if (result.success) {
      console.log('Login successful via unified interface:', result.user)
    }
  } catch (err) {
    console.error('Unified Apple login failed:', err)
  }
}
</script>
```

## Server-Side Token Verification

Here's an example of how to verify Apple tokens on your server:

```javascript
// server/api/auth/apple.post.js
export default defineEventHandler(async (event) => {
  const { identityToken, authorizationCode, user } = await readBody(event)
  
  try {
    // Verify the identity token with Apple's servers
    const applePublicKeys = await $fetch('https://appleid.apple.com/auth/keys')
    
    // Decode and verify the JWT token
    // This is a simplified example - use a proper JWT library
    const decodedToken = jwt.verify(identityToken, applePublicKeys)
    
    // Verify the token claims
    if (decodedToken.aud !== process.env.APPLE_CLIENT_ID) {
      throw new Error('Invalid audience')
    }
    
    if (decodedToken.iss !== 'https://appleid.apple.com') {
      throw new Error('Invalid issuer')
    }
    
    // Create or update user in your database
    const dbUser = await createOrUpdateUser({
      appleId: decodedToken.sub,
      email: decodedToken.email,
      name: user.name,
      identityToken,
      authorizationCode
    })
    
    // Generate your app's session token
    const sessionToken = generateSessionToken(dbUser)
    
    return {
      success: true,
      user: dbUser,
      token: sessionToken
    }
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid Apple token'
    })
  }
})
```

## Best Practices

1. **Always verify tokens server-side**: Never trust client-side tokens alone
2. **Handle popup blockers**: Provide fallback to redirect mode
3. **Store minimal user data**: Only store what you need
4. **Handle token expiration**: Implement proper refresh logic
5. **Test across devices**: Apple login behavior can vary on different devices
6. **Use HTTPS in production**: Apple requires HTTPS for production apps

## Troubleshooting

### Common Issues

1. **Popup blocked**: Use redirect mode as fallback
2. **Invalid client ID**: Check your environment variables
3. **Token verification fails**: Ensure your server-side verification is correct
4. **CORS issues**: Configure your Apple app settings properly

### Debug Mode

```vue
<script setup>
import { useApple } from '~/composables/useApple'

const { login, isReady, isLoading } = useApple()

// Enable debug logging
const handleDebugLogin = async () => {
  console.log('Apple SDK ready:', isReady.value)
  console.log('Apple SDK loading:', isLoading.value)
  
  const result = await login({ popup: true })
  console.log('Login result:', result)
  
  if (result.success) {
    console.log('User data:', result.user)
    console.log('Identity token payload:', parseJWT(result.user.identityToken))
  }
}

// Helper function to parse JWT (for debugging only)
const parseJWT = (token) => {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''))
    return JSON.parse(jsonPayload)
  } catch (e) {
    return null
  }
}
</script>
```