// frontend/src/services/reservationService.js - Improved class-based approach
import api from './api';

export const RESERVATION_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
};

class ReservationService {
  /**
   * Create a new reservation
   * @param {object} reservationData - Reservation details
   * @returns {Promise<object>} Creation result
   */
  async createReservation(reservationData) {
    try {
      // Validate reservation data
      const validation = this.validateReservationData(reservationData);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      const response = await api.post('/reservations', reservationData);
      
      return {
        success: true,
        data: response.data.data,
        reservationId: response.data.data?.reservationId,
        message: response.data.message
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to create reservation');
    }
  }

  /**
   * Get user's reservations (client view)
   * @param {object} params - Query parameters
   * @returns {Promise<object>} Reservations list
   */
  async getMyReservations(params = {}) {
    try {
      const response = await api.get('/reservations/my-reservations', { params });
      
      return {
        success: true,
        data: response.data.data,
        reservations: response.data.data?.reservations || [],
        pagination: response.data.data?.pagination
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to load reservations');
    }
  }

  /**
   * Get host's reservations
   * @param {object} params - Query parameters
   * @returns {Promise<object>} Host reservations
   */
  async getHostReservations(params = {}) {
    try {
      const response = await api.get('/reservations/host-reservations', { params });
      
      return {
        success: true,
        data: response.data.data,
        reservations: response.data.data?.reservations || [],
        pagination: response.data.data?.pagination
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to load host reservations');
    }
  }

  /**
   * Get reservation details
   * @param {string|number} reservationId - Reservation ID
   * @returns {Promise<object>} Reservation details
   */
  async getReservationDetails(reservationId) {
    try {
      if (!reservationId) {
        throw new Error('Reservation ID is required');
      }

      const response = await api.get(`/reservations/${reservationId}`);
      
      return {
        success: true,
        data: response.data.data,
        reservation: response.data.data?.reservation,
        history: response.data.data?.history
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to load reservation details');
    }
  }

  /**
   * Update reservation status
   * @param {string|number} reservationId - Reservation ID
   * @param {string} status - New status
   * @param {string} notes - Optional notes
   * @returns {Promise<object>} Update result
   */
  async updateReservationStatus(reservationId, status, notes = '') {
    try {
      if (!reservationId || !status) {
        throw new Error('Reservation ID and status are required');
      }

      if (!Object.values(RESERVATION_STATUSES).includes(status)) {
        throw new Error('Invalid reservation status');
      }

      const response = await api.patch(`/reservations/${reservationId}/status`, { 
        status, 
        notes 
      });
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to update reservation status');
    }
  }

  /**
   * Cancel reservation
   * @param {string|number} reservationId - Reservation ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<object>} Cancellation result
   */
  async cancelReservation(reservationId, reason = '') {
    try {
      if (!reservationId) {
        throw new Error('Reservation ID is required');
      }

      const response = await api.patch(`/reservations/${reservationId}/cancel`, { 
        reason 
      });
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to cancel reservation');
    }
  }

  /**
   * Get available dates for a listing
   * @param {string|number} listingId - Listing ID
   * @param {number} months - Number of months to check
   * @returns {Promise<object>} Available dates
   */
  async getAvailableDates(listingId, months = 3) {
    try {
      if (!listingId) {
        throw new Error('Listing ID is required');
      }

      const response = await api.get(`/reservations/listing/${listingId}/availability`, { 
        params: { months } 
      });
      
      return {
        success: true,
        data: response.data.data,
        bookedDates: response.data.data?.bookedDates || []
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to load availability');
    }
  }

  /**
   * Search reservations with filters
   * @param {object} filters - Search filters
   * @returns {Promise<object>} Search results
   */
  async searchReservations(filters) {
    try {
      const response = await api.get('/reservations/search', { params: filters });
      
      return {
        success: true,
        data: response.data.data,
        reservations: response.data.data?.reservations || [],
        pagination: response.data.data?.pagination
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to search reservations');
    }
  }

  /**
   * Calculate pricing breakdown
   * @param {number} basePrice - Base price per night
   * @param {string} checkInDate - Check-in date
   * @param {string} checkOutDate - Check-out date
   * @returns {object} Pricing breakdown
   */
  calculatePricing(basePrice, checkInDate, checkOutDate) {
    if (!basePrice || !checkInDate || !checkOutDate) {
      return { 
        total: 0, 
        nights: 0, 
        basePrice: 0, 
        serviceFee: 0, 
        cleaningFee: 0, 
        taxes: 0 
      };
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    
    if (nights <= 0) {
      return { 
        total: 0, 
        nights: 0, 
        basePrice: 0, 
        serviceFee: 0, 
        cleaningFee: 0, 
        taxes: 0 
      };
    }

    const subtotal = basePrice * nights;
    const serviceFee = Math.round(subtotal * 0.1 * 100) / 100; // 10% service fee
    const cleaningFee = 50; // Fixed cleaning fee
    const taxes = Math.round(subtotal * 0.12 * 100) / 100; // 12% tax
    const total = subtotal + serviceFee + cleaningFee + taxes;

    return {
      nights,
      basePrice: Math.round(subtotal * 100) / 100,
      serviceFee,
      cleaningFee,
      taxes,
      total: Math.round(total * 100) / 100
    };
  }

  /**
   * Check if dates are available
   * @param {string|number} listingId - Listing ID
   * @param {string} checkInDate - Check-in date
   * @param {string} checkOutDate - Check-out date
   * @returns {Promise<boolean>} Availability status
   */
  async checkAvailability(listingId, checkInDate, checkOutDate) {
    try {
      const response = await this.getAvailableDates(listingId);
      const bookedDates = response.bookedDates;
      
      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);
      
      // Check if the selected dates conflict with any booked dates
      return !bookedDates.some(booking => {
        const bookingCheckIn = new Date(booking.checkIn);
        const bookingCheckOut = new Date(booking.checkOut);
        
        // Check for date overlap
        return !(checkOut <= bookingCheckIn || checkIn >= bookingCheckOut);
      });
    } catch (error) {
      console.error('Error checking availability:', error);
      throw error;
    }
  }

  /**
   * Validate reservation data
   * @param {object} reservationData - Data to validate
   * @returns {object} Validation result
   */
  validateReservationData(reservationData) {
    const {
      listing_id,
      check_in_date,
      check_out_date,
      guest_count,
      guest_name,
      guest_email,
      base_price
    } = reservationData;

    if (!listing_id) {
      return { isValid: false, error: 'Listing ID is required' };
    }

    if (!check_in_date) {
      return { isValid: false, error: 'Check-in date is required' };
    }

    if (!check_out_date) {
      return { isValid: false, error: 'Check-out date is required' };
    }

    if (!guest_count || guest_count < 1 || guest_count > 20) {
      return { isValid: false, error: 'Guest count must be between 1 and 20' };
    }

    if (!guest_name || guest_name.trim().length < 2) {
      return { isValid: false, error: 'Guest name must be at least 2 characters' };
    }

    if (!guest_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest_email)) {
      return { isValid: false, error: 'Valid email address is required' };
    }

    if (!base_price || base_price <= 0) {
      return { isValid: false, error: 'Valid base price is required' };
    }

    // Date validation
    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkIn < today) {
      return { isValid: false, error: 'Check-in date cannot be in the past' };
    }

    if (checkOut <= checkIn) {
      return { isValid: false, error: 'Check-out date must be after check-in date' };
    }

    const daysDifference = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    
    if (daysDifference > 365) {
      return { isValid: false, error: 'Reservation cannot exceed 365 days' };
    }

    if (daysDifference < 1) {
      return { isValid: false, error: 'Minimum reservation duration is 1 day' };
    }

    return { isValid: true };
  }

  /**
   * Get reservation status color for UI
   * @param {string} status - Reservation status
   * @returns {string} Color name
   */
  getStatusColor(status) {
    const colors = {
      [RESERVATION_STATUSES.PENDING]: 'yellow',
      [RESERVATION_STATUSES.CONFIRMED]: 'green',
      [RESERVATION_STATUSES.CANCELLED]: 'red',
      [RESERVATION_STATUSES.COMPLETED]: 'gray'
    };
    return colors[status] || 'gray';
  }

  /**
   * Get reservation status badge class
   * @param {string} status - Reservation status
   * @returns {string} CSS classes
   */
  getStatusBadgeClass(status) {
    const classes = {
      [RESERVATION_STATUSES.PENDING]: 'bg-yellow-900/20 text-yellow-400 border-yellow-600',
      [RESERVATION_STATUSES.CONFIRMED]: 'bg-green-900/20 text-green-400 border-green-600',
      [RESERVATION_STATUSES.CANCELLED]: 'bg-red-900/20 text-red-400 border-red-600',
      [RESERVATION_STATUSES.COMPLETED]: 'bg-gray-900/20 text-gray-400 border-gray-600'
    };
    return classes[status] || classes[RESERVATION_STATUSES.PENDING];
  }

  /**
   * Format date for display
   * @param {string|Date} date - Date to format
   * @returns {string} Formatted date
   */
  formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Calculate cancellation refund
   * @param {object} reservation - Reservation object
   * @returns {object} Refund information
   */
  calculateCancellationRefund(reservation) {
    const now = new Date();
    const checkInDate = new Date(reservation.check_in_date);
    const daysUntilCheckIn = Math.ceil((checkInDate - now) / (1000 * 60 * 60 * 24));
    
    let refundPercentage = 0;
    
    if (daysUntilCheckIn >= 7) {
      refundPercentage = 100; // Full refund
    } else if (daysUntilCheckIn >= 3) {
      refundPercentage = 50; // 50% refund
    } else {
      refundPercentage = 0; // No refund
    }
    
    const refundAmount = (reservation.total_amount * refundPercentage) / 100;
    
    return {
      daysUntilCheckIn,
      refundPercentage,
      refundAmount: Math.round(refundAmount * 100) / 100,
      policy: this.getCancellationPolicyText(daysUntilCheckIn)
    };
  }

  /**
   * Get cancellation policy text
   * @param {number} daysUntilCheckIn - Days until check-in
   * @returns {string} Policy text
   */
  getCancellationPolicyText(daysUntilCheckIn) {
    if (daysUntilCheckIn >= 7) {
      return 'Free cancellation until 7 days before check-in';
    } else if (daysUntilCheckIn >= 3) {
      return '50% refund for cancellations 3-6 days before check-in';
    } else {
      return 'No refund for cancellations within 3 days of check-in';
    }
  }

  /**
   * Check if user can cancel reservation
   * @param {object} reservation - Reservation object
   * @param {object} user - Current user object
   * @returns {boolean} Can cancel status
   */
  canCancelReservation(reservation, user) {
    if (!reservation || !user) return false;

    const canCancelStatuses = [RESERVATION_STATUSES.PENDING, RESERVATION_STATUSES.CONFIRMED];
    const isCorrectStatus = canCancelStatuses.includes(reservation.status);
    const isOwnerOrHost = reservation.client_id === user.id || reservation.host_id === user.id;
    const isNotStarted = new Date(reservation.check_in_date) > new Date();

    return isCorrectStatus && isOwnerOrHost && isNotStarted;
  }

  /**
   * Check if host can confirm reservation
   * @param {object} reservation - Reservation object
   * @param {object} user - Current user object
   * @returns {boolean} Can confirm status
   */
  canConfirmReservation(reservation, user) {
    if (!reservation || !user) return false;

    return (
      reservation.status === RESERVATION_STATUSES.PENDING &&
      reservation.host_id === user.id
    );
  }

  /**
   * Format reservation duration
   * @param {string} checkIn - Check-in date
   * @param {string} checkOut - Check-out date
   * @returns {string} Duration text
   */
  formatDuration(checkIn, checkOut) {
    const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
    return `${nights} night${nights > 1 ? 's' : ''}`;
  }

  /**
   * Get reservation summary
   * @param {object} reservation - Reservation object
   * @returns {string} Summary text
   */
  getReservationSummary(reservation) {
    const duration = this.formatDuration(reservation.check_in_date, reservation.check_out_date);
    const checkInFormatted = this.formatDate(reservation.check_in_date);
    const checkOutFormatted = this.formatDate(reservation.check_out_date);
    
    return `${duration} • ${checkInFormatted} - ${checkOutFormatted} • ${reservation.guest_count} guest${reservation.guest_count > 1 ? 's' : ''}`;
  }
}

// Export both the class instance and individual functions for flexibility
const reservationService = new ReservationService();

export default reservationService;

// Also export utils for compatibility with existing code
export const reservationUtils = {
  calculatePricing: reservationService.calculatePricing.bind(reservationService),
  checkAvailability: reservationService.checkAvailability.bind(reservationService),
  getStatusColor: reservationService.getStatusColor.bind(reservationService),
  getStatusBadgeClass: reservationService.getStatusBadgeClass.bind(reservationService),
  formatDate: reservationService.formatDate.bind(reservationService),
  calculateCancellationRefund: reservationService.calculateCancellationRefund.bind(reservationService),
  getCancellationPolicyText: reservationService.getCancellationPolicyText.bind(reservationService)
};

// API object for compatibility
export const reservationAPI = {
  createReservation: reservationService.createReservation.bind(reservationService),
  getMyReservations: reservationService.getMyReservations.bind(reservationService),
  getHostReservations: reservationService.getHostReservations.bind(reservationService),
  getReservationDetails: reservationService.getReservationDetails.bind(reservationService),
  updateReservationStatus: reservationService.updateReservationStatus.bind(reservationService),
  cancelReservation: reservationService.cancelReservation.bind(reservationService),
  getAvailableDates: reservationService.getAvailableDates.bind(reservationService),
  searchReservations: reservationService.searchReservations.bind(reservationService)
};