// src/services/api.js - FIXED VERSION
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
          throw new Error('Invalid response format from server');
        }
      } else {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${text}`);
      }

      if (!response.ok) {
        // Handle authentication errors
        if (response.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
          throw new Error('Session expired. Please log in again.');
        }
        
        // Extract error message properly
        const errorMessage = data?.message || data?.error || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      // FIXED: Always return the full response, not just data
      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Standard HTTP methods
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

  // Auth methods - FIXED
  async login(email, password) {
    const response = await this.post('/users/login', { email, password });
    return response; // Backend returns { status: 'success', data: { token, user } }
  }

  async register(name, email, password) {
    const response = await this.post('/users/register', { name, email, password });
    return response;
  }

  async googleAuth(token) {
    const response = await this.post('/auth/google', { token });
    return response;
  }

  async getUserProfile() {
    const response = await this.get('/users/me');
    return response; // Backend returns { status: 'success', data: { user } }
  }

  async updateProfile(data) {
    const response = await this.put('/users/me', data);
    return response;
  }

  async changePassword(oldPassword, newPassword) {
    const response = await this.put('/users/me/change-password', { oldPassword, newPassword });
    return response;
  }

  // Listings methods - FIXED
  async getListings(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await this.get(`/listings${queryString ? `?${queryString}` : ''}`);
    return response;
  }

  async getAllListings(params = {}) {
    return this.getListings(params);
  }

  async getListingById(id) {
    if (!id || id === 'undefined' || id === 'null') {
      throw new Error('Valid listing ID is required');
    }
    
    try {
      const response = await this.get(`/listings/${id}`);
      return response;
    } catch (error) {
      console.error(`Failed to fetch listing ${id}:`, error);
      throw new Error(`Failed to fetch listing: ${error.message}`);
    }
  }

  async searchListings(searchParams) {
    const queryString = new URLSearchParams(searchParams).toString();
    const response = await this.get(`/listings/search?${queryString}`);
    return response;
  }

  async createListing(listingData, files = {}) {
    // File upload with FormData
    const formData = new FormData();
    
    Object.keys(listingData).forEach(key => {
      if (listingData[key] !== null && listingData[key] !== undefined) {
        formData.append(key, listingData[key]);
      }
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
    const response = await this.put(`/listings/${id}`, data);
    return response;
  }

  async deleteListing(id) {
    const response = await this.delete(`/listings/${id}`);
    return response;
  }

  async getMyListings() {
    const response = await this.get('/listings/my-listings');
    return response;
  }

  // Bookings methods - FIXED
  async createBooking(bookingData) {
    const response = await this.post('/bookings', bookingData);
    return response;
  }

  async getMyBookings() {
    const response = await this.get('/bookings/my-bookings');
    return response;
  }

  async getHostBookings() {
    const response = await this.get('/bookings/host-bookings');
    return response;
  }

  async updateBookingStatus(id, status) {
    const response = await this.put(`/bookings/${id}/status`, { status });
    return response;
  }

  async getBookingHistory(id) {
    const response = await this.get(`/bookings/${id}/history`);
    return response;
  }

  async getBookedDatesByListing(listingId) {
    if (!listingId || listingId === 'undefined' || listingId === 'null') {
      throw new Error('Valid listing ID is required');
    }
    
    try {
      const response = await this.get(`/bookings/booked-dates/${listingId}`);
      return response;
    } catch (error) {
      console.error(`Failed to fetch booked dates for listing ${listingId}:`, error);
      // Return empty structure instead of throwing
      return { status: 'success', data: { unavailableDates: [] } };
    }
  }

  // Messages methods
  async sendMessage(receiverId, message) {
    const response = await this.post('/messages', { receiverId, message });
    return response;
  }

  async getConversation(otherUserId, page = 1) {
    const response = await this.get(`/messages/conversation/${otherUserId}?page=${page}`);
    return response;
  }

  async getInbox() {
    const response = await this.get('/messages/inbox');
    return response;
  }

  async markMessageAsRead(messageId) {
    const response = await this.patch(`/messages/${messageId}/read`);
    return response;
  }

  async markConversationAsRead(otherUserId) {
    const response = await this.patch(`/messages/conversation/${otherUserId}/read`);
    return response;
  }

  // Notifications methods
  async getNotifications(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await this.get(`/notifications${queryString ? `?${queryString}` : ''}`);
    return response;
  }

  async markNotificationAsRead(id) {
    const response = await this.patch(`/notifications/${id}/read`);
    return response;
  }

  async markAllNotificationsAsRead() {
    const response = await this.patch('/notifications/read-all');
    return response;
  }

  // Reviews methods
  async createReview(reviewData) {
    const response = await this.post('/reviews', reviewData);
    return response;
  }

  async getMyReviews() {
    const response = await this.get('/reviews/my-reviews');
    return response;
  }

  async getListingReviews(listingId) {
    if (!listingId || listingId === 'undefined' || listingId === 'null') {
      throw new Error('Valid listing ID is required');
    }
    
    try {
      const response = await this.get(`/reviews/listing/${listingId}`);
      return response;
    } catch (error) {
      console.error(`Failed to fetch reviews for listing ${listingId}:`, error);
      return { status: 'success', data: { reviews: [] } };
    }
  }

  async deleteReview(id) {
    const response = await this.delete(`/reviews/${id}`);
    return response;
  }

  // Favorites methods
  async addToFavorites(listingId) {
    const response = await this.post(`/favorites/${listingId}`);
    return response;
  }

  async getFavorites() {
    const response = await this.get('/favorites');
    return response;
  }

  async removeFromFavorites(listingId) {
    const response = await this.delete(`/favorites/${listingId}`);
    return response;
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
        headers, // Don't set Content-Type for FormData
        body: formData,
      });

      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        throw new Error('Server returned non-JSON response');
      }

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      return data;
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  }

  // Admin methods
  async getAllUsers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await this.get(`/admin/users${queryString ? `?${queryString}` : ''}`);
    return response;
  }

  async banUser(userId) {
    const response = await this.put(`/admin/users/${userId}/ban`);
    return response;
  }

  async unbanUser(userId) {
    const response = await this.put(`/admin/users/${userId}/unban`);
    return response;
  }

  async updateUserRole(userId, role) {
    const response = await this.put(`/admin/users/${userId}/role`, { role });
    return response;
  }

  async getDashboardStats() {
    const response = await this.get('/admin/dashboard-stats');
    return response;
  }

  // Host methods
  async getHostEarnings() {
    const response = await this.get('/payouts/host/earnings');
    return response;
  }

  async getReceivedPayouts() {
    const response = await this.get('/payouts/my-received');
    return response;
  }

  // Utility methods
  async checkHealth() {
    const response = await this.get('/health');
    return response;
  }
}

export default new ApiService();