import {ApiClient} from '@data/api/apiClient';
import {SecureStorageService} from '@infrastructure/storage/secureStorageService';

export interface RefreshTokenResult {
  accessToken: string;
  refreshToken: string;
}

export class RefreshTokenUseCase {
  constructor(
    private apiClient: ApiClient,
    private storageService: SecureStorageService,
  ) {}

  async execute(): Promise<RefreshTokenResult> {
    try {
      // Get current refresh token
      const tokens = await this.storageService.getTokens();

      if (!tokens?.refreshToken) {
        throw new Error('No refresh token available');
      }

      // Call API to refresh token
      const response = await this.apiClient.refreshToken(tokens.refreshToken);

      // Save new tokens
      await this.storageService.saveTokens(
        response.accessToken,
        response.refreshToken,
      );

      return {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      };
    } catch (error: any) {
      // If refresh fails, clear tokens (user needs to login again)
      await this.storageService.clearTokens();
      throw new Error('Session expired. Please login again.');
    }
  }
}
