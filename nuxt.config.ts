// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/ui',
    '@nuxt/test-utils',
    '@nuxt/image',
    '@nuxt/eslint'
  ],

  runtimeConfig: {
    // Private keys (only available on server-side)
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    
    // Public keys (exposed to client-side)
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