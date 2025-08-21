import React, { useState, useEffect } from 'react';
import { Calendar, Users, CreditCard, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Button from '../common/Button';
import CalendarComponent from './Calendar';

const BookingForm = ({ listing, bookedDates = [], onBookingSubmit }) => {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useApp();
  const navigate = useNavigate();
  
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [showCalendar, setShowCalendar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState({
    basePrice: 0,
    nights: 0,
    serviceFee: 0,
    taxes: 0,
    total: 0
  });

  useEffect(() => {
    if (checkIn && checkOut) {
      calculatePricing();
    }
  }, [checkIn, checkOut, listing.price_per_night]);

  const calculatePricing = () => {
    if (!checkIn || !checkOut) return;

    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    if (nights <= 0) return;

    const basePrice = listing.price_per_night * nights;
    const serviceFee = Math.round(basePrice * 0.1); // 10% service fee
    const taxes = Math.round(basePrice * 0.05); // 5% taxes
    const total = basePrice + serviceFee + taxes;

    setPricing({
      basePrice,
      nights,
      serviceFee,
      taxes,
      total
    });
  };

  const validateDates = () => {
    if (!checkIn || !checkOut) {
      showToast('Please select check-in and check-out dates', 'error');
      return false;
    }

    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
      showToast('Check-in date cannot be in the past', 'error');
      return false;
    }

    if (endDate <= startDate) {
      showToast('Check-out date must be after check-in date', 'error');
      return false;
    }

    const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (nights > 365) {
      showToast('Maximum stay is 365 nights', 'error');
      return false;
    }

    // Check for conflicts with booked dates
    const hasConflict = bookedDates.some(booking => {
      const bookingStart = new Date(booking.start_date);
      const bookingEnd = new Date(booking.end_date);
      return (startDate < bookingEnd && endDate > bookingStart);
    });

    if (hasConflict) {
      showToast('Selected dates conflict with existing bookings', 'error');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      showToast('Please sign in to make a booking', 'info');
      navigate('/login');
      return;
    }

    if (!validateDates()) return;

    if (guests > (listing.max_guests || 10)) {
      showToast(`Maximum ${listing.max_guests || 10} guests allowed`, 'error');
      return;
    }

    setLoading(true);
    try {
      const bookingData = {
        listing_id: listing.id,
        start_date: checkIn,
        end_date: checkOut,
        guests,
        total_price: pricing.total
      };

      const response = await api.createBooking(bookingData);
      
      if (response.status === 'success') {
        showToast('Booking request sent successfully!', 'success');
        if (onBookingSubmit) {
          onBookingSubmit();
        }
        // Reset form
        setCheckIn('');
        setCheckOut('');
        setGuests(1);
        setPricing({ basePrice: 0, nights: 0, serviceFee: 0, taxes: 0, total: 0 });
      }
    } catch (error) {
      showToast(error.message || 'Failed to create booking', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getMaxCheckOutDate = () => {
    if (!checkIn) return '';
    const checkInDate = new Date(checkIn);
    const maxDate = new Date(checkInDate);
    maxDate.setFullYear(maxDate.getFullYear() + 1); // Max 1 year from check-in
    return maxDate.toISOString().split('T')[0];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Date Selection */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Check-in
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="date"
              value={checkIn}
              min={getMinDate()}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Check-out
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="date"
              value={checkOut}
              min={checkIn || getMinDate()}
              max={getMaxCheckOutDate()}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
        </div>
      </div>

      {/* Calendar View Toggle */}
      <button
        type="button"
        onClick={() => setShowCalendar(!showCalendar)}
        className="w-full text-sm text-purple-400 hover:text-purple-300 transition"
      >
        {showCalendar ? 'Hide' : 'Show'} calendar view
      </button>

      {/* Calendar Component */}
      {showCalendar && (
        <div className="border border-gray-700 rounded-lg p-4">
          <CalendarComponent
            bookedDates={bookedDates}
            selectedCheckIn={checkIn}
            selectedCheckOut={checkOut}
            onDateSelect={(start, end) => {
              setCheckIn(start);
              setCheckOut(end);
            }}
          />
        </div>
      )}

      {/* Guest Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Guests
        </label>
        <div className="relative">
          <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <select
            value={guests}
            onChange={(e) => setGuests(parseInt(e.target.value))}
            className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
          >
            {[...Array(Math.min(listing.max_guests || 10, 16))].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1} guest{i + 1 > 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pricing Breakdown */}
      {pricing.nights > 0 && (
        <div className="space-y-3 pt-4 border-t border-gray-700">
          <div className="flex justify-between text-sm">
            <span>{formatPrice(listing.price_per_night)} × {pricing.nights} night{pricing.nights > 1 ? 's' : ''}</span>
            <span>{formatPrice(pricing.basePrice)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Service fee</span>
            <span>{formatPrice(pricing.serviceFee)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Taxes</span>
            <span>{formatPrice(pricing.taxes)}</span>
          </div>
          <div className="flex justify-between font-semibold pt-3 border-t border-gray-700">
            <span>Total</span>
            <span>{formatPrice(pricing.total)}</span>
          </div>
        </div>
      )}

      {/* Booking Policies */}
      <div className="text-xs text-gray-400 space-y-1 pt-4 border-t border-gray-700">
        <div className="flex items-start space-x-2">
          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>Free cancellation for 48 hours after booking</span>
        </div>
        <div className="flex items-start space-x-2">
          <CreditCard className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>You won't be charged until your booking is confirmed</span>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        loading={loading}
        className="w-full"
        size="lg"
        disabled={!checkIn || !checkOut || pricing.total === 0}
      >
        {loading ? 'Processing...' : 'Request to Book'}
      </Button>

      {!isAuthenticated && (
        <p className="text-center text-sm text-gray-400">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-purple-400 hover:text-purple-300"
          >
            Sign in
          </button>
          {' '}to complete your booking
        </p>
      )}
    </form>
  );
};

export default BookingForm;