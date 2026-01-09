import {UserEntity} from '@core/entities/User';
import {IUserRepository} from '@core/repositories/IUserRepository';
import {ApiClient} from '@data/api/apiClient';
import {SecureStorageService} from '@infrastructure/storage/secureStorageService';

export interface LoginResult {
  user: UserEntity;
  accessToken: string;
  refreshToken: string;
}

export class LoginUseCase {
  constructor(
    private apiClient: ApiClient,
    private userRepository: IUserRepository,
    private storageService: SecureStorageService,
  ) {}

  async execute(email: string, password: string): Promise<LoginResult> {
    try {
      // Call API to login
      const response = await this.apiClient.login(email, password);

      // Create user entity from response
      const user = UserEntity.fromJson(response.user);

      // Save user to local database
      await this.userRepository.save(user);

      // Save tokens to SecureStore
      await this.storageService.saveTokens(
        response.accessToken,
        response.refreshToken,
      );

      // Save user ID for quick access
      await this.storageService.saveUserId(user.id);

      return {
        user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      };
    } catch (error: any) {
      // Re-throw with more context if needed
      throw new Error(
        error.response?.data?.error?.message || 'Failed to login. Please try again.',
      );
    }
  }
}
