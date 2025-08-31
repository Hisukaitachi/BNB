// frontend/src/services/api.js - FIXED ADMIN PAYOUT SECTION
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

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
  checkBanStatus: (userId) => api.get(`/admin/check-ban/${userId}`),
  
  // Listing Management
  getAllListings: (params) => api.get('/admin/listings', { params }),
  removeListing: (listingId, reason) => api.delete(`/admin/listings/${listingId}`, { data: { reason } }),
  
  // Booking Management
  getAllBookings: (params) => api.get('/admin/bookings', { params }),
  updateBookingStatus: (bookingId, status) => api.put(`/admin/bookings/${bookingId}/status`, { status }),
  cancelBooking: (bookingId) => api.delete(`/admin/bookings/${bookingId}`),
  getBookingHistory: (bookingId) => api.get(`/admin/bookings/${bookingId}/history`),
  
  // Review Management
  getAllReviews: () => api.get('/admin/reviews'),
  removeReview: (reviewId) => api.delete(`/admin/reviews/${reviewId}`),
  
  // ✅ FIXED - Financial Management using PAYOUT endpoints
  getHostEarnings: (hostId) => api.get(`/admin/earnings/${hostId}`), // Uses fixed admin route
  getAllPayouts: () => api.get('/admin/payouts/all'), // Uses payout controller via admin
  releasePayout: (payoutData) => api.post('/admin/payouts/release', payoutData), // Uses payout controller via admin
  
  // Financial Management - Refunds & Transactions (admin controller)
  processRefund: (transactionId) => api.post(`/admin/refund/${transactionId}`),
  getAllTransactions: () => api.get('/admin/transactions'),
  
  // Reports & User Safety
  getAllReports: () => api.get('/admin/reports'),
  takeAction: (actionData) => api.post('/admin/actions', actionData)
};

// ✅ FIXED PAYOUT FUNCTIONS - Direct payout endpoints for hosts
export const payoutAPI = {
  // For hosts to check their own earnings
  getMyEarnings: () => api.get('/payouts/host/earnings'),
  getMyPayouts: () => api.get('/payouts/my-received'),
  
  // For admin use via adminAPI above
  getAllPayouts: () => api.get('/payouts/all'),
  releasePayout: (payoutData) => api.post('/payouts/release', payoutData)
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
  getBookingsByListing: (listingId) => api.get(`/bookings/listing/${listingId}`)
};

// PAYMENT FUNCTIONS (unchanged)
export const paymentAPI = {
  // Create payment intent for GCash
  createPaymentIntent: (bookingId) => 
    api.post('/payments/create-intent', { bookingId }),
  
  // Get payment status
  getPaymentStatus: (bookingId) => api.get(`/payments/booking/${bookingId}`),
  
  // Get payment history
  getMyPayments: () => api.get('/payments/my-payments'),
  
  // Test payment config
  testConfig: () => api.get('/payments/test-config')
};

// MESSAGING FUNCTIONS (unchanged)
export const messageAPI = {
  // Send message (with image/video support)
  sendMessage: (receiverId, message, mediaFile = null) => {
    const formData = new FormData();
    formData.append('receiverId', receiverId);
    formData.append('message', message);
    if (mediaFile) {
      formData.append('media', mediaFile);
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
    api.patch(`/messages/conversation/${otherUserId}/read`)
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
  
  // Get view requests (for hosts)
  getViewRequests: () => api.get('/listings/view-requests'),
  
  // Respond to view request
  respondToViewRequest: (requestId, response) => 
    api.put(`/listings/view-requests/${requestId}`, response)
};

// LISTING FUNCTIONS (unchanged)
export const listingAPI = {
  // Get all listings
  getAllListings: () => api.get('/listings'),
  
  // Get listing by ID
  getListingById: (id) => api.get(`/listings/${id}`),
  
  // Search listings
  searchListings: (params) => api.get('/listings/search', { params }),
  
  // Get nearby listings
  getNearbyListings: (lat, lng, radius = 10) => 
    api.get(`/listings/nearby?lat=${lat}&lng=${lng}&radius=${radius}`),
    
  // Host listing management
  createListing: (formData) => api.post('/listings', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  updateListing: (id, data) => api.put(`/listings/${id}`, data),
  deleteListing: (id) => api.delete(`/listings/${id}`),
  getMyListings: () => api.get('/listings/my-listings')
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
  // Authentication
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

export default api;