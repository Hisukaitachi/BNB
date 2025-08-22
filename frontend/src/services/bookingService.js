// src/services/bookingService.js
import api from './api';
import { BOOKING_STATUS } from '../utils/constants';

class BookingService {
  /**
   * Create a new booking
   * @param {object} bookingData - Booking data
   * @returns {Promise<object>} Booking creation result
   */
  async createBooking(bookingData) {
    try {
      const response = await api.createBooking(bookingData);
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.message || 'Failed to create booking');
    }
  }

  /**
   * Get user's bookings
   * @returns {Promise<Array>} User bookings
   */
  async getMyBookings() {
    try {
      const response = await api.getMyBookings();
      return response.data?.bookings || [];
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch bookings');
    }
  }

  /**
   * Get host's bookings
   * @returns {Promise<Array>} Host bookings
   */
  async getHostBookings() {
    try {
      const response = await api.getHostBookings();
      return response.data?.bookings || [];
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch host bookings');
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
      if (!Object.values(BOOKING_STATUS).includes(status)) {
        throw new Error('Invalid booking status');
      }

      const response = await api.updateBookingStatus(bookingId, status);
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.message || 'Failed to update booking status');
    }
  }

  /**
   * Cancel booking
   * @param {number} bookingId - Booking ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<object>} Cancellation result
   */
  async cancelBooking(bookingId, reason = '') {
    try {
      const response = await api.updateBookingStatus(bookingId, BOOKING_STATUS.CANCELLED);
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.message || 'Failed to cancel booking');
    }
  }

  /**
   * Get booking history
   * @param {number} bookingId - Booking ID
   * @returns {Promise<Array>} Booking history
   */
  async getBookingHistory(bookingId) {
    try {
      const response = await api.getBookingHistory(bookingId);
      return response.data?.history || [];
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch booking history');
    }
  }

  /**
   * Get booked dates for a listing
   * @param {number} listingId - Listing ID
   * @returns {Promise<Array>} Booked dates
   */
  async getBookedDates(listingId) {
    try {
      const response = await api.get(`/bookings/booked-dates/${listingId}`);
      return response.data?.bookedDates || [];
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch booked dates');
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
      const bookedDates = await this.getBookedDates(listingId);
      const startDate = new Date(checkIn);
      const endDate = new Date(checkOut);

      // Check for conflicts
      const hasConflict = bookedDates.some(booking => {
        const bookingStart = new Date(booking.start_date);
        const bookingEnd = new Date(booking.end_date);
        return (startDate < bookingEnd && endDate > bookingStart);
      });

      return !hasConflict;
    } catch (error) {
      throw new Error(error.message || 'Failed to check availability');
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
    
    const basePrice = pricePerNight * nights;
    const serviceFee = Math.round(basePrice * 0.1); // 10% service fee
    const taxes = Math.round(basePrice * 0.05); // 5% taxes
    const total = basePrice + serviceFee + taxes;

    return {
      nights,
      basePrice,
      serviceFee,
      taxes,
      total
    };
  }
}

export const bookingService = new BookingService();
