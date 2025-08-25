# Telegram Login Usage Examples

This document provides examples of how to use the Telegram login functionality in your Nuxt application.

## Basic Setup

First, make sure you have configured your Telegram bot credentials in your `.env` file:

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_BOT_USERNAME=your_telegram_bot_username
```

## Basic Usage

### Simple Telegram Login

```vue
<template>
  <div>
    <button 
      @click="handleLogin" 
      :disabled="isLoading"
      class="telegram-login-btn"
    >
      <span v-if="isLoading">Logging in...</span>
      <span v-else>Login with Telegram</span>
    </button>

    <div v-if="user" class="user-info">
      <h3>Welcome, {{ user.name }}!</h3>
      <img v-if="user.avatar" :src="user.avatar" :alt="user.name" />
      <p>Telegram ID: {{ user.telegramId }}</p>
      <p v-if="user.username">Username: @{{ user.username }}</p>
      <button @click="handleLogout">Logout</button>
    </div>

    <div v-if="error" class="error">
      <p>Login failed: {{ error.message }}</p>
    </div>
  </div>
</template>

<script setup>
import { useTelegram } from '~/composables'

const { login, logout, isLoading, user } = useTelegram()
const error = ref(null)

const handleLogin = async () => {
  try {
    error.value = null
    const result = await login()
    
    if (!result.success) {
      error.value = result.error
    }
  } catch (err) {
    error.value = { message: 'An unexpected error occurred' }
  }
}

const handleLogout = async () => {
  await logout()
  error.value = null
}
</script>

<style scoped>
.telegram-login-btn {
  background-color: #0088cc;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
}

.telegram-login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.user-info {
  margin-top: 20px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.user-info img {
  width: 64px;
  height: 64px;
  border-radius: 50%;
}

.error {
  margin-top: 20px;
  padding: 12px;
  background-color: #fee;
  border: 1px solid #fcc;
  border-radius: 4px;
  color: #c33;
}
</style>
```

## Advanced Usage

### Telegram Login with Custom Options

```vue
<template>
  <div>
    <div class="login-options">
      <h3>Login with Telegram</h3>
      
      <div class="size-options">
        <label>Widget Size:</label>
        <select v-model="selectedSize">
          <option value="large">Large</option>
          <option value="medium">Medium</option>
          <option value="small">Small</option>
        </select>
      </div>

      <div class="radius-options">
        <label>Corner Radius:</label>
        <input 
          v-model.number="cornerRadius" 
          type="range" 
          min="0" 
          max="20" 
          step="1"
        />
        <span>{{ cornerRadius }}px</span>
      </div>

      <button 
        @click="handleCustomLogin" 
        :disabled="isLoading"
        class="custom-login-btn"
      >
        Login with Custom Settings
      </button>
    </div>

    <div v-if="user" class="user-profile">
      <h3>Telegram Profile</h3>
      <div class="profile-card">
        <img v-if="user.photoUrl" :src="user.photoUrl" :alt="user.name" />
        <div class="profile-info">
          <h4>{{ user.firstName }} {{ user.lastName }}</h4>
          <p v-if="user.username">@{{ user.username }}</p>
          <p>ID: {{ user.telegramId }}</p>
        </div>
      </div>
      <button @click="logout" class="logout-btn">Logout</button>
    </div>
  </div>
</template>

<script setup>
import { useTelegram } from '~/composables'

const { login, logout, isLoading, user } = useTelegram()

const selectedSize = ref('large')
const cornerRadius = ref(8)

const handleCustomLogin = async () => {
  try {
    const result = await login({
      size: selectedSize.value,
      cornerRadius: cornerRadius.value
    })
    
    if (result.success) {
      console.log('Telegram login successful:', result.user)
    } else {
      console.error('Telegram login failed:', result.error)
    }
  } catch (error) {
    console.error('Login error:', error)
  }
}
</script>

<style scoped>
.login-options {
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-bottom: 20px;
}

.size-options, .radius-options {
  margin: 10px 0;
}

.size-options label, .radius-options label {
  display: inline-block;
  width: 120px;
  font-weight: bold;
}

.custom-login-btn {
  background-color: #0088cc;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 15px;
}

.profile-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 8px;
}

.profile-card img {
  width: 60px;
  height: 60px;
  border-radius: 50%;
}

.logout-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}
</style>
```

## Redirect Mode Usage

```vue
<template>
  <div>
    <button @click="handleRedirectLogin">
      Login with Telegram (Redirect)
    </button>
  </div>
</template>

<script setup>
import { useTelegram } from '~/composables'

const { login } = useTelegram()

const handleRedirectLogin = async () => {
  await login({
    popup: false, // Force redirect mode
    redirectUrl: `${window.location.origin}/auth/telegram-callback`
  })
}
</script>
```

## Handling Redirect Callbacks

Create a callback page at `pages/auth/telegram-callback.vue`:

```vue
<template>
  <div>
    <div v-if="isLoading">
      <p>Processing Telegram login...</p>
    </div>
    
    <div v-else-if="user">
      <h2>Login Successful!</h2>
      <p>Welcome, {{ user.name }}!</p>
      <button @click="goHome">Continue to App</button>
    </div>
    
    <div v-else-if="error">
      <h2>Login Failed</h2>
      <p>{{ error.message }}</p>
      <button @click="goHome">Back to Home</button>
    </div>
  </div>
</template>

<script setup>
import { useTelegram } from '~/composables'

const { handleRedirectCallback, isLoading, user } = useTelegram()
const router = useRouter()

const error = ref(null)

onMounted(async () => {
  try {
    const result = await handleRedirectCallback()
    
    if (!result.success) {
      error.value = result.error
    }
  } catch (err) {
    error.value = { message: 'Failed to process login callback' }
  }
})

const goHome = () => {
  router.push('/')
}
</script>
```

## Error Handling

```vue
<template>
  <div>
    <button @click="handleLoginWithErrorHandling">
      Login with Telegram
    </button>
    
    <div v-if="loginError" class="error-message">
      <h4>Login Error</h4>
      <p><strong>Code:</strong> {{ loginError.code }}</p>
      <p><strong>Message:</strong> {{ loginError.message }}</p>
      <p><strong>Platform:</strong> {{ loginError.platform }}</p>
      
      <div v-if="loginError.code === 'USER_CANCELLED'">
        <p>You cancelled the login process. Please try again if you want to log in.</p>
      </div>
      
      <div v-else-if="loginError.code === 'TIMEOUT_ERROR'">
        <p>The login process timed out. Please try again.</p>
      </div>
      
      <div v-else-if="loginError.code === 'INVALID_CONFIG'">
        <p>There's a configuration issue. Please contact support.</p>
      </div>
      
      <button @click="clearError">Dismiss</button>
    </div>
  </div>
</template>

<script setup>
import { useTelegram } from '~/composables'

const { login } = useTelegram()
const loginError = ref(null)

const handleLoginWithErrorHandling = async () => {
  try {
    loginError.value = null
    
    const result = await login()
    
    if (!result.success) {
      loginError.value = result.error
    }
  } catch (error) {
    loginError.value = {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred',
      platform: 'telegram'
    }
  }
}

const clearError = () => {
  loginError.value = null
}
</script>

<style scoped>
.error-message {
  margin-top: 20px;
  padding: 15px;
  background-color: #fee;
  border: 1px solid #fcc;
  border-radius: 6px;
  color: #c33;
}
</style>
```

## Integration with Unified Social Login

```vue
<template>
  <div>
    <h3>Social Login Options</h3>
    
    <div class="social-buttons">
      <button @click="loginWithGoogle" class="google-btn">
        Login with Google
      </button>
      
      <button @click="loginWithApple" class="apple-btn">
        Login with Apple
      </button>
      
      <button @click="loginWithLine" class="line-btn">
        Login with Line
      </button>
      
      <button @click="loginWithTelegram" class="telegram-btn">
        Login with Telegram
      </button>
    </div>
    
    <div v-if="currentUser" class="user-info">
      <h4>Logged in via {{ currentUser.platform }}</h4>
      <p>{{ currentUser.name }}</p>
      <button @click="handleLogout">Logout</button>
    </div>
  </div>
</template>

<script setup>
import { 
  useGoogle, 
  useApple, 
  useLine, 
  useTelegram,
  useSocialState 
} from '~/composables'

const { login: googleLogin } = useGoogle()
const { login: appleLogin } = useApple()
const { login: lineLogin } = useLine()
const { login: telegramLogin, logout: telegramLogout } = useTelegram()

const { currentUser, clearAuthState } = useSocialState()

const loginWithGoogle = () => googleLogin()
const loginWithApple = () => appleLogin()
const loginWithLine = () => lineLogin()
const loginWithTelegram = () => telegramLogin()

const handleLogout = async () => {
  // Logout from the current platform
  if (currentUser.value?.platform === 'telegram') {
    await telegramLogout()
  }
  // Add other platform logouts as needed
  
  clearAuthState()
}
</script>

<style scoped>
.social-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 300px;
}

.social-buttons button {
  padding: 12px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
}

.telegram-btn {
  background-color: #0088cc;
  color: white;
}

.google-btn {
  background-color: #4285f4;
  color: white;
}

.apple-btn {
  background-color: #000;
  color: white;
}

.line-btn {
  background-color: #00c300;
  color: white;
}
</style>
```

## Notes

1. **Bot Setup**: Make sure your Telegram bot is properly configured in the BotFather and has the necessary permissions.

2. **Domain Verification**: Telegram requires domain verification for web login. Make sure your domain is added to your bot's settings.

3. **Security**: The authentication verification in this implementation is simplified for demo purposes. In production, always verify the authentication data on your server side.

4. **Widget Limitations**: Telegram login widgets have some limitations compared to other social platforms. They don't support true popup mode, so the implementation creates a modal-like interface.

5. **Redirect URLs**: When using redirect mode, make sure your redirect URLs are properly configured and whitelisted in your Telegram bot settings.