// frontend/src/components/host/HostBookings.jsx - Refactored and responsive
import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  User, 
  Check, 
  X, 
  MessageSquare,
  Eye,
  RefreshCw,
  Star
} from 'lucide-react';
import Button from '../ui/Button';
import { bookingAPI } from '../../services/api';
import BookingCard from './comphb/BookingCard';
import BookingDetailsModal from './comphb/BookingDetailsModal';
import GuestReviewModal from './comphb/GuestReviewModal';

const HostBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState({});
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

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
        setBookings(prev => prev.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: newStatus }
            : booking
        ));
        
        const statusMessages = {
          approved: 'Booking approved! The guest will now be able to make payment to confirm their reservation.',
          arrived: 'Booking marked as arrived. The guest is now checked in.',
          completed: 'Booking marked as completed.',
          default: `Booking ${newStatus} successfully`
        };
        
        alert(statusMessages[newStatus] || statusMessages.default);
      }
      
    } catch (error) {
      alert('Failed to update booking: ' + (error.response?.data?.message || error.message));
    } finally {
      setActionLoading({ ...actionLoading, [bookingId]: false });
    }
  };

  const getFilterCounts = () => {
    return {
      all: bookings.length,
      pending: bookings.filter(b => b.status === 'pending').length,
      approved: bookings.filter(b => b.status === 'approved').length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      arrived: bookings.filter(b => b.status === 'arrived').length,
      completed: bookings.filter(b => b.status === 'completed').length
    };
  };

const getStats = () => {
  const today = new Date().toISOString().split('T')[0];
  const reservations = bookings.filter(b => b.booking_type === 'reserve');
  const fullBookings = bookings.filter(b => b.booking_type === 'book' || !b.booking_type);
  
  return {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    checkingInToday: bookings.filter(b => 
      b.start_date && 
      b.start_date.split('T')[0] === today &&
      ['confirmed', 'approved'].includes(b.status)
    ).length,
    currentlyStaying: bookings.filter(b => b.status === 'arrived').length,
    reservations: reservations.length,
    fullBookings: fullBookings.length,
    pendingPayments: bookings.filter(b => 
      b.booking_type === 'reserve' && 
      b.deposit_paid === 1 && 
      b.remaining_paid === 0
    ).length
  };
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

  const stats = getStats();
  const filterCounts = getFilterCounts();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Manage Bookings</h1>
          <p className="text-sm sm:text-base text-gray-400 mt-1">
  {stats.total} total • {stats.pending} pending • 
  {stats.reservations} reservations • {stats.fullBookings} full bookings
  {stats.pendingPayments > 0 && ` • ${stats.pendingPayments} awaiting final payment`}
</p>
        </div>
        
        <Button
          onClick={loadHostBookings}
          variant="outline"
          className="border-gray-600 text-gray-300 w-full sm:w-auto"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="overflow-x-auto">
        <div className="flex space-x-2 border-b border-gray-700 min-w-max">
          {[
            { key: 'all', label: 'All', count: filterCounts.all },
            { key: 'pending', label: 'Pending', count: filterCounts.pending },
            { key: 'approved', label: 'Approved', count: filterCounts.approved },
            { key: 'confirmed', label: 'Confirmed', count: filterCounts.confirmed },
            { key: 'arrived', label: 'Arrived', count: filterCounts.arrived },
            { key: 'completed', label: 'Completed', count: filterCounts.completed }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 sm:px-4 py-2 rounded-t-lg transition flex items-center space-x-2 whitespace-nowrap ${
                filter === tab.key
                  ? 'bg-purple-600 text-white border-b-2 border-purple-600'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span className="text-sm sm:text-base">{tab.label}</span>
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
      </div>

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              isLoading={actionLoading[booking.id]}
              onUpdateStatus={updateBookingStatus}
              onViewDetails={(booking) => {
                setSelectedBooking(booking);
                setShowDetailsModal(true);
              }}
              onOpenReview={(booking) => {
                setSelectedBooking(booking);
                setShowReviewModal(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Modals */}
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

      {showReviewModal && selectedBooking && (
        <GuestReviewModal
          booking={selectedBooking}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedBooking(null);
          }}
          onReviewSubmitted={() => {
            setShowReviewModal(false);
            setSelectedBooking(null);
            alert('Review submitted successfully!');
          }}
        />
      )}
    </div>
  );
};

// Empty State Component
const EmptyState = ({ filter }) => (
  <div className="text-center py-12 sm:py-16">
    <Calendar className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
    <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
      {filter === 'all' ? 'No bookings yet' : `No ${filter} bookings`}
    </h3>
    <p className="text-sm sm:text-base text-gray-400 max-w-md mx-auto">
      {filter === 'pending' ? 'New booking requests will appear here' : 
       filter === 'arrived' ? 'Guests who have arrived will appear here' :
       'Bookings will appear here as guests make reservations'}
    </p>
  </div>
);

export default HostBookings;