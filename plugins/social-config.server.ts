/**
 * Server-side plugin to validate social login configuration
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  
  // Validate server-side configuration
  const errors: string[] = []
  
  // Check Telegram bot token (server-side only)
  if (config.public.socialLogin.enabledPlatforms.includes('telegram')) {
    if (!config.telegramBotToken) {
      errors.push('TELEGRAM_BOT_TOKEN is required for Telegram login')
    }
    if (!config.public.telegramBotUsername) {
      errors.push('TELEGRAM_BOT_USERNAME is required for Telegram login')
    }
  }
  
  // Check public configuration
  if (config.public.socialLogin.enabledPlatforms.includes('google') && !config.public.googleClientId) {
    errors.push('GOOGLE_CLIENT_ID is required for Google login')
  }
  
  if (config.public.socialLogin.enabledPlatforms.includes('apple') && !config.public.appleClientId) {
    errors.push('APPLE_CLIENT_ID is required for Apple login')
  }
  
  if (config.public.socialLogin.enabledPlatforms.includes('line') && !config.public.lineClientId) {
    errors.push('LINE_CLIENT_ID is required for Line login')
  }
  
  if (errors.length > 0) {
    console.error('❌ Social Login Configuration Errors:')
    errors.forEach(error => console.error(`  - ${error}`))
    console.error('Please check your .env file and ensure all required environment variables are set.')
  } else {
    console.log('✅ Server-side social login configuration validated successfully')
  }
})