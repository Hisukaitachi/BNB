// src/components/host/BookingsTab.jsx - Clean Version
import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, User, MapPin, Phone, Mail, 
  CheckCircle, XCircle, AlertCircle, Filter, Search,
  ChevronLeft, ChevronRight, Grid3X3, List, Eye
} from 'lucide-react';
import api from '../../services/api';
import Button from '../common/Button';
import Loading from '../common/Loading';
import Modal from '../common/Modal';
import { useApp } from '../../context/AppContext';

const BookingsTab = () => {
  // State management
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  // View and filter state
  const [viewMode, setViewMode] = useState('calendar');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarBookings, setCalendarBookings] = useState({});
  
  const { showToast } = useApp();

  // Effects
  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterBookings();
    prepareCalendarData();
  }, [bookings, statusFilter, searchTerm]);

  // Data fetching
  const fetchData = async () => {
    try {
      setLoading(true);
      const [bookingsRes, listingsRes] = await Promise.all([
        api.getHostBookings(),
        api.getMyListings()
      ]);
      
      setBookings(bookingsRes.data?.bookings || []);
      setListings(listingsRes.data?.listings || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Booking management
  const updateBookingStatus = async (bookingId, newStatus) => {
    try {
      setUpdating(true);
      await api.updateBookingStatus(bookingId, newStatus);
      
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId ? { ...booking, status: newStatus } : booking
      ));
      
      showToast(`Booking ${newStatus} successfully`, 'success');
    } catch (error) {
      console.error('Failed to update booking:', error);
      showToast('Failed to update booking', 'error');
    } finally {
      setUpdating(false);
    }
  };

  // Filtering and search
  const filterBookings = () => {
    let filtered = [...bookings];
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(booking => 
        booking.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.listing_title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setFilteredBookings(filtered);
  };

  // Calendar data preparation
  const prepareCalendarData = () => {
    const calendarData = {};
    
    bookings.forEach(booking => {
      // Only show confirmed and completed bookings on calendar
      if (!['confirmed', 'completed', 'pending'].includes(booking.status)) {
        return;
      }

      const startDate = new Date(booking.start_date);
      const endDate = new Date(booking.end_date);
      const listing = listings.find(l => l.id === booking.listing_id);
      
      // Create date range for booking
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        
        if (!calendarData[dateKey]) {
          calendarData[dateKey] = [];
        }
        
        const isStart = currentDate.toDateString() === startDate.toDateString();
        const isEnd = currentDate.toDateString() === endDate.toDateString();
        const isSingle = isStart && isEnd;
        
        calendarData[dateKey].push({
          ...booking,
          listingTitle: listing?.title || booking.listing_title || 'Unknown Property',
          listingColor: getListingColor(booking.listing_id),
          isStart,
          isEnd,
          isSingle
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });
    
    setCalendarBookings(calendarData);
  };

  // Helper functions
  const getListingColor = (listingId) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 
      'bg-pink-500', 'bg-indigo-500', 'bg-red-500', 'bg-orange-500'
    ];
    return colors[listingId % colors.length];
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // All days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const calculateNights = (startDate, endDate) => {
    return Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (status) => {
    const colors = {
      confirmed: 'bg-green-500/20 text-green-400',
      pending: 'bg-yellow-500/20 text-yellow-400',
      cancelled: 'bg-red-500/20 text-red-400',
      completed: 'bg-blue-500/20 text-blue-400',
      rejected: 'bg-red-500/20 text-red-400'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400';
  };

  const getStatusIcon = (status) => {
    const icons = {
      confirmed: <CheckCircle className="w-4 h-4" />,
      pending: <Clock className="w-4 h-4" />,
      cancelled: <XCircle className="w-4 h-4" />,
      completed: <CheckCircle className="w-4 h-4" />,
      rejected: <XCircle className="w-4 h-4" />
    };
    return icons[status] || <AlertCircle className="w-4 h-4" />;
  };

  const isToday = (date) => {
    const today = new Date();
    return date && date.toDateString() === today.toDateString();
  };

  const getBookingsForDate = (date) => {
    if (!date) return [];
    const dateKey = date.toISOString().split('T')[0];
    return calendarBookings[dateKey] || [];
  };

  // Calendar view component
  const CalendarView = () => {
    const days = getDaysInMonth(currentDate);
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="bg-gray-800 rounded-xl p-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(newDate.getMonth() - 1);
                setCurrentDate(newDate);
              }}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(newDate.getMonth() + 1);
                setCurrentDate(newDate);
              }}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Week headers */}
          {weekDays.map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-400 border-b border-gray-700">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {days.map((date, index) => {
            const dayBookings = getBookingsForDate(date);
            
            return (
              <div
                key={index}
                className={`min-h-[120px] p-2 border border-gray-700 ${
                  date ? 'bg-gray-750 hover:bg-gray-700' : 'bg-gray-900'
                } ${isToday(date) ? 'ring-2 ring-purple-500' : ''} transition-colors`}
              >
                {date && (
                  <>
                    <div className={`text-sm font-medium mb-2 ${
                      isToday(date) ? 'text-purple-400' : 'text-white'
                    }`}>
                      {date.getDate()}
                    </div>
                    
                    {/* Bookings for this day */}
                    <div className="space-y-1">
                      {dayBookings.map((booking, idx) => (
                        <div
                          key={`${booking.id}-${idx}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBooking(booking);
                            setShowDetailsModal(true);
                          }}
                          className={`text-xs p-1.5 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                            booking.listingColor
                          } text-white ${
                            booking.isSingle 
                              ? 'rounded' 
                              : booking.isStart 
                                ? 'rounded-r-sm' 
                                : booking.isEnd 
                                  ? 'rounded-l-sm' 
                                  : 'rounded-none'
                          }`}
                          title={`${booking.client_name} - ${booking.listingTitle}`}
                        >
                          {booking.isStart || booking.isSingle ? (
                            <div>
                              <div className="font-medium truncate flex items-center">
                                <User className="w-3 h-3 mr-1" />
                                {booking.client_name || 'Guest'}
                              </div>
                              <div className="truncate text-xs opacity-90 mt-0.5">
                                {booking.listingTitle}
                              </div>
                            </div>
                          ) : (
                            <div className="h-6 flex items-center justify-center">
                              <div className="w-full h-0.5 bg-white/50"></div>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {dayBookings.length > 3 && (
                        <div className="text-xs text-gray-400 text-center py-1 bg-gray-700 rounded">
                          +{dayBookings.length - 3} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Property Legend:</h4>
          <div className="flex flex-wrap gap-3">
            {listings.slice(0, 8).map((listing) => (
              <div key={listing.id} className="flex items-center space-x-2 bg-gray-700 rounded-lg px-3 py-1">
                <div className={`w-4 h-4 rounded ${getListingColor(listing.id)}`}></div>
                <span className="text-xs text-gray-300 max-w-[120px] truncate">
                  {listing.title}
                </span>
              </div>
            ))}
            {listings.length > 8 && (
              <div className="text-xs text-gray-400 px-3 py-1">
                +{listings.length - 8} more properties
              </div>
            )}
          </div>
        </div>

        {/* Calendar Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-gray-700 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-green-400">
              {Object.values(calendarBookings).flat().filter(b => b.status === 'confirmed').length}
            </div>
            <div className="text-xs text-gray-400">Confirmed Bookings</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-yellow-400">
              {Object.values(calendarBookings).flat().filter(b => b.status === 'pending').length}
            </div>
            <div className="text-xs text-gray-400">Pending Bookings</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-blue-400">
              {Object.values(calendarBookings).flat().filter(b => b.status === 'completed').length}
            </div>
            <div className="text-xs text-gray-400">Completed Bookings</div>
          </div>
        </div>
      </div>
    );
  };

  // List view component
  const ListView = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search bookings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-purple-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Bookings */}
      {filteredBookings.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-xl">
          <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No bookings found</h3>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <div key={booking.id} className="bg-gray-800 rounded-xl p-6 hover:bg-gray-750 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h3 className="text-lg font-semibold">{booking.listing_title || 'Unknown Listing'}</h3>
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${getStatusColor(booking.status)}`}>
                      {getStatusIcon(booking.status)}
                      <span className="capitalize">{booking.status}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
                    <div>
                      <span className="text-gray-400">Guest: </span>
                      {booking.client_name || 'Unknown'}
                    </div>
                    <div>
                      <span className="text-gray-400">Check-in: </span>
                      {formatDate(booking.start_date)}
                    </div>
                    <div>
                      <span className="text-gray-400">Duration: </span>
                      {calculateNights(booking.start_date, booking.end_date)} nights
                    </div>
                  </div>
                </div>

                <div className="text-right ml-4">
                  <p className="text-xl font-bold">{formatPrice(booking.total_price)}</p>
                  <p className="text-sm text-gray-400">Total</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-700">
                <div className="flex space-x-2">
                  {booking.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                        disabled={updating}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateBookingStatus(booking.id, 'rejected')}
                        disabled={updating}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                  
                  {booking.status === 'confirmed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateBookingStatus(booking.id, 'completed')}
                      disabled={updating}
                    >
                      Mark Complete
                    </Button>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedBooking(booking);
                    setShowDetailsModal(true);
                  }}
                >
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Loading state
  if (loading) {
    return <Loading message="Loading bookings..." fullScreen={false} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Booking Management</h2>
          <p className="text-gray-400">Manage your property bookings</p>
        </div>
        
        {/* View Toggle */}
        <div className="flex bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              viewMode === 'calendar' ? 'bg-purple-500 text-white' : 'text-gray-300 hover:text-white'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
            <span>Calendar</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              viewMode === 'list' ? 'bg-purple-500 text-white' : 'text-gray-300 hover:text-white'
            }`}
          >
            <List className="w-4 h-4" />
            <span>List</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: bookings.length, color: 'text-white' },
          { label: 'Pending', value: bookings.filter(b => b.status === 'pending').length, color: 'text-yellow-400' },
          { label: 'Confirmed', value: bookings.filter(b => b.status === 'confirmed').length, color: 'text-green-400' },
          { label: 'Completed', value: bookings.filter(b => b.status === 'completed').length, color: 'text-blue-400' },
          { label: 'Cancelled', value: bookings.filter(b => b.status === 'cancelled').length, color: 'text-red-400' }
        ].map((stat, index) => (
          <div key={index} className="bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Content */}
      {viewMode === 'calendar' ? <CalendarView /> : <ListView />}

      {/* Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedBooking(null);
        }}
        title="Booking Details"
      >
        {selectedBooking && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-700">
              <div>
                <h3 className="text-lg font-semibold">{selectedBooking.listingTitle}</h3>
                <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs mt-1 ${getStatusColor(selectedBooking.status)}`}>
                  {getStatusIcon(selectedBooking.status)}
                  <span className="capitalize">{selectedBooking.status}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-400">{formatPrice(selectedBooking.total_price)}</div>
                <div className="text-sm text-gray-400">Total Amount</div>
              </div>
            </div>

            {/* Guest Information */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center">
                <User className="w-4 h-4 mr-2" />
                Guest Information
              </h4>
              <div className="bg-gray-700 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Name:</span>
                  <span className="font-medium">{selectedBooking.client_name || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Email:</span>
                  <span className="font-medium">{selectedBooking.client_email || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Phone:</span>
                  <span className="font-medium">{selectedBooking.client_phone || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Number of Guests:</span>
                  <span className="font-medium">{selectedBooking.guests || 1}</span>
                </div>
              </div>
            </div>

            {/* Booking Information */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Booking Information
              </h4>
              <div className="bg-gray-700 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Property:</span>
                  <span className="font-medium">{selectedBooking.listingTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Booking ID:</span>
                  <span className="font-medium">#{selectedBooking.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Check-in:</span>
                  <span className="font-medium">{formatDate(selectedBooking.start_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Check-out:</span>
                  <span className="font-medium">{formatDate(selectedBooking.end_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Duration:</span>
                  <span className="font-medium">{calculateNights(selectedBooking.start_date, selectedBooking.end_date)} nights</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Booked on:</span>
                  <span className="font-medium">{formatDate(selectedBooking.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Special Requests */}
            {selectedBooking.special_requests && (
              <div>
                <h4 className="font-semibold mb-3">Special Requests</h4>
                <div className="bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-300">{selectedBooking.special_requests}</p>
                </div>
              </div>
            )}

            {/* Payment Breakdown */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center">
                <DollarSign className="w-4 h-4 mr-2" />
                Payment Summary
              </h4>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">
                      Base price ({calculateNights(selectedBooking.start_date, selectedBooking.end_date)} nights):
                    </span>
                    <span>{formatPrice((selectedBooking.total_price || 0) * 0.85)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Service fee (10%):</span>
                    <span>{formatPrice((selectedBooking.total_price || 0) * 0.1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Taxes (5%):</span>
                    <span>{formatPrice((selectedBooking.total_price || 0) * 0.05)}</span>
                  </div>
                  <div className="border-t border-gray-600 pt-2 flex justify-between font-semibold text-base">
                    <span>Total:</span>
                    <span className="text-green-400">{formatPrice(selectedBooking.total_price)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4 border-t border-gray-700">
              {selectedBooking.status === 'pending' && (
                <>
                  <Button
                    onClick={() => {
                      updateBookingStatus(selectedBooking.id, 'confirmed');
                      setShowDetailsModal(false);
                    }}
                    disabled={updating}
                    icon={<CheckCircle className="w-4 h-4" />}
                    className="flex-1"
                  >
                    Accept Booking
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      updateBookingStatus(selectedBooking.id, 'rejected');
                      setShowDetailsModal(false);
                    }}
                    disabled={updating}
                    icon={<XCircle className="w-4 h-4" />}
                    className="flex-1 text-red-400 border-red-400 hover:bg-red-500/10"
                  >
                    Reject Booking
                  </Button>
                </>
              )}
              
              {selectedBooking.status === 'confirmed' && (
                <Button
                  onClick={() => {
                    updateBookingStatus(selectedBooking.id, 'completed');
                    setShowDetailsModal(false);
                  }}
                  disabled={updating}
                  icon={<CheckCircle className="w-4 h-4" />}
                  className="flex-1"
                >
                  Mark as Completed
                </Button>
              )}

              {selectedBooking.client_email && (
                <Button
                  variant="outline"
                  onClick={() => window.open(`mailto:${selectedBooking.client_email}`, '_blank')}
                  icon={<Mail className="w-4 h-4" />}
                >
                  Email Guest
                </Button>
              )}

              {selectedBooking.client_phone && (
                <Button
                  variant="outline"
                  onClick={() => window.open(`tel:${selectedBooking.client_phone}`, '_blank')}
                  icon={<Phone className="w-4 h-4" />}
                >
                  Call Guest
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BookingsTab;