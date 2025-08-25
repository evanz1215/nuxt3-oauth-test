// Main export file for social login composables
export * from './types'
export * from './utils'
export * from './constants'

// Configuration management
export { useSocialConfig } from './useSocialConfig'

// State management
export { useSocialState } from './useSocialState'

// Individual platform composables
export { useGoogle } from './useGoogle'
export { useApple } from './useApple'
export { useLine } from './useLine'
export { useTelegram } from './useTelegram'

// Unified social login composable
export { useSocial } from './useSocial'