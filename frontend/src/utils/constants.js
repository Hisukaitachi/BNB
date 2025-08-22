// src/utils/constants.js

// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  SOCKET_URL: import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000',
  TIMEOUT: 30000, // 30 seconds
};

// User Roles
export const USER_ROLES = {
  CLIENT: 'client',
  HOST: 'host',
  ADMIN: 'admin'
};

// Booking Status
export const BOOKING_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  REFUNDED: 'refunded'
};

export const BOOKING_STATUS_LABELS = {
  [BOOKING_STATUS.PENDING]: 'Pending',
  [BOOKING_STATUS.APPROVED]: 'Approved',
  [BOOKING_STATUS.CONFIRMED]: 'Confirmed',
  [BOOKING_STATUS.REJECTED]: 'Rejected',
  [BOOKING_STATUS.CANCELLED]: 'Cancelled',
  [BOOKING_STATUS.COMPLETED]: 'Completed',
  [BOOKING_STATUS.REFUNDED]: 'Refunded'
};

export const BOOKING_STATUS_COLORS = {
  [BOOKING_STATUS.PENDING]: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  [BOOKING_STATUS.APPROVED]: 'bg-green-500/20 text-green-400 border-green-500/30',
  [BOOKING_STATUS.CONFIRMED]: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  [BOOKING_STATUS.REJECTED]: 'bg-red-500/20 text-red-400 border-red-500/30',
  [BOOKING_STATUS.CANCELLED]: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  [BOOKING_STATUS.COMPLETED]: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  [BOOKING_STATUS.REFUNDED]: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
};

// Notification Types
export const NOTIFICATION_TYPES = {
  BOOKING_REQUEST: 'booking_request',
  BOOKING_APPROVED: 'booking_approved',
  BOOKING_DECLINED: 'booking_declined',
  BOOKING_CANCELLED: 'booking_cancelled',
  BOOKING_COMPLETED: 'booking_completed',
  MESSAGE: 'message',
  REVIEW: 'review',
  PAYOUT: 'payout',
  GENERAL: 'general',
  ADMIN_NOTICE: 'admin_notice',
  ACCOUNT: 'account',
  ROLE: 'role',
  LISTING: 'listing'
};

// Message Types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  SYSTEM: 'system'
};

// Currency
export const CURRENCY = {
  CODE: 'PHP',
  SYMBOL: '₱',
  NAME: 'Philippine Peso'
};

// Date Formats
export const DATE_FORMATS = {
  SHORT: 'MMM dd, yyyy',
  LONG: 'MMMM dd, yyyy',
  TIME: 'h:mm aa',
  DATETIME: 'MMM dd, yyyy h:mm aa',
  ISO: 'yyyy-MM-dd'
};

// Pagination
export const PAGINATION = {
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  DEFAULT_PAGE: 1
};

// File Upload
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/quicktime'],
  MAX_IMAGES: 10,
  MAX_VIDEOS: 3
};

// Validation Rules
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 8,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  TITLE_MIN_LENGTH: 5,
  TITLE_MAX_LENGTH: 200,
  DESCRIPTION_MIN_LENGTH: 20,
  DESCRIPTION_MAX_LENGTH: 2000,
  LOCATION_MIN_LENGTH: 3,
  LOCATION_MAX_LENGTH: 255,
  REVIEW_MIN_LENGTH: 10,
  REVIEW_MAX_LENGTH: 500,
  MESSAGE_MAX_LENGTH: 1000,
  PRICE_MIN: 1,
  PRICE_MAX: 1000000,
  RATING_MIN: 1,
  RATING_MAX: 5
};

// Search Filters
export const SEARCH_FILTERS = {
  SORT_BY: {
    CREATED_AT: 'created_at',
    PRICE: 'price_per_night',
    RATING: 'average_rating',
    RELEVANCE: 'relevance'
  },
  SORT_ORDER: {
    ASC: 'ASC',
    DESC: 'DESC'
  }
};

// Property Types
export const PROPERTY_TYPES = [
  'House',
  'Apartment',
  'Villa',
  'Condo',
  'Resort',
  'Hotel',
  'Cabin',
  'Treehouse',
  'Tiny Home',
  'Loft',
  'Studio',
  'Guesthouse'
];

// Amenities
export const AMENITIES = [
  'WiFi',
  'Swimming Pool',
  'Kitchen',
  'Air Conditioning',
  'Parking',
  'Pet Friendly',
  'Gym',
  'Beach Access',
  'Mountain View',
  'City View',
  'Garden',
  'Balcony',
  'Hot Tub',
  'Fireplace',
  'BBQ Grill',
  'Laundry',
  'TV',
  'Netflix',
  'Workspace',
  'Security',
  'Elevator',
  'Wheelchair Accessible'
];

// Socket Events
export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  REGISTER: 'register',
  SEND_MESSAGE: 'sendMessage',
  RECEIVE_MESSAGE: 'receiveMessage',
  USER_ONLINE: 'userOnline',
  USER_OFFLINE: 'userOffline',
  TYPING: 'typing',
  NEW_NOTIFICATION: 'newNotification',
  BANNED: 'banned',
  UNBANNED: 'unbanned',
  UPDATE_INBOX: 'updateInbox'
};

// Toast Types
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Theme Colors
export const THEME_COLORS = {
  PRIMARY: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7c3aed',
    800: '#6b21a8',
    900: '#581c87'
  },
  SECONDARY: {
    50: '#fdf2f8',
    100: '#fce7f3',
    200: '#fbcfe8',
    300: '#f9a8d4',
    400: '#f472b6',
    500: '#ec4899',
    600: '#db2777',
    700: '#be185d',
    800: '#9d174d',
    900: '#831843'
  },
  GRAY: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827'
  }
};

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  LISTINGS: '/listings',
  LISTING_DETAIL: '/listing/:id',
  PROFILE: '/profile',
  BOOKINGS: '/bookings',
  MESSAGES: '/messages',
  FAVORITES: '/favorites',
  HOST: {
    DASHBOARD: '/host',
    LISTINGS: '/host/listings',
    BOOKINGS: '/host/bookings',
    ANALYTICS: '/host/analytics',
    EARNINGS: '/host/earnings',
    REVIEWS: '/host/reviews',
    MESSAGES: '/host/messages',
    SETTINGS: '/host/settings'
  },
  ADMIN: {
    DASHBOARD: '/admin',
    USERS: '/admin/users',
    LISTINGS: '/admin/listings',
    BOOKINGS: '/admin/bookings',
    REPORTS: '/admin/reports',
    ANALYTICS: '/admin/analytics',
    SETTINGS: '/admin/settings'
  }
};

// Error Messages
export const ERROR_MESSAGES = {
  GENERIC: 'Something went wrong. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied.',
  NOT_FOUND: 'Resource not found.',
  VALIDATION: 'Please check your input and try again.',
  SERVER: 'Server error. Please try again later.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  FILE_TOO_LARGE: 'File size is too large. Please choose a smaller file.',
  INVALID_FILE_TYPE: 'Invalid file type. Please choose a different file.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.'
};

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN: 'Welcome back!',
  REGISTER: 'Account created successfully!',
  LOGOUT: 'Logged out successfully.',
  PROFILE_UPDATED: 'Profile updated successfully.',
  PASSWORD_CHANGED: 'Password changed successfully.',
  BOOKING_CREATED: 'Booking request sent successfully!',
  BOOKING_UPDATED: 'Booking updated successfully.',
  BOOKING_CANCELLED: 'Booking cancelled successfully.',
  LISTING_CREATED: 'Listing created successfully!',
  LISTING_UPDATED: 'Listing updated successfully.',
  LISTING_DELETED: 'Listing deleted successfully.',
  MESSAGE_SENT: 'Message sent successfully.',
  REVIEW_CREATED: 'Review submitted successfully.',
  FAVORITE_ADDED: 'Added to favorites.',
  FAVORITE_REMOVED: 'Removed from favorites.'
};

// Local Storage Keys
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  THEME: 'theme',
  LANGUAGE: 'language',
  SEARCH_HISTORY: 'searchHistory',
  FAVORITES: 'favorites',
  RECENT_LISTINGS: 'recentListings'
};

// Feature Flags
export const FEATURES = {
  GOOGLE_AUTH: import.meta.env.VITE_GOOGLE_CLIENT_ID ? true : false,
  FACEBOOK_AUTH: import.meta.env.VITE_FACEBOOK_APP_ID ? true : false,
  REAL_TIME_MESSAGING: true,
  PUSH_NOTIFICATIONS: true,
  ADVANCED_SEARCH: true,
  MAP_INTEGRATION: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? true : false,
  PAYMENT_INTEGRATION: import.meta.env.VITE_STRIPE_PUBLIC_KEY ? true : false
};

// Environment
export const ENV = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test'
};

export const IS_DEVELOPMENT = import.meta.env.MODE === ENV.DEVELOPMENT;
export const IS_PRODUCTION = import.meta.env.MODE === ENV.PRODUCTION;

// Default Values
export const DEFAULTS = {
  LISTING: {
    MAX_GUESTS: 4,
    CHECK_IN_TIME: '15:00',
    CHECK_OUT_TIME: '11:00',
    MIN_STAY: 1,
    MAX_STAY: 365
  },
  SEARCH: {
    RADIUS: 10, // km
    GUESTS: 1,
    SORT_BY: SEARCH_FILTERS.SORT_BY.CREATED_AT,
    SORT_ORDER: SEARCH_FILTERS.SORT_ORDER.DESC
  },
  PAGINATION: {
    LISTINGS: 12,
    BOOKINGS: 10,
    MESSAGES: 50,
    NOTIFICATIONS: 20,
    REVIEWS: 10
  }
};