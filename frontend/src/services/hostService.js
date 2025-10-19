// frontend/src/services/hostService.js
import api from './api';

class HostService {
  /**
   * Get host dashboard overview data
   * @returns {Promise<object>} Dashboard data
   */
  async getDashboardOverview() {
    try {
      // Get multiple data sources for dashboard
      const [bookings, listings, earnings, notifications] = await Promise.all([
        api.get('/bookings/host-bookings'),
        api.get('/listings/my-listings'),
        api.get('/payouts/host/earnings'),
        api.get('/notifications?unread_only=true')
      ]);

      const bookingsData = bookings.data.data?.bookings || [];
      const listingsData = listings.data.data?.listings || [];
      const earningsData = earnings.data;
      const notificationsData = notifications.data.data?.notifications || [];

      // Calculate statistics
      const pendingBookings = bookingsData.filter(b => b.status === 'pending').length;
      const approvedBookings = bookingsData.filter(b => b.status === 'approved').length;
      const completedBookings = bookingsData.filter(b => b.status === 'completed').length;
      
      // Today's check-ins
      const today = new Date().toISOString().split('T')[0];
      const todaysCheckIns = bookingsData.filter(b => 
        b.check_in_date && b.check_in_date.split('T')[0] === today
      ).length;

      return {
        totalListings: listingsData.length,
        activeListings: listingsData.filter(l => l.status === 'active').length,
        totalBookings: bookingsData.length,
        pendingBookings,
        approvedBookings,
        completedBookings,
        todaysCheckIns,
        totalEarnings: earningsData.totalEarnings || 0,
        pendingPayout: earningsData.pendingPayout || 0,
        unreadNotifications: notificationsData.length,
        recentBookings: bookingsData.slice(0, 5),
        topListings: listingsData.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0)).slice(0, 3),
        monthlyStats: this.calculateMonthlyStats(bookingsData)
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch dashboard data');
    }
  }

  /**
   * Get host bookings with filtering and sorting
   * @param {object} options - Query options
   * @returns {Promise<object>} Bookings data
   */
  async getHostBookings(options = {}) {
    try {
      const { status, date_range, page = 1, limit = 20 } = options;
      
      const params = { page, limit };
      if (status) params.status = status;
      if (date_range) {
        params.start_date = date_range.start;
        params.end_date = date_range.end;
      }

      const response = await api.get('/bookings/host-bookings', { params });
      
      return {
        bookings: response.data.data?.bookings || [],
        pagination: response.data.data?.pagination || {},
        statistics: this.calculateBookingStatistics(response.data.data?.bookings || [])
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch host bookings');
    }
  }

  /**
   * Update booking status (approve, decline, etc.)
   * @param {number} bookingId - Booking ID
   * @param {string} status - New status
   * @param {string} note - Optional note
   * @returns {Promise<object>} Update result
   */
  async updateBookingStatus(bookingId, status, note = '') {
    try {
      const response = await api.put(`/bookings/${bookingId}/status`, { 
        status,
        note 
      });
      
      return {
        success: true,
        data: response.data.data,
        message: `Booking ${status} successfully`
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update booking status');
    }
  }

  /**
   * Get host earnings and payout information
   * @returns {Promise<object>} Earnings data
   */
  async getHostEarnings() {
    try {
      const response = await api.get('/payouts/host/earnings');
      
      const earningsData = response.data;
      
      return {
        totalEarnings: earningsData.totalEarnings || 0,
        pendingPayout: earningsData.pendingPayout || 0,
        paidOut: earningsData.paidOut || 0,
        payouts: earningsData.payouts || [],
        monthlyBreakdown: this.calculateEarningsBreakdown(earningsData.payouts || [])
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch earnings data');
    }
  }

  /**
   * Get received payouts
   * @returns {Promise<Array>} Payouts list
   */
  async getReceivedPayouts() {
    try {
      const response = await api.get('/payouts/my-received');
      return response.data.payouts || [];
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch payouts');
    }
  }

  /**
   * Get host listings with statistics
   * @returns {Promise<object>} Listings data
   */
  async getHostListings() {
    try {
      const response = await api.get('/listings/my-listings');
      const listings = response.data.data?.listings || [];
      
      return {
        listings,
        statistics: this.calculateListingStatistics(listings),
        totalCount: listings.length
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch host listings');
    }
  }

  /**
/**
 * Create new listing - FINAL VERSION for multiple images
 * @param {object} listingData - Listing data with files
 * @returns {Promise<object>} Creation result
 */
async createListing(listingData) {
  try {
    console.log('🚀 Creating listing with data:', listingData);
    
    const formData = new FormData();
    
    // Add text fields
    formData.append('title', listingData.title || '');
    formData.append('description', listingData.description || '');
    formData.append('price_per_night', listingData.price_per_night || '');
    formData.append('location', listingData.location || '');
    
    // Optional fields
    if (listingData.latitude) formData.append('latitude', listingData.latitude);
    if (listingData.longitude) formData.append('longitude', listingData.longitude);
    if (listingData.max_guests) formData.append('max_guests', listingData.max_guests);
    if (listingData.bedrooms) formData.append('bedrooms', listingData.bedrooms);
    if (listingData.bathrooms) formData.append('bathrooms', listingData.bathrooms);
    if (listingData.amenities) formData.append('amenities', listingData.amenities);
    if (listingData.house_rules) formData.append('house_rules', listingData.house_rules);
    
    // CRITICAL: Handle multiple images with correct field name
    if (listingData.images && Array.isArray(listingData.images)) {
      listingData.images.forEach((image) => {
        if (image instanceof File) {
          formData.append('images', image); // MUST match multer config: 'images'
        }
      });
      console.log(`📁 ${listingData.images.length} image files added`);
    }
    
    // Video upload
    if (listingData.video && listingData.video instanceof File) {
      formData.append('video', listingData.video);
      console.log('🎥 Video file added:', listingData.video.name);
    }

    // Debug: Log what we're sending
    console.log('📋 FormData being sent:');
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value instanceof File ? `File: ${value.name}` : value);
    }

    const response = await api.post('/listings', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000 // 2 minutes for multiple large files
    });
    
    console.log('✅ Listing created successfully:', response.data);
    
    return {
      success: true,
      data: response.data.data,
      listingId: response.data.data?.listingId
    };
  } catch (error) {
    console.error('❌ CreateListing error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to create listing');
  }
}
  /**
 * Update existing listing - SIMPLIFIED VERSION
 * @param {number} listingId - Listing ID  
 * @param {object} updateData - Update data
 * @returns {Promise<object>} Update result
 */
async updateListing(listingId, updateData) {
  try {
    console.log('🚀 HostService updateListing called:', listingId);
    
    // Check if we have files
    const hasImages = updateData.images && Array.isArray(updateData.images) && updateData.images.length > 0;
    const hasVideo = updateData.video && updateData.video instanceof File;
    const hasFiles = hasImages || hasVideo;

    if (hasFiles) {
      // Use FormData for file uploads
      const formData = new FormData();
      
      // Add text fields
      Object.entries(updateData).forEach(([key, value]) => {
        if (key !== 'images' && key !== 'video' && value !== '' && value != null) {
          formData.append(key, value);
        }
      });
      
      // Add multiple images
      if (hasImages) {
        updateData.images.forEach((image) => {
          if (image instanceof File) {
            formData.append('images', image);
          }
        });
        console.log(`📁 ${updateData.images.length} images added`);
      }
      
      // Add video
      if (hasVideo) {
        formData.append('video', updateData.video);
        console.log('🎥 Video added');
      }

      const response = await api.put(`/listings/${listingId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000
      });
      
      return {
        success: true,
        data: response.data.data,
        message: 'Listing updated successfully'
      };
      
    } else {
      // JSON for text-only updates
      const fieldsToSend = {};
      Object.entries(updateData).forEach(([key, value]) => {
        if (key !== 'images' && key !== 'video' && value !== '' && value != null) {
          fieldsToSend[key] = value;
        }
      });

      const response = await api.put(`/listings/${listingId}`, fieldsToSend, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      return {
        success: true,
        data: response.data.data,
        message: 'Listing updated successfully'
      };
    }
    
  } catch (error) {
    console.error('❌ UpdateListing error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to update listing');
  }
}
  /**
   * Delete listing
   * @param {number} listingId - Listing ID
   * @returns {Promise<object>} Deletion result
   */
  async deleteListing(listingId) {
    try {
      const response = await api.delete(`/listings/${listingId}`);
      
      return {
        success: true,
        message: 'Listing deleted successfully'
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete listing');
    }
  }

  /**
   * Get calendar data for big calendar view
   * @param {string} month - Month (YYYY-MM)
   * @returns {Promise<object>} Calendar data
   */
  async getCalendarData(month = null) {
    try {
      const currentMonth = month || new Date().toISOString().slice(0, 7);
      
      // Get host bookings for the month
      const response = await api.get('/bookings/host-bookings', {
        params: {
          month: currentMonth,
          limit: 1000 // Get all bookings for the month
        }
      });
      
      const bookings = response.data.data?.bookings || [];
      const listings = await this.getHostListings();
      
      return {
        bookings: this.formatBookingsForCalendar(bookings),
        listings: listings.listings,
        month: currentMonth,
        occupancyRate: this.calculateOccupancyRate(bookings, currentMonth)
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch calendar data');
    }
  }

  /**
   * Submit report against client
   * @param {object} reportData - Report data
   * @returns {Promise<object>} Report submission result
   */
  async submitReport(reportData) {
    try {
      const response = await api.post('/reports', {
        ...reportData,
        reporter_id: this.getCurrentUserId()
      });
      
      return {
        success: true,
        reportId: response.data.reportId,
        message: 'Report submitted successfully'
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to submit report');
    }
  }

  /**
   * Get host's submitted reports
   * @returns {Promise<Array>} Reports list
   */
  async getMyReports() {
    try {
      const response = await api.get('/reports/my-reports');
      return response.data.data?.reports || [];
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch reports');
    }
  }

  // HELPER METHODS

  /**
   * Calculate monthly statistics from bookings
   * @param {Array} bookings - Bookings array
   * @returns {object} Monthly stats
   */
  calculateMonthlyStats(bookings) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const thisMonthBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.created_at);
      return bookingDate.getMonth() === currentMonth && bookingDate.getFullYear() === currentYear;
    });

    const lastMonthBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.created_at);
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      return bookingDate.getMonth() === lastMonth && bookingDate.getFullYear() === lastMonthYear;
    });

    return {
      thisMonth: thisMonthBookings.length,
      lastMonth: lastMonthBookings.length,
      growth: lastMonthBookings.length > 0 
        ? Math.round(((thisMonthBookings.length - lastMonthBookings.length) / lastMonthBookings.length) * 100)
        : 0
    };
  }

  /**
   * Calculate booking statistics
   * @param {Array} bookings - Bookings array
   * @returns {object} Booking statistics
   */
  calculateBookingStatistics(bookings) {
    const statusCounts = bookings.reduce((acc, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1;
      return acc;
    }, {});

    const totalRevenue = bookings
      .filter(b => ['completed', 'approved'].includes(b.status))
      .reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);

    return {
      total: bookings.length,
      byStatus: statusCounts,
      totalRevenue,
      averageBookingValue: bookings.length > 0 ? totalRevenue / bookings.length : 0
    };
  }

  /**
   * Calculate listing statistics
   * @param {Array} listings - Listings array
   * @returns {object} Listing statistics
   */
  calculateListingStatistics(listings) {
    const totalViews = listings.reduce((sum, l) => sum + (l.view_count || 0), 0);
    const averageRating = listings.length > 0 
      ? listings.reduce((sum, l) => sum + (Number(l.average_rating) || 0), 0) / listings.length
      : 0;
    
    return {
      total: listings.length,
      averageRating: Math.round(averageRating * 10) / 10,
      totalViews,
      averagePrice: listings.length > 0
        ? listings.reduce((sum, l) => sum + (Number(l.price_per_night) || 0), 0) / listings.length
        : 0,
      topPerformer: listings.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))[0]
    };
  }

  /**
 * Format bookings for calendar display
 * @param {Array} bookings - Raw bookings data
 * @returns {Array} Formatted calendar events
 */
formatBookingsForCalendar(bookings) {
  return bookings.map(booking => ({
    id: booking.id || booking.booking_id,
    title: `${booking.title} - ${booking.client_name}`,
    // Fix: Use the actual field names from your backend
    start: booking.start_date || booking.check_in_date,
    end: booking.end_date || booking.check_out_date,
    status: booking.status,
    listingId: booking.listing_id,
    clientName: booking.client_name,
    totalPrice: booking.total_price,
    color: this.getStatusColor(booking.status),
    extendedProps: {
      bookingId: booking.id || booking.booking_id,
      clientId: booking.client_id,
      listingTitle: booking.title,
      hostName: booking.host_name,
      totalPrice: booking.total_price,
      imageUrl: booking.image_url  // ← ADD THIS LINE
    }
  }));
}

  /**
   * Calculate occupancy rate for a month
   * @param {Array} bookings - Bookings for the month
   * @param {string} month - Month (YYYY-MM)
   * @returns {number} Occupancy rate percentage
   */
  calculateOccupancyRate(bookings, month) {
  const [year, monthNum] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  
  const bookedDays = bookings
    .filter(b => ['approved', 'confirmed', 'completed'].includes(b.status))
    .reduce((days, booking) => {
      // Fix: Use the actual field names from your backend
      const checkIn = booking.start_date || booking.check_in_date;
      const checkOut = booking.end_date || booking.check_out_date;
      
      if (!checkIn || !checkOut) return days;
      
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      const bookingDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      return days + bookingDays;
    }, 0);
  
  return Math.round((bookedDays / daysInMonth) * 100);
}

  /**
   * Calculate earnings breakdown by month
   * @param {Array} payouts - Payouts array
   * @returns {object} Monthly earnings breakdown
   */
  calculateEarningsBreakdown(payouts) {
    const breakdown = payouts.reduce((acc, payout) => {
      const month = new Date(payout.created_at).toISOString().slice(0, 7);
      acc[month] = (acc[month] || 0) + Number(payout.amount);
      return acc;
    }, {});

    return Object.entries(breakdown)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 12) // Last 12 months
      .reduce((obj, [month, amount]) => {
        obj[month] = amount;
        return obj;
      }, {});
  }

  /**
   * Get status color for calendar events
   * @param {string} status - Booking status
   * @returns {string} Color code
   */
  getStatusColor(status) {
    const colors = {
      'pending': '#FFA500',     // Orange
      'approved': '#32CD32',    // Green
      'confirmed': '#4169E1',   // Blue
      'completed': '#9932CC',   // Purple
      'cancelled': '#FF6347',   // Red
      'rejected': '#DC143C'     // Dark Red
    };
    
    return colors[status] || '#6B7280';
  }

  /**
   * Get current user ID from localStorage
   * @returns {number} User ID
   */
  getCurrentUserId() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id;
  }

  /**
   * Format booking for display
   * @param {object} booking - Raw booking data
   * @returns {object} Formatted booking
   */
  formatBooking(booking) {
    return {
      ...booking,
      formattedDates: `${new Date(booking.check_in_date).toLocaleDateString()} - ${new Date(booking.check_out_date).toLocaleDateString()}`,
      formattedPrice: `₱${Number(booking.total_price).toLocaleString()}`,
      daysFromNow: this.getDaysFromNow(booking.check_in_date),
      duration: this.calculateDuration(booking.check_in_date, booking.check_out_date),
      statusColor: this.getStatusColor(booking.status),
      canModify: ['pending', 'approved'].includes(booking.status),
      needsAction: booking.status === 'pending'
    };
  }

  /**
   * Calculate days from now
   * @param {string} date - Target date
   * @returns {number} Days from now
   */
  getDaysFromNow(date) {
    const target = new Date(date);
    const now = new Date();
    const diffTime = target - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate booking duration
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {number} Duration in days
   */
  calculateDuration(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  }

  /**
   * Get booking analytics for a specific period
   * @param {string} period - 'week', 'month', 'year'
   * @returns {Promise<object>} Analytics data
   */
  async getBookingAnalytics(period = 'month') {
    try {
      const bookings = await this.getHostBookings({ limit: 1000 });
      const now = new Date();
      let startDate;
      
      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const periodBookings = bookings.bookings.filter(booking => 
        new Date(booking.created_at) >= startDate
      );

      return {
        totalBookings: periodBookings.length,
        revenue: periodBookings.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0),
        averageBookingValue: periodBookings.length > 0 
          ? periodBookings.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0) / periodBookings.length 
          : 0,
        occupancyRate: this.calculateOccupancyRate(periodBookings, period),
        topListings: this.getTopPerformingListings(periodBookings),
        dailyBreakdown: this.getDailyBreakdown(periodBookings)
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch analytics');
    }
  }

  /**
   * Get top performing listings
   * @param {Array} bookings - Bookings array
   * @returns {Array} Top listings
   */
  getTopPerformingListings(bookings) {
    const listingStats = bookings.reduce((acc, booking) => {
      const listingId = booking.listing_id;
      if (!acc[listingId]) {
        acc[listingId] = {
          id: listingId,
          title: booking.title,
          bookingCount: 0,
          totalRevenue: 0
        };
      }
      acc[listingId].bookingCount++;
      acc[listingId].totalRevenue += Number(booking.total_price) || 0;
      return acc;
    }, {});

    return Object.values(listingStats)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);
  }

  /**
   * Get daily breakdown for charts
   * @param {Array} bookings - Bookings array
   * @returns {Array} Daily data
   */
  getDailyBreakdown(bookings) {
    const dailyStats = bookings.reduce((acc, booking) => {
      const date = new Date(booking.created_at).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, bookings: 0, revenue: 0 };
      }
      acc[date].bookings++;
      acc[date].revenue += Number(booking.total_price) || 0;
      return acc;
    }, {});

    return Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Request payout from available earnings
   * @param {object} payoutData - Payout request data
   * @returns {Promise<object>} Request result
   */
  async requestPayout(payoutData) {
    try {
      const response = await api.post('/payouts/request', {
        amount: payoutData.amount,
        payment_method: payoutData.payment_method || 'bank_transfer',
        bank_details: payoutData.bank_details
      });
      
      return {
        success: true,
        data: response.data,
        message: 'Payout request submitted successfully'
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to request payout');
    }
  }
}

export default new HostService();