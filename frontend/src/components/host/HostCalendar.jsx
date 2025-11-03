// frontend/src/components/host/HostCalendar.jsx - Fully Responsive
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Eye, 
  MessageSquare,
  User,
  MapPin,
  Clock,
  DollarSign,
  Filter,
  RefreshCw,
  X,
  CheckCircle,
  Check,
  AlertTriangle,
  Home,
  Menu
} from 'lucide-react';
import hostService from '../../services/hostService';
import { BOOKING_STATUS } from '../../services/bookingService';
import Button from '../ui/Button';
import UserProfileLink from '../ui/UserProfileLink';
import { getImageUrl } from '../../services/api';

const HostCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState({ bookings: [], listings: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayBookings, setDayBookings] = useState([]);
  const [showDayModal, setShowDayModal] = useState(false);
  const [filterListing, setFilterListing] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadCalendarData();
  }, [currentMonth]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      setError(null);
      const monthStr = currentMonth.toISOString().slice(0, 7);
      const data = await hostService.getCalendarData(monthStr);
      setCalendarData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    
    const days = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayStr = currentDate.toISOString().split('T')[0];
      
      // Get bookings for this day
      const dayBookings = calendarData.bookings.filter(booking => {
        if (!booking.start || !booking.end) {
          console.warn('Booking missing start or end date:', booking);
          return false;
        }
        
        const startDate = new Date(booking.start);
        const endDate = new Date(booking.end);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.warn('Invalid booking dates:', booking);
          return false;
        }
        
        const bookingStart = startDate.toISOString().split('T')[0];
        const bookingEnd = endDate.toISOString().split('T')[0];
        return dayStr >= bookingStart && dayStr < bookingEnd;
      });

      // Filter bookings based on selected filters
      const filteredDayBookings = dayBookings.filter(booking => {
        if (filterListing !== 'all' && booking.listingId !== parseInt(filterListing)) {
          return false;
        }
        if (filterStatus !== 'all' && booking.status !== filterStatus) {
          return false;
        }
        return true;
      });

      days.push({
        date: new Date(currentDate),
        dateStr: dayStr,
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: dayStr === new Date().toISOString().split('T')[0],
        bookings: filteredDayBookings,
        hasBookings: filteredDayBookings.length > 0
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  }, [currentMonth, calendarData.bookings, filterListing, filterStatus]);

  const handleDateClick = (day) => {
    if (day.hasBookings) {
      setSelectedDate(day.date);
      setDayBookings(day.bookings);
      setShowDayModal(true);
    }
  };

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const getBookingColor = (status) => {
    const colors = {
      [BOOKING_STATUS.PENDING]: 'bg-yellow-500',
      [BOOKING_STATUS.APPROVED]: 'bg-green-500', 
      [BOOKING_STATUS.CONFIRMED]: 'bg-blue-500',
      [BOOKING_STATUS.COMPLETED]: 'bg-purple-500',
      [BOOKING_STATUS.CANCELLED]: 'bg-red-500',
      [BOOKING_STATUS.REJECTED]: 'bg-gray-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const getTodaysCheckIns = () => {
    const today = new Date().toISOString().split('T')[0];
    return calendarData.bookings.filter(booking => {
      const checkInDate = new Date(booking.start).toISOString().split('T')[0];
      return checkInDate === today && [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.APPROVED].includes(booking.status);
    });
  };

  const getTodaysCheckOuts = () => {
    const today = new Date().toISOString().split('T')[0];
    return calendarData.bookings.filter(booking => {
      const checkOutDate = new Date(booking.end).toISOString().split('T')[0];
      return checkOutDate === today && [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.COMPLETED].includes(booking.status);
    });
  };

  const monthlyStats = useMemo(() => {
    const currentMonthBookings = calendarData.bookings.filter(booking => {
      const bookingDate = new Date(booking.start);
      return bookingDate.getMonth() === currentMonth.getMonth() && 
             bookingDate.getFullYear() === currentMonth.getFullYear();
    });

    const totalRevenue = currentMonthBookings.reduce((sum, booking) => 
      sum + (Number(booking.extendedProps?.totalPrice) || 0), 0
    );

    return {
      totalBookings: currentMonthBookings.length,
      totalRevenue,
      occupancyRate: Math.round((currentMonthBookings.length / 30) * 100),
      pendingBookings: currentMonthBookings.filter(b => b.status === BOOKING_STATUS.PENDING).length
    };
  }, [calendarData.bookings, currentMonth]);

  // Handle booking actions
  const handleBookingAction = async (bookingId, newStatus) => {
    try {
      console.log(`Updating booking ${bookingId} to status ${newStatus}`);
      await loadCalendarData();
    } catch (error) {
      console.error('Failed to update booking:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
        <div className="flex justify-center items-center min-h-[50vh] sm:min-h-96">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 sm:py-16 px-4">
        <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-red-500 mx-auto mb-3 sm:mb-4" />
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Failed to load calendar</h3>
        <p className="text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base">{error}</p>
        <Button onClick={loadCalendarData} variant="gradient" className="text-sm sm:text-base">
          <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Stats - Responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4">
          <h3 className="text-xs sm:text-sm text-gray-400 mb-1">This Month</h3>
          <p className="text-lg sm:text-2xl font-bold text-white">{monthlyStats.totalBookings}</p>
          <p className="text-xs text-gray-500">bookings</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4">
          <h3 className="text-xs sm:text-sm text-gray-400 mb-1">Revenue</h3>
          <p className="text-lg sm:text-2xl font-bold text-green-400">
            <span className="hidden xs:inline">₱</span>
            {monthlyStats.totalRevenue >= 10000 
              ? `${(monthlyStats.totalRevenue / 1000).toFixed(0)}k`
              : monthlyStats.totalRevenue.toLocaleString()
            }
          </p>
          <p className="text-xs text-gray-500">this month</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4">
          <h3 className="text-xs sm:text-sm text-gray-400 mb-1">Check-ins</h3>
          <p className="text-lg sm:text-2xl font-bold text-blue-400">{getTodaysCheckIns().length}</p>
          <p className="text-xs text-gray-500">today</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 sm:p-4">
          <h3 className="text-xs sm:text-sm text-gray-400 mb-1">Pending</h3>
          <p className="text-lg sm:text-2xl font-bold text-yellow-400">{monthlyStats.pendingBookings}</p>
          <p className="text-xs text-gray-500">need action</p>
        </div>
      </div>

      {/* Calendar Controls - Responsive */}
      <div className="space-y-3 sm:space-y-0 sm:flex sm:justify-between sm:items-center">
        {/* Month Navigation */}
        <div className="flex items-center justify-center sm:justify-start space-x-2 sm:space-x-4">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-700 text-gray-300"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          
          <h2 className="text-base sm:text-xl font-bold text-white min-w-[140px] sm:min-w-[200px] text-center">
            {currentMonth.toLocaleDateString('en-US', { 
              month: isMobile ? 'short' : 'long', 
              year: 'numeric' 
            })}
          </h2>
          
          <button
            onClick={() => navigateMonth(1)}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-700 text-gray-300"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Filters - Mobile Toggle */}
        <div className="flex items-center justify-center sm:justify-end space-x-2 sm:space-x-3">
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="sm:hidden p-2 bg-gray-800 rounded-lg border border-gray-600 text-white"
          >
            <Filter className="w-4 h-4" />
          </button>

          {/* Desktop Filters */}
          <div className={`${showFilters ? 'flex' : 'hidden'} sm:flex flex-col sm:flex-row gap-2 sm:gap-3 
            ${showFilters ? 'absolute top-full left-0 right-0 mt-2 p-3 bg-gray-800 rounded-lg border border-gray-600 z-10' : ''}`}>
            <select
              value={filterListing}
              onChange={(e) => setFilterListing(e.target.value)}
              className="bg-gray-800 border border-gray-600 text-white rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm"
            >
              <option value="all">All Properties</option>
              {calendarData.listings.map(listing => (
                <option key={listing.id} value={listing.id} className="bg-gray-800">
                  {listing.title.length > 20 && isMobile 
                    ? `${listing.title.substring(0, 20)}...` 
                    : listing.title
                  }
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-gray-800 border border-gray-600 text-white rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm"
            >
              <option value="all">All Status</option>
              <option value={BOOKING_STATUS.PENDING}>Pending</option>
              <option value={BOOKING_STATUS.APPROVED}>Approved</option>
              <option value={BOOKING_STATUS.CONFIRMED}>Confirmed</option>
              <option value={BOOKING_STATUS.COMPLETED}>Completed</option>
            </select>
          </div>

          <Button 
            onClick={loadCalendarData} 
                        variant="outline" 
            size="sm" 
            className="border-gray-600 p-1.5 sm:p-2"
          >
            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid - Responsive */}
      <div className="bg-gray-800 rounded-lg sm:rounded-xl p-3 sm:p-6">
        {/* Days of Week Header - Responsive */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 sm:mb-4">
          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
            <div key={day} className="text-center text-xs sm:text-sm text-gray-400 font-medium py-1 sm:py-2">
              {isMobile ? day.slice(0, 1) : day.slice(0, 3)}
            </div>
          ))}
        </div>

        {/* Calendar Days - Responsive */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`min-h-[60px] xs:min-h-[80px] sm:min-h-[100px] p-1 sm:p-2 border border-gray-700 rounded-md sm:rounded-lg 
                cursor-pointer hover:bg-gray-700/50 transition ${
                !day.isCurrentMonth ? 'opacity-50' : ''
              } ${day.isToday ? 'ring-1 sm:ring-2 ring-blue-500' : ''} ${
                day.hasBookings ? 'bg-gray-700/30 hover:bg-gray-700' : ''
              }`}
              onClick={() => handleDateClick(day)}
            >
              <div className="flex justify-between items-start mb-0.5 sm:mb-1">
                <span className={`text-xs sm:text-sm ${
                  day.isToday ? 'text-blue-400 font-bold' : 
                  day.isCurrentMonth ? 'text-white' : 'text-gray-500'
                }`}>
                  {day.date.getDate()}
                </span>
                {day.hasBookings && (
                  <span className="text-xs text-purple-400 bg-purple-600/30 rounded-full w-4 h-4 sm:w-5 sm:h-5 
                    flex items-center justify-center text-[10px] sm:text-xs">
                    {day.bookings.length}
                  </span>
                )}
              </div>

              {/* Booking previews - Responsive */}
              <div className="space-y-0.5 sm:space-y-1">
                {/* Show only 1 booking on mobile, 2 on desktop */}
                {day.bookings.slice(0, isMobile ? 1 : 2).map((booking, idx) => (
                  <div
                    key={idx}
                    className={`text-[10px] sm:text-xs px-1 sm:px-2 py-0.5 sm:py-1 rounded text-white truncate 
                      ${getBookingColor(booking.status)}`}
                    title={`${booking.title} - ${booking.clientName}`}
                  >
                    <span className="hidden xs:inline">{booking.clientName}</span>
                    <span className="xs:hidden">•</span>
                  </div>
                ))}
                {day.bookings.length > (isMobile ? 1 : 2) && (
                  <div className="text-[10px] sm:text-xs text-center text-gray-400">
                    +{day.bookings.length - (isMobile ? 1 : 2)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Legend - Responsive */}
        <div className="flex flex-wrap gap-2 sm:gap-4 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-700">
          <div className="flex items-center">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-500 rounded mr-1 sm:mr-2"></div>
            <span className="text-xs sm:text-sm text-gray-400">Pending</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded mr-1 sm:mr-2"></div>
            <span className="text-xs sm:text-sm text-gray-400">Approved</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded mr-1 sm:mr-2"></div>
            <span className="text-xs sm:text-sm text-gray-400">Confirmed</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-purple-500 rounded mr-1 sm:mr-2"></div>
            <span className="text-xs sm:text-sm text-gray-400">Completed</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded mr-1 sm:mr-2"></div>
            <span className="text-xs sm:text-sm text-gray-400">Cancelled</span>
          </div>
        </div>
      </div>

      {/* Quick Actions for Today - Responsive */}
      {(getTodaysCheckIns().length > 0 || getTodaysCheckOuts().length > 0) && (
        <div className="bg-gray-800 rounded-lg sm:rounded-xl p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Today's Schedule</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Check-ins */}
            {getTodaysCheckIns().length > 0 && (
              <div>
                <h4 className="text-green-400 font-medium mb-2 sm:mb-3 text-sm sm:text-base">
                  Check-ins ({getTodaysCheckIns().length})
                </h4>
                <div className="space-y-2">
                  {getTodaysCheckIns().map(booking => (
                    <div key={booking.id} className="bg-gray-700 rounded-lg p-2 sm:p-3 flex items-center space-x-2 sm:space-x-3">
                      {/* Property Image - Responsive */}
                      <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-600">
                        {booking.extendedProps?.imageUrl ? (
                          <img 
                            src={getImageUrl(booking.extendedProps.imageUrl)} 
                            alt={booking.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/placeholder.jpg';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home className="w-4 h-4 sm:w-6 sm:h-6 text-gray-500" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1 sm:space-x-2 mb-0.5 sm:mb-1">
                          <span className="text-gray-400 text-xs sm:text-sm">Guest:</span>
                          <UserProfileLink
                            userId={booking.extendedProps?.clientId}
                            name={booking.clientName}
                            role="client"
                            size="sm"
                            showAvatar={false}
                            className="text-white font-medium truncate text-xs sm:text-sm"
                          />
                        </div>
                        <p className="text-gray-400 text-xs sm:text-sm truncate">{booking.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Check-outs */}
            {getTodaysCheckOuts().length > 0 && (
              <div>
                <h4 className="text-purple-400 font-medium mb-2 sm:mb-3 text-sm sm:text-base">
                  Check-outs ({getTodaysCheckOuts().length})
                </h4>
                <div className="space-y-2">
                  {getTodaysCheckOuts().map(booking => (
                    <div key={booking.id} className="bg-gray-700 rounded-lg p-2 sm:p-3 flex items-center space-x-2 sm:space-x-3">
                      {/* Property Image - Responsive */}
                      <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-600">
                        {booking.extendedProps?.imageUrl ? (
                          <img 
                            src={getImageUrl(booking.extendedProps.imageUrl)} 
                            alt={booking.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/placeholder.jpg';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home className="w-4 h-4 sm:w-6 sm:h-6 text-gray-500" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1 sm:space-x-2 mb-0.5 sm:mb-1">
                          <span className="text-gray-400 text-xs sm:text-sm">Guest:</span>
                          <UserProfileLink
                            userId={booking.extendedProps?.clientId}
                            name={booking.clientName}
                            role="client"
                            size="sm"
                            showAvatar={false}
                            className="text-white font-medium truncate text-xs sm:text-sm"
                          />
                        </div>
                        <p className="text-gray-400 text-xs sm:text-sm truncate">{booking.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Day Details Modal - Responsive */}
      {showDayModal && selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-4 sm:p-6 max-w-full sm:max-w-2xl w-full max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start sm:items-center mb-4 sm:mb-6">
              <h2 className="text-base sm:text-xl font-semibold text-white">
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: isMobile ? 'short' : 'long', 
                  year: 'numeric', 
                  month: isMobile ? 'short' : 'long', 
                  day: 'numeric' 
                })}
              </h2>
              <button
                onClick={() => setShowDayModal(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {dayBookings.length === 0 ? (
                <p className="text-gray-400 text-center py-6 sm:py-8 text-sm sm:text-base">
                  No bookings for this day
                </p>
              ) : (
                dayBookings.map((booking) => (
                  <div key={booking.id} className="bg-gray-700 rounded-lg overflow-hidden">
                    <div className="flex flex-col sm:flex-row">
                      {/* Property Image - Responsive */}
                      <div className="w-full sm:w-32 h-24 xs:h-32 sm:h-auto flex-shrink-0 bg-gray-600">
                        {booking.extendedProps?.imageUrl ? (
                          <img 
                            src={getImageUrl(booking.extendedProps.imageUrl)} 
                            alt={booking.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/placeholder.jpg';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home className="w-8 h-8 sm:w-12 sm:h-12 text-gray-500" />
                          </div>
                        )}
                      </div>

                      {/* Booking Details - Responsive */}
                      <div className="flex-1 p-3 sm:p-4">
                        <div className="flex flex-col xs:flex-row justify-between items-start gap-2 mb-2 sm:mb-3">
                          <div className="flex-1">
                            <h3 className="text-white font-semibold text-sm sm:text-base">{booking.title}</h3>
                            <div className="flex items-center space-x-1 sm:space-x-2 text-gray-400 text-xs sm:text-sm mt-1">
                              <User className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span>Guest:</span>
                              <UserProfileLink
                                userId={booking.extendedProps?.clientId}
                                name={booking.clientName}
                                role="client"
                                size="sm"
                                showAvatar={false}
                                className="text-white hover:text-purple-400"
                              />
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs text-white ${getBookingColor(booking.status)}`}>
                            {booking.status}
                          </span>
                        </div>

                                                <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm mb-3 sm:mb-4">
                          <div className="flex items-center text-gray-300">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            <span className="truncate">
                              {new Date(booking.start).toLocaleDateString()} - 
                              {new Date(booking.end).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center text-gray-300">
                            <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            <span>₱{Number(booking.extendedProps?.totalPrice || 0).toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-gray-600 text-white text-xs sm:text-sm px-2 sm:px-3 py-1.5"
                              onClick={() => window.open(`/messages?client=${booking.extendedProps?.clientId}`, '_blank')}
                            >
                              <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                              <span className="hidden xs:inline">Message</span>
                              <span className="xs:hidden">Msg</span>
                            </Button>
                          </div>

                          {/* Booking actions based on status - Responsive */}
                          <div className="flex gap-2 justify-end">
                            {booking.status === BOOKING_STATUS.PENDING && (
                              <>
                                <Button
                                  size="sm"
                                  variant="gradient"
                                  className="bg-green-600 hover:bg-green-700 px-2 sm:px-3 py-1.5"
                                  onClick={() => handleBookingAction(booking.extendedProps?.bookingId, BOOKING_STATUS.APPROVED)}
                                >
                                  <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                                  <span className="hidden xs:inline ml-1 text-xs sm:text-sm">Approve</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-500 text-red-400 px-2 sm:px-3 py-1.5"
                                  onClick={() => handleBookingAction(booking.extendedProps?.bookingId, BOOKING_STATUS.REJECTED)}
                                >
                                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                                  <span className="hidden xs:inline ml-1 text-xs sm:text-sm">Reject</span>
                                </Button>
                              </>
                            )}
                            
                            {booking.status === BOOKING_STATUS.APPROVED && (
                              <Button
                                size="sm"
                                variant="gradient"
                                className="px-2 sm:px-3 py-1.5 text-xs sm:text-sm"
                                onClick={() => handleBookingAction(booking.extendedProps?.bookingId, BOOKING_STATUS.CONFIRMED)}
                              >
                                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                Confirm
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostCalendar;