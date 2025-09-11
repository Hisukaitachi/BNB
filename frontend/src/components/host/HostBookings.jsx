// frontend/src/components/host/HostBookings.jsx - FIXED status handling
import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  DollarSign, 
  User, 
  Check, 
  X, 
  MessageSquare,
  Eye,
  MoreHorizontal,
  Filter,
  RefreshCw
} from 'lucide-react';
import Button from '../ui/Button';
import { bookingAPI } from '../../services/api';

const HostBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState({});
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    loadHostBookings();
  }, [filter]);

  const loadHostBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await bookingAPI.getHostBookings();
      
      let filteredBookings = response.data.data?.bookings || [];
      
      if (filter !== 'all') {
        filteredBookings = filteredBookings.filter(booking => booking.status === filter);
      }
      
      setBookings(filteredBookings);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId, newStatus, note = '') => {
    try {
      setActionLoading({ ...actionLoading, [bookingId]: true });
      
      const response = await bookingAPI.updateBookingStatus(bookingId, newStatus);
      
      if (response.data.status === 'success') {
        // Update local state
        setBookings(prev => prev.map(booking => 
          booking.booking_id === bookingId 
            ? { ...booking, status: newStatus }
            : booking
        ));
        
        // Show success message based on the new payment flow
        if (newStatus === 'approved') {
          alert('Booking approved! The guest will now be able to make payment to confirm their reservation.');
        } else {
          alert(`Booking ${newStatus} successfully`);
        }
      }
      
    } catch (error) {
      alert('Failed to update booking: ' + (error.response?.data?.message || error.message));
    } finally {
      setActionLoading({ ...actionLoading, [bookingId]: false });
    }
  };

  // ✅ FIXED: Change 'confirmed' to 'approved'
  const handleApprove = (bookingId) => {
    if (confirm('Approve this booking request? The guest will then need to complete payment to confirm their reservation.')) {
      updateBookingStatus(bookingId, 'approved'); // ✅ Changed from 'confirmed' to 'approved'
    }
  };

  const handleDecline = (bookingId) => {
    const reason = prompt('Please provide a reason for declining (optional):');
    updateBookingStatus(bookingId, 'rejected', reason || 'Host declined');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      approved: { color: 'bg-blue-100 text-blue-800', label: 'Approved (Awaiting Payment)' }, // ✅ Updated label
      confirmed: { color: 'bg-green-100 text-green-800', label: 'Confirmed' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
      cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Cancelled' },
      completed: { color: 'bg-purple-100 text-purple-800', label: 'Completed' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return config;
  };

  const getPendingBookingsCount = () => {
    return bookings.filter(booking => booking.status === 'pending').length;
  };

  const getTodaysCheckIns = () => {
    const today = new Date().toISOString().split('T')[0];
    return bookings.filter(booking => 
      booking.check_in_date && 
      booking.check_in_date.split('T')[0] === today &&
      ['confirmed', 'approved'].includes(booking.status) // ✅ Include both confirmed and approved
    ).length;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={loadHostBookings} variant="gradient">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Manage Bookings</h1>
          <p className="text-gray-400">
            {bookings.length} total bookings • {getPendingBookingsCount()} pending • {getTodaysCheckIns()} checking in today
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button
            onClick={loadHostBookings}
            variant="outline"
            className="border-gray-600 text-gray-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Updated Filter Tabs */}
      <div className="flex space-x-2 border-b border-gray-700">
        {[
          { key: 'all', label: 'All Bookings', count: bookings.length },
          { key: 'pending', label: 'Pending', count: getPendingBookingsCount() },
          { key: 'approved', label: 'Approved', count: bookings.filter(b => b.status === 'approved').length }, // ✅ Added approved tab
          { key: 'confirmed', label: 'Confirmed', count: bookings.filter(b => b.status === 'confirmed').length },
          { key: 'completed', label: 'Completed', count: bookings.filter(b => b.status === 'completed').length }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-t-lg transition flex items-center space-x-2 ${
              filter === tab.key
                ? 'bg-purple-600 text-white border-b-2 border-purple-600'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span className={`px-2 py-1 rounded-full text-xs ${
                filter === tab.key 
                  ? 'bg-purple-700 text-purple-100' 
                  : 'bg-gray-700 text-gray-300'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            {filter === 'all' ? 'No bookings yet' : `No ${filter} bookings`}
          </h3>
          <p className="text-gray-400">
            {filter === 'pending' ? 'New booking requests will appear here' : 'Bookings will appear here as guests make reservations'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {bookings.map((booking) => {
            const statusBadge = getStatusBadge(booking.status);
            const isLoading = actionLoading[booking.booking_id];
            
            return (
              <div key={booking.booking_id} className={`bg-gray-800 rounded-xl p-6 border ${
                booking.status === 'pending' ? 'border-yellow-500' : 
                booking.status === 'approved' ? 'border-blue-500' : 'border-gray-700'
              }`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold text-white">{booking.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadge.color}`}>
                        {statusBadge.label}
                      </span>
                      
                      {/* ✅ NEW: Payment status indicator */}
                      {booking.status === 'approved' && (
                        <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                          Awaiting Payment
                        </span>
                      )}
                      {booking.payment_status === 'succeeded' && (
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          Paid
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center text-gray-400 space-x-4 text-sm">
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        <span>Guest: {booking.client_name}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>Booking #{booking.booking_id}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ✅ NEW: Special message for approved bookings */}
                {booking.status === 'approved' && !booking.payment_status && (
                  <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3 mb-4">
                    <p className="text-blue-400 text-sm">
                      💳 This booking has been approved. The guest can now complete payment to confirm their reservation.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="flex items-center text-gray-300">
                    <Calendar className="w-5 h-5 mr-3 text-purple-400" />
                    <div>
                      <p className="text-sm text-gray-400">Check-in</p>
                      <p className="font-medium">
                        {new Date(booking.check_in_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short', 
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center text-gray-300">
                    <Calendar className="w-5 h-5 mr-3 text-purple-400" />
                    <div>
                      <p className="text-sm text-gray-400">Check-out</p>
                      <p className="font-medium">
                        {new Date(booking.check_out_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short', 
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center text-gray-300">
                    <DollarSign className="w-5 h-5 mr-3 text-green-400" />
                    <div>
                      <p className="text-sm text-gray-400">Total</p>
                      <p className="font-medium">₱{Number(booking.total_price).toLocaleString()}</p>
                      {/* ✅ NEW: Show earnings info */}
                      {booking.payment_status === 'succeeded' && (
                        <p className="text-xs text-green-400">Your earnings: ₱{Number(booking.total_price * 0.9).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between items-center">
                  <div className="flex space-x-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-gray-600 text-gray-300"
                      onClick={() => {
                        setSelectedBooking(booking);
                        setShowDetailsModal(true);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-purple-500 text-purple-400"
                      onClick={() => window.open(`/messages?client=${booking.client_id}`, '_blank')}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Message Guest
                    </Button>
                  </div>

                  {/* Status-specific actions */}
                  {booking.status === 'pending' && (
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                        onClick={() => handleDecline(booking.booking_id)}
                        loading={isLoading}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        variant="gradient"
                        onClick={() => handleApprove(booking.booking_id)}
                        loading={isLoading}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                    </div>
                  )}

                  {booking.status === 'approved' && (
                    <div className="text-right">
                      <div className="bg-blue-900/20 text-blue-400 px-3 py-2 rounded-lg text-sm">
                        ✓ Approved - Awaiting Payment
                      </div>
                    </div>
                  )}

                  {['confirmed'].includes(booking.status) && (
                    <div className="text-right">
                      <div className="bg-green-900/20 text-green-400 px-3 py-2 rounded-lg text-sm">
                        ✓ Confirmed & Paid
                      </div>
                    </div>
                  )}

                  {booking.status === 'completed' && (
                    <div className="text-right">
                      <div className="bg-purple-900/20 text-purple-400 px-3 py-2 rounded-lg text-sm">
                        ✓ Completed
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Booking Details Modal */}
      {showDetailsModal && selectedBooking && (
        <BookingDetailsModal 
          booking={selectedBooking}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedBooking(null);
          }}
          onStatusUpdate={(bookingId, status) => {
            updateBookingStatus(bookingId, status);
            setShowDetailsModal(false);
          }}
        />
      )}
    </div>
  );
};

// ✅ UPDATED: Booking Details Modal with correct actions
const BookingDetailsModal = ({ booking, onClose, onStatusUpdate }) => {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadBookingHistory();
  }, [booking.booking_id]);

  const loadBookingHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await bookingAPI.getBookingHistory(booking.booking_id);
      setHistory(response.data.data?.history || []);
    } catch (error) {
      console.error('Failed to load booking history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const calculateDuration = () => {
    const checkIn = new Date(booking.check_in_date);
    const checkOut = new Date(booking.check_out_date);
    return Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  };

  const getDaysUntilCheckIn = () => {
    const checkIn = new Date(booking.check_in_date);
    const today = new Date();
    const diffTime = checkIn - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Booking Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Booking Information */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Booking Information</h3>
              <div className="bg-gray-700 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Booking ID</span>
                  <span className="text-white font-medium">#{booking.booking_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Property</span>
                  <span className="text-white font-medium">{booking.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Duration</span>
                  <span className="text-white font-medium">{calculateDuration()} nights</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Amount</span>
                  <span className="text-green-400 font-medium">₱{Number(booking.total_price).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Days until check-in</span>
                  <span className="text-white font-medium">
                    {getDaysUntilCheckIn() > 0 ? `${getDaysUntilCheckIn()} days` : 'Today'}
                  </span>
                </div>
              </div>
            </div>

            {/* Guest Information */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Guest Information</h3>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-600 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">{booking.client_name}</h4>
                    <p className="text-gray-400 text-sm">Guest</p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-purple-500 text-purple-400 flex-1"
                    onClick={() => window.open(`/messages?client=${booking.client_id}`, '_blank')}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Dates & Actions */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Dates & Status</h3>
              <div className="bg-gray-700 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-600 rounded-lg">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-green-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-400">Check-in</p>
                      <p className="text-white font-medium">
                        {new Date(booking.check_in_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-600 rounded-lg">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 text-red-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-400">Check-out</p>
                      <p className="text-white font-medium">
                        {new Date(booking.check_out_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ✅ FIXED: Actions for pending bookings */}
            {booking.status === 'pending' && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Button
                    onClick={() => onStatusUpdate(booking.booking_id, 'approved')} // ✅ Changed from 'confirmed' to 'approved'
                    variant="gradient"
                    size="lg"
                    className="w-full"
                  >
                    <Check className="w-5 h-5 mr-2" />
                    Approve Booking
                  </Button>
                  
                  <Button
                    onClick={() => onStatusUpdate(booking.booking_id, 'rejected')}
                    variant="outline"
                    size="lg"
                    className="w-full border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                  >
                    <X className="w-5 h-5 mr-2" />
                    Decline Booking
                  </Button>
                </div>
              </div>
            )}

            {/* Booking History */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Booking History</h3>
              <div className="bg-gray-700 rounded-lg p-4 max-h-64 overflow-y-auto">
                {loadingHistory ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">No history available</p>
                ) : (
                  <div className="space-y-3">
                    {history.map((entry, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                        <div>
                          <p className="text-white text-sm">
                            Status changed to <span className="font-medium">{entry.new_status}</span>
                          </p>
                          <p className="text-gray-400 text-xs">
                            {new Date(entry.changed_at).toLocaleString()} by {entry.changed_by_name}
                          </p>
                          {entry.note && (
                            <p className="text-gray-300 text-xs italic mt-1">{entry.note}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostBookings;