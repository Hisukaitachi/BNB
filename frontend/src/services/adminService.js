// frontend/src/services/adminService.js - FIXED VERSION
import api from './api';

class AdminService {
  /**
   * Get admin dashboard overview data - FIXED ENDPOINT
   * @returns {Promise<object>} Dashboard data
   */
  async getDashboardOverview() {
    try {
      // ✅ FIXED: Use the correct endpoint that exists in your backend
      const response = await api.get('/admin/dashboard-stats');
      return response.data.data || {};
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch dashboard data');
    }
  }

  // USER MANAGEMENT
  /**
   * Get all users with filters
   * @param {object} params - Query parameters
   * @returns {Promise<Array>} Users list
   */
  async getAllUsers(params = {}) {
    try {
      const response = await api.get('/admin/users', { params });
      return response.data.data?.users || [];
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch users');
    }
  }

  /**
   * Ban user
   * @param {number} userId - User ID
   * @param {string} reason - Ban reason
   * @returns {Promise<object>} Ban result
   */
  async banUser(userId, reason = 'Violation of terms of service') {
    try {
      const response = await api.put(`/admin/users/${userId}/ban`, { reason });
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to ban user');
    }
  }

  /**
   * Unban user
   * @param {number} userId - User ID
   * @returns {Promise<object>} Unban result
   */
  async unbanUser(userId) {
    try {
      const response = await api.put(`/admin/users/${userId}/unban`);
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to unban user');
    }
  }

  /**
   * Update user role
   * @param {number} userId - User ID
   * @param {string} role - New role
   * @returns {Promise<object>} Update result
   */
  async updateUserRole(userId, role) {
    try {
      const response = await api.put(`/admin/users/${userId}/role`, { role });
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update user role');
    }
  }

  // LISTING MANAGEMENT
  /**
   * Get all listings for admin review
   * @param {object} params - Query parameters
   * @returns {Promise<Array>} Listings list
   */
  async getAllListings(params = {}) {
    try {
      const response = await api.get('/admin/listings', { params });
      return response.data.data?.listings || [];
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch listings');
    }
  }

  /**
   * Delete listing
   * @param {number} listingId - Listing ID
   * @param {string} reason - Deletion reason
   * @returns {Promise<object>} Deletion result
   */
  async deleteListing(listingId, reason = '') {
    try {
      const response = await api.delete(`/admin/listings/${listingId}`, { 
        data: { reason } 
      });
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete listing');
    }
  }

  // ✅ FIXED PAYOUT MANAGEMENT - Using correct endpoints
  /**
   * Get all payouts
   * @param {object} params - Query parameters
   * @returns {Promise<Array>} Payouts list
   */
  async getAllPayouts(params = {}) {
    try {
      const response = await api.get('/payouts/all', { params });
      return response.data.data?.payouts || [];
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch payouts');
    }
  }

  /**
   * Get platform earnings - ADDED MISSING METHOD
   * @returns {Promise<object>} Platform earnings data
   */
  async getPlatformEarnings() {
    try {
      // Use dashboard stats to get earnings data
      const dashboardData = await this.getDashboardOverview();
      
      // Calculate platform earnings from dashboard stats
      const platformEarnings = {
        totalRevenue: dashboardData.totalRevenue || 0,
        totalCommission: (dashboardData.totalRevenue || 0) * 0.1, // 10% platform fee
        totalPayouts: dashboardData.totalPayouts || 0,
        pendingPayouts: dashboardData.pendingPayouts || 0,
        netEarnings: ((dashboardData.totalRevenue || 0) * 0.1) - (dashboardData.totalPayouts || 0)
      };
      
      return platformEarnings;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch platform earnings');
    }
  }

  /**
   * Get host earnings (admin checking specific host)
   * @param {number} hostId - Host ID
   * @returns {Promise<object>} Host earnings
   */
  async getHostEarnings(hostId) {
    try {
      const response = await api.get(`/admin/earnings/${hostId}`);
      return response.data || {};
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch host earnings');
    }
  }

  /**
   * Release/process payout
   * @param {object} payoutData - Payout data
   * @returns {Promise<object>} Processing result
   */
  async releasePayout(payoutData) {
    try {
      const response = await api.post('/admin/payouts/release', payoutData);
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to process payout');
    }
  }

  // BOOKING MANAGEMENT
  /**
   * Get all bookings
   * @param {object} params - Query parameters
   * @returns {Promise<Array>} Bookings list
   */
  async getAllBookings(params = {}) {
    try {
      const response = await api.get('/admin/bookings', { params });
      return response.data.data?.bookings || [];
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch bookings');
    }
  }

  /**
   * Cancel booking (admin action)
   * @param {number} bookingId - Booking ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<object>} Cancellation result
   */
  async cancelBooking(bookingId, reason) {
    try {
      const response = await api.delete(`/admin/bookings/${bookingId}`, { 
        data: { reason } 
      });
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to cancel booking');
    }
  }

  // REPORT MANAGEMENT
  /**
   * Get all reports
   * @param {object} params - Query parameters
   * @returns {Promise<Array>} Reports list
   */
  async getAllReports(params = {}) {
    try {
      const response = await api.get('/admin/reports', { params });
      return response.data.data?.reports || [];
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch reports');
    }
  }

  /**
   * Take action on report
   * @param {object} actionData - Action data
   * @returns {Promise<object>} Action result
   */
  async takeAction(actionData) {
    try {
      const response = await api.post('/admin/actions', actionData);
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to take action');
    }
  }

  // REVIEW MANAGEMENT
  /**
   * Get all reviews
   * @returns {Promise<Array>} Reviews list
   */
  async getAllReviews() {
    try {
      const response = await api.get('/admin/reviews');
      return response.data.data?.reviews || [];
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch reviews');
    }
  }

  /**
   * Remove review
   * @param {number} reviewId - Review ID
   * @returns {Promise<object>} Removal result
   */
  async removeReview(reviewId) {
    try {
      const response = await api.delete(`/admin/reviews/${reviewId}`);
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to remove review');
    }
  }

  // UTILITY METHODS
  /**
   * Format user for display
   * @param {object} user - User object
   * @returns {object} Formatted user
   */
  formatUser(user) {
    return {
      ...user,
      displayName: user.name,
      statusBadge: this.getUserStatusBadge(user),
      roleBadge: this.getRoleBadge(user.role),
      joinedDate: new Date(user.created_at).toLocaleDateString(),
      lastActive: user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'
    };
  }

  /**
   * Get user status badge info
   * @param {object} user - User object
   * @returns {object} Badge info
   */
  getUserStatusBadge(user) {
    if (user.is_banned) {
      return { label: 'Banned', color: 'bg-red-100 text-red-800' };
    }
    if (user.is_suspended) {
      return { label: 'Suspended', color: 'bg-yellow-100 text-yellow-800' };
    }
    if (user.status === 'active') {
      return { label: 'Active', color: 'bg-green-100 text-green-800' };
    }
    return { label: 'Inactive', color: 'bg-gray-100 text-gray-800' };
  }

  /**
   * Get role badge info
   * @param {string} role - User role
   * @returns {object} Badge info
   */
  getRoleBadge(role) {
    const colors = {
      admin: 'bg-red-100 text-red-800',
      host: 'bg-purple-100 text-purple-800',
      client: 'bg-blue-100 text-blue-800'
    };
    
    return {
      label: role.charAt(0).toUpperCase() + role.slice(1),
      color: colors[role] || 'bg-gray-100 text-gray-800'
    };
  }

  /**
   * Format currency for display
   * @param {number} amount - Amount to format
   * @param {string} currency - Currency code
   * @returns {string} Formatted amount
   */
  formatCurrency(amount, currency = 'PHP') {
    if (currency === 'PHP') {
      return `₱${Number(amount).toLocaleString()}`;
    }
    return `${currency} ${Number(amount).toLocaleString()}`;
  }

  /**
   * Calculate percentage change
   * @param {number} current - Current value
   * @param {number} previous - Previous value
   * @returns {object} Change info
   */
  calculateChange(current, previous) {
    if (!previous || previous === 0) {
      return { percentage: 0, isPositive: true, display: '0%' };
    }
    
    const change = ((current - previous) / previous) * 100;
    const isPositive = change >= 0;
    
    return {
      percentage: Math.abs(change),
      isPositive,
      display: `${isPositive ? '+' : '-'}${Math.abs(change).toFixed(1)}%`
    };
  }
}

export default new AdminService();