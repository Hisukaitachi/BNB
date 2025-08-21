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
      const response = await fetch(url, config);
      
      // Handle different response types
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
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
        
        const errorMessage = data?.message || data || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      return data;
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
        body: formData, // Don't set Content-Type for FormData
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

  // Specific API methods for your backend
  
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
  async getAllListings(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/listings${queryString ? `?${queryString}` : ''}`);
  }

  async getListingById(id) {
    return this.get(`/listings/${id}`);
  }

  async searchListings(searchParams) {
    const queryString = new URLSearchParams(searchParams).toString();
    return this.get(`/listings/search?${queryString}`);
  }

  async createListing(listingData, files = {}) {
    const formData = new FormData();
    
    // Append listing data
    Object.keys(listingData).forEach(key => {
      formData.append(key, listingData[key]);
    });
    
    // Append files
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

  // Bookings methods
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

  // Reviews methods
  async createReview(reviewData) {
    return this.post('/reviews', reviewData);
  }

  async getMyReviews() {
    return this.get('/reviews/my-reviews');
  }

  async getListingReviews(listingId) {
    return this.get(`/reviews/listing/${listingId}`);
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
  async getMyListings() {
    return this.get('/listings/my-listings');
  }

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