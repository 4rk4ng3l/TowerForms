import {IUserRepository} from '@core/repositories/IUserRepository';
import {SecureStorageService} from '@infrastructure/storage/secureStorageService';

export class LogoutUseCase {
  constructor(
    private userRepository: IUserRepository,
    private storageService: SecureStorageService,
  ) {}

  async execute(): Promise<void> {
    try {
      // Clear tokens from SecureStore
      await this.storageService.clearTokens();

      // Clear user ID
      await this.storageService.clearUserId();

      // Clear users from local database
      await this.userRepository.clear();

      // Note: In a real app, you might want to call an API endpoint
      // to invalidate the refresh token on the server
      // await this.apiClient.logout();

      // You might also want to clear other local data like forms, submissions, etc.
      // This depends on your app's requirements
    } catch (error: any) {
      // Even if there's an error, we should still clear local data
      console.error('Error during logout:', error);
      throw new Error('Failed to logout properly');
    }
  }
}
