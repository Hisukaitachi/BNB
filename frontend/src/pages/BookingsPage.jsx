import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Users, Clock, Star, MessageCircle, X, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import Loading from '../components/common/Loading';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';

const BookingsPage = () => {
  const { user } = useAuth();
  const { showToast } = useApp();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  const statusColors = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    approved: 'bg-green-500/20 text-green-400 border-green-500/30',
    confirmed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
    cancelled: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    completed: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    refunded: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  };

  const statusIcons = {
    pending: Clock,
    approved: CheckCircle,
    confirmed: CheckCircle,
    rejected: X,
    cancelled: X,
    completed: CheckCircle,
    refunded: AlertCircle
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await api.getMyBookings();
      if (response.status === 'success') {
        setBookings(response.data.bookings || []);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      showToast('Failed to load bookings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking || !cancelReason.trim()) {
      showToast('Please provide a cancellation reason', 'error');
      return;
    }

    setCancelLoading(true);
    try {
      await api.updateBookingStatus(selectedBooking.id, 'cancelled');
      showToast('Booking cancelled successfully', 'success');
      setShowCancelModal(false);
      setSelectedBooking(null);
      setCancelReason('');
      fetchBookings(); // Refresh bookings
    } catch (error) {
      showToast(error.message || 'Failed to cancel booking', 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      await api.updateBookingStatus(bookingId, newStatus);
      showToast(`Booking ${newStatus} successfully`, 'success');
      fetchBookings(); // Refresh bookings
    } catch (error) {
      showToast(error.message || `Failed to ${newStatus} booking`, 'error');
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDuration = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return `${nights} night${nights > 1 ? 's' : ''}`;
  };

  const getFilteredBookings = () => {
    if (filter === 'all') return bookings;
    return bookings.filter(booking => booking.status === filter);
  };

  const canCancelBooking = (booking) => {
    const checkInDate = new Date(booking.start_date);
    const now = new Date();
    const hoursUntilCheckIn = (checkInDate - now) / (1000 * 60 * 60);
    
    return ['pending', 'approved', 'confirmed'].includes(booking.status) && 
           hoursUntilCheckIn > 24; // Can cancel up to 24 hours before check-in
  };

  const filterCounts = {
    all: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    approved: bookings.filter(b => b.status === 'approved').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length
  };

  if (loading) {
    return <Loading message="Loading your bookings..." />;
  }

  return (
    <div className="min-h-screen pt-20">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Bookings</h1>
          <p className="text-gray-400">Manage your travel reservations</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Pending' },
            { key: 'approved', label: 'Approved' },
            { key: 'confirmed', label: 'Confirmed' },
            { key: 'completed', label: 'Completed' },
            { key: 'cancelled', label: 'Cancelled' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                filter === key
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {label} ({filterCounts[key] || 0})
            </button>
          ))}
        </div>

        {/* Bookings List */}
        {getFilteredBookings().length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              {filter === 'all' ? 'No bookings yet' : `No ${filter} bookings`}
            </h3>
            <p className="text-gray-500 mb-6">
              {filter === 'all' 
                ? 'Start exploring amazing places and make your first booking!'
                : `You don't have any ${filter} bookings at the moment.`
              }
            </p>
            {filter === 'all' && (
              <Button onClick={() => window.location.href = '/listings'}>
                Explore Listings
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {getFilteredBookings().map((booking) => {
              const StatusIcon = statusIcons[booking.status];
              
              return (
                <div key={booking.id} className="bg-gray-800 rounded-xl p-6 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Booking Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-xl font-semibold mb-1">{booking.listing_title}</h3>
                          <div className="flex items-center text-gray-400 text-sm">
                            <MapPin className="w-4 h-4 mr-1" />
                            <span>{booking.listing_location}</span>
                          </div>
                        </div>
                        <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm border ${statusColors[booking.status]}`}>
                          <StatusIcon className="w-4 h-4" />
                          <span className="capitalize">{booking.status}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-purple-400" />
                          <div>
                            <span className="text-gray-400">Check-in:</span>
                            <div className="font-medium">{formatDate(booking.start_date)}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-purple-400" />
                          <div>
                            <span className="text-gray-400">Check-out:</span>
                            <div className="font-medium">{formatDate(booking.end_date)}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-purple-400" />
                          <div>
                            <span className="text-gray-400">Duration:</span>
                            <div className="font-medium">{getDuration(booking.start_date, booking.end_date)}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Price & Actions */}
                    <div className="flex flex-col items-end space-y-3">
                      <div className="text-right">
                        <div className="text-2xl font-bold">{formatPrice(booking.total_price)}</div>
                        <div className="text-gray-400 text-sm">Total price</div>
                      </div>

                      <div className="flex space-x-2">
                        {/* Message Host */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.location.href = `/messages?user=${booking.host_id}`}
                          icon={<MessageCircle className="w-4 h-4" />}
                        >
                          Message Host
                        </Button>

                        {/* Cancel Booking */}
                        {canCancelBooking(booking) && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowCancelModal(true);
                            }}
                          >
                            Cancel
                          </Button>
                        )}

                        {/* Review (for completed bookings) */}
                        {booking.status === 'completed' && !booking.reviewed && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => window.location.href = `/listings/${booking.listing_id}?review=true`}
                            icon={<Star className="w-4 h-4" />}
                          >
                            Review
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Booking Timeline/Status Details */}
                  <div className="pt-4 border-t border-gray-700">
                    <div className="text-xs text-gray-400">
                      Booking ID: {booking.id} • 
                      Created: {formatDate(booking.created_at)}
                      {booking.updated_at !== booking.created_at && (
                        <> • Last updated: {formatDate(booking.updated_at)}</>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cancel Booking Modal */}
        <Modal
          isOpen={showCancelModal}
          onClose={() => {
            setShowCancelModal(false);
            setSelectedBooking(null);
            setCancelReason('');
          }}
          title="Cancel Booking"
        >
          <div className="space-y-4">
            <p className="text-gray-400">
              Are you sure you want to cancel your booking for <strong>{selectedBooking?.listing_title}</strong>?
            </p>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reason for cancellation
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please let us know why you're cancelling..."
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
                rows={3}
                required
              />
            </div>

            <div className="text-sm text-gray-400 bg-gray-700 p-3 rounded-lg">
              <strong>Cancellation Policy:</strong> Free cancellation up to 24 hours before check-in. 
              Cancellations made within 24 hours may be subject to fees.
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedBooking(null);
                  setCancelReason('');
                }}
              >
                Keep Booking
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                loading={cancelLoading}
                onClick={handleCancelBooking}
                disabled={!cancelReason.trim()}
              >
                {cancelLoading ? 'Cancelling...' : 'Cancel Booking'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default BookingsPage;