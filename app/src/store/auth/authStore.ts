import {create} from 'zustand';
import {UserEntity} from '@core/entities/User';
import {LoginUseCase} from '@core/use-cases/auth/LoginUseCase';
import {LogoutUseCase} from '@core/use-cases/auth/LogoutUseCase';
import {RefreshTokenUseCase} from '@core/use-cases/auth/RefreshTokenUseCase';
import {GetCurrentUserUseCase} from '@core/use-cases/auth/GetCurrentUserUseCase';
import {ApiClient} from '@data/api/apiClient';
import {SQLiteUserRepository} from '@data/repositories/SQLiteUserRepository';
import {secureStorageService} from '@infrastructure/storage/secureStorageService';

interface AuthState {
  user: UserEntity | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

// Initialize dependencies
const apiClient = ApiClient.getInstance();
const userRepository = new SQLiteUserRepository();

const loginUseCase = new LoginUseCase(
  apiClient,
  userRepository,
  secureStorageService,
);

const logoutUseCase = new LogoutUseCase(userRepository, secureStorageService);

const refreshTokenUseCase = new RefreshTokenUseCase(apiClient, secureStorageService);

const getCurrentUserUseCase = new GetCurrentUserUseCase(userRepository);

export const useAuthStore = create<AuthStore>((set, get) => ({
  // Initial state
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Actions
  login: async (email: string, password: string) => {
    set({isLoading: true, error: null});
    try {
      const result = await loginUseCase.execute(email, password);

      set({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: error.message || 'Failed to login',
      });
      throw error;
    }
  },

  logout: async () => {
    set({isLoading: true, error: null});
    try {
      await logoutUseCase.execute();

      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      // Even if logout fails, clear the state
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: error.message || 'Failed to logout',
      });
    }
  },

  refreshAuth: async () => {
    try {
      const result = await refreshTokenUseCase.execute();

      set({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    } catch (error: any) {
      // If refresh fails, logout the user
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        error: error.message || 'Session expired',
      });
      throw error;
    }
  },

  loadUser: async () => {
    set({isLoading: true});
    try {
      // Get user from local database
      const user = await getCurrentUserUseCase.execute();

      // Get tokens from storage
      const tokens = await secureStorageService.getTokens();

      if (user && tokens) {
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error: any) {
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: error.message,
      });
    }
  },

  clearError: () => {
    set({error: null});
  },

  setLoading: (loading: boolean) => {
    set({isLoading: loading});
  },
}));
