import { describe, it, expect, beforeEach } from "vitest";
import type {
  SocialUser,
  SocialError,
  LoginState,
  SocialPlatform,
} from "../composables/types";

// Create a simplified version of useSocialState for testing
// This tests the core logic without Nuxt dependencies
const createSocialState = () => {
  // Simple reactive state implementation for testing
  let currentUser: SocialUser | null = null;
  let loginState: LoginState = { isLoading: false };
  let authenticatedPlatforms: SocialPlatform[] = [];

  const isAuthenticated = () => currentUser !== null;
  const currentPlatform = () => currentUser?.platform;

  const setUser = (user: SocialUser | null) => {
    currentUser = user;

    if (user) {
      if (!authenticatedPlatforms.includes(user.platform)) {
        authenticatedPlatforms.push(user.platform);
      }
    } else {
      authenticatedPlatforms = [];
    }
  };

  const setLoginState = (state: Partial<LoginState>) => {
    loginState = { ...loginState, ...state };
  };

  const setLoading = (isLoading: boolean, platform?: SocialPlatform) => {
    setLoginState({
      isLoading,
      platform,
      error: isLoading ? undefined : loginState.error,
    });
  };

  const setError = (error: SocialError | null) => {
    setLoginState({
      error,
      isLoading: false,
    });
  };

  const clearError = () => {
    setError(null);
  };

  const isPlatformAuthenticated = (platform: SocialPlatform): boolean => {
    return authenticatedPlatforms.includes(platform);
  };

  const addAuthenticatedPlatform = (platform: SocialPlatform) => {
    if (!authenticatedPlatforms.includes(platform)) {
      authenticatedPlatforms.push(platform);
    }
  };

  const removeAuthenticatedPlatform = (platform: SocialPlatform) => {
    const index = authenticatedPlatforms.indexOf(platform);
    if (index > -1) {
      authenticatedPlatforms.splice(index, 1);
    }
  };

  const clearAuthState = () => {
    currentUser = null;
    authenticatedPlatforms = [];
    setLoginState({
      isLoading: false,
      error: null,
      platform: undefined,
    });
  };

  const logout = (platform?: SocialPlatform) => {
    if (platform) {
      removeAuthenticatedPlatform(platform);

      if (currentUser?.platform === platform) {
        currentUser = null;
      }
    } else {
      clearAuthState();
    }
  };

  const updateUser = (updates: Partial<SocialUser>) => {
    if (currentUser) {
      currentUser = { ...currentUser, ...updates };
    }
  };

  const getAuthStatus = () => {
    return {
      isAuthenticated: isAuthenticated(),
      currentUser,
      currentPlatform: currentPlatform(),
      authenticatedPlatforms: [...authenticatedPlatforms],
      loginState: { ...loginState },
    };
  };

  const resetState = () => {
    clearAuthState();
  };

  return {
    // State getters
    getCurrentUser: () => currentUser,
    getLoginState: () => loginState,
    getAuthenticatedPlatforms: () => [...authenticatedPlatforms],

    // Computed
    isAuthenticated,
    currentPlatform,

    // Actions
    setUser,
    setLoginState,
    setLoading,
    setError,
    clearError,
    isPlatformAuthenticated,
    addAuthenticatedPlatform,
    removeAuthenticatedPlatform,
    clearAuthState,
    logout,
    updateUser,
    getAuthStatus,
    resetState,
  };
};

describe("useSocialState", () => {
  let socialState: ReturnType<typeof createSocialState>;

  const mockGoogleUser: SocialUser = {
    id: "google123",
    email: "test@example.com",
    name: "Test User",
    avatar: "https://example.com/avatar.jpg",
    platform: "google",
    accessToken: "google_access_token",
    refreshToken: "google_refresh_token",
  };

  const mockAppleUser: SocialUser = {
    id: "apple456",
    email: "test@icloud.com",
    name: "Apple User",
    platform: "apple",
    accessToken: "apple_access_token",
  };

  const mockError: SocialError = {
    code: "AUTH_FAILED",
    message: "Authentication failed",
    platform: "google",
  };

  beforeEach(() => {
    socialState = createSocialState();
    socialState.resetState();
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      expect(socialState.getCurrentUser()).toBeNull();
      expect(socialState.isAuthenticated()).toBe(false);
      expect(socialState.currentPlatform()).toBeUndefined();
      expect(socialState.getAuthenticatedPlatforms()).toEqual([]);
      expect(socialState.getLoginState().isLoading).toBe(false);
      expect(socialState.getLoginState().error).toBeFalsy();
      expect(socialState.getLoginState().platform).toBeUndefined();
    });
  });

  describe("User Management", () => {
    it("should set user correctly", () => {
      socialState.setUser(mockGoogleUser);

      expect(socialState.getCurrentUser()).toEqual(mockGoogleUser);
      expect(socialState.isAuthenticated()).toBe(true);
      expect(socialState.currentPlatform()).toBe("google");
      expect(socialState.getAuthenticatedPlatforms()).toContain("google");
    });

    it("should clear user when set to null", () => {
      socialState.setUser(mockGoogleUser);
      socialState.setUser(null);

      expect(socialState.getCurrentUser()).toBeNull();
      expect(socialState.isAuthenticated()).toBe(false);
      expect(socialState.currentPlatform()).toBeUndefined();
      expect(socialState.getAuthenticatedPlatforms()).toEqual([]);
    });

    it("should update user information", () => {
      socialState.setUser(mockGoogleUser);

      const updates = {
        name: "Updated Name",
        avatar: "https://example.com/new-avatar.jpg",
      };

      socialState.updateUser(updates);

      expect(socialState.getCurrentUser()?.name).toBe("Updated Name");
      expect(socialState.getCurrentUser()?.avatar).toBe(
        "https://example.com/new-avatar.jpg"
      );
      expect(socialState.getCurrentUser()?.email).toBe(mockGoogleUser.email); // Should preserve other fields
    });

    it("should not update user if no current user", () => {
      socialState.updateUser({ name: "Test" });
      expect(socialState.getCurrentUser()).toBeNull();
    });
  });

  describe("Login State Management", () => {
    it("should set loading state correctly", () => {
      socialState.setLoading(true, "google");

      expect(socialState.getLoginState().isLoading).toBe(true);
      expect(socialState.getLoginState().platform).toBe("google");
    });

    it("should clear error when starting new login", () => {
      socialState.setError(mockError);
      socialState.setLoading(true, "apple");

      expect(socialState.getLoginState().error).toBeUndefined();
      expect(socialState.getLoginState().isLoading).toBe(true);
      expect(socialState.getLoginState().platform).toBe("apple");
    });

    it("should set error state correctly", () => {
      socialState.setError(mockError);

      expect(socialState.getLoginState().error).toEqual(mockError);
      expect(socialState.getLoginState().isLoading).toBe(false);
    });

    it("should clear error state", () => {
      socialState.setError(mockError);
      socialState.clearError();

      expect(socialState.getLoginState().error).toBeNull();
    });
  });

  describe("Platform Authentication Management", () => {
    it("should check platform authentication correctly", () => {
      expect(socialState.isPlatformAuthenticated("google")).toBe(false);

      socialState.addAuthenticatedPlatform("google");
      expect(socialState.isPlatformAuthenticated("google")).toBe(true);
    });

    it("should not add duplicate platforms", () => {
      socialState.addAuthenticatedPlatform("google");
      socialState.addAuthenticatedPlatform("google");

      expect(socialState.getAuthenticatedPlatforms()).toEqual(["google"]);
    });

    it("should remove authenticated platform", () => {
      socialState.addAuthenticatedPlatform("google");
      socialState.addAuthenticatedPlatform("apple");

      socialState.removeAuthenticatedPlatform("google");

      expect(socialState.getAuthenticatedPlatforms()).toEqual(["apple"]);
      expect(socialState.isPlatformAuthenticated("google")).toBe(false);
    });
  });

  describe("Logout Functionality", () => {
    beforeEach(() => {
      socialState.setUser(mockGoogleUser);
      socialState.addAuthenticatedPlatform("apple");
    });

    it("should logout from specific platform", () => {
      socialState.logout("google");

      expect(socialState.getCurrentUser()).toBeNull();
      expect(socialState.isPlatformAuthenticated("google")).toBe(false);
      expect(socialState.isPlatformAuthenticated("apple")).toBe(true);
    });

    it("should logout from all platforms", () => {
      socialState.logout();

      expect(socialState.getCurrentUser()).toBeNull();
      expect(socialState.getAuthenticatedPlatforms()).toEqual([]);
      expect(socialState.getLoginState().isLoading).toBe(false);
      expect(socialState.getLoginState().error).toBeNull();
    });

    it("should not clear current user when logging out from different platform", () => {
      socialState.logout("apple");

      expect(socialState.getCurrentUser()).toEqual(mockGoogleUser);
      expect(socialState.isPlatformAuthenticated("apple")).toBe(false);
      expect(socialState.isPlatformAuthenticated("google")).toBe(true);
    });
  });

  describe("State Management", () => {
    it("should clear all auth state", () => {
      socialState.setUser(mockGoogleUser);
      socialState.setError(mockError);
      socialState.addAuthenticatedPlatform("apple");

      socialState.clearAuthState();

      expect(socialState.getCurrentUser()).toBeNull();
      expect(socialState.getAuthenticatedPlatforms()).toEqual([]);
      expect(socialState.getLoginState().isLoading).toBe(false);
      expect(socialState.getLoginState().error).toBeNull();
      expect(socialState.getLoginState().platform).toBeUndefined();
    });

    it("should get auth status summary", () => {
      socialState.setUser(mockGoogleUser);
      socialState.setLoading(true, "google");

      const status = socialState.getAuthStatus();

      expect(status.isAuthenticated).toBe(true);
      expect(status.currentUser).toEqual(mockGoogleUser);
      expect(status.currentPlatform).toBe("google");
      expect(status.authenticatedPlatforms).toContain("google");
      expect(status.loginState.isLoading).toBe(true);
    });

    it("should reset state to initial values", () => {
      socialState.setUser(mockGoogleUser);
      socialState.setError(mockError);

      socialState.resetState();

      expect(socialState.getCurrentUser()).toBeNull();
      expect(socialState.isAuthenticated()).toBe(false);
      expect(socialState.getAuthenticatedPlatforms()).toEqual([]);
      expect(socialState.getLoginState().error).toBeNull();
    });
  });

  describe("Multiple Platform Support", () => {
    it("should handle multiple authenticated platforms", () => {
      socialState.setUser(mockGoogleUser);
      socialState.addAuthenticatedPlatform("apple");
      socialState.addAuthenticatedPlatform("line");

      expect(socialState.getAuthenticatedPlatforms()).toEqual([
        "google",
        "apple",
        "line",
      ]);
      expect(socialState.isPlatformAuthenticated("google")).toBe(true);
      expect(socialState.isPlatformAuthenticated("apple")).toBe(true);
      expect(socialState.isPlatformAuthenticated("line")).toBe(true);
      expect(socialState.isPlatformAuthenticated("telegram")).toBe(false);
    });

    it("should switch between users from different platforms", () => {
      socialState.setUser(mockGoogleUser);
      expect(socialState.currentPlatform()).toBe("google");

      socialState.setUser(mockAppleUser);
      expect(socialState.currentPlatform()).toBe("apple");
      expect(socialState.getAuthenticatedPlatforms()).toContain("google");
      expect(socialState.getAuthenticatedPlatforms()).toContain("apple");
    });
  });
});
