// src/services/api.js - FIXED VERSION with better error handling
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      console.log(`Making request to: ${url}`);
      const response = await fetch(url, config);
      
      // Handle different response types
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (jsonError) {
          console.error('Failed to parse JSON response:', jsonError);
          data = null;
        }
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        // Handle authentication errors
        if (response.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
          throw new Error('Session expired. Please log in again.');
        }
        
        // Handle different error types
        let errorMessage = 'Unknown error occurred';
        
        if (response.status === 404) {
          errorMessage = 'Resource not found';
        } else if (response.status === 400) {
          errorMessage = data?.message || data?.error || 'Bad request';
        } else if (response.status === 500) {
          errorMessage = 'Server error - please try again later';
        } else {
          errorMessage = data?.message || data?.error || data || `HTTP error! status: ${response.status}`;
        }
        
        console.error(`API Error (${response.status}):`, errorMessage);
        throw new Error(errorMessage);
      }

      // Return data, but handle null/undefined cases
      return data || {};
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  async get(endpoint) {
    return this.request(endpoint);
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  // File upload method
  async uploadFile(endpoint, formData) {
    const token = localStorage.getItem('token');
    const headers = {};
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      return data;
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }

  // Auth methods
  async login(email, password) {
    return this.post('/users/login', { email, password });
  }

  async register(name, email, password) {
    return this.post('/users/register', { name, email, password });
  }

  async googleAuth(token) {
    return this.post('/auth/google', { token });
  }

  async logout() {
    localStorage.removeItem('token');
  }

  async getUserProfile() {
    return this.get('/users/me');
  }

  async updateProfile(data) {
    return this.put('/users/me', data);
  }

  async changePassword(oldPassword, newPassword) {
    return this.put('/users/me/change-password', { oldPassword, newPassword });
  }

  // Listings methods
  async getListings(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/listings${queryString ? `?${queryString}` : ''}`);
  }

  async getAllListings(params = {}) {
    return this.getListings(params);
  }

  // FIXED: Better error handling for listing by ID
  async getListingById(id) {
    if (!id || id === 'undefined' || id === 'null') {
      throw new Error('Valid listing ID is required');
    }
    
    try {
      const response = await this.get(`/listings/${id}`);
      return response || { data: null };
    } catch (error) {
      console.error(`Failed to fetch listing ${id}:`, error);
      throw new Error(`Failed to fetch listing: ${error.message}`);
    }
  }

  async searchListings(searchParams) {
    const queryString = new URLSearchParams(searchParams).toString();
    return this.get(`/listings/search?${queryString}`);
  }

  async createListing(listingData, files = {}) {
    const formData = new FormData();
    
    Object.keys(listingData).forEach(key => {
      formData.append(key, listingData[key]);
    });
    
    if (files.image) {
      formData.append('image', files.image);
    }
    if (files.video) {
      formData.append('video', files.video);
    }
    
    return this.uploadFile('/listings', formData);
  }

  async updateListing(id, data) {
    return this.put(`/listings/${id}`, data);
  }

  async deleteListing(id) {
    return this.delete(`/listings/${id}`);
  }

  async getMyListings() {
    return this.get('/listings/my-listings');
  }

  // Bookings methods - FIXED
  async createBooking(bookingData) {
    return this.post('/bookings', bookingData);
  }

  async getMyBookings() {
    return this.get('/bookings/my-bookings');
  }

  async getHostBookings() {
    return this.get('/bookings/host-bookings');
  }

  async updateBookingStatus(id, status) {
    return this.put(`/bookings/${id}/status`, { status });
  }

  async getBookingHistory(id) {
    return this.get(`/bookings/${id}/history`);
  }

  // FIXED: Add better error handling for booked dates
  async getBookedDatesByListing(listingId) {
    if (!listingId || listingId === 'undefined' || listingId === 'null') {
      throw new Error('Valid listing ID is required');
    }
    
    try {
      const response = await this.get(`/bookings/booked-dates/${listingId}`);
      return response || { data: [] };
    } catch (error) {
      console.error(`Failed to fetch booked dates for listing ${listingId}:`, error);
      // Return empty array instead of throwing error
      return { data: [] };
    }
  }

  // Messages methods
  async sendMessage(receiverId, message) {
    return this.post('/messages', { receiverId, message });
  }

  async getConversation(otherUserId, page = 1) {
    return this.get(`/messages/conversation/${otherUserId}?page=${page}`);
  }

  async getInbox() {
    return this.get('/messages/inbox');
  }

  async markMessageAsRead(messageId) {
    return this.patch(`/messages/${messageId}/read`);
  }

  async markConversationAsRead(otherUserId) {
    return this.patch(`/messages/conversation/${otherUserId}/read`);
  }

  // Notifications methods
  async getNotifications(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/notifications${queryString ? `?${queryString}` : ''}`);
  }

  async markNotificationAsRead(id) {
    return this.patch(`/notifications/${id}/read`);
  }

  async markAllNotificationsAsRead() {
    return this.patch('/notifications/read-all');
  }

  // FIXED: Reviews methods with better error handling
  async createReview(reviewData) {
    return this.post('/reviews', reviewData);
  }

  async getMyReviews() {
    return this.get('/reviews/my-reviews');
  }

  async getListingReviews(listingId) {
    if (!listingId || listingId === 'undefined' || listingId === 'null') {
      throw new Error('Valid listing ID is required');
    }
    
    try {
      const response = await this.get(`/reviews/listing/${listingId}`);
      return response || { data: [] };
    } catch (error) {
      console.error(`Failed to fetch reviews for listing ${listingId}:`, error);
      // Return empty array instead of throwing error
      return { data: [] };
    }
  }

  async deleteReview(id) {
    return this.delete(`/reviews/${id}`);
  }

  // Favorites methods
  async addToFavorites(listingId) {
    return this.post(`/favorites/${listingId}`);
  }

  async getFavorites() {
    return this.get('/favorites');
  }

  async removeFromFavorites(listingId) {
    return this.delete(`/favorites/${listingId}`);
  }

  async addFavorite(listingId) {
    return this.addToFavorites(listingId);
  }

  async removeFavorite(listingId) {
    return this.removeFromFavorites(listingId);
  }

  // Admin methods
  async getAllUsers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/admin/users${queryString ? `?${queryString}` : ''}`);
  }

  async banUser(userId) {
    return this.put(`/admin/users/${userId}/ban`);
  }

  async unbanUser(userId) {
    return this.put(`/admin/users/${userId}/unban`);
  }

  async updateUserRole(userId, role) {
    return this.put(`/admin/users/${userId}/role`, { role });
  }

  async getDashboardStats() {
    return this.get('/admin/dashboard-stats');
  }

  async getAllBookingsAdmin(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/admin/bookings${queryString ? `?${queryString}` : ''}`);
  }

  async getAllTransactions() {
    return this.get('/admin/transactions');
  }

  async processHostPayout(hostId) {
    return this.post(`/admin/payouts/host/${hostId}`);
  }

  async getHostsPendingPayouts() {
    return this.get('/admin/payouts-summary');
  }

  // Host methods
  async getHostEarnings() {
    return this.get('/payouts/host/earnings');
  }

  async getReceivedPayouts() {
    return this.get('/payouts/my-received');
  }

  // Utility methods
  async checkHealth() {
    return this.get('/health');
  }

  async getAuthProviders() {
    return this.get('/auth/providers');
  }
}

export default new ApiService();