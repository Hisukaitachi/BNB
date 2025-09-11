// src/services/bookingService.js - Updated with payment support
import { bookingAPI } from './api';

export const BOOKING_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  CONFIRMED: 'confirmed',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
};

class BookingService {
  /**
   * Create a new booking - Book a unit
   * @param {object} bookingData - Booking data
   * @returns {Promise<object>} Booking creation result
   */
  async createBooking(bookingData) {
    try {
      const response = await bookingAPI.createBooking(bookingData);
      return {
        success: true,
        data: response.data,
        bookingId: response.data.data?.bookingId
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create booking');
    }
  }

  /**
   * Get client's bookings with payment status - My Bookings
   * @returns {Promise<Array>} User bookings with payment info
   */
  async getMyBookings() {
    try {
      const response = await bookingAPI.getMyBookings();
      return response.data.data?.bookings || [];
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch bookings');
    }
  }

  /**
   * Get host's bookings
   * @returns {Promise<Array>} Host bookings
   */
  async getHostBookings() {
    try {
      const response = await bookingAPI.getHostBookings();
      return response.data.data?.bookings || [];
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch host bookings');
    }
  }

  /**
   * Cancel Bookings
   * @param {number} bookingId - Booking ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<object>} Cancellation result
   */
  async cancelBooking(bookingId, reason = '') {
    try {
      const response = await bookingAPI.updateBookingStatus(bookingId, BOOKING_STATUS.CANCELLED);
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to cancel booking');
    }
  }

  /**
   * Update booking status (for hosts)
   * @param {number} bookingId - Booking ID
   * @param {string} status - New status
   * @returns {Promise<object>} Update result
   */
  async updateBookingStatus(bookingId, status) {
    try {
      if (!Object.values(BOOKING_STATUS).includes(status)) {
        throw new Error('Invalid booking status');
      }

      const response = await bookingAPI.updateBookingStatus(bookingId, status);
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
      const response = await bookingAPI.getBookingHistory(bookingId);
      return response.data.data?.history || [];
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch booking history');
    }
  }

  /**
   * Bookings Calendar Conflict - Check for conflicts
   * @param {number} listingId - Listing ID
   * @returns {Promise<Array>} Booked dates
   */
  async getBookedDates(listingId) {
    try {
      const response = await bookingAPI.getBookedDates(listingId);
      return response.data.data?.unavailableDates || [];
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch booked dates');
    }
  }

  /**
   * Check booking availability
   * @param {number} listingId - Listing ID
   * @param {string} checkIn - Check-in date
   * @param {string} checkOut - Check-out date
   * @returns {Promise<boolean>} Whether dates are available
   */
  async checkAvailability(listingId, checkIn, checkOut) {
    try {
      const bookedData = await this.getBookedDates(listingId);
      const startDate = new Date(checkIn);
      const endDate = new Date(checkOut);

      // Check for conflicts with unavailable dates
      const hasConflict = bookedData.some(booking => {
        const bookingStart = new Date(booking.date);
        const bookingEnd = new Date(booking.date);
        bookingEnd.setDate(bookingEnd.getDate() + 1); // Add one day for single date entries
        
        return (startDate < bookingEnd && endDate > bookingStart);
      });

      // Also check booking ranges if available
      if (bookedData.bookingRanges) {
        const rangeConflict = bookedData.bookingRanges.some(range => {
          const rangeStart = new Date(range.start);
          const rangeEnd = new Date(range.end);
          return (startDate < rangeEnd && endDate > rangeStart);
        });
        return !hasConflict && !rangeConflict;
      }

      return !hasConflict;
    } catch (error) {
      console.error('Availability check failed:', error);
      return false; // Assume not available if check fails
    }
  }

  /**
   * Calculate booking price
   * @param {number} pricePerNight - Price per night
   * @param {string} checkIn - Check-in date
   * @param {string} checkOut - Check-out date
   * @returns {object} Price breakdown
   */
  calculateBookingPrice(pricePerNight, checkIn, checkOut) {
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    if (nights <= 0) {
      return { nights: 0, basePrice: 0, serviceFee: 0, taxes: 0, total: 0 };
    }
    
    const basePrice = pricePerNight * nights;
    const serviceFee = Math.round(basePrice * 0.1); // 10% service fee
    const taxes = Math.round(basePrice * 0.05); // 5% taxes
    const total = basePrice + serviceFee + taxes;

    return {
      nights,
      basePrice,
      serviceFee,
      taxes,
      total,
      breakdown: {
        [`₱${pricePerNight.toLocaleString()} x ${nights} night${nights > 1 ? 's' : ''}`]: basePrice,
        'Service fee': serviceFee,
        'Taxes': taxes
      }
    };
  }

  /**
   * Get booking summary with status formatting - UPDATED WITH PAYMENT INFO
   * @param {object} booking - Booking object
   * @returns {object} Formatted booking summary
   */
  formatBookingSummary(booking) {
    const statusColors = {
      [BOOKING_STATUS.PENDING]: 'text-yellow-500',
      [BOOKING_STATUS.APPROVED]: 'text-green-500',
      [BOOKING_STATUS.CONFIRMED]: 'text-blue-500',
      [BOOKING_STATUS.REJECTED]: 'text-red-500',
      [BOOKING_STATUS.CANCELLED]: 'text-red-500',
      [BOOKING_STATUS.COMPLETED]: 'text-gray-500'
    };

    // NEW: Check if booking needs payment
    const needsPayment = booking.status === 'approved' && (!booking.payment_status || booking.payment_status === 'failed');
    const hasPaymentPending = booking.payment_status === 'pending';
    const isPaymentSucceeded = booking.payment_status === 'succeeded';

    return {
      ...booking,
      statusColor: statusColors[booking.status] || 'text-gray-500',
      formattedDates: `${new Date(booking.start_date).toLocaleDateString()} - ${new Date(booking.end_date).toLocaleDateString()}`,
      formattedPrice: `₱${Number(booking.total_price).toLocaleString()}`,
      
      // Updated action flags with payment logic
      canCancel: [BOOKING_STATUS.PENDING, BOOKING_STATUS.APPROVED].includes(booking.status) && !isPaymentSucceeded,
      canReview: booking.status === BOOKING_STATUS.COMPLETED && !booking.review_submitted,
      
      // NEW: Payment-related flags
      needsPayment,
      hasPaymentPending,
      isPaymentSucceeded,
      payment_status: booking.payment_status || null,
      payment_id: booking.payment_id || null
    };
  }

  /**
   * NEW: Check if booking requires payment
   * @param {object} booking - Booking object
   * @returns {boolean} True if payment is needed
   */
  needsPayment(booking) {
    return booking.status === 'approved' && (!booking.payment_status || booking.payment_status === 'failed');
  }

  /**
   * NEW: Check if payment is in progress
   * @param {object} booking - Booking object
   * @returns {boolean} True if payment is pending
   */
  hasPaymentPending(booking) {
    return booking.payment_status === 'pending';
  }

  /**
   * NEW: Check if payment is completed
   * @param {object} booking - Booking object
   * @returns {boolean} True if payment succeeded
   */
  isPaymentCompleted(booking) {
    return booking.payment_status === 'succeeded';
  }
}

export default new BookingService();