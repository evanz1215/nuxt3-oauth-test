# Social Login Configuration Usage

This document demonstrates how to use the social login configuration system.

## Environment Setup

1. Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

2. Fill in your actual client IDs and tokens:
```env
GOOGLE_CLIENT_ID=your_actual_google_client_id
APPLE_CLIENT_ID=your_actual_apple_client_id
LINE_CLIENT_ID=your_actual_line_client_id
TELEGRAM_BOT_TOKEN=your_actual_telegram_bot_token
TELEGRAM_BOT_USERNAME=your_actual_bot_username
```

## Using the Configuration Composable

### Basic Usage

```vue
<script setup>
const { 
  getSocialConfig, 
  isPlatformEnabled, 
  getEnabledPlatforms,
  validateConfig 
} = useSocialConfig()

// Get all configuration
const config = getSocialConfig()

// Check if specific platforms are enabled
const isGoogleEnabled = isPlatformEnabled('google')
const isAppleEnabled = isPlatformEnabled('apple')

// Get list of all enabled platforms
const enabledPlatforms = getEnabledPlatforms()
</script>

<template>
  <div>
    <h2>Available Social Login Platforms</h2>
    <ul>
      <li v-for="platform in enabledPlatforms" :key="platform">
        {{ platform }} - ✅ Configured
      </li>
    </ul>
  </div>
</template>
```

### Validation and Error Handling

```vue
<script setup>
const { validateAllConfigs, getConfigStatus } = useSocialConfig()

// Validate all configurations
const validation = validateAllConfigs()

if (!validation.valid) {
  console.error('Configuration errors:', validation.errors)
}

// Get detailed status for debugging
const status = getConfigStatus()
console.log('Configuration status:', status)
</script>
```

### Platform-Specific Configuration

```vue
<script setup>
const { getPlatformConfig, validateConfig } = useSocialConfig()

// Get configuration for a specific platform
try {
  const googleConfig = getPlatformConfig('google')
  validateConfig('google')
  console.log('Google login is ready:', googleConfig)
} catch (error) {
  console.error('Google configuration error:', error.message)
}
</script>
```

## Configuration Validation

The system automatically validates configuration on startup through plugins:

- **Client-side**: `plugins/social-config.client.ts` validates public configuration
- **Server-side**: `plugins/social-config.server.ts` validates server-side configuration

### Development Mode

In development mode, detailed configuration status is logged to the console:

```javascript
// Console output example
✅ Social login configuration validated successfully

// Or if there are issues:
❌ Social Login Configuration Errors:
  - google: Missing GOOGLE_CLIENT_ID for google login
  - telegram: Missing TELEGRAM_BOT_TOKEN for telegram login
```

## Runtime Configuration

The configuration is managed through Nuxt's runtime config in `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  runtimeConfig: {
    // Private (server-side only)
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    
    // Public (client-side accessible)
    public: {
      googleClientId: process.env.GOOGLE_CLIENT_ID || '',
      appleClientId: process.env.APPLE_CLIENT_ID || '',
      lineClientId: process.env.LINE_CLIENT_ID || '',
      telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME || '',
      socialLogin: {
        redirectUri: process.env.SOCIAL_REDIRECT_URI || '',
        enabledPlatforms: process.env.ENABLED_PLATFORMS?.split(',') || ['google', 'apple', 'line', 'telegram']
      }
    }
  }
})
```

## Error Handling

The configuration system provides comprehensive error handling:

- **Missing Configuration**: Clear error messages for missing client IDs
- **Invalid Platforms**: Validation for unsupported platforms
- **Runtime Validation**: Automatic validation on app startup
- **Development Feedback**: Detailed logging in development mode