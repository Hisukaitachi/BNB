// src/components/listings/BookingSidebar.jsx
import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, Info } from 'lucide-react';
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
    guests: 1,
    bookingType: 'book', // 'book' or 'reserve'
    remainingPaymentMethod: 'personal' // 'platform' or 'personal'
  });
  const [totalPrice, setTotalPrice] = useState(0);
  const [priceBreakdown, setPriceBreakdown] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [availabilityChecking, setAvailabilityChecking] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState('');

  useEffect(() => {
    calculateTotalPrice();
    checkAvailability();
  }, [bookingData.startDate, bookingData.endDate, listing, bookingData.bookingType]);

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
    
    // Add deposit calculation for reserve option
    if (bookingData.bookingType === 'reserve') {
      breakdown.depositAmount = Math.round(breakdown.total * 0.5);
      breakdown.remainingAmount = breakdown.total - breakdown.depositAmount;
      
      // Calculate payment due date (3 days before check-in)
      const checkInDate = new Date(bookingData.startDate);
      const paymentDueDate = new Date(checkInDate);
      paymentDueDate.setDate(paymentDueDate.getDate() - 3);
      breakdown.paymentDueDate = paymentDueDate.toLocaleDateString();
    }
    
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
    const submitData = {
      ...bookingData,
      listing_id: listing.id,
      total_price: totalPrice,
      booking_type: bookingData.bookingType,
      remaining_payment_method: bookingData.bookingType === 'reserve' ? bookingData.remainingPaymentMethod : undefined
    };
    onBooking(submitData);
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

          {/* Booking Type Selection */}
          <div className="mb-4 p-4 bg-gray-700 rounded-lg">
            <label className="block text-sm text-gray-300 mb-3">Booking Option</label>
            <div className="space-y-3">
              <label className="flex items-start cursor-pointer">
                <input
                  type="radio"
                  name="bookingType"
                  value="book"
                  checked={bookingData.bookingType === 'book'}
                  onChange={(e) => setBookingData({...bookingData, bookingType: e.target.value})}
                  className="mt-1 mr-3 text-purple-500 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <span className="text-white font-medium">Book Now</span>
                  <p className="text-xs text-gray-400 mt-1">Pay full amount upon host approval</p>
                </div>
              </label>
              
              <label className="flex items-start cursor-pointer">
                <input
                  type="radio"
                  name="bookingType"
                  value="reserve"
                  checked={bookingData.bookingType === 'reserve'}
                  onChange={(e) => setBookingData({...bookingData, bookingType: e.target.value})}
                  className="mt-1 mr-3 text-purple-500 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <span className="text-white font-medium">Reserve (50% Deposit)</span>
                </div>
              </label>
            </div>

            {/* Payment Method for Remaining (if Reserve selected) */}
            {bookingData.bookingType === 'reserve' && (
              <div className="mt-4 pt-4 border-t border-gray-600">
                <label className="block text-sm text-gray-300 mb-2">Remaining Payment Method</label>
                <select
                  value={bookingData.remainingPaymentMethod}
                  onChange={(e) => setBookingData({...bookingData, remainingPaymentMethod: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="personal">Direct to Host (Recommended)</option>
                </select>
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

              {/* Reserve Payment Breakdown */}
              {bookingData.bookingType === 'reserve' && priceBreakdown.depositAmount && (
                <div className="mt-4 pt-4 border-t border-gray-600 space-y-2">
                  <div className="flex justify-between text-purple-400">
                    <span>Deposit (50%)</span>
                    <span className="font-semibold">₱{priceBreakdown.depositAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-400 text-sm">
                    <span>Remaining (due {priceBreakdown.paymentDueDate})</span>
                    <span>₱{priceBreakdown.remainingAmount.toLocaleString()}</span>
                  </div>
                </div>
              )}
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
              {!isAuthenticated ? 'Sign in to Book' : 
               bookingData.bookingType === 'reserve' ? 
               `Reserve with ₱${priceBreakdown?.depositAmount?.toLocaleString() || 0} Deposit` :
               'Submit Booking Request'}
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
              {bookingData.bookingType === 'reserve' ? 
                'Deposit payment required upon host approval' :
                'Full payment required upon host approval'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingSidebar;