import * as SecureStore from 'expo-secure-store';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'towerforms.access_token',
  REFRESH_TOKEN: 'towerforms.refresh_token',
  USER_ID: 'towerforms.user_id',
} as const;

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export class SecureStorageService {
  private static instance: SecureStorageService;

  private constructor() {}

  static getInstance(): SecureStorageService {
    if (!SecureStorageService.instance) {
      SecureStorageService.instance = new SecureStorageService();
    }
    return SecureStorageService.instance;
  }

  // Token Management
  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      await Promise.all([
        SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
        SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
      ]);
      console.log('[SecureStorageService] Tokens saved successfully');
    } catch (error) {
      console.error('[SecureStorageService] Error saving tokens:', error);
      throw error;
    }
  }

  async getTokens(): Promise<Tokens | null> {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
        SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
      ]);

      if (accessToken && refreshToken) {
        return {accessToken, refreshToken};
      }

      return null;
    } catch (error) {
      console.error('[SecureStorageService] Error getting tokens:', error);
      return null;
    }
  }

  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (error) {
      console.error('[SecureStorageService] Error getting access token:', error);
      return null;
    }
  }

  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    } catch (error) {
      console.error('[SecureStorageService] Error getting refresh token:', error);
      return null;
    }
  }

  async clearTokens(): Promise<void> {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN),
        SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN),
      ]);
      console.log('[SecureStorageService] Tokens cleared');
    } catch (error) {
      console.error('[SecureStorageService] Error clearing tokens:', error);
      throw error;
    }
  }

  // User ID Management
  async saveUserId(userId: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_ID, userId);
      console.log('[SecureStorageService] User ID saved');
    } catch (error) {
      console.error('[SecureStorageService] Error saving user ID:', error);
      throw error;
    }
  }

  async getUserId(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(STORAGE_KEYS.USER_ID);
    } catch (error) {
      console.error('[SecureStorageService] Error getting user ID:', error);
      return null;
    }
  }

  async clearUserId(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_ID);
      console.log('[SecureStorageService] User ID cleared');
    } catch (error) {
      console.error('[SecureStorageService] Error clearing user ID:', error);
      throw error;
    }
  }

  // Clear all auth data
  async clearAll(): Promise<void> {
    try {
      console.log('[SecureStorageService] Clearing all secure storage...');
      await Promise.all([
        this.clearTokens(),
        this.clearUserId(),
      ]);
      console.log('[SecureStorageService] All secure storage cleared');
    } catch (error) {
      console.error('[SecureStorageService] Error clearing all storage:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const secureStorageService = SecureStorageService.getInstance();
