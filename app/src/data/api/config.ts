// API Configuration
export const API_CONFIG = {
  // Change this to your backend URL
  // For Android emulator: http://10.0.2.2:3000/api
  // For iOS simulator: http://localhost:3000/api
  // For physical device: http://YOUR_IP:3000/api
  BASE_URL: __DEV__
    ? 'http://10.0.2.2:3000/api' // Android emulator - use localhost for iOS/Web
    : 'https://api.towerforms.com/api', // Production

  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
} as const;

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REFRESH_TOKEN: '/auth/refresh',

  // Forms
  FORMS: '/forms',
  FORM_BY_ID: (id: string) => `/forms/${id}`,

  // Submissions
  SUBMISSIONS: '/submissions',
  SUBMISSION_BY_ID: (id: string) => `/submissions/${id}`,

  // Sync
  SYNC: '/sync',
  SYNC_PENDING: '/sync/pending',
  SYNC_STATUS: '/sync/status',

  // Files
  FILES_UPLOAD: '/files/upload',
  FILE_BY_ID: (id: string) => `/files/${id}`,
  FILE_DOWNLOAD: (id: string) => `/files/${id}/download`,
} as const;
