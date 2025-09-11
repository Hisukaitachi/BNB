// src/components/booking/MyBookings.jsx - Updated with Pay Now functionality
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, DollarSign, MessageSquare, Star, X, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import bookingService, { BOOKING_STATUS } from '../../services/bookingService';
import reviewService from '../../services/reviewService';
import { paymentAPI } from '../../services/api';
import Button from '../../components/ui/Button';

const MyBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showCancelModal, setShowCancelModal] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(null); // Track which booking is being processed for payment

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bookingService.getMyBookings();
      const formattedBookings = data.map(booking => bookingService.formatBookingSummary(booking));
      setBookings(formattedBookings);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId, reason = 'User requested cancellation') => {
    try {
      setCancelling(true);
      await bookingService.cancelBooking(bookingId, reason);
      await loadBookings(); // Refresh bookings
      setShowCancelModal(null);
    } catch (error) {
      alert('Failed to cancel booking: ' + error.message);
    } finally {
      setCancelling(false);
    }
  };

  const handleSubmitReview = async (reviewData) => {
    try {
      await reviewService.createReview(reviewData);
      setShowReviewModal(null);
      alert('Review submitted successfully!');
      await loadBookings(); // Refresh to update review status
    } catch (error) {
      alert('Failed to submit review: ' + error.message);
    }
  };

  // NEW: Handle payment initiation for approved bookings
  const handlePayNow = async (booking) => {
    try {
      setProcessingPayment(booking.id);
      
      // Create payment intent
      const response = await paymentAPI.createPaymentIntent(booking.id);
      
      if (response.data.status === 'success') {
        // Navigate to payment page with the payment intent data
        navigate('/payment', {
          state: {
            bookingId: booking.id,
            paymentIntent: response.data.data.paymentIntent,
            booking: response.data.data.booking
          }
        });
      } else {
        throw new Error('Failed to create payment intent');
      }
    } catch (error) {
      console.error('Payment initiation failed:', error);
      alert('Failed to initiate payment: ' + error.message);
    } finally {
      setProcessingPayment(null);
    }
  };

  // NEW: Check if booking needs payment
  const needsPayment = (booking) => {
    return booking.status === 'approved' && !booking.payment_status;
  };

  // NEW: Check if payment is pending
  const hasPaymentPending = (booking) => {
    return booking.payment_status === 'pending';
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    return booking.status === filter;
  });

  const getStatusBadge = (status) => {
    const configs = {
      [BOOKING_STATUS.PENDING]: 'bg-yellow-100 text-yellow-800',
      [BOOKING_STATUS.APPROVED]: 'bg-green-100 text-green-800',
      [BOOKING_STATUS.CONFIRMED]: 'bg-blue-100 text-blue-800',
      [BOOKING_STATUS.REJECTED]: 'bg-red-100 text-red-800',
      [BOOKING_STATUS.CANCELLED]: 'bg-gray-100 text-gray-800',
      [BOOKING_STATUS.COMPLETED]: 'bg-purple-100 text-purple-800'
    };
    
    return configs[status] || 'bg-gray-100 text-gray-800';
  };

  // NEW: Get payment status badge
  const getPaymentStatusBadge = (booking) => {
    if (hasPaymentPending(booking)) {
      return <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800 ml-2">Payment Pending</span>;
    }
    if (booking.payment_status === 'succeeded') {
      return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 ml-2">Paid</span>;
    }
    if (needsPayment(booking)) {
      return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 ml-2">Payment Required</span>;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={loadBookings} variant="gradient">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">My Bookings</h1>
        
        {/* Filter Tabs */}
        <div className="flex space-x-2">
          {[
            { key: 'all', label: 'All' },
            { key: BOOKING_STATUS.PENDING, label: 'Pending' },
            { key: BOOKING_STATUS.APPROVED, label: 'Approved' },
            { key: BOOKING_STATUS.CONFIRMED, label: 'Confirmed' },
            { key: BOOKING_STATUS.COMPLETED, label: 'Completed' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-lg transition ${
                filter === key
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filteredBookings.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No bookings found</h3>
          <p className="text-gray-400">
            {filter === 'all' ? 'You haven\'t made any bookings yet.' : `No ${filter} bookings.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <div key={booking.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">{booking.title}</h3>
                  <div className="flex items-center text-gray-400 text-sm">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>Hosted by {booking.host_name}</span>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(booking.status)}`}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                  {getPaymentStatusBadge(booking)}
                </div>
              </div>

              {/* NEW: Payment Required Alert */}
              {needsPayment(booking) && (
                <div className="bg-orange-900/20 border border-orange-600 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <CreditCard className="w-5 h-5 text-orange-400 mr-3" />
                    <div>
                      <p className="text-orange-400 font-medium">Payment Required</p>
                      <p className="text-orange-300 text-sm">Your booking has been approved! Complete payment to confirm your reservation.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* NEW: Payment Pending Alert */}
              {hasPaymentPending(booking) && (
                <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 text-blue-400 mr-3" />
                    <div>
                      <p className="text-blue-400 font-medium">Payment Processing</p>
                      <p className="text-blue-300 text-sm">Your payment is being processed. You'll receive confirmation shortly.</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="flex items-center text-gray-300">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>{booking.formattedDates}</span>
                </div>
                <div className="flex items-center text-gray-300">
                  <DollarSign className="w-4 h-4 mr-2" />
                  <span>{booking.formattedPrice}</span>
                </div>
                <div className="flex items-center text-gray-300">
                  <Clock className="w-4 h-4 mr-2" />
                  <span>Booking #{booking.id}</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex space-x-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-gray-600 text-gray-300"
                    onClick={() => window.open(`/messages?host=${booking.host_id}`, '_blank')}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Contact Host
                  </Button>
                  
                  {booking.canReview && (
                    <Button
                      size="sm"
                      variant="gradient"
                      onClick={() => setShowReviewModal(booking)}
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Leave Review
                    </Button>
                  )}

                  {/* NEW: Pay Now Button */}
                  {needsPayment(booking) && (
                    <Button
                      size="sm"
                      variant="gradient"
                      loading={processingPayment === booking.id}
                      onClick={() => handlePayNow(booking)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      {processingPayment === booking.id ? 'Processing...' : 'Pay Now'}
                    </Button>
                  )}

                  {/* NEW: View Payment Button for paid bookings */}
                  {booking.payment_status === 'succeeded' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-600 text-green-400"
                      onClick={() => navigate(`/payment/${booking.id}/receipt`)}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      View Receipt
                    </Button>
                  )}
                </div>

                {booking.canCancel && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                    onClick={() => setShowCancelModal(booking)}
                  >
                    Cancel Booking
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancel Booking Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Cancel Booking</h3>
              <button 
                onClick={() => setShowCancelModal(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-gray-300 mb-4">
              Are you sure you want to cancel your booking for "{showCancelModal.title}"?
            </p>
            
            <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-3 mb-4">
              <p className="text-yellow-400 text-sm">
                ⚠️ Cancellation policies may apply. Please review the terms before cancelling.
              </p>
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300"
                onClick={() => setShowCancelModal(null)}
              >
                Keep Booking
              </Button>
              <Button
                variant="gradient"
                className="flex-1"
                loading={cancelling}
                onClick={() => handleCancelBooking(showCancelModal.id)}
              >
                Cancel Booking
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <ReviewModal 
          booking={showReviewModal}
          onSubmit={handleSubmitReview}
          onClose={() => setShowReviewModal(null)}
        />
      )}
    </div>
  );
};

// Review Modal Component (unchanged)
const ReviewModal = ({ booking, onSubmit, onClose }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (comment.length < 10) {
      alert('Please provide at least 10 characters in your review');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        booking_id: booking.id,
        reviewee_id: booking.host_id,
        rating,
        comment,
        type: 'host'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Review Your Stay</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Overall Rating</label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-600'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Your Review</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with other travelers..."
              rows={4}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
              maxLength={500}
            />
            <div className="text-right text-sm text-gray-400 mt-1">
              {comment.length}/500
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gradient"
              className="flex-1"
              loading={submitting}
            >
              Submit Review
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MyBookings;