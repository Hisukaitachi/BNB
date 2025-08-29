// src/services/api.js - Updated with all your backend endpoints
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

// BOOKING FUNCTIONS
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

// PAYMENT FUNCTIONS
export const paymentAPI = {
  // Create payment intent for GCash
  createPaymentIntent: (bookingId) => 
    api.post('/payments/create-intent', { bookingId }),
  
  // Get payment status
  getPaymentStatus: (bookingId) => api.get(`/payments/booking/${bookingId}`),
  
  // Get payment history
  getMyPayments: () => api.get('/payments/my-payments')
};

// MESSAGING FUNCTIONS
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

// REVIEWS AND FEEDBACK FUNCTIONS
export const reviewAPI = {
  // Create review for unit/host
  createReview: (reviewData) => api.post('/reviews', reviewData),
  
  // Get reviews for listing
  getListingReviews: (listingId, page = 1) => 
    api.get(`/reviews/listing/${listingId}?page=${page}`),
  
  // Get my reviews (written and received)
  getMyReviews: (type = 'all') => api.get(`/reviews/my-reviews?type=${type}`),
  
  // Delete review
  deleteReview: (reviewId) => api.delete(`/reviews/${reviewId}`)
};

// FAVORITES FUNCTIONS
export const favoritesAPI = {
  // Add to favorites
  addFavorite: (listingId) => api.post(`/favorites/${listingId}`),
  
  // Remove from favorites
  removeFavorite: (listingId) => api.delete(`/favorites/${listingId}`),
  
  // Get my favorites
  getFavorites: (page = 1) => api.get(`/favorites?page=${page}`)
};

// REPORTS & DISPUTES FUNCTIONS
export const reportsAPI = {
  // Submit report/dispute
  submitReport: (reportData) => api.post('/reports', reportData),
  
  // Get my reports
  getMyReports: () => api.get('/reports/my-reports')
};

// NOTIFICATIONS FUNCTIONS
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

// REQUEST VIEW UNIT FUNCTIONS (if implemented)
export const viewRequestAPI = {
  // Request to view unit
  requestViewUnit: (listingId, requestData) => 
    api.post(`/listings/${listingId}/view-request`, requestData),
  
  // Get view requests (for hosts)
  getViewRequests: () => api.get('/listings/view-requests'),
  
  // Respond to view request
  respondToViewRequest: (requestId, response) => 
    api.put(`/listings/view-requests/${requestId}`, { response })
};

// LISTING FUNCTIONS
export const listingAPI = {
  // Get all listings
  getAllListings: () => api.get('/listings'),
  
  // Get listing by ID
  getListingById: (id) => api.get(`/listings/${id}`),
  
  // Search listings
  searchListings: (params) => api.get('/listings/search', { params }),
  
  // Get nearby listings
  getNearbyListings: (lat, lng, radius = 10) => 
    api.get(`/listings/nearby?lat=${lat}&lng=${lng}&radius=${radius}`)
};

export default api;