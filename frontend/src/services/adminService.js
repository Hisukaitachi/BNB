// frontend/src/services/adminService.js - CLEANED VERSION
import api from './api';

class AdminService {
  /**
   * Get admin dashboard overview data
   * @returns {Promise<object>} Dashboard data
   */
  async getDashboardOverview() {
    try {
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

  /**
   * Check user ban status
   * @param {number} userId - User ID
   * @returns {Promise<object>} Ban status
   */
  async checkBanStatus(userId) {
    try {
      const response = await api.get(`/admin/check-ban/${userId}`);
      return response.data.data || {};
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to check ban status');
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
   * Remove listing
   * @param {number} listingId - Listing ID
   * @param {string} reason - Removal reason
   * @returns {Promise<object>} Removal result
   */
  async removeListing(listingId, reason = '') {
    try {
      const response = await api.delete(`/admin/listings/${listingId}`, { 
        data: { reason } 
      });
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to remove listing');
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

  /**
   * Update booking status
   * @param {number} bookingId - Booking ID
   * @param {string} status - New status
   * @returns {Promise<object>} Update result
   */
  async updateBookingStatus(bookingId, status) {
    try {
      const response = await api.put(`/admin/bookings/${bookingId}/status`, { status });
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update booking status');
    }
  }

  /**
   * Get booking history
   * @param {number} bookingId - Booking ID
   * @returns {Promise<Array>} Booking history
   */
  async getBookingHistory(bookingId) {
    try {
      const response = await api.get(`/admin/bookings/${bookingId}/history`);
      return response.data.data?.history || [];
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch booking history');
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


  /**
   * Get platform earnings data
   * @returns {Promise<object>} Platform earnings
   */
  async getPlatformEarnings() {
    try {
      const response = await api.get('/admin/dashboard-stats');
      const dashboardData = response.data.data || {};
      
      // Transform dashboard data to earnings format
      return {
        totalRevenue: dashboardData.totalRevenue || 0,
        totalCommission: dashboardData.platformRevenue || 0,
        totalBookings: dashboardData.totalBookings || 0,
        averageCommissionRate: 10, // Your 10% platform fee
        monthlyGrowth: dashboardData.monthlyGrowth || 0,
        revenueGrowth: dashboardData.revenueGrowth || 0,
        topHosts: dashboardData.topHosts || [],
        revenueChart: dashboardData.monthlyChart || [],
        commissionChart: dashboardData.commissionBreakdown || []
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch platform earnings');
    }
  }

  /**
   * Get all payouts for admin management
   * @returns {Promise<Array>} All payouts
   */
  async getAllPayouts() {
    try {
      const response = await api.get('/payouts/all');
      return response.data.payouts || [];
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch payouts');
    }
  }

  /**
   * Process/approve a payout
   * @param {number} payoutId - Payout ID  
   * @returns {Promise<object>} Process result
   */
  async processPayout(payoutId) {
    try {
      // This should call your actual payout controller
      const response = await api.post('/payouts/release', {
        payout_id: payoutId,
        action: 'approve'
      });
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to process payout');
    }
  }

  /**
   * Reject a payout
   * @param {number} payoutId - Payout ID
   * @param {string} reason - Rejection reason
   * @returns {Promise<object>} Reject result
   */
  async rejectPayout(payoutId, reason) {
    try {
      const response = await api.post('/payouts/reject', {
        payout_id: payoutId,
        reason: reason
      });
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to reject payout');
    }
  }
  
  //Refund Management
/**
   * Get all refunds with filtering
   * @param {object} params - Query parameters (status, page, limit)
   * @returns {Promise<object>} Refunds data with pagination
   */
  async getAllRefunds(params = {}) {
    try {
      const response = await api.get('/admin/refunds', { params });
      return {
        refunds: response.data.data?.refunds || [],
        statistics: response.data.data?.statistics || {},
        pagination: response.data.data?.pagination || {}
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch refunds');
    }
  }

  /**
   * Get refund details
   * @param {number} refundId - Refund ID
   * @returns {Promise<object>} Refund details
   */
  async getRefundDetails(refundId) {
    try {
      const response = await api.get(`/admin/refunds/${refundId}`);
      return response.data.data?.refund || {};
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch refund details');
    }
  }

  /**
   * Update refund status
   * @param {number} refundId - Refund ID
   * @param {string} status - New status (pending/processing/completed/failed)
   * @param {string} notes - Optional notes
   * @returns {Promise<object>} Update result
   */
  async updateRefundStatus(refundId, status, notes = '') {
    try {
      const response = await api.patch(`/admin/refunds/${refundId}/status`, { 
        status, 
        notes 
      });
      return { 
        success: true, 
        data: response.data.data,
        message: `Refund ${status} successfully` 
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update refund status');
    }
  }

  /**
   * Process manual refund
   * @param {number} bookingId - Booking ID
   * @param {number} amount - Refund amount
   * @param {string} reason - Refund reason
   * @returns {Promise<object>} Refund creation result
   */
  async processManualRefund(bookingId, amount, reason) {
    try {
      const response = await api.post('/admin/refunds/manual', {
        bookingId,
        amount,
        reason
      });
      return { 
        success: true, 
        data: response.data.data,
        refundId: response.data.data?.refundId 
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to process manual refund');
    }
  }

  /**
   * Get booking details for admin
   * @param {number} bookingId - Booking ID
   * @returns {Promise<object>} Booking details
   */
  async getBookingDetails(bookingId) {
    try {
      const response = await api.get(`/admin/bookings/${bookingId}`);
      return response.data.data?.booking || {};
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch booking details');
    }
  }

  /**
   * Cancel booking with optional refund
   * @param {number} bookingId - Booking ID
   * @param {string} reason - Cancellation reason
   * @param {number} refundAmount - Optional refund amount
   * @returns {Promise<object>} Cancellation result
   */
  async cancelBookingWithRefund(bookingId, reason, refundAmount = 0) {
    try {
      if (refundAmount > 0) {
        const response = await api.post(`/admin/bookings/${bookingId}/cancel-with-refund`, {
          reason,
          refundAmount
        });
        return { success: true, data: response.data.data };
      } else {
        const response = await api.post(`/admin/bookings/${bookingId}/cancel`, { reason });
        return { success: true, data: response.data.data };
      }
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to cancel booking');
    }
  }

  /**
   * Format refund for display
   * @param {object} refund - Refund object
   * @returns {object} Formatted refund
   */
  formatRefund(refund) {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };

    return {
      ...refund,
      formattedAmount: this.formatCurrency(refund.amount),
      statusBadge: {
        label: refund.status.charAt(0).toUpperCase() + refund.status.slice(1),
        color: statusColors[refund.status] || 'bg-gray-100 text-gray-800'
      },
      createdDate: new Date(refund.created_at).toLocaleDateString(),
      canProcess: refund.status === 'pending',
      needsAttention: refund.status === 'pending' && 
        new Date(refund.created_at) < new Date(Date.now() - 48 * 60 * 60 * 1000) // Older than 48 hours
    };
  }
}

export default new AdminService();