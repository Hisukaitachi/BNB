// src/components/booking/MyBookings.jsx - Updated with Reserve Payment Details
import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, MapPin, DollarSign, MessageSquare, Star, X, 
  CreditCard, RefreshCw, Eye, Filter, Info, AlertCircle 
} from 'lucide-react';
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
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(null);

  useEffect(() => {
    loadBookings();
  }, []);

  // Data fetching
const loadBookings = async () => {
  try {
    setLoading(true);
    setError(null);
    const data = await bookingService.getMyBookings();
    
    // Debug: Check what data we're getting
    console.log('Raw booking data:', data);
    
    const formattedBookings = data.map(booking => {
      const formatted = bookingService.formatBookingSummary(booking);
      
      // Debug: Check reservation fields
      if (booking.booking_type === 'reserve') {
        console.log('Reserve booking fields:', {
          booking_type: formatted.booking_type,
          deposit_amount: formatted.deposit_amount,
          remaining_amount: formatted.remaining_amount,
          deposit_paid: formatted.deposit_paid,
          remaining_paid: formatted.remaining_paid,
          remaining_payment_method: formatted.remaining_payment_method
        });
      }
      
      return formatted;
    });
    
    setBookings(formattedBookings);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
  // Action handlers
  const handleCancelBooking = async (bookingId, reason = 'User requested cancellation') => {
    try {
      setCancelling(true);
      await bookingService.cancelBooking(bookingId, reason);
      await loadBookings();
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
      await loadBookings();
    } catch (error) {
      alert('Failed to submit review: ' + error.message);
    }
  };

  const handlePayNow = async (booking) => {
    try {
      setProcessingPayment(booking.id);
      
      // Determine payment amount based on booking type and payment status
      let paymentAmount = booking.total_price;
      let paymentType = 'full';
      
      if (booking.booking_type === 'reserve') {
        if (!booking.deposit_paid) {
          paymentAmount = booking.deposit_amount;
          paymentType = 'deposit';
        } else if (!booking.remaining_paid && booking.remaining_payment_method === 'platform') {
          paymentAmount = booking.remaining_amount;
          paymentType = 'remaining';
        }
      }
      
      const response = await paymentAPI.createPaymentIntent(booking.id);
      
      if (response.data.status === 'success') {
        navigate('/payment', {
          state: {
            bookingId: booking.id,
            paymentIntent: response.data.data.paymentIntent,
            booking: response.data.data.booking,
            paymentType,
            paymentAmount
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

  const handleExtendStay = (booking) => {
    navigate(`/listings/${booking.listing_id}`);
  };

  // Utility functions
  const needsPayment = (booking) => {
    if (booking.booking_type === 'reserve') {
      // Check if deposit needs to be paid
      if (booking.status === 'approved' && !booking.deposit_paid) {
        return true;
      }
      // Check if remaining needs to be paid through platform
      if (booking.status === 'confirmed' && !booking.remaining_paid && booking.remaining_payment_method === 'platform') {
        // Check if payment is due (3 days before check-in)
        const dueDate = booking.payment_due_date ? new Date(booking.payment_due_date) : null;
        const now = new Date();
        if (dueDate && now >= dueDate) {
          return true;
        }
      }
      return false;
    } else {
      // Full booking - needs payment if approved and not paid
      return booking.status === 'approved' && !booking.payment_status;
    }
  };
  
  const hasPaymentPending = (booking) => booking.payment_status === 'pending';
  const canExtend = (booking) => booking.status === 'confirmed' || booking.status === 'completed';

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

  const getPaymentStatusBadge = (booking) => {
    if (booking.booking_type === 'reserve') {
      if (booking.deposit_paid && booking.remaining_paid) {
        return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 ml-2">Fully Paid</span>;
      }
      if (booking.deposit_paid && !booking.remaining_paid) {
        return <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 ml-2">Deposit Paid</span>;
      }
      if (!booking.deposit_paid && booking.status === 'approved') {
        return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 ml-2">Deposit Required</span>;
      }
    } else {
      if (hasPaymentPending(booking)) {
        return <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800 ml-2">Payment Pending</span>;
      }
      if (booking.payment_status === 'succeeded') {
        return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 ml-2">Paid</span>;
      }
      if (needsPayment(booking)) {
        return <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 ml-2">Payment Required</span>;
      }
    }
    return null;
  };

  const filterOptions = [
    { key: 'all', label: 'All' },
    { key: BOOKING_STATUS.PENDING, label: 'Pending' },
    { key: BOOKING_STATUS.APPROVED, label: 'Approved' },
    { key: BOOKING_STATUS.CONFIRMED, label: 'Confirmed' },
    { key: BOOKING_STATUS.COMPLETED, label: 'Completed' }
  ];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={loadBookings} variant="gradient">Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">My Bookings</h1>
        
        {/* Desktop Filter Tabs */}
        <div className="hidden md:flex space-x-2">
          {filterOptions.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-2 rounded-lg text-sm transition ${
                filter === key
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Mobile Filter Button */}
        <div className="md:hidden">
          <Button
            onClick={() => setShowMobileFilter(true)}
            variant="outline"
            size="sm"
            className="border-gray-600"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filter ({filter === 'all' ? 'All' : filter})
          </Button>
        </div>
      </div>

      {/* Mobile Filter Modal */}
      {showMobileFilter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Filter Bookings</h3>
              <button onClick={() => setShowMobileFilter(false)} className="text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {filterOptions.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => {
                    setFilter(key);
                    setShowMobileFilter(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg transition ${
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
        </div>
      )}

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No bookings found</h3>
          <p className="text-gray-400">
            {filter === 'all' ? 'You haven\'t made any bookings yet.' : `No ${filter} bookings.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onCancel={() => setShowCancelModal(booking)}
              onReview={() => setShowReviewModal(booking)}
              onPayNow={() => handlePayNow(booking)}
              onExtend={() => handleExtendStay(booking)}
              onViewDetails={() => navigate(`/listings/${booking.listing_id}`)}
              onContactHost={() => window.open(`/messages?host=${booking.host_id}`, '_blank')}
              onViewReceipt={() => navigate(`/payment/${booking.id}/receipt`)}
              getStatusBadge={getStatusBadge}
              getPaymentStatusBadge={getPaymentStatusBadge}
              needsPayment={needsPayment(booking)}
              hasPaymentPending={hasPaymentPending(booking)}
              canExtend={canExtend(booking)}
              processingPayment={processingPayment === booking.id}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showCancelModal && (
        <CancelModal
          booking={showCancelModal}
          onClose={() => setShowCancelModal(null)}
          onConfirm={(bookingId) => handleCancelBooking(bookingId)}
          cancelling={cancelling}
        />
      )}

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

// Booking Card Component - UPDATED with reservation details
const BookingCard = ({ 
  booking, onCancel, onReview, onPayNow, onExtend, onViewDetails, 
  onContactHost, onViewReceipt, getStatusBadge, getPaymentStatusBadge,
  needsPayment, hasPaymentPending, canExtend, processingPayment
}) => {
  // Determine what payment is needed for reservations
  const getPaymentInfo = () => {
    if (booking.booking_type === 'reserve') {
      if (!booking.deposit_paid && booking.status === 'approved') {
        return {
          type: 'deposit',
          amount: booking.deposit_amount,
          message: 'Pay 50% deposit to confirm your reservation'
        };
      }
      if (booking.deposit_paid && !booking.remaining_paid && booking.remaining_payment_method === 'platform') {
        const dueDate = booking.payment_due_date ? new Date(booking.payment_due_date) : null;
        const now = new Date();
        const isDue = dueDate && now >= dueDate;
        
        return {
          type: 'remaining',
          amount: booking.remaining_amount,
          message: isDue ? 'Remaining balance due now' : `Remaining balance due ${dueDate?.toLocaleDateString()}`,
          isDue
        };
      }
    }
    return null;
  };

  const paymentInfo = getPaymentInfo();

  return (
    <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-3">
        <div className="flex-1">
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">{booking.title}</h3>
          <div className="flex items-center text-gray-400 text-sm">
            <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
            <span>Hosted by {booking.host_name}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(booking.status)}`}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </span>
          {booking.booking_type === 'reserve' && (
            <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800 font-medium">
              Reserve
            </span>
          )}
          {getPaymentStatusBadge(booking)}
        </div>
      </div>

      {/* Payment Alerts for Reservations */}
      {booking.booking_type === 'reserve' && paymentInfo && (
        <div className={`border rounded-lg p-3 mb-4 ${
          paymentInfo.type === 'deposit' 
            ? 'bg-orange-900/20 border-orange-600' 
            : paymentInfo.isDue 
              ? 'bg-red-900/20 border-red-600'
              : 'bg-blue-900/20 border-blue-600'
        }`}>
          <div className="flex items-start">
            <CreditCard className={`w-5 h-5 mr-3 mt-0.5 flex-shrink-0 ${
              paymentInfo.type === 'deposit' 
                ? 'text-orange-400' 
                : paymentInfo.isDue 
                  ? 'text-red-400'
                  : 'text-blue-400'
            }`} />
            <div>
              <p className={`font-medium text-sm ${
                paymentInfo.type === 'deposit' 
                  ? 'text-orange-400' 
                  : paymentInfo.isDue 
                    ? 'text-red-400'
                    : 'text-blue-400'
              }`}>
                {paymentInfo.type === 'deposit' ? 'Deposit Required' : 'Remaining Payment'}
              </p>
              <p className={`text-xs mt-1 ${
                paymentInfo.type === 'deposit' 
                  ? 'text-orange-300' 
                  : paymentInfo.isDue 
                    ? 'text-red-300'
                    : 'text-blue-300'
              }`}>
                {paymentInfo.message}
              </p>
              <p className="text-white font-semibold text-sm mt-2">
                Amount due: ₱{Number(paymentInfo.amount).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reservation Payment Breakdown */}
      {booking.booking_type === 'reserve' && (
        <div className="bg-gray-700/50 rounded-lg p-3 mb-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Total Amount:</span>
              <span className="text-white font-medium">₱{Number(booking.total_price).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Deposit (50%):</span>
              <div className="flex items-center gap-2">
                <span className="text-white">₱{Number(booking.deposit_amount || 0).toLocaleString()}</span>
                {booking.deposit_paid ? (
                  <span className="text-green-400 text-xs">✓ Paid</span>
                ) : (
                  <span className="text-yellow-400 text-xs">Pending</span>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Remaining (50%):</span>
              <div className="flex items-center gap-2">
                <span className="text-white">₱{Number(booking.remaining_amount || 0).toLocaleString()}</span>
                {booking.remaining_paid ? (
                  <span className="text-green-400 text-xs">✓ Paid</span>
                ) : (
                  <span className="text-gray-400 text-xs">
                    {booking.remaining_payment_method === 'personal' ? '🤝 Pay to host' : '💳 Pay via platform'}
                  </span>
                )}
              </div>
            </div>
            
            {/* Payment method indicator */}
            {booking.remaining_payment_method && !booking.remaining_paid && (
              <div className={`mt-2 pt-2 border-t border-gray-600 flex items-center gap-2 ${
                booking.remaining_payment_method === 'personal' 
                  ? 'text-yellow-400' 
                  : 'text-blue-400'
              }`}>
                <Info className="w-4 h-4" />
                <span className="text-xs">
                  {booking.remaining_payment_method === 'personal' 
                    ? 'Remaining payment should be made directly to the host' 
                    : 'Remaining payment will be collected through the platform 3 days before check-in'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Standard Payment Alert for Full Bookings */}
      {booking.booking_type !== 'reserve' && needsPayment && (
        <div className="bg-orange-900/20 border border-orange-600 rounded-lg p-3 mb-4">
          <div className="flex items-start">
            <CreditCard className="w-5 h-5 text-orange-400 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-orange-400 font-medium text-sm">Payment Required</p>
              <p className="text-orange-300 text-xs mt-1">Your booking has been approved! Complete payment to confirm.</p>
            </div>
          </div>
        </div>
      )}

      {hasPaymentPending && (
        <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3 mb-4">
          <div className="flex items-start">
            <Clock className="w-5 h-5 text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-blue-400 font-medium text-sm">Payment Processing</p>
              <p className="text-blue-300 text-xs mt-1">Your payment is being processed.</p>
            </div>
          </div>
        </div>
      )}

      {/* Booking Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6 text-sm">
        <div className="flex items-center text-gray-300">
          <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="truncate">{booking.formattedDates}</span>
        </div>
        <div className="flex items-center text-gray-300">
          <DollarSign className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="truncate">{booking.formattedPrice}</span>
        </div>
        <div className="flex items-center text-gray-300">
          <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="truncate">Booking #{booking.id}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button size="sm" variant="outline" className="border-gray-600 text-gray-300" onClick={onContactHost}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Contact
          </Button>
          
          <Button size="sm" variant="outline" className="border-purple-500 text-purple-400" onClick={onViewDetails}>
            <Eye className="w-4 h-4 mr-2" />
            Details
          </Button>
          
          {booking.canReview && (
            <Button size="sm" variant="gradient" onClick={onReview}>
              <Star className="w-4 h-4 mr-2" />
              Review
            </Button>
          )}

          {/* Dynamic Pay Now button for reservations */}
          {booking.booking_type === 'reserve' && paymentInfo && (
            <Button 
              size="sm" 
              variant="gradient" 
              loading={processingPayment}
              onClick={onPayNow}
              className={paymentInfo.isDue ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Pay ₱{Number(paymentInfo.amount).toLocaleString()}
            </Button>
          )}

          {/* Standard Pay Now for full bookings */}
          {booking.booking_type !== 'reserve' && needsPayment && (
            <Button 
              size="sm" 
              variant="gradient" 
              loading={processingPayment}
              onClick={onPayNow}
              className="bg-green-600 hover:bg-green-700"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Pay Now
            </Button>
          )}

          {canExtend && (
            <Button size="sm" variant="gradient" onClick={onExtend} className="bg-blue-600 hover:bg-blue-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Extend
            </Button>
          )}

          {((booking.booking_type === 'reserve' && booking.deposit_paid) || booking.payment_status === 'succeeded') && (
            <Button size="sm" variant="outline" className="border-green-600 text-green-400" onClick={onViewReceipt}>
              <CreditCard className="w-4 h-4 mr-2" />
              Receipt
            </Button>
          )}
        </div>

        {booking.canCancel && (
          <Button
            size="sm"
            variant="outline"
            className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white w-full sm:w-auto"
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
};

// Cancel Modal Component
const CancelModal = ({ booking, onClose, onConfirm, cancelling }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Cancel Booking</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <p className="text-gray-300 mb-4 text-sm">
        Are you sure you want to cancel your booking for "{booking.title}"?
      </p>
      
      <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-3 mb-4">
        <p className="text-yellow-400 text-xs">
          ⚠️ Cancellation policies may apply. Please review the terms before cancelling.
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 border-gray-600 text-gray-300" onClick={onClose}>
          Keep Booking
        </Button>
        <Button variant="gradient" className="flex-1" loading={cancelling} onClick={() => onConfirm(booking.id)}>
          Cancel Booking
        </Button>
      </div>
    </div>
  </div>
);

// Review Modal Component
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Review Your Stay</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Your Review</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              rows={4}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 text-sm"
              maxLength={500}
            />
            <div className="text-right text-xs text-gray-400 mt-1">
              {comment.length}/500
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1 border-gray-600 text-gray-300" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="gradient" className="flex-1" loading={submitting}>
              Submit Review
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MyBookings;