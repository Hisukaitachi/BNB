// frontend/src/services/adminService.js
import api from './api';

class AdminService {
  /**
   * Get admin dashboard overview data
   * @returns {Promise<object>} Dashboard data
   */
  async getDashboardOverview() {
    try {
      const response = await api.get('/admin/dashboard');
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
   * Get user by ID
   * @param {number} userId - User ID
   * @returns {Promise<object>} User data
   */
  async getUserById(userId) {
    try {
      const response = await api.get(`/admin/users/${userId}`);
      return response.data.data?.user || {};
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch user');
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
      const response = await api.post(`/admin/users/${userId}/ban`, { reason });
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
      const response = await api.post(`/admin/users/${userId}/unban`);
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to unban user');
    }
  }

  /**
   * Suspend user
   * @param {number} userId - User ID
   * @param {string} reason - Suspension reason
   * @param {number} duration - Duration in days
   * @returns {Promise<object>} Suspension result
   */
  async suspendUser(userId, reason, duration = 30) {
    try {
      const response = await api.post(`/admin/users/${userId}/suspend`, { 
        reason, 
        duration 
      });
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to suspend user');
    }
  }

  /**
   * Unsuspend user
   * @param {number} userId - User ID
   * @returns {Promise<object>} Unsuspension result
   */
  async unsuspendUser(userId) {
    try {
      const response = await api.post(`/admin/users/${userId}/unsuspend`);
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to unsuspend user');
    }
  }

  /**
   * Soft delete user
   * @param {number} userId - User ID
   * @returns {Promise<object>} Deletion result
   */
  async softDeleteUser(userId) {
    try {
      const response = await api.delete(`/admin/users/${userId}/soft`);
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete user');
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
   * Approve listing
   * @param {number} listingId - Listing ID
   * @returns {Promise<object>} Approval result
   */
  async approveListing(listingId) {
    try {
      const response = await api.post(`/admin/listings/${listingId}/approve`);
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to approve listing');
    }
  }

  /**
   * Reject listing
   * @param {number} listingId - Listing ID
   * @param {string} reason - Rejection reason
   * @returns {Promise<object>} Rejection result
   */
  async rejectListing(listingId, reason) {
    try {
      const response = await api.post(`/admin/listings/${listingId}/reject`, { reason });
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to reject listing');
    }
  }

  /**
   * Delete listing
   * @param {number} listingId - Listing ID
   * @returns {Promise<object>} Deletion result
   */
  async deleteListing(listingId) {
    try {
      const response = await api.delete(`/admin/listings/${listingId}`);
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete listing');
    }
  }

  /**
   * Check for duplicate listings
   * @returns {Promise<Array>} Duplicate listings
   */
  async checkDuplicateListings() {
    try {
      const response = await api.get('/admin/listings/duplicates');
      return response.data.data?.duplicates || [];
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to check duplicates');
    }
  }

  // PAYOUT MANAGEMENT
  /**
   * Get all payouts
   * @param {object} params - Query parameters
   * @returns {Promise<Array>} Payouts list
   */
  async getAllPayouts(params = {}) {
    try {
      const response = await api.get('/admin/payouts', { params });
      return response.data.data?.payouts || [];
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch payouts');
    }
  }

  /**
   * Process payout
   * @param {number} payoutId - Payout ID
   * @returns {Promise<object>} Processing result
   */
  async processPayout(payoutId) {
    try {
      const response = await api.post(`/admin/payouts/${payoutId}/process`);
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to process payout');
    }
  }

  /**
   * Reject payout
   * @param {number} payoutId - Payout ID
   * @param {string} reason - Rejection reason
   * @returns {Promise<object>} Rejection result
   */
  async rejectPayout(payoutId, reason) {
    try {
      const response = await api.post(`/admin/payouts/${payoutId}/reject`, { reason });
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to reject payout');
    }
  }

  /**
   * Get platform earnings
   * @returns {Promise<object>} Earnings data
   */
  async getPlatformEarnings() {
    try {
      const response = await api.get('/admin/earnings');
      return response.data.data || {};
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch earnings');
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
      const response = await api.post(`/admin/bookings/${bookingId}/cancel`, { reason });
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
   * Update report status
   * @param {number} reportId - Report ID
   * @param {string} status - New status
   * @param {string} adminResponse - Admin response
   * @returns {Promise<object>} Update result
   */
  async updateReportStatus(reportId, status, adminResponse = '') {
    try {
      const response = await api.put(`/admin/reports/${reportId}`, { 
        status, 
        admin_response: adminResponse 
      });
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update report');
    }
  }

  /**
   * Send message to users involved in report
   * @param {number} reportId - Report ID
   * @param {string} message - Message to send
   * @returns {Promise<object>} Send result
   */
  async sendReportMessage(reportId, message) {
    try {
      const response = await api.post(`/admin/reports/${reportId}/message`, { message });
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to send message');
    }
  }

  // FEEDBACK MANAGEMENT
  /**
   * Get platform feedback
   * @param {object} params - Query parameters
   * @returns {Promise<Array>} Feedback list
   */
  async getPlatformFeedback(params = {}) {
    try {
      const response = await api.get('/admin/feedback', { params });
      return response.data.data?.feedback || [];
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch feedback');
    }
  }

  /**
   * Update feedback status
   * @param {number} feedbackId - Feedback ID
   * @param {string} status - New status
   * @param {string} adminResponse - Admin response
   * @returns {Promise<object>} Update result
   */
  async updateFeedbackStatus(feedbackId, status, adminResponse = '') {
    try {
      const response = await api.put(`/admin/feedback/${feedbackId}`, { 
        status, 
        admin_response: adminResponse 
      });
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update feedback');
    }
  }

  // ANALYTICS AND REPORTING
  /**
   * Get platform analytics
   * @param {string} period - Time period (week, month, year)
   * @returns {Promise<object>} Analytics data
   */
  async getPlatformAnalytics(period = 'month') {
    try {
      const response = await api.get('/admin/analytics', { 
        params: { period } 
      });
      return response.data.data || {};
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch analytics');
    }
  }

  /**
   * Generate report
   * @param {string} reportType - Type of report
   * @param {object} params - Report parameters
   * @returns {Promise<object>} Report data
   */
  async generateReport(reportType, params = {}) {
    try {
      const response = await api.post('/admin/reports/generate', { 
        type: reportType, 
        ...params 
      });
      return response.data.data || {};
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to generate report');
    }
  }

  /**
   * Export data
   * @param {string} dataType - Type of data to export
   * @param {object} filters - Export filters
   * @returns {Promise<Blob>} Export file
   */
  async exportData(dataType, filters = {}) {
    try {
      const response = await api.post('/admin/export', { 
        type: dataType, 
        filters 
      }, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to export data');
    }
  }

  // SYSTEM SETTINGS
  /**
   * Get system settings
   * @returns {Promise<object>} System settings
   */
  async getSystemSettings() {
    try {
      const response = await api.get('/admin/settings');
      return response.data.data?.settings || {};
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch settings');
    }
  }

  /**
   * Update system settings
   * @param {object} settings - Settings to update
   * @returns {Promise<object>} Update result
   */
  async updateSystemSettings(settings) {
    try {
      const response = await api.put('/admin/settings', settings);
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update settings');
    }
  }

  /**
   * Send system notification to all users
   * @param {object} notification - Notification data
   * @returns {Promise<object>} Send result
   */
  async sendSystemNotification(notification) {
    try {
      const response = await api.post('/admin/notifications/broadcast', notification);
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to send notification');
    }
  }

  // UTILITY METHODS
  /**
   * Get system health status
   * @returns {Promise<object>} Health status
   */
  async getSystemHealth() {
    try {
      const response = await api.get('/admin/health');
      return response.data.data || {};
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch system health');
    }
  }

  /**
   * Clear cache
   * @param {string} cacheType - Type of cache to clear
   * @returns {Promise<object>} Clear result
   */
  async clearCache(cacheType = 'all') {
    try {
      const response = await api.post('/admin/cache/clear', { type: cacheType });
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to clear cache');
    }
  }

  /**
   * Get activity logs
   * @param {object} params - Query parameters
   * @returns {Promise<Array>} Activity logs
   */
  async getActivityLogs(params = {}) {
    try {
      const response = await api.get('/admin/logs', { params });
      return response.data.data?.logs || [];
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch logs');
    }
  }

  /**
   * Search across platform
   * @param {string} query - Search query
   * @param {string} type - Search type (users, listings, bookings, etc.)
   * @returns {Promise<object>} Search results
   */
  async searchPlatform(query, type = 'all') {
    try {
      const response = await api.get('/admin/search', { 
        params: { q: query, type } 
      });
      return response.data.data?.results || {};
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to search');
    }
  }

  // HELPER METHODS
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