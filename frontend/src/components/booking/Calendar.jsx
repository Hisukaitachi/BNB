import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Calendar = ({ bookedDates = [], selectedCheckIn, selectedCheckOut, onDateSelect }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectingCheckIn, setSelectingCheckIn] = useState(true);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
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

  const isDateBooked = (date) => {
    if (!date) return false;
    
    return bookedDates.some(booking => {
      const startDate = new Date(booking.start_date);
      const endDate = new Date(booking.end_date);
      return date >= startDate && date < endDate;
    });
  };

  const isDateInRange = (date) => {
    if (!date || !selectedCheckIn || !selectedCheckOut) return false;
    
    const checkIn = new Date(selectedCheckIn);
    const checkOut = new Date(selectedCheckOut);
    return date >= checkIn && date <= checkOut;
  };

  const isDateSelected = (date) => {
    if (!date) return false;
    
    const dateStr = date.toISOString().split('T')[0];
    return dateStr === selectedCheckIn || dateStr === selectedCheckOut;
  };

  const isPastDate = (date) => {
    if (!date) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const handleDateClick = (date) => {
    if (!date || isPastDate(date) || isDateBooked(date)) return;

    const dateStr = date.toISOString().split('T')[0];

    if (selectingCheckIn || !selectedCheckIn) {
      // Selecting check-in date
      onDateSelect(dateStr, '');
      setSelectingCheckIn(false);
    } else {
      // Selecting check-out date
      const checkInDate = new Date(selectedCheckIn);
      
      if (date <= checkInDate) {
        // If selected date is before or same as check-in, set as new check-in
        onDateSelect(dateStr, '');
        setSelectingCheckIn(false);
      } else {
        // Check if there are any booked dates between check-in and selected date
        const hasBlockingBooking = bookedDates.some(booking => {
          const startDate = new Date(booking.start_date);
          return startDate > checkInDate && startDate < date;
        });

        if (hasBlockingBooking) {
          // Reset and start over
          onDateSelect(dateStr, '');
          setSelectingCheckIn(false);
        } else {
          // Valid check-out date
          onDateSelect(selectedCheckIn, dateStr);
          setSelectingCheckIn(true);
        }
      }
    }
  };

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const getDateClass = (date) => {
    if (!date) return 'invisible';

    let classes = 'w-10 h-10 flex items-center justify-center text-sm rounded-full cursor-pointer transition-colors ';

    if (isPastDate(date)) {
      classes += 'text-gray-500 cursor-not-allowed ';
    } else if (isDateBooked(date)) {
      classes += 'bg-gray-600 text-gray-400 cursor-not-allowed line-through ';
    } else if (isDateSelected(date)) {
      classes += 'bg-purple-500 text-white ';
    } else if (isDateInRange(date)) {
      classes += 'bg-purple-500/30 text-white ';
    } else {
      classes += 'text-gray-300 hover:bg-gray-700 ';
    }

    return classes;
  };

  const currentMonthDays = useMemo(() => getDaysInMonth(currentMonth), [currentMonth]);
  const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  const nextMonthDays = useMemo(() => getDaysInMonth(nextMonth), [currentMonth]);

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="text-center text-sm text-gray-400">
        {selectingCheckIn ? 'Select check-in date' : 'Select check-out date'}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Month */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-gray-700 rounded-full transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-medium">
              {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-gray-700 rounded-full transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {days.map(day => (
              <div key={day} className="text-center text-xs text-gray-500 font-medium py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {currentMonthDays.map((date, index) => (
              <div
                key={index}
                className={getDateClass(date)}
                onClick={() => handleDateClick(date)}
              >
                {date ? date.getDate() : ''}
              </div>
            ))}
          </div>
        </div>

        {/* Next Month */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div></div> {/* Spacer */}
            <h3 className="text-lg font-medium">
              {months[nextMonth.getMonth()]} {nextMonth.getFullYear()}
            </h3>
            <div></div> {/* Spacer */}
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {days.map(day => (
              <div key={day} className="text-center text-xs text-gray-500 font-medium py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {nextMonthDays.map((date, index) => (
              <div
                key={index}
                className={getDateClass(date)}
                onClick={() => handleDateClick(date)}
              >
                {date ? date.getDate() : ''}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
          <span>Selected</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-purple-500/30 rounded-full"></div>
          <span>In range</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
          <span>Booked</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
          <span>Past dates</span>
        </div>
      </div>

      {/* Selected dates display */}
      {(selectedCheckIn || selectedCheckOut) && (
        <div className="text-center text-sm">
          {selectedCheckIn && (
            <span className="text-purple-400">
              Check-in: {new Date(selectedCheckIn).toLocaleDateString()}
            </span>
          )}
          {selectedCheckIn && selectedCheckOut && <span className="mx-2 text-gray-500">→</span>}
          {selectedCheckOut && (
            <span className="text-purple-400">
              Check-out: {new Date(selectedCheckOut).toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      {/* Clear dates button */}
      {(selectedCheckIn || selectedCheckOut) && (
        <div className="text-center">
          <button
            onClick={() => {
              onDateSelect('', '');
              setSelectingCheckIn(true);
            }}
            className="text-sm text-gray-400 hover:text-white transition underline"
          >
            Clear dates
          </button>
        </div>
      )}
    </div>
  );
};

export default Calendar;