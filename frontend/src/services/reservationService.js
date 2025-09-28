// frontend/src/services/reservationService.js
import { reservationAPI } from './api';

class ReservationService {
  // Create a new reservation
  async createReservation(reservationData) {
    try {
      const response = await reservationAPI.createReservation(reservationData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Create reservation error:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to create reservation'
      };
    }
  }

  // Get user's reservations
  async getMyReservations(filters = {}) {
    try {
      const response = await reservationAPI.getMyReservations(filters);
      return {
        success: true,
        data: response.data.data,
        pagination: response.data.pagination
      };
    } catch (error) {
      console.error('Get reservations error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to load reservations'
      };
    }
  }

  // Get host's reservations
  async getHostReservations(filters = {}) {
    try {
      const response = await reservationAPI.getHostReservations(filters);
      return {
        success: true,
        data: response.data.data,
        pagination: response.data.pagination
      };
    } catch (error) {
      console.error('Get host reservations error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to load host reservations'
      };
    }
  }

  // Get reservation details
  async getReservationDetails(reservationId) {
    try {
      const response = await reservationAPI.getReservationDetails(reservationId);
      return {
        success: true,
        data: response.data.data.reservation
      };
    } catch (error) {
      console.error('Get reservation details error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to load reservation details'
      };
    }
  }

  // Cancel reservation
  async cancelReservation(reservationId, reason = '') {
    try {
      const response = await reservationAPI.cancelReservation(reservationId, reason);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Cancel reservation error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to cancel reservation'
      };
    }
  }

  // Check availability for dates
  async checkAvailability(listingId, checkIn, checkOut) {
    try {
      const response = await reservationAPI.getAvailableDates(listingId, 1);
      const bookedDates = response.data.data.bookedDates;
      
      // Check if selected dates conflict with any booked dates
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      
      for (const booking of bookedDates) {
        const bookingCheckIn = new Date(booking.checkIn);
        const bookingCheckOut = new Date(booking.checkOut);
        
        // Check for date conflicts
        if (
          (checkInDate >= bookingCheckIn && checkInDate < bookingCheckOut) ||
          (checkOutDate > bookingCheckIn && checkOutDate <= bookingCheckOut) ||
          (checkInDate <= bookingCheckIn && checkOutDate >= bookingCheckOut)
        ) {
          return false; // Dates not available
        }
      }
      
      return true; // Dates available
    } catch (error) {
      console.error('Check availability error:', error);
      return false;
    }
  }

  // Calculate pricing for reservation
  calculateReservationPrice(pricePerNight, checkIn, checkOut) {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    
    if (nights <= 0) {
      return {
        nights: 0,
        basePrice: 0,
        serviceFee: 0,
        cleaningFee: 0,
        taxes: 0,
        total: 0,
        depositAmount: 0,
        remainingAmount: 0
      };
    }
    
    const basePrice = pricePerNight * nights;
    const serviceFee = Math.round(basePrice * 0.1 * 100) / 100; // 10% service fee
    const cleaningFee = 50; // Fixed cleaning fee
    const taxes = Math.round(basePrice * 0.12 * 100) / 100; // 12% tax
    const total = basePrice + serviceFee + cleaningFee + taxes;
    
    // 50% deposit, 50% remaining
    const depositAmount = Math.round(total * 0.5 * 100) / 100;
    const remainingAmount = Math.round((total - depositAmount) * 100) / 100;
    
    return {
      nights,
      basePrice: Math.round(basePrice * 100) / 100,
      serviceFee,
      cleaningFee,
      taxes,
      total: Math.round(total * 100) / 100,
      depositAmount,
      remainingAmount
    };
  }

  // Format reservation for display
  formatReservationSummary(reservation) {
    const checkIn = new Date(reservation.check_in_date);
    const checkOut = new Date(reservation.check_out_date);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    
    return {
      ...reservation,
      id: parseInt(reservation.id),
      nights,
      formattedDates: `${checkIn.toLocaleDateString()} - ${checkOut.toLocaleDateString()}`,
      formattedPrice: `₱${reservation.total_amount.toLocaleString()}`,
      formattedDeposit: `₱${reservation.deposit_amount?.toLocaleString() || 'N/A'}`,
      formattedRemaining: `₱${reservation.remaining_amount?.toLocaleString() || 'N/A'}`,
      canCancel: this.canCancelReservation(reservation),
      canReview: this.canReviewReservation(reservation),
      needsPayment: this.needsPayment(reservation),
      statusColor: this.getStatusColor(reservation.status)
    };
  }

  // Business logic helpers
  canCancelReservation(reservation) {
    const validStatuses = ['pending', 'confirmed'];
    const checkInDate = new Date(reservation.check_in_date);
    const daysUntilCheckIn = Math.ceil((checkInDate - new Date()) / (1000 * 60 * 60 * 24));
    
    return validStatuses.includes(reservation.status) && daysUntilCheckIn > 0;
  }

  canReviewReservation(reservation) {
    return reservation.status === 'completed';
  }

  needsPayment(reservation) {
    return reservation.status === 'awaiting_payment' || 
           (reservation.status === 'confirmed' && !reservation.full_amount_paid);
  }

  getStatusColor(status) {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      awaiting_payment: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      declined: 'bg-red-100 text-red-800',
      completed: 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  }

  // Search reservations
  async searchReservations(filters) {
    try {
      const response = await reservationAPI.searchReservations(filters);
      return {
        success: true,
        data: response.data.data.reservations.map(r => this.formatReservationSummary(r))
      };
    } catch (error) {
      console.error('Search reservations error:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to search reservations'
      };
    }
  }

  // Get cancellation policy info
  async getCancellationPolicy() {
    try {
      const response = await reservationAPI.getCancellationPolicy();
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      console.error('Get cancellation policy error:', error);
      return {
        success: false,
        error: 'Failed to load cancellation policy'
      };
    }
  }

  // Calculate refund for cancellation
  calculateCancellationRefund(reservation) {
    const now = new Date();
    const checkInDate = new Date(reservation.check_in_date);
    const daysUntilCheckIn = Math.ceil((checkInDate - now) / (1000 * 60 * 60 * 24));
    
    let refundPercentage = 0;
    let policy = '';
    
    if (daysUntilCheckIn >= 7) {
      refundPercentage = 100;
      policy = 'Free cancellation until 7 days before check-in';
    } else if (daysUntilCheckIn >= 3) {
      refundPercentage = 50;
      policy = '50% refund for cancellations 3-6 days before check-in';
    } else {
      refundPercentage = 0;
      policy = 'No refund for cancellations within 3 days of check-in';
    }
    
    const serviceFeePercentage = 10; // 10% service fee on cancellations
    const baseRefund = (reservation.total_amount * refundPercentage) / 100;
    const cancellationFee = (baseRefund * serviceFeePercentage) / 100;
    const finalRefundAmount = Math.max(0, baseRefund - cancellationFee);
    
    return {
      daysUntilCheckIn,
      refundPercentage,
      cancellationFee: Math.round(cancellationFee * 100) / 100,
      refundAmount: Math.round(finalRefundAmount * 100) / 100,
      policy
    };
  }

  // Validation helpers
  validateReservationData(data) {
    const errors = {};
    
    if (!data.listing_id) {
      errors.listing_id = 'Listing is required';
    }
    
    if (!data.check_in_date) {
      errors.check_in_date = 'Check-in date is required';
    } else {
      const checkIn = new Date(data.check_in_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (checkIn < today) {
        errors.check_in_date = 'Check-in date cannot be in the past';
      }
    }
    
    if (!data.check_out_date) {
      errors.check_out_date = 'Check-out date is required';
    } else if (data.check_in_date) {
      const checkIn = new Date(data.check_in_date);
      const checkOut = new Date(data.check_out_date);
      
      if (checkOut <= checkIn) {
        errors.check_out_date = 'Check-out date must be after check-in date';
      }
      
      const daysDifference = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      if (daysDifference > 365) {
        errors.check_out_date = 'Reservation cannot exceed 365 days';
      }
    }
    
    if (!data.guest_count || data.guest_count < 1) {
      errors.guest_count = 'At least 1 guest is required';
    }
    
    if (!data.guest_name || data.guest_name.trim().length < 2) {
      errors.guest_name = 'Guest name is required (minimum 2 characters)';
    }
    
    if (!data.guest_email) {
      errors.guest_email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.guest_email)) {
      errors.guest_email = 'Please enter a valid email address';
    }
    
    if (!data.total_amount || data.total_amount <= 0) {
      errors.total_amount = 'Valid total amount is required';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}

// Reservation status constants
export const RESERVATION_STATUS = {
  PENDING: 'pending',
  AWAITING_PAYMENT: 'awaiting_payment',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  DECLINED: 'declined',
  COMPLETED: 'completed'
};

// Export singleton instance
const reservationService = new ReservationService();
export default reservationService;