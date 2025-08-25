# Performance Optimization Usage Examples

This document provides comprehensive examples and strategies for optimizing the performance of the social login system.

## Table of Contents

1. [SDK Loading Optimization](#sdk-loading-optimization)
2. [Bundle Size Optimization](#bundle-size-optimization)
3. [Caching Strategies](#caching-strategies)
4. [Lazy Loading Patterns](#lazy-loading-patterns)
5. [Memory Management](#memory-management)
6. [Network Optimization](#network-optimization)
7. [Performance Monitoring](#performance-monitoring)

## SDK Loading Optimization

### Intelligent SDK Preloading

```typescript
// composables/useSDKPreloader.ts
export const useSDKPreloader = () => {
  const loadedSDKs = ref(new Set<SocialPlatform>());
  const loadingSDKs = ref(new Set<SocialPlatform>());
  const loadPromises = ref(new Map<SocialPlatform, Promise<boolean>>());

  // Preload strategy based on user behavior
  const preloadStrategy = {
    // Preload on hover (desktop)
    onHover: (platform: SocialPlatform) => {
      if (!isMobile() && !loadedSDKs.value.has(platform)) {
        preloadSDK(platform);
      }
    },

    // Preload on focus (keyboard navigation)
    onFocus: (platform: SocialPlatform) => {
      if (!loadedSDKs.value.has(platform)) {
        preloadSDK(platform);
      }
    },

    // Preload popular platforms immediately
    onMount: () => {
      const popularPlatforms: SocialPlatform[] = ["google", "apple"];
      popularPlatforms.forEach((platform) => preloadSDK(platform));
    },

    // Preload based on user history
    onUserHistory: (preferredPlatforms: SocialPlatform[]) => {
      preferredPlatforms.forEach((platform) => preloadSDK(platform));
    },
  };

  const preloadSDK = async (platform: SocialPlatform): Promise<boolean> => {
    // Return existing promise if already loading
    if (loadPromises.value.has(platform)) {
      return await loadPromises.value.get(platform)!;
    }

    // Return true if already loaded
    if (loadedSDKs.value.has(platform)) {
      return true;
    }

    loadingSDKs.value.add(platform);

    const loadPromise = loadPlatformSDK(platform);
    loadPromises.value.set(platform, loadPromise);

    try {
      const success = await loadPromise;
      if (success) {
        loadedSDKs.value.add(platform);
      }
      return success;
    } catch (error) {
      console.error(`Failed to preload ${platform} SDK:`, error);
      return false;
    } finally {
      loadingSDKs.value.delete(platform);
      loadPromises.value.delete(platform);
    }
  };

  const loadPlatformSDK = async (
    platform: SocialPlatform
  ): Promise<boolean> => {
    const startTime = performance.now();

    try {
      switch (platform) {
        case "google":
          await loadGoogleSDK();
          break;
        case "apple":
          await loadAppleSDK();
          break;
        case "line":
          await loadLineSDK();
          break;
        case "telegram":
          await loadTelegramSDK();
          break;
        default:
          throw new Error(`Unknown platform: ${platform}`);
      }

      const loadTime = performance.now() - startTime;
      console.log(`${platform} SDK loaded in ${loadTime.toFixed(2)}ms`);

      return true;
    } catch (error) {
      const loadTime = performance.now() - startTime;
      console.error(
        `${platform} SDK failed to load after ${loadTime.toFixed(2)}ms:`,
        error
      );
      return false;
    }
  };

  // Platform-specific SDK loaders with optimization
  const loadGoogleSDK = async (): Promise<void> => {
    if (window.google?.accounts) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;

      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Google SDK"));

      // Add to head for better caching
      document.head.appendChild(script);
    });
  };

  const loadAppleSDK = async (): Promise<void> => {
    if (window.AppleID) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
      script.async = true;
      script.defer = true;

      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Apple SDK"));

      document.head.appendChild(script);
    });
  };

  const loadLineSDK = async (): Promise<void> => {
    if (window.liff) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://static.line-scdn.net/liff/edge/2/sdk.js";
      script.async = true;
      script.defer = true;

      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load LINE SDK"));

      document.head.appendChild(script);
    });
  };

  const loadTelegramSDK = async (): Promise<void> => {
    // Telegram doesn't have a traditional SDK, just widget script
    return Promise.resolve();
  };

  const isMobile = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  };

  return {
    preloadStrategy,
    preloadSDK,
    loadedSDKs: readonly(loadedSDKs),
    loadingSDKs: readonly(loadingSDKs),
    isSDKLoaded: (platform: SocialPlatform) => loadedSDKs.value.has(platform),
    isSDKLoading: (platform: SocialPlatform) => loadingSDKs.value.has(platform),
  };
};
```

### Optimized Login Component with Preloading

```vue
<template>
  <div class="optimized-social-login">
    <div class="platform-buttons">
      <button
        v-for="platform in platforms"
        :key="platform"
        @click="handleLogin(platform)"
        @mouseenter="handleHover(platform)"
        @focus="handleFocus(platform)"
        :disabled="isLoading || !isSDKReady(platform)"
        :class="getButtonClass(platform)"
      >
        <div class="button-content">
          <div class="platform-icon">
            <component :is="getPlatformIcon(platform)" />
          </div>

          <span class="button-text">
            {{ getButtonText(platform) }}
          </span>

          <!-- Loading indicator -->
          <div
            v-if="preloader.isSDKLoading(platform)"
            class="loading-indicator"
          >
            <div class="spinner-small"></div>
          </div>

          <!-- Ready indicator -->
          <div
            v-else-if="preloader.isSDKLoaded(platform)"
            class="ready-indicator"
          >
            ✓
          </div>
        </div>
      </button>
    </div>

    <!-- Performance metrics (dev mode only) -->
    <div v-if="showMetrics && isDev" class="performance-metrics">
      <h4>Performance Metrics</h4>
      <div class="metrics-grid">
        <div v-for="platform in platforms" :key="platform" class="metric-item">
          <span class="platform-name">{{ platform }}:</span>
          <span class="metric-value">
            {{ getSDKStatus(platform) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useSDKPreloader } from "~/composables/useSDKPreloader";
import { useSocial } from "~/composables/useSocial";

const social = useSocial();
const preloader = useSDKPreloader();

const platforms: SocialPlatform[] = ["google", "apple", "line", "telegram"];
const isLoading = ref(false);
const showMetrics = ref(false);
const isDev = process.env.NODE_ENV === "development";

// Preload popular platforms on mount
onMounted(() => {
  preloader.preloadStrategy.onMount();

  // Load user preferences and preload accordingly
  const userPreferences = getUserPreferences();
  if (userPreferences.preferredPlatforms) {
    preloader.preloadStrategy.onUserHistory(userPreferences.preferredPlatforms);
  }
});

const handleLogin = async (platform: SocialPlatform) => {
  isLoading.value = true;

  try {
    // Ensure SDK is loaded before login
    await preloader.preloadSDK(platform);

    // Proceed with login
    let result;
    switch (platform) {
      case "google":
        result = await social.loginWithGoogle({ popup: true });
        break;
      case "apple":
        result = await social.loginWithApple({ popup: true });
        break;
      case "line":
        result = await social.loginWithLine({ popup: true });
        break;
      case "telegram":
        result = await social.loginWithTelegram();
        break;
    }

    if (result?.success) {
      // Save user preference for future preloading
      saveUserPreference(platform);
    }
  } catch (error) {
    console.error(`Login failed for ${platform}:`, error);
  } finally {
    isLoading.value = false;
  }
};

const handleHover = (platform: SocialPlatform) => {
  preloader.preloadStrategy.onHover(platform);
};

const handleFocus = (platform: SocialPlatform) => {
  preloader.preloadStrategy.onFocus(platform);
};

const isSDKReady = (platform: SocialPlatform): boolean => {
  return preloader.isSDKLoaded(platform);
};

const getButtonClass = (platform: SocialPlatform): string => {
  const baseClass = `platform-btn ${platform}-btn`;

  if (preloader.isSDKLoading(platform)) {
    return `${baseClass} loading`;
  }

  if (preloader.isSDKLoaded(platform)) {
    return `${baseClass} ready`;
  }

  return baseClass;
};

const getButtonText = (platform: SocialPlatform): string => {
  if (preloader.isSDKLoading(platform)) {
    return `Loading ${platform}...`;
  }

  const texts = {
    google: "Continue with Google",
    apple: "Continue with Apple",
    line: "Continue with LINE",
    telegram: "Continue with Telegram",
  };

  return texts[platform];
};

const getSDKStatus = (platform: SocialPlatform): string => {
  if (preloader.isSDKLoading(platform)) return "Loading...";
  if (preloader.isSDKLoaded(platform)) return "Ready";
  return "Not loaded";
};

const getPlatformIcon = (platform: SocialPlatform) => {
  // Return appropriate icon component
  const icons = {
    google: "GoogleIcon",
    apple: "AppleIcon",
    line: "LineIcon",
    telegram: "TelegramIcon",
  };
  return icons[platform];
};

const getUserPreferences = () => {
  if (process.client) {
    const saved = localStorage.getItem("socialLoginPreferences");
    return saved ? JSON.parse(saved) : {};
  }
  return {};
};

const saveUserPreference = (platform: SocialPlatform) => {
  if (process.client) {
    const preferences = getUserPreferences();
    preferences.preferredPlatforms = preferences.preferredPlatforms || [];

    if (!preferences.preferredPlatforms.includes(platform)) {
      preferences.preferredPlatforms.unshift(platform);
      preferences.preferredPlatforms = preferences.preferredPlatforms.slice(
        0,
        3
      ); // Keep top 3
    }

    localStorage.setItem("socialLoginPreferences", JSON.stringify(preferences));
  }
};
</script>

<style scoped>
.optimized-social-login {
  max-width: 400px;
  margin: 0 auto;
}

.platform-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.platform-btn {
  border: none;
  border-radius: 8px;
  padding: 16px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.platform-btn.loading {
  opacity: 0.7;
}

.platform-btn.ready {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.platform-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.button-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.platform-icon {
  width: 20px;
  height: 20px;
}

.button-text {
  flex: 1;
  text-align: left;
  font-weight: 500;
}

.loading-indicator,
.ready-indicator {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.ready-indicator {
  color: #28a745;
  font-weight: bold;
}

.google-btn {
  background: #4285f4;
  color: white;
}
.apple-btn {
  background: #000;
  color: white;
}
.line-btn {
  background: #00c300;
  color: white;
}
.telegram-btn {
  background: #0088cc;
  color: white;
}

.performance-metrics {
  margin-top: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 12px;
}

.metrics-grid {
  display: grid;
  gap: 8px;
}

.metric-item {
  display: flex;
  justify-content: space-between;
}

.platform-name {
  font-weight: 600;
  text-transform: capitalize;
}

.metric-value {
  color: #666;
}
</style>
```

## Bundle Size Optimization

### Dynamic Imports and Code Splitting

```typescript
// composables/useLazySocialLogin.ts
export const useLazySocialLogin = () => {
  const loadedComposables = ref(new Map<SocialPlatform, any>());

  const getComposable = async (platform: SocialPlatform) => {
    // Return cached composable if already loaded
    if (loadedComposables.value.has(platform)) {
      return loadedComposables.value.get(platform);
    }

    // Dynamic import based on platform
    let composable;
    switch (platform) {
      case "google":
        const { useGoogle } = await import("~/composables/useGoogle");
        composable = useGoogle();
        break;
      case "apple":
        const { useApple } = await import("~/composables/useApple");
        composable = useApple();
        break;
      case "line":
        const { useLine } = await import("~/composables/useLine");
        composable = useLine();
        break;
      case "telegram":
        const { useTelegram } = await import("~/composables/useTelegram");
        composable = useTelegram();
        break;
      default:
        throw new Error(`Unknown platform: ${platform}`);
    }

    // Cache the composable
    loadedComposables.value.set(platform, composable);
    return composable;
  };

  const login = async (
    platform: SocialPlatform,
    options?: SocialLoginOptions
  ) => {
    const composable = await getComposable(platform);
    return await composable.login(options);
  };

  const logout = async (platform: SocialPlatform) => {
    const composable = await getComposable(platform);
    return await composable.logout();
  };

  const isReady = async (platform: SocialPlatform): Promise<boolean> => {
    try {
      const composable = await getComposable(platform);
      return composable.isReady.value;
    } catch {
      return false;
    }
  };

  return {
    login,
    logout,
    isReady,
    getComposable,
  };
};
```

### Tree Shaking Optimization

```typescript
// utils/platformUtils.ts - Optimized for tree shaking
export const createGoogleConfig = (clientId: string) => ({ clientId });
export const createAppleConfig = (clientId: string) => ({ clientId });
export const createLineConfig = (clientId: string) => ({ clientId });
export const createTelegramConfig = (
  botToken: string,
  botUsername: string
) => ({ botToken, botUsername });

export const validateGoogleConfig = (config: any): boolean =>
  !!config?.clientId;
export const validateAppleConfig = (config: any): boolean => !!config?.clientId;
export const validateLineConfig = (config: any): boolean => !!config?.clientId;
export const validateTelegramConfig = (config: any): boolean =>
  !!(config?.botToken && config?.botUsername);

// Only import what you need
export { createGoogleConfig, validateGoogleConfig } from "./platformUtils";
```

## Caching Strategies

### SDK Response Caching

```typescript
// utils/sdkCache.ts
class SDKCache {
  private cache = new Map<
    string,
    { data: any; timestamp: number; ttl: number }
  >();

  set(key: string, data: any, ttlMs: number = 300000): void {
    // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

export const sdkCache = new SDKCache();

// Cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => sdkCache.cleanup(), 300000);
}
```

### User Data Caching

```typescript
// composables/useCachedSocialData.ts
export const useCachedSocialData = () => {
  const userCache = ref(
    new Map<string, { user: SocialUser; timestamp: number }>()
  );
  const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  const cacheUser = (user: SocialUser): void => {
    const key = `${user.platform}:${user.id}`;
    userCache.value.set(key, {
      user: { ...user },
      timestamp: Date.now(),
    });

    // Persist to localStorage
    if (process.client) {
      try {
        const cacheData = Array.from(userCache.value.entries());
        localStorage.setItem("socialUserCache", JSON.stringify(cacheData));
      } catch (error) {
        console.warn("Failed to persist user cache:", error);
      }
    }
  };

  const getCachedUser = (
    platform: SocialPlatform,
    userId: string
  ): SocialUser | null => {
    const key = `${platform}:${userId}`;
    const cached = userCache.value.get(key);

    if (!cached) return null;

    if (Date.now() - cached.timestamp > CACHE_TTL) {
      userCache.value.delete(key);
      return null;
    }

    return cached.user;
  };

  const loadCacheFromStorage = (): void => {
    if (process.client) {
      try {
        const stored = localStorage.getItem("socialUserCache");
        if (stored) {
          const cacheData = JSON.parse(stored);
          userCache.value = new Map(cacheData);

          // Clean expired entries
          cleanExpiredCache();
        }
      } catch (error) {
        console.warn("Failed to load user cache:", error);
      }
    }
  };

  const cleanExpiredCache = (): void => {
    const now = Date.now();
    for (const [key, cached] of userCache.value.entries()) {
      if (now - cached.timestamp > CACHE_TTL) {
        userCache.value.delete(key);
      }
    }
  };

  const clearCache = (): void => {
    userCache.value.clear();
    if (process.client) {
      localStorage.removeItem("socialUserCache");
    }
  };

  // Load cache on initialization
  onMounted(() => {
    loadCacheFromStorage();
  });

  return {
    cacheUser,
    getCachedUser,
    clearCache,
    cleanExpiredCache,
  };
};
```

## Lazy Loading Patterns

### Component-Level Lazy Loading

```vue
<!-- components/LazySocialLogin.vue -->
<template>
  <div class="lazy-social-login">
    <div v-if="!shouldLoad" class="placeholder">
      <button @click="loadComponent" class="load-btn">
        Load Social Login Options
      </button>
    </div>

    <Suspense v-else>
      <template #default>
        <SocialLoginComponent />
      </template>
      <template #fallback>
        <div class="loading-skeleton">
          <div class="skeleton-btn" v-for="i in 4" :key="i"></div>
        </div>
      </template>
    </Suspense>
  </div>
</template>

<script setup>
const shouldLoad = ref(false);

// Lazy load the actual component
const SocialLoginComponent = defineAsyncComponent({
  loader: () => import("./SocialLoginComponent.vue"),
  delay: 200,
  timeout: 10000,
  errorComponent: () => import("./SocialLoginError.vue"),
  loadingComponent: () => import("./SocialLoginSkeleton.vue"),
});

const loadComponent = () => {
  shouldLoad.value = true;
};

// Auto-load on intersection (when component comes into view)
const target = ref(null);
const { stop } = useIntersectionObserver(
  target,
  ([{ isIntersecting }]) => {
    if (isIntersecting) {
      loadComponent();
      stop();
    }
  },
  { threshold: 0.1 }
);
</script>

<style scoped>
.lazy-social-login {
  min-height: 200px;
}

.placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.load-btn {
  padding: 12px 24px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.loading-skeleton {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-btn {
  height: 48px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
  border-radius: 8px;
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
```

## Memory Management

### Cleanup and Resource Management

```typescript
// composables/useResourceManager.ts
export const useResourceManager = () => {
  const activeConnections = ref(new Set<string>());
  const eventListeners = ref(new Map<string, () => void>());
  const timers = ref(new Set<number>());

  const addConnection = (id: string): void => {
    activeConnections.value.add(id);
  };

  const removeConnection = (id: string): void => {
    activeConnections.value.delete(id);
  };

  const addEventListener = (
    element: EventTarget,
    event: string,
    handler: () => void
  ): void => {
    const key = `${element.constructor.name}:${event}`;
    element.addEventListener(event, handler);
    eventListeners.value.set(key, () =>
      element.removeEventListener(event, handler)
    );
  };

  const addTimer = (timerId: number): void => {
    timers.value.add(timerId);
  };

  const cleanup = (): void => {
    // Clear all event listeners
    eventListeners.value.forEach((cleanup) => cleanup());
    eventListeners.value.clear();

    // Clear all timers
    timers.value.forEach((timerId) => clearTimeout(timerId));
    timers.value.clear();

    // Close active connections
    activeConnections.value.clear();

    console.log("Resources cleaned up");
  };

  // Auto-cleanup on unmount
  onUnmounted(() => {
    cleanup();
  });

  return {
    addConnection,
    removeConnection,
    addEventListener,
    addTimer,
    cleanup,
  };
};
```

### Memory-Efficient State Management

```typescript
// composables/useEfficientSocialState.ts
export const useEfficientSocialState = () => {
  // Use WeakMap for automatic garbage collection
  const userSessions = new WeakMap<object, SocialUser>();
  const platformStates = ref(new Map<SocialPlatform, any>());

  // Limit the number of stored sessions
  const MAX_SESSIONS = 5;
  const sessionHistory = ref<SocialUser[]>([]);

  const addSession = (user: SocialUser): void => {
    // Add to beginning of array
    sessionHistory.value.unshift(user);

    // Keep only the most recent sessions
    if (sessionHistory.value.length > MAX_SESSIONS) {
      sessionHistory.value = sessionHistory.value.slice(0, MAX_SESSIONS);
    }
  };

  const clearOldSessions = (): void => {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours

    sessionHistory.value = sessionHistory.value.filter((session) => {
      // Assuming session has a timestamp property
      return (session as any).timestamp > cutoffTime;
    });
  };

  // Periodic cleanup
  const cleanupInterval = setInterval(clearOldSessions, 60 * 60 * 1000); // Every hour

  onUnmounted(() => {
    clearInterval(cleanupInterval);
  });

  return {
    addSession,
    clearOldSessions,
    sessionHistory: readonly(sessionHistory),
  };
};
```

## Network Optimization

### Request Batching and Debouncing

```typescript
// utils/networkOptimizer.ts
class NetworkOptimizer {
  private requestQueue = new Map<string, Promise<any>>();
  private batchQueue = new Map<string, any[]>();
  private batchTimers = new Map<string, number>();

  // Deduplicate identical requests
  async deduplicateRequest<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    if (this.requestQueue.has(key)) {
      return await this.requestQueue.get(key)!;
    }

    const promise = requestFn();
    this.requestQueue.set(key, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.requestQueue.delete(key);
    }
  }

  // Batch multiple requests
  batchRequest(
    batchKey: string,
    request: any,
    delay: number = 100
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      // Add request to batch
      if (!this.batchQueue.has(batchKey)) {
        this.batchQueue.set(batchKey, []);
      }

      this.batchQueue.get(batchKey)!.push({ request, resolve, reject });

      // Clear existing timer
      if (this.batchTimers.has(batchKey)) {
        clearTimeout(this.batchTimers.get(batchKey)!);
      }

      // Set new timer
      const timer = setTimeout(() => {
        this.processBatch(batchKey);
      }, delay);

      this.batchTimers.set(batchKey, timer);
    });
  }

  private async processBatch(batchKey: string): Promise<void> {
    const batch = this.batchQueue.get(batchKey);
    if (!batch || batch.length === 0) return;

    this.batchQueue.delete(batchKey);
    this.batchTimers.delete(batchKey);

    try {
      // Process all requests in the batch
      const results = await Promise.allSettled(
        batch.map((item) => item.request())
      );

      // Resolve individual promises
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          batch[index].resolve(result.value);
        } else {
          batch[index].reject(result.reason);
        }
      });
    } catch (error) {
      // Reject all promises in case of batch failure
      batch.forEach((item) => item.reject(error));
    }
  }
}

export const networkOptimizer = new NetworkOptimizer();
```

### Connection Pooling

```typescript
// utils/connectionPool.ts
class ConnectionPool {
  private pools = new Map<string, Connection[]>();
  private maxPoolSize = 5;
  private connectionTimeout = 30000; // 30 seconds

  async getConnection(platform: SocialPlatform): Promise<Connection> {
    const poolKey = `${platform}-pool`;

    if (!this.pools.has(poolKey)) {
      this.pools.set(poolKey, []);
    }

    const pool = this.pools.get(poolKey)!;

    // Try to get an existing connection
    const availableConnection = pool.find(
      (conn) => !conn.inUse && !conn.isExpired()
    );

    if (availableConnection) {
      availableConnection.inUse = true;
      return availableConnection;
    }

    // Create new connection if pool not full
    if (pool.length < this.maxPoolSize) {
      const newConnection = await this.createConnection(platform);
      pool.push(newConnection);
      return newConnection;
    }

    // Wait for a connection to become available
    return await this.waitForConnection(poolKey);
  }

  releaseConnection(connection: Connection): void {
    connection.inUse = false;
    connection.lastUsed = Date.now();
  }

  private async createConnection(
    platform: SocialPlatform
  ): Promise<Connection> {
    // Platform-specific connection creation logic
    return new Connection(platform);
  }

  private async waitForConnection(poolKey: string): Promise<Connection> {
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const pool = this.pools.get(poolKey)!;
        const availableConnection = pool.find((conn) => !conn.inUse);

        if (availableConnection) {
          clearInterval(checkInterval);
          availableConnection.inUse = true;
          resolve(availableConnection);
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error("Connection timeout"));
      }, 10000);
    });
  }
}

class Connection {
  public inUse = false;
  public lastUsed = Date.now();
  public createdAt = Date.now();

  constructor(public platform: SocialPlatform) {}

  isExpired(): boolean {
    return Date.now() - this.lastUsed > 30000; // 30 seconds
  }
}

export const connectionPool = new ConnectionPool();
```

## Performance Monitoring

### Performance Metrics Collection

```typescript
// utils/performanceMonitor.ts
class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric[]>();

  startTiming(operation: string): PerformanceTimer {
    return new PerformanceTimer(operation, this);
  }

  recordMetric(
    operation: string,
    duration: number,
    success: boolean,
    metadata?: any
  ): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    const metric: PerformanceMetric = {
      operation,
      duration,
      success,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.get(operation)!.push(metric);

    // Keep only recent metrics (last 100 per operation)
    const operationMetrics = this.metrics.get(operation)!;
    if (operationMetrics.length > 100) {
      operationMetrics.splice(0, operationMetrics.length - 100);
    }
  }

  getMetrics(operation?: string): PerformanceMetric[] {
    if (operation) {
      return this.metrics.get(operation) || [];
    }

    // Return all metrics
    const allMetrics: PerformanceMetric[] = [];
    this.metrics.forEach((metrics) => allMetrics.push(...metrics));
    return allMetrics;
  }

  getAverageTime(operation: string): number {
    const operationMetrics = this.metrics.get(operation) || [];
    if (operationMetrics.length === 0) return 0;

    const totalTime = operationMetrics.reduce(
      (sum, metric) => sum + metric.duration,
      0
    );
    return totalTime / operationMetrics.length;
  }

  getSuccessRate(operation: string): number {
    const operationMetrics = this.metrics.get(operation) || [];
    if (operationMetrics.length === 0) return 0;

    const successCount = operationMetrics.filter(
      (metric) => metric.success
    ).length;
    return (successCount / operationMetrics.length) * 100;
  }

  generateReport(): PerformanceReport {
    const report: PerformanceReport = {
      timestamp: Date.now(),
      operations: {},
    };

    this.metrics.forEach((metrics, operation) => {
      report.operations[operation] = {
        totalCalls: metrics.length,
        averageTime: this.getAverageTime(operation),
        successRate: this.getSuccessRate(operation),
        recentMetrics: metrics.slice(-10), // Last 10 metrics
      };
    });

    return report;
  }
}

class PerformanceTimer {
  private startTime: number;

  constructor(private operation: string, private monitor: PerformanceMonitor) {
    this.startTime = performance.now();
  }

  end(success: boolean = true, metadata?: any): number {
    const duration = performance.now() - this.startTime;
    this.monitor.recordMetric(this.operation, duration, success, metadata);
    return duration;
  }
}

interface PerformanceMetric {
  operation: string;
  duration: number;
  success: boolean;
  timestamp: number;
  metadata?: any;
}

interface PerformanceReport {
  timestamp: number;
  operations: Record<
    string,
    {
      totalCalls: number;
      averageTime: number;
      successRate: number;
      recentMetrics: PerformanceMetric[];
    }
  >;
}

export const performanceMonitor = new PerformanceMonitor();
```

### Performance-Optimized Social Login

```vue
<template>
  <div class="performance-optimized-login">
    <div class="login-buttons">
      <button
        v-for="platform in platforms"
        :key="platform"
        @click="handleOptimizedLogin(platform)"
        :disabled="isLoading"
        :class="`platform-btn ${platform}-btn`"
      >
        {{ getPlatformText(platform) }}
      </button>
    </div>

    <!-- Performance Dashboard (dev mode) -->
    <div v-if="showPerformanceDashboard && isDev" class="performance-dashboard">
      <h4>Performance Dashboard</h4>
      <div class="metrics-display">
        <div
          v-for="(stats, operation) in performanceStats"
          :key="operation"
          class="metric-row"
        >
          <span class="operation-name">{{ operation }}:</span>
          <span class="avg-time">{{ stats.averageTime.toFixed(2) }}ms</span>
          <span class="success-rate">{{ stats.successRate.toFixed(1) }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { performanceMonitor } from "~/utils/performanceMonitor";
import { useSocial } from "~/composables/useSocial";

const social = useSocial();
const platforms: SocialPlatform[] = ["google", "apple", "line", "telegram"];
const isLoading = ref(false);
const showPerformanceDashboard = ref(false);
const isDev = process.env.NODE_ENV === "development";

const performanceStats = computed(() => {
  const report = performanceMonitor.generateReport();
  return report.operations;
});

const handleOptimizedLogin = async (platform: SocialPlatform) => {
  const timer = performanceMonitor.startTiming(`${platform}-login`);
  isLoading.value = true;

  try {
    let result;

    switch (platform) {
      case "google":
        result = await social.loginWithGoogle({ popup: true });
        break;
      case "apple":
        result = await social.loginWithApple({ popup: true });
        break;
      case "line":
        result = await social.loginWithLine({ popup: true });
        break;
      case "telegram":
        result = await social.loginWithTelegram();
        break;
    }

    const success = result?.success || false;
    timer.end(success, { platform, mode: "popup" });

    if (success) {
      console.log(`${platform} login completed successfully`);
    }
  } catch (error) {
    timer.end(false, { platform, error: error.message });
    console.error(`${platform} login failed:`, error);
  } finally {
    isLoading.value = false;
  }
};

const getPlatformText = (platform: SocialPlatform): string => {
  const texts = {
    google: "Google",
    apple: "Apple",
    line: "LINE",
    telegram: "Telegram",
  };
  return `Login with ${texts[platform]}`;
};

// Toggle performance dashboard with keyboard shortcut
onMounted(() => {
  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.ctrlKey && event.shiftKey && event.key === "P") {
      showPerformanceDashboard.value = !showPerformanceDashboard.value;
    }
  };

  document.addEventListener("keydown", handleKeyPress);

  onUnmounted(() => {
    document.removeEventListener("keydown", handleKeyPress);
  });
});
</script>

<style scoped>
.performance-optimized-login {
  max-width: 400px;
  margin: 0 auto;
}

.login-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.platform-btn {
  padding: 12px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  color: white;
  transition: transform 0.1s ease;
}

.platform-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.google-btn {
  background: #4285f4;
}
.apple-btn {
  background: #000;
}
.line-btn {
  background: #00c300;
}
.telegram-btn {
  background: #0088cc;
}

.performance-dashboard {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 15px;
  font-size: 12px;
}

.performance-dashboard h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
}

.metrics-display {
  display: grid;
  gap: 5px;
}

.metric-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 10px;
  align-items: center;
}

.operation-name {
  font-weight: 600;
}

.avg-time {
  color: #007bff;
  font-family: monospace;
}

.success-rate {
  color: #28a745;
  font-family: monospace;
}
</style>
```

This comprehensive performance optimization guide provides strategies for improving the social login system's performance across multiple dimensions including SDK loading, bundle size, caching, lazy loading, memory management, network optimization, and performance monitoring.
