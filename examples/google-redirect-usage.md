# Google Redirect Login Usage

This example demonstrates how to use the Google redirect login mode with the `useGoogle` composable.

## Basic Usage

```vue
<template>
  <div>
    <h1>Google Redirect Login Example</h1>
    
    <!-- Login Button -->
    <button 
      v-if="!user" 
      @click="handleLogin"
      :disabled="isLoading"
    >
      {{ isLoading ? 'Logging in...' : 'Login with Google (Redirect)' }}
    </button>
    
    <!-- User Info -->
    <div v-if="user" class="user-info">
      <h2>Welcome, {{ user.name }}!</h2>
      <img :src="user.avatar" :alt="user.name" />
      <p>Email: {{ user.email }}</p>
      <button @click="handleLogout">Logout</button>
    </div>
    
    <!-- Error Display -->
    <div v-if="error" class="error">
      <p>Login failed: {{ error.message }}</p>
      <button @click="clearError">Try Again</button>
    </div>
  </div>
</template>

<script setup>
import { useGoogle } from '~/composables/useGoogle'

const { user, isLoading, login, logout } = useGoogle()

const error = ref(null)

const handleLogin = async () => {
  try {
    error.value = null
    
    // Use redirect mode (popup: false)
    const result = await login({ popup: false })
    
    if (!result.success) {
      error.value = result.error
    }
    // If successful, the page will redirect and come back with user data
  } catch (err) {
    error.value = err
  }
}

const handleLogout = async () => {
  try {
    await logout()
  } catch (err) {
    console.error('Logout failed:', err)
  }
}

const clearError = () => {
  error.value = null
}
</script>

<style scoped>
.user-info {
  border: 1px solid #ccc;
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
}

.user-info img {
  width: 64px;
  height: 64px;
  border-radius: 50%;
}

.error {
  color: red;
  border: 1px solid red;
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
}
</style>
```

## How Redirect Mode Works

1. **Initiate Login**: When `login({ popup: false })` is called, the user is redirected to Google's OAuth page
2. **User Authorization**: User grants permission on Google's site
3. **Callback Handling**: Google redirects back to your app with an authorization code
4. **Token Exchange**: The composable automatically exchanges the code for an access token
5. **User Data**: User information is fetched and stored in the composable state

## Callback URL Configuration

Make sure your Google OAuth app is configured with the correct redirect URI:

```
http://localhost:3000/auth/callback  (for development)
https://yourdomain.com/auth/callback  (for production)
```

## Environment Configuration

Set up your `.env` file:

```env
GOOGLE_CLIENT_ID=your_google_client_id_here
```

## Advanced Usage with Custom Scopes

```vue
<script setup>
const { login } = useGoogle()

const handleLoginWithCustomScopes = async () => {
  const result = await login({
    popup: false,
    scopes: ['profile', 'email', 'https://www.googleapis.com/auth/calendar.readonly']
  })
  
  if (result.success) {
    console.log('User logged in with calendar access:', result.user)
  }
}
</script>
```

## Error Handling

The redirect mode handles various error scenarios:

- **User cancellation**: When user denies permission
- **State mismatch**: CSRF protection validation
- **Expired state**: Protection against replay attacks
- **Network errors**: Token exchange or user info fetch failures

## Security Features

- **CSRF Protection**: Uses state parameter to prevent cross-site request forgery
- **State Expiration**: Login state expires after 10 minutes
- **Secure Token Exchange**: Authorization code is exchanged for access token
- **URL Cleanup**: Removes OAuth parameters from URL after successful login

## Automatic Callback Detection

The composable automatically detects when the page loads with OAuth callback parameters and processes them:

```javascript
// This happens automatically when the composable is initialized
if (isRedirectCallback()) {
  // Process the callback and update user state
  handleRedirectCallback()
}
```

## Comparison with Popup Mode

| Feature | Redirect Mode | Popup Mode |
|---------|---------------|------------|
| User Experience | Page redirect | Stays on page |
| Mobile Support | Better | Limited |
| Popup Blockers | Not affected | May be blocked |
| Browser Compatibility | Universal | Modern browsers |
| Implementation | Simpler | More complex |

## Best Practices

1. **Use redirect mode for mobile devices** - Better user experience
2. **Handle loading states** - Show appropriate UI during redirect flow  
3. **Implement error handling** - Gracefully handle authorization failures
4. **Configure proper redirect URIs** - Ensure security and functionality
5. **Test thoroughly** - Verify behavior across different browsers and devices