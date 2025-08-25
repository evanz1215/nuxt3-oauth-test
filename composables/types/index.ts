// Core type definitions for social login system

export type SocialPlatform = 'google' | 'apple' | 'line' | 'telegram'

export interface SocialLoginOptions {
  popup?: boolean
  redirectUrl?: string
}

export interface SocialUser {
  id: string
  email?: string
  name?: string
  avatar?: string
  platform: SocialPlatform
  accessToken: string
  refreshToken?: string
}

export interface SocialLoginResult {
  success: boolean
  user?: SocialUser
  error?: SocialError
  platform: SocialPlatform
}

export interface SocialError {
  code: string
  message: string
  platform: SocialPlatform
  details?: any
}

export interface LoginState {
  isLoading: boolean
  platform?: SocialPlatform
  error?: SocialError | null
}

// Google specific types
export interface GoogleLoginOptions extends SocialLoginOptions {
  scopes?: string[]
}

export interface GoogleUser extends SocialUser {
  googleId: string
  familyName?: string
  givenName?: string
}

// Apple specific types
export interface AppleLoginOptions extends SocialLoginOptions {
  usePopup?: boolean
}

export interface AppleUser extends SocialUser {
  appleId: string
  identityToken: string
  authorizationCode: string
}

// Line specific types
export interface LineLoginOptions extends SocialLoginOptions {
  botPrompt?: 'normal' | 'aggressive'
}

export interface LineUser extends SocialUser {
  lineId: string
  displayName?: string
  pictureUrl?: string
  statusMessage?: string
}

// Telegram specific types
export interface TelegramLoginOptions extends SocialLoginOptions {
  size?: 'large' | 'medium' | 'small'
  cornerRadius?: number
}

export interface TelegramUser extends SocialUser {
  telegramId: number
  username?: string
  firstName?: string
  lastName?: string
  photoUrl?: string
}

// Configuration types
export interface SocialConfig {
  google: {
    clientId: string
    redirectUri?: string
  }
  apple: {
    clientId: string
    redirectUri?: string
  }
  line: {
    clientId: string
    redirectUri?: string
  }
  telegram: {
    botToken: string
    botUsername: string
  }
}