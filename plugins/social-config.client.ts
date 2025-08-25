/**
 * Client-side plugin to validate social login configuration
 */
export default defineNuxtPlugin(() => {
  const { validateAllConfigs, getConfigStatus } = useSocialConfig()
  
  // Validate configuration on client startup
  const validation = validateAllConfigs()
  
  if (!validation.valid) {
    console.warn('Social Login Configuration Issues:', validation.errors)
    
    // In development, show detailed configuration status
    if (process.dev) {
      console.group('Social Login Configuration Status')
      console.table(getConfigStatus())
      console.groupEnd()
    }
  } else {
    console.log('✅ Social login configuration validated successfully')
  }
  
  // Provide global access to configuration validation
  return {
    provide: {
      socialConfigValidation: validation
    }
  }
})