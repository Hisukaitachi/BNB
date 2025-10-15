// frontend/src/services/api.js - FIXED ADMIN PAYOUT SECTION
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// ✅ ADD THIS: Helper for backend base URL (without /api)
export const BACKEND_BASE_URL = API_BASE_URL.replace('/api', '');

// ✅ ADD THIS: Helper function to get full image URL
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath; // Already full URL
  
  // Handle paths that might or might not start with /
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${BACKEND_BASE_URL}${cleanPath}`;
};

// ✅ ADD THIS: Helper to get profile picture with fallback sizes
export const getProfilePictureUrl = (user, size = 'medium') => {
  if (!user?.profile_picture) return null;
  
  // If profile picture has size variants (from Sharp processing)
  const basePath = user.profile_picture.replace('-medium.jpg', '');
  const sizeVariant = `${basePath}-${size}.jpg`;
  
  return getImageUrl(sizeVariant);
};


// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle banned user responses
    if (error.response?.status === 403 && 
        error.response?.data?.message === 'Account has been banned') {
      
      console.log('API detected banned user, forcing logout...');
      
      // Complete logout
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.clear();
      
      // Force redirect to ban page
      window.location.href = '/banned';
      
      return Promise.reject(new Error('Account banned'));
    }
    
    // Existing 401 handling
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/auth/login';
    }
    
    return Promise.reject(error);
  }
);

// ✅ FIXED ADMIN FUNCTIONS - Updated payout endpoints
export const adminAPI = {
  // Dashboard
  getDashboardStats: () => api.get('/admin/dashboard-stats'),
  
  // User Management
  getAllUsers: (params) => api.get('/admin/users', { params }),
  banUser: (userId) => api.put(`/admin/users/${userId}/ban`),
  unbanUser: (userId) => api.put(`/admin/users/${userId}/unban`),
  updateUserRole: (userId, role) => api.put(`/admin/users/${userId}/role`, { role }),
  checkBanStatus: (userId) => api.get(`/admin/users/${userId}/ban-status`),
  
  // Listing Management
  getAllListings: (params) => api.get('/admin/listings', { params }),
  removeListing: (listingId, reason) => api.delete(`/admin/listings/${listingId}`, { data: { reason } }),
  
  // Booking Management
  getAllBookings: (params) => api.get('/admin/bookings', { params }),
  getBookingDetails: (bookingId) => api.get(`/admin/bookings/${bookingId}`),
  updateBookingStatus: (bookingId, status) => api.put(`/admin/bookings/${bookingId}/status`, { status }),
  cancelBooking: (bookingId, reason) => api.post(`/admin/bookings/${bookingId}/cancel`, { reason }),
  getBookingHistory: (bookingId) => api.get(`/admin/bookings/${bookingId}/history`),
  cancelBookingWithRefund: (bookingId, reason, refundAmount) =>
    api.post(`/admin/bookings/${bookingId}/cancel-with-refund`, { reason, refundAmount }),
  
  // Review Management
  getAllReviews: () => api.get('/admin/reviews'),
  removeReview: (reviewId) => api.delete(`/admin/reviews/${reviewId}`),

  // Reports
  getAllReports: () => api.get('/reports/admin/reports'),
  takeAction: (actionData) => api.post('/reports/admin/actions', actionData)
};

// PAYOUT FUNCTIONS (fixed paths and added missing routes)
export const payoutAPI = {
  // Host endpoints
  requestPayout: (data) => api.post('/payouts/request', data),
  getMyEarnings: () => api.get('/payouts/host/earnings'), // Fixed path
  getAvailableBalance: () => api.get('/payouts/balance'),
  getReceivedPayouts: () => api.get('/payouts/my-received'), // Added this

  // Admin endpoints
  getAllPayouts: () => api.get('/payouts/all'),
  approvePayout: (id, data) => api.post(`/payouts/${id}/approve`, data),
  completePayout: (id, data) => api.post(`/payouts/${id}/complete`, data),
  rejectPayout: (data) => api.post('/payouts/reject', data),
  getPayoutStats: () => api.get('/payouts/stats'),
  releasePayout: (data) => api.post('/payouts/release', data) // Added for admin
};

// BOOKING FUNCTIONS (unchanged)
export const bookingAPI = {
  // Book a unit
  createBooking: (bookingData) => api.post('/bookings', bookingData),
  
  // Get client's bookings
  getMyBookings: () => api.get('/bookings/my-bookings'),
  
  // Get host's bookings
  getHostBookings: () => api.get('/bookings/host-bookings'),
  
  // Update booking status (confirm, cancel, etc.)
  updateBookingStatus: (bookingId, status) => 
    api.put(`/bookings/${bookingId}/status`, { status }),
  
  // Get booking history
  getBookingHistory: (bookingId) => api.get(`/bookings/${bookingId}/history`),
  
  // Get booked dates for calendar conflict checking
  getBookedDates: (listingId) => api.get(`/bookings/booked-dates/${listingId}`),
  
  // Get bookings by listing
  getBookingsByListing: (listingId) => api.get(`/bookings/listing/${listingId}`),

  // Update customer information with ID upload
  updateCustomerInfo: (bookingId, formData) => 
    api.post(`/bookings/${bookingId}/customer-info`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }),

  // Get customer verification info for a booking (host only)
  getBookingCustomerInfo: (bookingId) => 
    api.get(`/bookings/${bookingId}/customer-info`)
};

export const refundAPI = {
  // CLIENT: Request refund after cancelling booking
  requestRefund: (bookingId, reason) => 
    api.post('/refunds/request', { bookingId, reason }),
  
  // CLIENT: Get my refund requests
  getMyRefunds: (status = null) => {
    const params = status ? { status } : {};
    return api.get('/refunds/my-refunds', { params });
  },
  
  // ADMIN: Get all refund requests
  getAllRefundRequests: (params = {}) => 
    api.get('/refunds/all', { params }),
  
  // ADMIN: Get refund details
  getRefundDetails: (refundId) => 
    api.get(`/refunds/${refundId}/details`),
  
  // ADMIN: Process refund (approve/reject)
  processRefund: (refundId, action, notes = '', customRefundAmount = null) => {
    const payload = { action, notes };
    if (customRefundAmount !== null && action === 'approve') {
      payload.customRefundAmount = customRefundAmount;
    }
    return api.post(`/refunds/${refundId}/process`, payload);
  },
  
  // ADMIN: Confirm refund intent (execute PayMongo refund)
  confirmRefundIntent: (refundIntentId) => 
    api.post(`/refunds/intent/${refundIntentId}/confirm`),
  
  // ADMIN: Complete manual refund
  completePersonalRefund: (refundId, notes) => 
    api.post(`/refunds/${refundId}/complete-personal`, { notes })
};

// PAYMENT FUNCTIONS (fixed paths and added missing routes)
export const paymentAPI = {
  createPaymentIntent: (bookingId) => 
    api.post('/payments/create-payment-intent', { bookingId }),
  
  createIntent: (bookingId) => 
    api.post('/payments/create-intent', { bookingId }),
  
  getPaymentStatus: (bookingId) => 
    api.get(`/payments/booking/${bookingId}`),
  
  getPaymentStatusAlt: (bookingId) => 
    api.get(`/payments/status/${bookingId}`),
  
  getMyPayments: () => 
    api.get('/payments/my-payments'),

  verifyStatus: (bookingId) => 
    api.post('/payments/verify-status', { bookingId }),
  
  testConfig: () => 
    api.get('/payments/test-config'),

  test: () => 
    api.get('/payments/test')
};

// MESSAGING FUNCTIONS (unchanged)
export const messageAPI = {
  // Send message with multiple media files
  sendMessage: (receiverId, message, mediaFiles = []) => {
    const formData = new FormData();
    formData.append('receiverId', receiverId);
    
    // Allow empty message if media files are present
    if (message && message.trim()) {
      formData.append('message', message.trim());
    }
    
    // Add multiple media files
    if (mediaFiles && mediaFiles.length > 0) {
      mediaFiles.forEach((file) => {
        formData.append('media', file);
      });
      console.log(`📁 Sending ${mediaFiles.length} media files`);
    }
    
    return api.post('/messages', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // Get conversation with another user
  getConversation: (otherUserId, page = 1) => 
    api.get(`/messages/conversation/${otherUserId}?page=${page}`),
  
  // Get inbox/chat list
  getInbox: () => api.get('/messages/inbox'),
  
  // Mark message as read
  markMessageAsRead: (messageId) => api.patch(`/messages/${messageId}/read`),
  
  // Mark entire conversation as read
  markConversationAsRead: (otherUserId) => 
    api.patch(`/messages/conversation/${otherUserId}/read`),

  // NEW: Get message statistics
  getMessageStats: () => api.get('/messages/stats'),

  // NEW: Search messages
  searchMessages: (query, page = 1, limit = 20) => 
    api.get(`/messages/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`),

  // NEW: Delete message
  deleteMessage: (messageId) => api.delete(`/messages/${messageId}`)
};

// REVIEWS AND FEEDBACK FUNCTIONS (unchanged)
export const reviewAPI = {
  // Create review for unit/host
  createReview: (reviewData) => api.post('/reviews', reviewData),
  
  // Get reviews for listing - FIXED ENDPOINT
  getListingReviews: (listingId, params = {}) => 
    api.get(`/reviews/listing/${listingId}`, { params }),
  
  // Get my reviews (written and received)  
  getMyReviews: (type = 'all') => api.get(`/reviews/my-reviews?type=${type}`),
  
  // Delete review
  deleteReview: (reviewId) => api.delete(`/reviews/${reviewId}`)
};

// FAVORITES FUNCTIONS (unchanged)
export const favoritesAPI = {
  // Add to favorites
  addFavorite: (listingId) => api.post(`/favorites/${listingId}`),
  
  // Remove from favorites
  removeFavorite: (listingId) => api.delete(`/favorites/${listingId}`),
  
  // Get my favorites
  getFavorites: (page = 1) => api.get(`/favorites?page=${page}`)
};

// REPORTS & DISPUTES FUNCTIONS (unchanged)
export const reportsAPI = {
  // Submit report/dispute - CONNECT TO BACKEND
  submitReport: (reportData) => api.post('/reports', reportData),
  
  // Get my reports - ADD MISSING ROUTE
  getMyReports: () => api.get('/reports/my-reports')
};

// NOTIFICATIONS FUNCTIONS (unchanged)
export const notificationAPI = {
  // Get notifications
  getNotifications: (page = 1, unreadOnly = false) => 
    api.get(`/notifications?page=${page}&unread_only=${unreadOnly}`),
  
  // Mark notification as read
  markNotificationRead: (notificationId) => 
    api.patch(`/notifications/${notificationId}/read`),
  
  // Mark all notifications as read
  markAllNotificationsRead: () => api.patch('/notifications/read-all')
};

// REQUEST VIEW UNIT FUNCTIONS (unchanged)
export const viewRequestAPI = {
  // Request to view unit
  requestViewUnit: (listingId, requestData) => 
    api.post(`/listings/${listingId}/view-request`, requestData),
  
  // Get view requests (for hosts) - with optional status filter
  getViewRequests: (status = null) => {
    const params = status ? { status } : {};
    return api.get('/listings/view-requests', { params });
  },
  
  // 🆕 NEW: Get my view requests (for clients)
  getMyViewRequests: (status = null) => {
    const params = status ? { status } : {};
    return api.get('/listings/my-view-requests', { params });
  },
  
  // Respond to view request (enhanced with better data structure)
  respondToViewRequest: (requestId, response, message = '') => 
    api.put(`/listings/view-requests/${requestId}`, { response, message })
};

// LISTING FUNCTIONS (unchanged)
export const listingAPI = {
  // Get all listings
  getAllListings: () => api.get('/listings'),
  
  // Get listing by ID
  getListingById: (id) => api.get(`/listings/${id}`),
  
  // Search listings with better parameter handling
  searchListings: (params) => {
    // Clean undefined params
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== undefined && value !== '')
    );
    return api.get('/listings/search', { params: cleanParams });
  },
  
  // Get nearby listings
  getNearbyListings: (lat, lng, radius = 10) => 
    api.get(`/listings/nearby?lat=${lat}&lng=${lng}&radius=${radius}`),
    
  // Host listing management with better file handling
  createListing: (formData) => {
    // Ensure formData is FormData for file uploads
    const data = formData instanceof FormData ? formData : formData;
    return api.post('/listings', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  // 🆕 IMPROVED: Update listing with file upload support
  updateListing: (id, data) => {
    // Check if data contains files (FormData) or just JSON
    const isFormData = data instanceof FormData;
    return api.put(`/listings/${id}`, data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {}
    });
  },
  
  deleteListing: (id) => api.delete(`/listings/${id}`),
  getMyListings: () => api.get('/listings/my-listings'),
  
  // 🆕 NEW: Get search suggestions
  getSearchSuggestions: (query) => 
    api.get('/listings/suggestions', { params: { q: query } })
};

// ROLE MANAGEMENT FUNCTIONS (unchanged)
export const roleAPI = {
  // Switch role
  switchRole: (newRole) => api.post('/role/switch', { newRole }),
  
  // Get role info
  getRoleInfo: () => api.get('/role/info')
};

// USER FUNCTIONS (unchanged)
export const userAPI = {
  // Existing authentication functions...
  register: (userData) => api.post('/users/register', userData),
  login: (credentials) => api.post('/users/login', credentials),
  verifyEmail: (email, code) => api.post('/users/verify-email', { email, code }),
  forgotPassword: (email) => api.post('/users/forgot-password', { email }),
  resetPassword: (data) => api.post('/users/reset-password', data),
  
  // Google OAuth
  googleLogin: (token) => api.post('/users/google-login', { token }),
  getGoogleConfig: () => api.get('/users/google-config'),
  
  // Profile management
  getProfile: () => api.get('/users/me'),
  updateProfile: (data) => api.put('/users/me', data),
  changePassword: (data) => api.put('/users/me/change-password', data),
  
  // NEW: Profile Picture Management
  uploadProfilePicture: (file) => {
    const formData = new FormData();
    formData.append('profilePicture', file);
    return api.post('/users/profile-picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  deleteProfilePicture: () => api.delete('/users/profile-picture'),
  
  // Public profiles
  getPublicProfile: (userId) => api.get(`/users/${userId}/public`),
  getUserReviews: (userId) => api.get(`/users/${userId}/reviews`),
  
  // Status checks
  checkMyBanStatus: () => api.get('/users/check-my-ban')
};
// HEALTH CHECK FUNCTIONS (unchanged)
export const healthAPI = {
  // Basic health check
  getHealth: () => api.get('/health'),
  
  // Detailed health check
  getDetailedHealth: () => api.get('/health/detailed')
};

export const apiWithErrorHandling = {
  // Wrapper for consistent error handling
  async call(apiFunction, ...args) {
    try {
      const response = await apiFunction(...args);
      return {
        success: true,
        data: response.data,
        error: null
      };
    } catch (error) {
      console.error('API Error:', error);
      return {
        success: false,
        data: null,
        error: {
          message: error.response?.data?.message || error.message || 'Something went wrong',
          status: error.response?.status || 500,
          code: error.response?.data?.code || 'UNKNOWN_ERROR'
        }
      };
    }
  }
};
export default api;