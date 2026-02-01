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
  /**
   * Upload a single file using multipart/form-data
   * More efficient than base64 for large files
   */
  async uploadFile(params: {
    submissionId: string;
    stepId: string;
    questionId?: string;
    fileId: string;
    localPath: string;
    fileName: string;
    mimeType: string;
  }): Promise<{id: string; fileName: string; fileSize: number; mimeType: string}> {
    const formData = new FormData();

    // Add file - React Native specific format
    formData.append('file', {
      uri: params.localPath,
      type: params.mimeType,
      name: params.fileName,
    } as any);

    // Add metadata
    formData.append('submissionId', params.submissionId);
    formData.append('stepId', params.stepId);
    formData.append('fileId', params.fileId);
    if (params.questionId) {
      formData.append('questionId', params.questionId);
    }

    console.log('[ApiClient] Uploading file:', {
      fileName: params.fileName,
      submissionId: params.submissionId,
    });

    const response = await this.client.post(API_ENDPOINTS.FILES_UPLOAD, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5 minutes per file (for large videos)
    });

    console.log('[ApiClient] File uploaded:', params.fileName);
    return response.data.data;
  }

  /**
   * Upload files in batches with progress callback
   * @param files Array of files to upload
   * @param batchSize Number of files to upload concurrently (default: 5)
   * @param onProgress Callback for progress updates
   */
  async uploadFilesInBatches(
    files: Array<{
      submissionId: string;
      stepId: string;
      questionId?: string;
      fileId: string;
      localPath: string;
      fileName: string;
      mimeType: string;
    }>,
    batchSize: number = 5,
    onProgress?: (completed: number, total: number, currentFile: string) => void,
  ): Promise<{
    uploaded: number;
    failed: number;
    successIds: string[];
    errors: Array<{fileId: string; fileName: string; error: string}>;
  }> {
    const result = {
      uploaded: 0,
      failed: 0,
      successIds: [] as string[],
      errors: [] as Array<{fileId: string; fileName: string; error: string}>,
    };

    const total = files.length;
    console.log(`[ApiClient] Starting batch upload of ${total} files (batch size: ${batchSize})`);

    // Process files in batches
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);

      // Upload batch concurrently
      const batchResults = await Promise.allSettled(
        batch.map(file => this.uploadFile(file)),
      );

      // Process results
      batchResults.forEach((batchResult, index) => {
        const file = batch[index];
        if (batchResult.status === 'fulfilled') {
          result.uploaded++;
          result.successIds.push(file.fileId);
        } else {
          result.failed++;
          result.errors.push({
            fileId: file.fileId,
            fileName: file.fileName,
            error: batchResult.reason?.message || 'Upload failed',
          });
          console.error(`[ApiClient] Failed to upload ${file.fileName}:`, batchResult.reason);
        }

        // Report progress
        if (onProgress) {
          onProgress(result.uploaded + result.failed, total, file.fileName);
        }
      });

      console.log(`[ApiClient] Batch complete: ${result.uploaded}/${total} uploaded, ${result.failed} failed`);
    }

    console.log('[ApiClient] Batch upload complete:', result);
    return result;
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

  // Sites Methods
  async getSites(type?: string): Promise<any[]> {
    const url = type ? API_ENDPOINTS.SITES_BY_TYPE(type) : API_ENDPOINTS.SITES;
    const response = await this.client.get(url);
    return response.data.data;
  }

  async getSiteByCode(codigo: string): Promise<any> {
    const response = await this.client.get(API_ENDPOINTS.SITE_BY_CODE(codigo));
    return response.data.data;
  }

  async getSiteInventory(codigo: string): Promise<any> {
    const response = await this.client.get(API_ENDPOINTS.SITE_INVENTORY(codigo));
    return response.data.data;
  }

  async addInventoryEE(codigo: string, data: any): Promise<any> {
    const response = await this.client.post(
      API_ENDPOINTS.SITE_INVENTORY_EE(codigo),
      data,
    );
    return response.data.data;
  }

  async addInventoryEP(codigo: string, data: any): Promise<any> {
    const response = await this.client.post(
      API_ENDPOINTS.SITE_INVENTORY_EP(codigo),
      data,
    );
    return response.data.data;
  }

  async updateInventoryEE(id: string, data: any): Promise<any> {
    const response = await this.client.put(
      API_ENDPOINTS.INVENTORY_EE_BY_ID(id),
      data,
    );
    return response.data.data;
  }

  async updateInventoryEP(id: string, data: any): Promise<any> {
    const response = await this.client.put(
      API_ENDPOINTS.INVENTORY_EP_BY_ID(id),
      data,
    );
    return response.data.data;
  }

  /**
   * Download a file from the server
   * Returns the file as an ArrayBuffer for saving locally
   */
  async downloadFile(fileId: string): Promise<{
    data: ArrayBuffer;
    fileName: string;
    mimeType: string;
  }> {
    console.log(`[ApiClient] Downloading file: ${fileId}`);

    const response = await this.client.get(API_ENDPOINTS.FILE_DOWNLOAD(fileId), {
      responseType: 'arraybuffer',
      timeout: 300000, // 5 minutes for large files
    });

    // Extract filename from Content-Disposition header if available
    const contentDisposition = response.headers['content-disposition'];
    let fileName = `file_${fileId}`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        fileName = filenameMatch[1].replace(/['"]/g, '');
      }
    }

    const mimeType = response.headers['content-type'] || 'application/octet-stream';

    console.log(`[ApiClient] File downloaded: ${fileName} (${mimeType})`);

    return {
      data: response.data,
      fileName,
      mimeType,
    };
  }

  /**
   * Download files in batches with progress callback
   * @param fileIds Array of file IDs to download
   * @param batchSize Number of files to download concurrently (default: 3)
   * @param onProgress Callback for progress updates
   */
  async downloadFilesInBatches(
    fileIds: string[],
    batchSize: number = 3,
    onProgress?: (completed: number, total: number, currentFileId: string) => void,
  ): Promise<{
    downloaded: number;
    failed: number;
    results: Array<{fileId: string; data: ArrayBuffer; fileName: string; mimeType: string}>;
    errors: Array<{fileId: string; error: string}>;
  }> {
    const result = {
      downloaded: 0,
      failed: 0,
      results: [] as Array<{fileId: string; data: ArrayBuffer; fileName: string; mimeType: string}>,
      errors: [] as Array<{fileId: string; error: string}>,
    };

    const total = fileIds.length;
    console.log(`[ApiClient] Starting batch download of ${total} files (batch size: ${batchSize})`);

    // Process files in batches
    for (let i = 0; i < fileIds.length; i += batchSize) {
      const batch = fileIds.slice(i, i + batchSize);

      // Download batch concurrently
      const batchResults = await Promise.allSettled(
        batch.map(fileId => this.downloadFile(fileId)),
      );

      // Process results
      batchResults.forEach((batchResult, index) => {
        const fileId = batch[index];
        if (batchResult.status === 'fulfilled') {
          result.downloaded++;
          result.results.push({
            fileId,
            ...batchResult.value,
          });
        } else {
          result.failed++;
          result.errors.push({
            fileId,
            error: batchResult.reason?.message || 'Download failed',
          });
          console.error(`[ApiClient] Failed to download ${fileId}:`, batchResult.reason);
        }

        // Report progress
        if (onProgress) {
          onProgress(result.downloaded + result.failed, total, fileId);
        }
      });

      console.log(`[ApiClient] Download batch complete: ${result.downloaded}/${total} downloaded, ${result.failed} failed`);
    }

    console.log('[ApiClient] Batch download complete:', {
      downloaded: result.downloaded,
      failed: result.failed,
    });
    return result;
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
