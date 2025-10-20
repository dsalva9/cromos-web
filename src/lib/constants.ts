// App-wide constants
export const APP_NAME = 'CambioCromos';
export const APP_DESCRIPTION = 'Sports card marketplace and collection manager';

export const ROUTES = {
  HOME: '/',
  MARKETPLACE: '/marketplace',
  MARKETPLACE_CREATE: '/marketplace/create',
  MARKETPLACE_MY_LISTINGS: '/marketplace/my-listings',
  TEMPLATES: '/templates',
  TEMPLATES_CREATE: '/templates/create',
  MY_TEMPLATES: '/my-templates',
  FAVORITES: '/favorites',
  PROFILE: '/profile',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_REPORTS: '/admin/reports',
  ADMIN_USERS: '/admin/users',
  ADMIN_AUDIT: '/admin/audit',
  LOGIN: '/login',
  REGISTER: '/register',
} as const;

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const VALIDATION = {
  MIN_TITLE_LENGTH: 3,
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_IMAGE_SIZE_MB: 5,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

export const TOAST_DURATION = {
  SUCCESS: 3000,
  ERROR: 5000,
  INFO: 3000,
} as const;
