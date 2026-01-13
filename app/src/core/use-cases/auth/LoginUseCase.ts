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
      console.log('[LoginUseCase] Starting login for:', email);

      // Call API to login
      const response = await this.apiClient.login(email, password);
      console.log('[LoginUseCase] API login successful');

      // Create user entity from response
      const user = UserEntity.fromJson(response.user);

      // Save user to local database
      await this.userRepository.save(user);
      console.log('[LoginUseCase] User saved to database');

      // Save tokens to SecureStore
      await this.storageService.saveTokens(
        response.accessToken,
        response.refreshToken,
      );
      console.log('[LoginUseCase] Tokens saved to secure storage');

      // Save user ID for quick access
      await this.storageService.saveUserId(user.id);
      console.log('[LoginUseCase] Login completed successfully');

      return {
        user,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      };
    } catch (error: any) {
      console.error('[LoginUseCase] Login failed:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
      });

      // Handle different types of errors
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        throw new Error('Error de conexión: Tiempo de espera agotado. Verifica tu conexión a internet.');
      }

      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        throw new Error('Error de red: No se puede conectar al servidor. Verifica tu conexión a internet.');
      }

      if (error.response?.status === 401) {
        throw new Error('Email o contraseña incorrectos.');
      }

      if (error.response?.status === 500) {
        throw new Error('Error del servidor. Por favor intenta más tarde.');
      }

      // Re-throw with more context
      throw new Error(
        error.response?.data?.error?.message || error.message || 'Error al iniciar sesión. Por favor intenta nuevamente.',
      );
    }
  }
}
