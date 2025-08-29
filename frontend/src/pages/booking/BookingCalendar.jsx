// src/components/booking/BookingCalendar.jsx - Calendar with Conflict Prevention
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, AlertCircle } from 'lucide-react';
import bookingService from '../../services/bookingService';

const BookingCalendar = ({ 
  listingId, 
  selectedDates, 
  onDateSelect, 
  pricePerNight,
  minStay = 1,
  maxStay = 30 
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredDate, setHoveredDate] = useState(null);

  useEffect(() => {
    if (listingId) {
      loadUnavailableDates();
    }
  }, [listingId, currentMonth]);

  const loadUnavailableDates = async () => {
    try {
      setLoading(true);
      const bookedDates = await bookingService.getBookedDates(listingId);
      setUnavailableDates(bookedDates);
    } catch (error) {
      console.error('Failed to load unavailable dates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay())); // End at Saturday
    
    const days = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  }, [currentMonth]);

  const isDateUnavailable = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return unavailableDates.some(unavailable => 
      unavailable.date === dateStr || 
      (unavailable.start && unavailable.end && 
       date >= new Date(unavailable.start) && 
       date <= new Date(unavailable.end))
    );
  };

  const isDateInRange = (date, startDate, endDate) => {
    if (!startDate || !endDate) return false;
    return date >= startDate && date <= endDate;
  };

  const isDateSelectable = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Can't select past dates
    if (date < today) return false;
    
    // Can't select unavailable dates
    if (isDateUnavailable(date)) return false;
    
    // If we have a start date selected, check for valid end dates
    if (selectedDates.checkIn && !selectedDates.checkOut) {
      const checkInDate = new Date(selectedDates.checkIn);
      const daysDiff = Math.ceil((date - checkInDate) / (1000 * 60 * 60 * 24));
      
      // Must be after check-in date
      if (date <= checkInDate) return false;
      
      // Must be within max stay limit
      if (daysDiff > maxStay) return false;
      
      // Check if there are any unavailable dates between check-in and this date
      const datesBetween = [];
      const currentDate = new Date(checkInDate);
      currentDate.setDate(currentDate.getDate() + 1);
      
      while (currentDate < date) {
        if (isDateUnavailable(currentDate)) return false;
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    
    return true;
  };

  const handleDateClick = (date) => {
    if (!isDateSelectable(date)) return;
    
    const dateStr = date.toISOString().split('T')[0];
    
    // If no dates selected or both dates selected, start new selection
    if (!selectedDates.checkIn || (selectedDates.checkIn && selectedDates.checkOut)) {
      onDateSelect({ checkIn: dateStr, checkOut: null });
    }
    // If only check-in selected, set check-out
    else if (selectedDates.checkIn && !selectedDates.checkOut) {
      const checkInDate = new Date(selectedDates.checkIn);
      
      if (date > checkInDate) {
        const daysDiff = Math.ceil((date - checkInDate) / (1000 * 60 * 60 * 24));
        
        // Check minimum stay requirement
        if (daysDiff < minStay) {
          alert(`Minimum stay is ${minStay} night${minStay > 1 ? 's' : ''}`);
          return;
        }
        
        onDateSelect({ checkIn: selectedDates.checkIn, checkOut: dateStr });
      } else {
        // If selected date is before check-in, make it the new check-in
        onDateSelect({ checkIn: dateStr, checkOut: null });
      }
    }
  };

  const getDateClassName = (date) => {
    const baseClass = "w-10 h-10 flex items-center justify-center text-sm rounded-lg cursor-pointer transition-all";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const isToday = date.getTime() === today.getTime();
    const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
    const isUnavailable = isDateUnavailable(date);
    const isPast = date < today;
    const isSelectable = isDateSelectable(date);
    
    const checkInDate = selectedDates.checkIn ? new Date(selectedDates.checkIn) : null;
    const checkOutDate = selectedDates.checkOut ? new Date(selectedDates.checkOut) : null;
    
    const isCheckIn = checkInDate && date.getTime() === checkInDate.getTime();
    const isCheckOut = checkOutDate && date.getTime() === checkOutDate.getTime();
    const isInRange = checkInDate && checkOutDate && isDateInRange(date, checkInDate, checkOutDate);
    const isHovered = hoveredDate && selectedDates.checkIn && !selectedDates.checkOut && 
                     isDateInRange(date, checkInDate, hoveredDate);

    let className = baseClass;
    
    if (!isCurrentMonth) {
      className += " text-gray-600";
    } else if (isPast || isUnavailable) {
      className += " text-gray-500 cursor-not-allowed bg-gray-800/50";
    } else if (isCheckIn || isCheckOut) {
      className += " bg-purple-600 text-white font-semibold";
    } else if (isInRange || isHovered) {
      className += " bg-purple-200 text-purple-800";
    } else if (isToday) {
      className += " bg-blue-600 text-white";
    } else if (isSelectable) {
      className += " text-gray-200 hover:bg-gray-700";
    } else {
      className += " text-gray-500";
    }
    
    return className;
  };

  const calculatePrice = () => {
    if (!selectedDates.checkIn || !selectedDates.checkOut || !pricePerNight) return null;
    
    const checkIn = new Date(selectedDates.checkIn);
    const checkOut = new Date(selectedDates.checkOut);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    
    return bookingService.calculateBookingPrice(pricePerNight, selectedDates.checkIn, selectedDates.checkOut);
  };

  const priceBreakdown = calculatePrice();

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigateMonth(-1)}
          className="p-2 rounded-lg hover:bg-gray-700 text-gray-300"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <h3 className="text-lg font-semibold text-white">
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        
        <button
          onClick={() => navigateMonth(1)}
          className="p-2 rounded-lg hover:bg-gray-700 text-gray-300"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Days of Week */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm text-gray-400 font-medium py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 mb-6">
        {calendarDays.map((date, index) => (
          <div
            key={index}
            className={getDateClassName(date)}
            onClick={() => handleDateClick(date)}
            onMouseEnter={() => setHoveredDate(date)}
            onMouseLeave={() => setHoveredDate(null)}
          >
            {date.getDate()}
          </div>
        ))}
      </div>

      {/* Selected Dates Summary */}
      {selectedDates.checkIn && (
        <div className="bg-gray-700 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">Check-in</span>
            <span className="text-sm text-white font-medium">
              {new Date(selectedDates.checkIn).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
          </div>
          
          {selectedDates.checkOut && (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Check-out</span>
                <span className="text-sm text-white font-medium">
                  {new Date(selectedDates.checkOut).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
              
              {priceBreakdown && (
                <div className="border-t border-gray-600 pt-2 mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-300">
                      {priceBreakdown.nights} night{priceBreakdown.nights > 1 ? 's' : ''}
                    </span>
                    <span className="text-sm text-white">
                      ₱{priceBreakdown.basePrice.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-300">Service fee</span>
                    <span className="text-sm text-white">
                      ₱{priceBreakdown.serviceFee.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-300">Taxes</span>
                    <span className="text-sm text-white">
                      ₱{priceBreakdown.taxes.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between font-semibold text-white pt-2 border-t border-gray-600">
                    <span>Total</span>
                    <span>₱{priceBreakdown.total.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-400">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-purple-600 rounded mr-2"></div>
          <span>Selected</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-gray-800 border border-gray-600 rounded mr-2"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-gray-600 rounded mr-2"></div>
          <span>Unavailable</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-blue-600 rounded mr-2"></div>
          <span>Today</span>
        </div>
      </div>

      {/* Booking Rules */}
      <div className="mt-4 p-3 bg-blue-900/20 border border-blue-600 rounded-lg">
        <div className="flex items-center text-blue-400 text-sm">
          <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
          <div>
            <div>Minimum stay: {minStay} night{minStay > 1 ? 's' : ''}</div>
            {maxStay < 365 && <div>Maximum stay: {maxStay} nights</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingCalendar;