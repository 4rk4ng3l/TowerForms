import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import {secureStorageService} from '@infrastructure/storage/secureStorageService';
import {API_CONFIG, API_ENDPOINTS} from './config';

interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    errors?: string[];
  };
}

export class ApiClient {
  private static instance: ApiClient;
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
  }> = [];

  private constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  private setupInterceptors(): void {
    // Request interceptor: Add JWT token to requests
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await secureStorageService.getAccessToken();

        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        console.log(
          `[ApiClient] ${config.method?.toUpperCase()} ${config.url}`,
        );
        return config;
      },
      error => {
        console.error('[ApiClient] Request error:', error);
        return Promise.reject(error);
      },
    );

    // Response interceptor: Handle 401 errors and refresh token
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error: AxiosError<ApiError>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
          _retry?: boolean;
        };

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Queue the request while token is being refreshed
            return new Promise((resolve, reject) => {
              this.failedQueue.push({resolve, reject});
            })
              .then(token => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                return this.client(originalRequest);
              })
              .catch(err => {
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = await secureStorageService.getRefreshToken();

            if (!refreshToken) {
              // No refresh token available, user needs to login again
              throw new Error('No refresh token available');
            }

            // Attempt to refresh the token
            const response = await this.client.post(
              API_ENDPOINTS.REFRESH_TOKEN,
              {
                refreshToken,
              },
            );

            const {accessToken, refreshToken: newRefreshToken} =
              response.data.data;

            // Save new tokens
            await secureStorageService.saveTokens(accessToken, newRefreshToken);

            // Update authorization header
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            }

            // Process failed queue
            this.processQueue(null, accessToken);

            // Retry original request
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, clear tokens and reject
            this.processQueue(refreshError, null);
            await secureStorageService.clearTokens();
            await secureStorageService.clearUserId();

            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // Log other errors
        if (error.response?.data) {
          console.error('[ApiClient] API Error:', {
            status: error.response.status,
            data: error.response.data,
          });
        } else {
          console.error('[ApiClient] Network Error:', error.message);
        }

        return Promise.reject(error);
      },
    );
  }

  private processQueue(error: any, token: string | null): void {
    this.failedQueue.forEach(prom => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });

    this.failedQueue = [];
  }

  // Auth Methods
  async login(
    email: string,
    password: string,
  ): Promise<{
    user: any;
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      console.log('[ApiClient] Attempting login to:', this.client.defaults.baseURL);
      const response = await this.client.post(API_ENDPOINTS.LOGIN, {
        email,
        password,
      });

      console.log('[ApiClient] Login response status:', response.status);
      return response.data.data;
    } catch (error: any) {
      console.error('[ApiClient] Login error:', {
        message: error.message,
        code: error.code,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
      });
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.client.post(API_ENDPOINTS.LOGOUT);
    } catch (error) {
      console.error('[ApiClient] Logout error:', error);
    }
  }

  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const response = await this.client.post(API_ENDPOINTS.REFRESH_TOKEN, {
      refreshToken,
    });

    return response.data.data;
  }

  // Forms Methods
  async getForms(): Promise<any[]> {
    const response = await this.client.get(API_ENDPOINTS.FORMS);
    return response.data.data;
  }

  async getFormById(id: string): Promise<any> {
    const response = await this.client.get(API_ENDPOINTS.FORM_BY_ID(id));
    return response.data.data;
  }

  // Submissions Methods
  async getSubmissions(params?: {
    formId?: string;
    userId?: string;
  }): Promise<any[]> {
    const response = await this.client.get(API_ENDPOINTS.SUBMISSIONS, {
      params,
    });
    return response.data.data;
  }

  async getSubmissionById(id: string): Promise<any> {
    const response = await this.client.get(
      API_ENDPOINTS.SUBMISSION_BY_ID(id),
    );
    return response.data.data;
  }

  async createSubmission(data: any): Promise<any> {
    const response = await this.client.post(API_ENDPOINTS.SUBMISSIONS, data);
    return response.data.data;
  }

  async updateSubmission(id: string, data: any): Promise<any> {
    const response = await this.client.put(
      API_ENDPOINTS.SUBMISSION_BY_ID(id),
      data,
    );
    return response.data.data;
  }

  // Sync Methods
  async syncSubmissions(submissions: any[]): Promise<{
    syncedSubmissions: number;
    syncedFiles: number;
    errors: any[];
    hasErrors: boolean;
  }> {
    console.log('[ApiClient] Syncing submissions...', {
      count: submissions.length,
      endpoint: API_ENDPOINTS.SYNC,
      baseURL: this.client.defaults.baseURL,
    });

    try {
      const response = await this.client.post(API_ENDPOINTS.SYNC, {
        submissions,
      });

      console.log('[ApiClient] Sync response received:', {
        status: response.status,
        data: response.data,
      });

      return response.data.data;
    } catch (error: any) {
      console.error('[ApiClient] Sync failed:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw error;
    }
  }

  async getPendingData(params?: {
    userId?: string;
    lastSyncDate?: string;
  }): Promise<{
    submissions: any[];
    files: any[];
    count: {submissions: number; files: number};
  }> {
    const response = await this.client.get(API_ENDPOINTS.SYNC_PENDING, {
      params,
    });
    return response.data.data;
  }

  async getSyncStatus(params?: {userId?: string}): Promise<{
    pendingSubmissions: number;
    pendingFiles: number;
    requiresSync: boolean;
    lastChecked: string;
  }> {
    const response = await this.client.get(API_ENDPOINTS.SYNC_STATUS, {
      params,
    });
    return response.data.data;
  }

  // Files Methods
  async uploadFile(file: {
    submissionId: string;
    stepId: string;
    questionId?: string;
    fileName: string;
    fileData: string; // base64
    mimeType: string;
    fileSize: number;
  }): Promise<any> {
    const response = await this.client.post(API_ENDPOINTS.FILES_UPLOAD, file);
    return response.data.data;
  }

  // Export Methods
  /**
   * Download submission data as Excel file
   * Returns the file URL from backend
   */
  async downloadSubmissionExcel(submissionId: string): Promise<{
    url: string;
    fileName: string;
  }> {
    const response = await this.client.get(
      API_ENDPOINTS.EXPORT_SUBMISSION_EXCEL(submissionId),
    );
    return response.data.data;
  }

  /**
   * Download images for a specific step as ZIP file
   * Returns the file URL from backend
   */
  async downloadSubmissionStepImages(
    submissionId: string,
    stepNumber: number,
  ): Promise<{
    url: string;
    fileName: string;
  }> {
    const response = await this.client.get(
      API_ENDPOINTS.EXPORT_SUBMISSION_IMAGES(submissionId, stepNumber),
    );
    return response.data.data;
  }

  /**
   * Download complete package (Excel + all step images as ZIPs)
   * Returns array of file URLs from backend
   */
  async downloadSubmissionPackage(submissionId: string): Promise<{
    excel: {url: string; fileName: string};
    images: Array<{url: string; fileName: string; stepNumber: number}>;
  }> {
    const response = await this.client.get(
      API_ENDPOINTS.EXPORT_SUBMISSION_PACKAGE(submissionId),
    );
    return response.data.data;
  }

  // Generic request method for custom calls
  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: any,
    config?: any,
  ): Promise<T> {
    const response = await this.client.request({
      method,
      url,
      data,
      ...config,
    });

    return response.data;
  }
}

// Export singleton instance
export const apiClient = ApiClient.getInstance();
