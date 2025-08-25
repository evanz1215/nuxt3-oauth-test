import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  setupTestEnvironment,
  cleanupTestEnvironment,
} from "./utils/testHelpers";

// Mock useRuntimeConfig
const mockRuntimeConfig = {
  public: {
    googleClientId: "test-google-client-id",
    appleClientId: "test-apple-client-id",
    lineClientId: "test-line-client-id",
    telegramBotUsername: "test-bot",
    socialLogin: {
      redirectUri: "http://localhost:3000/auth/callback",
      enabledPlatforms: ["google", "apple", "line", "telegram"],
    },
  },
  telegramBotToken: "test-telegram-token",
};

// Mock Nuxt runtime config globally
global.useRuntimeConfig = vi.fn(() => mockRuntimeConfig);

// Mock process.server
Object.defineProperty(global, "process", {
  value: {
    server: false,
  },
});

// Import after mocking
const { useSocialConfig } = await import("../composables/useSocialConfig");

describe("useSocialConfig", () => {
  beforeEach(() => {
    setupTestEnvironment();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  describe("Configuration Retrieval", () => {
    it("should return complete social configuration", () => {
      const { getSocialConfig } = useSocialConfig();
      const config = getSocialConfig();

      expect(config).toEqual({
        google: {
          clientId: "test-google-client-id",
          redirectUri: "http://localhost:3000/auth/callback",
        },
        apple: {
          clientId: "test-apple-client-id",
          redirectUri: "http://localhost:3000/auth/callback",
        },
        line: {
          clientId: "test-line-client-id",
          redirectUri: "http://localhost:3000/auth/callback",
        },
        telegram: {
          botToken: "",
          botUsername: "test-bot",
        },
      });
    });

    it("should get platform-specific configuration", () => {
      const { getPlatformConfig } = useSocialConfig();

      const googleConfig = getPlatformConfig("google");
      expect(googleConfig).toEqual({
        clientId: "test-google-client-id",
        redirectUri: "http://localhost:3000/auth/callback",
      });

      const telegramConfig = getPlatformConfig("telegram");
      expect(telegramConfig).toEqual({
        botToken: "",
        botUsername: "test-bot",
      });
    });

    it("should handle missing configuration gracefully", () => {
      // Mock empty runtime config
      vi.mocked(global.useRuntimeConfig).mockReturnValue({
        public: {},
        telegramBotToken: undefined,
      } as any);

      const { getPlatformConfig } = useSocialConfig();

      const googleConfig = getPlatformConfig("google");
      expect(googleConfig.clientId).toBe("");
      expect(googleConfig.redirectUri).toBeDefined();
    });
  });

  describe("Platform Validation", () => {
    it("should validate platform configuration successfully", () => {
      const { validateConfig } = useSocialConfig();

      // Should not throw for properly configured platforms
      expect(() => validateConfig("google")).not.toThrow();
      expect(() => validateConfig("apple")).not.toThrow();
      expect(() => validateConfig("line")).not.toThrow();
    });

    it("should throw error for invalid configuration", () => {
      // Mock empty runtime config
      vi.mocked(global.useRuntimeConfig).mockReturnValue({
        public: {},
        telegramBotToken: undefined,
      } as any);

      const { validateConfig } = useSocialConfig();

      expect(() => validateConfig("google")).toThrow();
      expect(() => validateConfig("apple")).toThrow();
      expect(() => validateConfig("line")).toThrow();
    });

    it("should validate telegram configuration with bot token", () => {
      const { validateConfig } = useSocialConfig();

      // Telegram validation should pass even without client ID if bot token exists
      expect(() => validateConfig("telegram")).not.toThrow();
    });

    it("should validate all configurations", () => {
      const { validateAllConfigs } = useSocialConfig();
      const validation = validateAllConfigs();

      expect(validation).toHaveProperty("valid");
      expect(validation).toHaveProperty("errors");
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should return validation errors for invalid configs", () => {
      // Mock invalid runtime config
      vi.mocked(global.useRuntimeConfig).mockReturnValue({
        public: {
          googleClientId: "", // Invalid empty client ID
          appleClientId: "valid-apple-id",
          lineClientId: "",
          telegramBotUsername: "test-bot",
        },
        telegramBotToken: "",
      } as any);

      const { validateAllConfigs } = useSocialConfig();
      const validation = validateAllConfigs();

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some((error) => error.includes("google"))).toBe(
        true
      );
    });
  });

  describe("Platform Management", () => {
    it("should check if platform is enabled", () => {
      const { isPlatformEnabled } = useSocialConfig();

      expect(isPlatformEnabled("google")).toBe(true);
      expect(isPlatformEnabled("apple")).toBe(true);
      expect(isPlatformEnabled("line")).toBe(true);
      expect(isPlatformEnabled("telegram")).toBe(true);
    });

    it("should handle disabled platforms", () => {
      // Mock config with disabled platforms
      vi.mocked(global.useRuntimeConfig).mockReturnValue({
        public: {
          googleClientId: "test-google-client-id",
          appleClientId: "test-apple-client-id",
          lineClientId: "test-line-client-id",
          telegramBotUsername: "test-bot",
          socialLogin: {
            redirectUri: "http://localhost:3000/auth/callback",
            enabledPlatforms: ["google", "apple"], // Only Google and Apple enabled
          },
        },
        telegramBotToken: "test-telegram-token",
      } as any);

      const { isPlatformEnabled } = useSocialConfig();

      expect(isPlatformEnabled("google")).toBe(true);
      expect(isPlatformEnabled("apple")).toBe(true);
      expect(isPlatformEnabled("line")).toBe(false);
      expect(isPlatformEnabled("telegram")).toBe(false);
    });

    it("should get enabled platforms list", () => {
      const { getEnabledPlatforms } = useSocialConfig();
      const enabledPlatforms = getEnabledPlatforms();

      expect(enabledPlatforms).toContain("google");
      expect(enabledPlatforms).toContain("apple");
      expect(enabledPlatforms).toContain("line");
      expect(enabledPlatforms).toContain("telegram");
      expect(enabledPlatforms).toHaveLength(4);
    });

    it("should filter enabled platforms correctly", () => {
      // Mock config with only some platforms enabled
      vi.mocked(global.useRuntimeConfig).mockReturnValue({
        public: {
          googleClientId: "test-google-client-id",
          appleClientId: "test-apple-client-id",
          lineClientId: "test-line-client-id",
          telegramBotUsername: "test-bot",
          socialLogin: {
            redirectUri: "http://localhost:3000/auth/callback",
            enabledPlatforms: ["google", "line"],
          },
        },
        telegramBotToken: "test-telegram-token",
      } as any);

      const { getEnabledPlatforms } = useSocialConfig();
      const enabledPlatforms = getEnabledPlatforms();

      expect(enabledPlatforms).toEqual(["google", "line"]);
      expect(enabledPlatforms).not.toContain("apple");
      expect(enabledPlatforms).not.toContain("telegram");
    });
  });

  describe("Configuration Status", () => {
    it("should provide comprehensive configuration status", () => {
      const { getConfigStatus } = useSocialConfig();
      const status = getConfigStatus();

      expect(status).toHaveProperty("config");
      expect(status).toHaveProperty("enabledPlatforms");
      expect(status).toHaveProperty("validation");
      expect(status).toHaveProperty("platformStatus");

      expect(status.platformStatus).toHaveProperty("google");
      expect(status.platformStatus).toHaveProperty("apple");
      expect(status.platformStatus).toHaveProperty("line");
      expect(status.platformStatus).toHaveProperty("telegram");

      // Check platform status structure
      expect(status.platformStatus.google).toHaveProperty("enabled");
      expect(status.platformStatus.google).toHaveProperty("configured");
      expect(status.platformStatus.google).toHaveProperty("valid");
    });

    it("should show correct platform status for mixed configurations", () => {
      // Mock mixed configuration
      vi.mocked(global.useRuntimeConfig).mockReturnValue({
        public: {
          googleClientId: "valid-google-id",
          appleClientId: "", // Invalid
          lineClientId: "valid-line-id",
          telegramBotUsername: "test-bot",
          socialLogin: {
            redirectUri: "http://localhost:3000/auth/callback",
            enabledPlatforms: ["google", "apple", "line"], // Apple enabled but not configured
          },
        },
        telegramBotToken: "test-telegram-token",
      } as any);

      const { getConfigStatus } = useSocialConfig();
      const status = getConfigStatus();

      expect(status.platformStatus.google.enabled).toBe(true);
      expect(status.platformStatus.google.configured).toBe(true);
      expect(status.platformStatus.google.valid).toBe(true);

      expect(status.platformStatus.apple.enabled).toBe(true);
      expect(status.platformStatus.apple.configured).toBe(false);
      expect(status.platformStatus.apple.valid).toBe(false);

      expect(status.platformStatus.telegram.enabled).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined runtime config", () => {
      vi.mocked(global.useRuntimeConfig).mockReturnValue(undefined as any);

      const { getSocialConfig } = useSocialConfig();

      expect(() => getSocialConfig()).not.toThrow();
      const config = getSocialConfig();
      expect(config.google.clientId).toBe("");
    });

    it("should handle missing public config", () => {
      vi.mocked(global.useRuntimeConfig).mockReturnValue({
        telegramBotToken: "test-token",
      } as any);

      const { getSocialConfig } = useSocialConfig();
      const config = getSocialConfig();

      expect(config.google.clientId).toBe("");
      expect(config.telegram.botToken).toBe("");
    });

    it("should handle missing socialLogin config", () => {
      vi.mocked(global.useRuntimeConfig).mockReturnValue({
        public: {
          googleClientId: "test-google-client-id",
        },
      } as unknown);

      const { getSocialConfig, getEnabledPlatforms } = useSocialConfig();
      const config = getSocialConfig();
      const enabledPlatforms = getEnabledPlatforms();

      expect(config.google.redirectUri).toBeDefined();
      expect(enabledPlatforms).toEqual(["google", "apple", "line", "telegram"]); // Default to all
    });

    it("should handle server-side rendering", () => {
      // Mock server environment
      Object.defineProperty(global, "process", {
        value: {
          server: true,
        },
      });

      const { getSocialConfig } = useSocialConfig();

      expect(() => getSocialConfig()).not.toThrow();
    });
  });
});
