// API Configuration
export const API_CONFIG = {
  // Change this to your backend URL
  // For Android emulator: http://10.0.2.2:3000/api
  // For iOS simulator: http://localhost:3000/api
  // For physical device: http://YOUR_IP:3000/api
  BASE_URL: __DEV__
    ? 'http://10.0.2.2:3000/api' // Android emulator - use localhost for iOS/Web
    : 'http://3.208.180.76:3000/api', // Production - EC2 Server
  // BASE_URL: 'http://3.208.180.76:3000/api',

  TIMEOUT: 120000, // 120 seconds (2 minutes) for sync operations with large files
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

  // Export
  EXPORT_SUBMISSION_EXCEL: (id: string) => `/export/submissions/${id}/excel`,
  EXPORT_SUBMISSION_IMAGES: (id: string, stepNumber: number) =>
    `/export/submissions/${id}/images/step/${stepNumber}`,
  EXPORT_SUBMISSION_PACKAGE: (id: string) => `/export/submissions/${id}/package`,

  // Sites
  SITES: '/sites',
  SITES_BY_TYPE: (type: string) => `/sites?type=${type}`,
  SITE_BY_CODE: (codigo: string) => `/sites/${codigo}`,
  SITE_INVENTORY: (codigo: string) => `/sites/${codigo}/inventory`,
  SITE_INVENTORY_EE: (codigo: string) => `/sites/${codigo}/inventory/ee`,
  SITE_INVENTORY_EP: (codigo: string) => `/sites/${codigo}/inventory/ep`,
  INVENTORY_EE_BY_ID: (id: string) => `/sites/inventory/ee/${id}`,
  INVENTORY_EP_BY_ID: (id: string) => `/sites/inventory/ep/${id}`,
} as const;
