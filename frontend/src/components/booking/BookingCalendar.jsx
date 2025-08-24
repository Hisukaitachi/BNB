import React, { useState, useEffect } from 'react';
import { Calendar, X, ChevronLeft, ChevronRight, User, CreditCard } from 'lucide-react';

const BookingCalendar = ({ listing, bookedDates, onClose, onBookingComplete }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState({ checkIn: null, checkOut: null });
  const [isSelectingCheckOut, setIsSelectingCheckOut] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [numberOfNights, setNumberOfNights] = useState(0);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Calculate total price when dates change
  useEffect(() => {
    if (selectedDates.checkIn && selectedDates.checkOut) {
      const nights = Math.ceil((selectedDates.checkOut - selectedDates.checkIn) / (1000 * 60 * 60 * 24));
      setNumberOfNights(nights);
      setTotalPrice(nights * (listing?.price_per_night || 0));
    } else {
      setNumberOfNights(0);
      setTotalPrice(0);
    }
  }, [selectedDates, listing]);

  // Helper function to check if a date is booked
  const isDateBooked = (date) => {
    if (!bookedDates || bookedDates.length === 0) return false;
    
    return bookedDates.some(booking => {
      const startDate = new Date(booking.start_date);
      const endDate = new Date(booking.end_date);
      return date >= startDate && date <= endDate;
    });
  };

  // Helper function to check if date is in the past
  const isDateInPast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Helper function to check if date is in selected range
  const isDateInRange = (date) => {
    if (!selectedDates.checkIn || !selectedDates.checkOut) return false;
    return date >= selectedDates.checkIn && date <= selectedDates.checkOut;
  };

  // Handle date click
  const handleDateClick = (date) => {
    if (isDateBooked(date) || isDateInPast(date)) return;

    if (!isSelectingCheckOut) {
      // Selecting check-in date
      setSelectedDates({ checkIn: date, checkOut: null });
      setIsSelectingCheckOut(true);
    } else {
      // Selecting check-out date
      if (date <= selectedDates.checkIn) {
        // If selected date is before check-in, restart selection
        setSelectedDates({ checkIn: date, checkOut: null });
      } else {
        // Check if any dates in range are booked
        const datesInRange = [];
        const current = new Date(selectedDates.checkIn);
        while (current <= date) {
          datesInRange.push(new Date(current));
          current.setDate(current.getDate() + 1);
        }

        const hasBookedDatesInRange = datesInRange.some(d => isDateBooked(d));
        
        if (hasBookedDatesInRange) {
          alert('Selected range contains unavailable dates. Please choose different dates.');
          return;
        }

        setSelectedDates({ ...selectedDates, checkOut: date });
        setIsSelectingCheckOut(false);
      }
    }
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  // Navigate months
  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + direction);
      return newMonth;
    });
  };

  // Handle booking submission
  const handleBooking = async () => {
    setBookingLoading(true);
    try {
      const bookingData = {
        listing_id: listing.id,
        start_date: selectedDates.checkIn.toISOString().split('T')[0],
        end_date: selectedDates.checkOut.toISOString().split('T')[0],
        total_price: totalPrice
      };

      // Here you would call your booking API
      // const response = await api.createBooking(bookingData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      onBookingComplete && onBookingComplete(bookingData);
      onClose();
    } catch (error) {
      alert('Booking failed: ' + error.message);
    } finally {
      setBookingLoading(false);
    }
  };

  const days = generateCalendarDays();
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Book Your Stay</h2>
            <p className="text-gray-400">{listing?.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {!showBookingForm ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Calendar Section */}
              <div>
                {/* Month Navigation */}
                <div className="flex justify-between items-center mb-6">
                  <button
                    onClick={() => navigateMonth(-1)}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h3 className="text-xl font-semibold">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </h3>
                  <button
                    onClick={() => navigateMonth(1)}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="bg-gray-900 rounded-lg p-4">
                  {/* Day Headers */}
                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center text-sm font-medium text-gray-400 py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days */}
                  <div className="grid grid-cols-7 gap-2">
                    {days.map((date, index) => {
                      if (!date) {
                        return <div key={index} className="h-10"></div>;
                      }

                      const isBooked = isDateBooked(date);
                      const isPast = isDateInPast(date);
                      const isCheckIn = selectedDates.checkIn && date.getTime() === selectedDates.checkIn.getTime();
                      const isCheckOut = selectedDates.checkOut && date.getTime() === selectedDates.checkOut.getTime();
                      const isInRange = isDateInRange(date);
                      const isDisabled = isBooked || isPast;

                      return (
                        <button
                          key={index}
                          onClick={() => handleDateClick(date)}
                          disabled={isDisabled}
                          className={`
                            h-10 rounded-lg text-sm font-medium transition-all
                            ${isDisabled 
                              ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                              : 'hover:bg-gray-600 text-white cursor-pointer'
                            }
                            ${isCheckIn ? 'bg-purple-600 text-white' : ''}
                            ${isCheckOut ? 'bg-purple-600 text-white' : ''}
                            ${isInRange && !isCheckIn && !isCheckOut ? 'bg-purple-400 text-white' : ''}
                          `}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-600 rounded"></div>
                    <span>Selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-400 rounded"></div>
                    <span>Selected Range</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-700 rounded"></div>
                    <span>Unavailable</span>
                  </div>
                </div>
              </div>

              {/* Booking Details Section */}
              <div>
                <div className="bg-gray-900 rounded-lg p-6 sticky top-24">
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-2xl font-bold">₱{listing?.price_per_night?.toLocaleString()}</span>
                      <span className="text-gray-400">/ night</span>
                    </div>
                    {listing?.average_rating && (
                      <div className="flex items-center">
                        <span className="text-yellow-400 mr-1">★</span>
                        <span className="text-sm">{parseFloat(listing.average_rating).toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  {/* Date Selection Display */}
                  <div className="space-y-4 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border border-gray-600 rounded-lg p-3">
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Check-in</label>
                        <div className="text-sm">
                          {selectedDates.checkIn 
                            ? selectedDates.checkIn.toLocaleDateString() 
                            : 'Select date'
                          }
                        </div>
                      </div>
                      <div className="border border-gray-600 rounded-lg p-3">
                        <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Check-out</label>
                        <div className="text-sm">
                          {selectedDates.checkOut 
                            ? selectedDates.checkOut.toLocaleDateString() 
                            : 'Select date'
                          }
                        </div>
                      </div>
                    </div>

                    <div className="border border-gray-600 rounded-lg p-3">
                      <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Guests</label>
                      <div className="text-sm">1 guest</div>
                    </div>
                  </div>

                  {/* Price Breakdown */}
                  {numberOfNights > 0 && (
                    <div className="space-y-2 mb-6 pb-6 border-b border-gray-600">
                      <div className="flex justify-between">
                        <span>₱{listing?.price_per_night?.toLocaleString()} × {numberOfNights} nights</span>
                        <span>₱{(listing?.price_per_night * numberOfNights)?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span>₱{totalPrice.toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setShowBookingForm(true)}
                    disabled={!selectedDates.checkIn || !selectedDates.checkOut}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {!selectedDates.checkIn ? 'Select check-in date' :
                     !selectedDates.checkOut ? 'Select check-out date' :
                     'Continue to booking'}
                  </button>

                  <p className="text-xs text-gray-400 text-center mt-2">
                    You won't be charged yet
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Booking Form */
            <div className="max-w-2xl mx-auto">
              <div className="mb-6">
                <button
                  onClick={() => setShowBookingForm(false)}
                  className="text-purple-400 hover:text-purple-300 mb-4"
                >
                  ← Back to calendar
                </button>
                <h3 className="text-2xl font-bold">Confirm and pay</h3>
              </div>

              {/* Booking Summary */}
              <div className="bg-gray-900 rounded-lg p-6 mb-6">
                <h4 className="text-lg font-semibold mb-4">Your trip</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-medium">Dates</div>
                      <div className="text-sm text-gray-400">
                        {selectedDates.checkIn?.toLocaleDateString()} - {selectedDates.checkOut?.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <div className="font-medium">Guests</div>
                      <div className="text-sm text-gray-400">1 guest</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price Details */}
              <div className="bg-gray-900 rounded-lg p-6 mb-6">
                <h4 className="text-lg font-semibold mb-4">Price details</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>₱{listing?.price_per_night?.toLocaleString()} × {numberOfNights} nights</span>
                    <span>₱{(listing?.price_per_night * numberOfNights)?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-2 border-t border-gray-600">
                    <span>Total (PHP)</span>
                    <span>₱{totalPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Book Button */}
              <button
                onClick={handleBooking}
                disabled={bookingLoading}
                className="btn-primary w-full flex items-center justify-center space-x-2"
              >
                {bookingLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    <span>Confirm and pay</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingCalendar;