// frontend/src/components/host/HostCalendar.jsx - Big Calendar for Host Dashboard
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
  AlertTriangle
} from 'lucide-react';
import hostService from '../../services/hostService';
import { BOOKING_STATUS } from '../../services/bookingService';
import Button from '../ui/Button';
import UserProfileLink from '../ui/UserProfileLink';

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
        const bookingStart = new Date(booking.start).toISOString().split('T')[0];
        const bookingEnd = new Date(booking.end).toISOString().split('T')[0];
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
      // Add your booking action logic here
      console.log(`Updating booking ${bookingId} to status ${newStatus}`);
      // Reload calendar data after action
      await loadCalendarData();
    } catch (error) {
      console.error('Failed to update booking:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center min-h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Failed to load calendar</h3>
        <p className="text-gray-400 mb-6">{error}</p>
        <Button onClick={loadCalendarData} variant="gradient">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm text-gray-400 mb-1">This Month</h3>
          <p className="text-2xl font-bold text-white">{monthlyStats.totalBookings}</p>
          <p className="text-xs text-gray-500">bookings</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm text-gray-400 mb-1">Revenue</h3>
          <p className="text-2xl font-bold text-green-400">₱{monthlyStats.totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-gray-500">this month</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm text-gray-400 mb-1">Today's Check-ins</h3>
          <p className="text-2xl font-bold text-blue-400">{getTodaysCheckIns().length}</p>
          <p className="text-xs text-gray-500">guests arriving</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm text-gray-400 mb-1">Pending</h3>
          <p className="text-2xl font-bold text-yellow-400">{monthlyStats.pendingBookings}</p>
          <p className="text-xs text-gray-500">need action</p>
        </div>
      </div>

      {/* Calendar Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        {/* Month Navigation */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-2 rounded-lg hover:bg-gray-700 text-gray-300"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <h2 className="text-xl font-bold text-white min-w-48 text-center">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          
          <button
            onClick={() => navigateMonth(1)}
            className="p-2 rounded-lg hover:bg-gray-700 text-gray-300"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-3">
          <select
            value={filterListing}
            onChange={(e) => setFilterListing(e.target.value)}
            className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Properties</option>
            {calendarData.listings.map(listing => (
              <option key={listing.id} value={listing.id} className="bg-gray-800">
                {listing.title}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-gray-800 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value={BOOKING_STATUS.PENDING}>Pending</option>
            <option value={BOOKING_STATUS.APPROVED}>Approved</option>
            <option value={BOOKING_STATUS.CONFIRMED}>Confirmed</option>
            <option value={BOOKING_STATUS.COMPLETED}>Completed</option>
          </select>

          <Button onClick={loadCalendarData} variant="outline" size="sm" className="border-gray-600">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-gray-800 rounded-xl p-6">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
            <div key={day} className="text-center text-sm text-gray-400 font-medium py-2">
              {day.slice(0, 3)}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`min-h-24 p-1 border border-gray-700 rounded-lg cursor-pointer hover:bg-gray-700/50 transition ${
                !day.isCurrentMonth ? 'opacity-50' : ''
              } ${day.isToday ? 'ring-2 ring-blue-500' : ''} ${
                day.hasBookings ? 'bg-gray-700/30 hover:bg-gray-700' : ''
              }`}
              onClick={() => handleDateClick(day)}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-sm ${
                  day.isToday ? 'text-blue-400 font-bold' : 
                  day.isCurrentMonth ? 'text-white' : 'text-gray-500'
                }`}>
                  {day.date.getDate()}
                </span>
                {day.hasBookings && (
                  <span className="text-xs text-purple-400 bg-purple-600 rounded-full w-5 h-5 flex items-center justify-center">
                    {day.bookings.length}
                  </span>
                )}
              </div>

              {/* Booking previews */}
              <div className="space-y-1">
                {day.bookings.slice(0, 2).map((booking, idx) => (
                  <div
                    key={idx}
                    className={`text-xs px-2 py-1 rounded text-white truncate ${getBookingColor(booking.status)}`}
                    title={`${booking.title} - ${booking.clientName}`}
                  >
                    {booking.clientName}
                  </div>
                ))}
                {day.bookings.length > 2 && (
                  <div className="text-xs text-center text-gray-400">
                    +{day.bookings.length - 2} more
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-gray-700">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
            <span className="text-sm text-gray-400">Pending</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
            <span className="text-sm text-gray-400">Approved</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
            <span className="text-sm text-gray-400">Confirmed</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-purple-500 rounded mr-2"></div>
            <span className="text-sm text-gray-400">Completed</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
            <span className="text-sm text-gray-400">Cancelled</span>
          </div>
        </div>
      </div>

      {/* Quick Actions for Today */}
      {(getTodaysCheckIns().length > 0 || getTodaysCheckOuts().length > 0) && (
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Today's Schedule</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Check-ins */}
            {getTodaysCheckIns().length > 0 && (
              <div>
                <h4 className="text-green-400 font-medium mb-3">Check-ins ({getTodaysCheckIns().length})</h4>
                <div className="space-y-2">
                  {getTodaysCheckIns().map(booking => (
                    <div key={booking.id} className="bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-gray-400 text-sm">Guest:</span>
                        <UserProfileLink
                          userId={booking.extendedProps?.clientId}
                          name={booking.clientName}
                          role="client"
                          size="sm"
                          showAvatar={false}
                          className="text-white font-medium"
                        />
                      </div>
                      <p className="text-gray-400 text-sm">{booking.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Check-outs */}
            {getTodaysCheckOuts().length > 0 && (
              <div>
                <h4 className="text-purple-400 font-medium mb-3">Check-outs ({getTodaysCheckOuts().length})</h4>
                <div className="space-y-2">
                  {getTodaysCheckOuts().map(booking => (
                    <div key={booking.id} className="bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-gray-400 text-sm">Guest:</span>
                        <UserProfileLink
                          userId={booking.extendedProps?.clientId}
                          name={booking.clientName}
                          role="client"
                          size="sm"
                          showAvatar={false}
                          className="text-white font-medium"
                        />
                      </div>
                      <p className="text-gray-400 text-sm">{booking.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Day Details Modal */}
      {showDayModal && selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h2>
              <button
                onClick={() => setShowDayModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {dayBookings.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No bookings for this day</p>
              ) : (
                dayBookings.map((booking) => (
                  <div key={booking.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-white font-semibold">{booking.title}</h3>
                        <div className="flex items-center space-x-2 text-gray-400 text-sm mt-1">
                          <User className="w-4 h-4" />
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

                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      <div className="flex items-center text-gray-300">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>
                          {new Date(booking.start).toLocaleDateString()} - 
                          {new Date(booking.end).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center text-gray-300">
                        <DollarSign className="w-4 h-4 mr-2" />
                        <span>₱{Number(booking.extendedProps?.totalPrice || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-gray-600 text-gray-300"
                          onClick={() => window.open(`/messages?client=${booking.extendedProps?.clientId}`, '_blank')}
                        >
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Message
                        </Button>
                      </div>

                      {/* Booking actions based on status */}
                      <div className="flex space-x-2">
                        {booking.status === BOOKING_STATUS.PENDING && (
                          <>
                            <Button
                              size="sm"
                              variant="gradient"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleBookingAction(booking.extendedProps?.bookingId, BOOKING_STATUS.APPROVED)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500 text-red-400"
                              onClick={() => handleBookingAction(booking.extendedProps?.bookingId, BOOKING_STATUS.REJECTED)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        
                        {booking.status === BOOKING_STATUS.APPROVED && (
                          <Button
                            size="sm"
                            variant="gradient"
                            onClick={() => handleBookingAction(booking.extendedProps?.bookingId, BOOKING_STATUS.CONFIRMED)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Confirm
                          </Button>
                        )}
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