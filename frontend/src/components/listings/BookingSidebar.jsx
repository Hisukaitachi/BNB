// src/components/listings/BookingSidebar.jsx
import React, { useState, useEffect } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import BookingCalendar from '../../pages/booking/BookingCalendar';
import bookingService from '../../services/bookingService';

const BookingSidebar = ({ 
  listing, 
  reviews, 
  isAuthenticated,
  onBooking, 
  onContactHost, 
  onViewRequest,
  isBookingLoading = false
}) => {
  const [bookingData, setBookingData] = useState({
    startDate: '',
    endDate: '',
    guests: 1
  });
  const [totalPrice, setTotalPrice] = useState(0);
  const [priceBreakdown, setPriceBreakdown] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [availabilityChecking, setAvailabilityChecking] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState('');

  useEffect(() => {
    calculateTotalPrice();
    checkAvailability();
  }, [bookingData.startDate, bookingData.endDate, listing]);

  const calculateTotalPrice = () => {
    if (!listing || !bookingData.startDate || !bookingData.endDate) {
      setTotalPrice(0);
      setPriceBreakdown(null);
      return;
    }

    const breakdown = bookingService.calculateBookingPrice(
      listing.price_per_night,
      bookingData.startDate,
      bookingData.endDate
    );
    
    setTotalPrice(breakdown.total);
    setPriceBreakdown(breakdown);
  };

  const checkAvailability = async () => {
    if (!listing || !bookingData.startDate || !bookingData.endDate) {
      setAvailabilityMessage('');
      return;
    }

    try {
      setAvailabilityChecking(true);
      const isAvailable = await bookingService.checkAvailability(
        listing.id,
        bookingData.startDate,
        bookingData.endDate
      );
      
      if (isAvailable) {
        setAvailabilityMessage('✅ Dates are available!');
      } else {
        setAvailabilityMessage('❌ Selected dates are not available. Please choose different dates.');
      }
    } catch (error) {
      setAvailabilityMessage('⚠️ Unable to check availability. Please try again.');
    } finally {
      setAvailabilityChecking(false);
    }
  };

  const handleDateSelect = (dates) => {
    setBookingData(prev => ({
      ...prev,
      startDate: dates.checkIn || '',
      endDate: dates.checkOut || ''
    }));
  };

  const handleBookingSubmit = () => {
    onBooking({ ...bookingData, totalPrice });
  };

  return (
    <div className="lg:col-span-1">
      <div className="sticky top-24">
        <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
          <div className="mb-6">
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-white">
                ₱{Number(listing.price_per_night).toLocaleString()}
              </span>
              <span className="text-gray-400">/ night</span>
            </div>
            {listing.average_rating && (
              <div className="flex items-center mt-2">
                <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                <span className="text-sm text-gray-300">
                  {Number(listing.average_rating).toFixed(1)} ({reviews.length} reviews)
                </span>
              </div>
            )}
          </div>

          {/* Enhanced Booking Form */}
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">Select dates</span>
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="text-purple-400 text-sm hover:text-purple-300 transition"
              >
                {showCalendar ? 'Simple view' : 'Calendar view'}
              </button>
            </div>

            {showCalendar ? (
              <BookingCalendar
                listingId={listing.id}
                selectedDates={{
                  checkIn: bookingData.startDate,
                  checkOut: bookingData.endDate
                }}
                onDateSelect={handleDateSelect}
                pricePerNight={listing.price_per_night}
              />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Check-in</label>
                    <Input
                      type="date"
                      value={bookingData.startDate}
                      onChange={(e) => setBookingData({...bookingData, startDate: e.target.value})}
                      className="bg-white/10 border-gray-600 text-white"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Check-out</label>
                    <Input
                      type="date"
                      value={bookingData.endDate}
                      onChange={(e) => setBookingData({...bookingData, endDate: e.target.value})}
                      className="bg-white/10 border-gray-600 text-white"
                      min={bookingData.startDate || new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">Guests</label>
                  <select
                    value={bookingData.guests}
                    onChange={(e) => setBookingData({...bookingData, guests: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-white/10 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                  >
                    {Array.from({ length: listing.max_guests }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num} className="bg-gray-800">
                        {num} Guest{num > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Availability Status */}
            {(bookingData.startDate && bookingData.endDate) && (
              <div className={`p-3 rounded-lg text-sm ${
                availabilityMessage.includes('✅') ? 'bg-green-900/20 text-green-400 border border-green-600' :
                availabilityMessage.includes('❌') ? 'bg-red-900/20 text-red-400 border border-red-600' :
                'bg-yellow-900/20 text-yellow-400 border border-yellow-600'
              }`}>
                {availabilityChecking ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Checking availability...
                  </div>
                ) : (
                  availabilityMessage
                )}
              </div>
            )}
          </div>

          {/* Price Breakdown */}
          {priceBreakdown && priceBreakdown.total > 0 && (
            <div className="mb-6 p-4 bg-gray-700 rounded-lg">
              <div className="flex justify-between text-gray-300 mb-2">
                <span>₱{Number(listing.price_per_night).toLocaleString()} x {priceBreakdown.nights} nights</span>
                <span>₱{priceBreakdown.basePrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-300 mb-2">
                <span>Service fee</span>
                <span>₱{priceBreakdown.serviceFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-300 mb-2">
                <span>Taxes</span>
                <span>₱{priceBreakdown.taxes.toLocaleString()}</span>
              </div>
              <div className="border-t border-gray-600 pt-2">
                <div className="flex justify-between font-semibold text-white">
                  <span>Total</span>
                  <span>₱{priceBreakdown.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Booking Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleBookingSubmit}
              loading={isBookingLoading}
              variant="gradient"
              size="lg"
              className="w-full"
              disabled={!bookingData.startDate || !bookingData.endDate || totalPrice <= 0 || availabilityMessage.includes('❌')}
            >
              {!isAuthenticated ? 'Sign in to Book' : 'Submit Booking Request'}
            </Button>
            
            <Button 
              onClick={onContactHost}
              variant="outline"
              size="lg"
              className="w-full border-gray-600 text-gray-300"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Contact Host
            </Button>
            
            <Button
              onClick={onViewRequest}
              variant="outline"
              size="lg"
              className="w-full border-purple-500 text-purple-400"
            >
              Request Viewing
            </Button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              No payment required until host approves your request
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingSidebar;