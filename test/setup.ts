import { vi } from 'vitest'

// Mock Nuxt composables
global.useRuntimeConfig = vi.fn(() => ({
  public: {
    googleClientId: 'test-google-client-id',
    appleClientId: 'test-apple-client-id',
    lineClientId: 'test-line-client-id',
    telegramBotUsername: 'test-bot',
    socialLogin: {
      redirectUri: 'http://localhost:3000/auth/callback',
      enabledPlatforms: ['google', 'apple', 'line', 'telegram']
    }
  },
  telegramBotToken: 'test-telegram-bot-token'
}))

global.useState = vi.fn((key: string, init?: () => any) => {
  const state = ref(init ? init() : null)
  return state
})

global.ref = vi.fn((value: any) => ({
  value,
  __v_isRef: true
}))

global.readonly = vi.fn((value: any) => value)

global.onMounted = vi.fn((callback: () => void) => {
  // In test environment, immediately call the callback
  if (process.client !== false) {
    callback()
  }
})

// Mock process.client
Object.defineProperty(global, 'process', {
  value: {
    client: true,
    server: false
  },
  writable: true
})