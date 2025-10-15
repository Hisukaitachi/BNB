// src/components/booking/MyBookings.jsx - COMPLETE UPDATED VERSION WITH REFUND INTEGRATION
import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, MapPin, DollarSign, MessageSquare, Star, X, 
  CreditCard, RefreshCw, Eye, Filter, Info, AlertCircle, RotateCcw 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import bookingService, { BOOKING_STATUS } from '../../services/bookingService';
import reviewService from '../../services/reviewService';
import refundService from '../../services/refundService';
import { paymentAPI } from '../../services/api';
import paymentService from '../../services/paymentService';
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
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  // Data fetching
  const loadBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bookingService.getMyBookings();
      
      const formattedBookings = data.map(booking => {
        const formatted = bookingService.formatBookingSummary(booking);
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
  const handleCancelBooking = async (bookingId, reason, shouldRequestRefund) => {
    try {
      setCancelling(true);
      
      // First cancel the booking
      await bookingService.cancelBooking(bookingId, reason);
      
      // Then request refund if selected
      if (shouldRequestRefund) {
        try {
          const result = await refundService.requestRefund(bookingId, reason);
          
          // Show refund breakdown
          const breakdown = result.breakdown;
          alert(
            `✅ Booking Cancelled & Refund Requested!\n\n` +
            `📊 Refund Breakdown:\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `Total Paid: ₱${breakdown.totalPaid.toLocaleString()}\n` +
            `Refund Amount: ₱${breakdown.refundAmount.toLocaleString()} (${breakdown.refundPercentage}%)\n` +
            `Cancellation Fee: ₱${breakdown.deductionAmount.toLocaleString()}\n\n` +
            `📋 Policy: ${breakdown.policyApplied}\n` +
            `⏰ ${breakdown.hoursBeforeCheckIn} hours before check-in\n\n` +
            `✨ Your refund request has been submitted successfully!\n` +
            `An admin will review it shortly.`
          );
        } catch (refundError) {
          console.error('Refund request failed:', refundError);
          alert(
            `⚠️ Booking Cancelled Successfully\n\n` +
            `However, the refund request failed:\n${refundError.message}\n\n` +
            `Please contact support or submit a refund request manually from "My Refunds" section.`
          );
        }
      } else {
        alert('✅ Booking cancelled successfully!');
      }
      
      setShowCancelModal(null);
      await loadBookings();
    } catch (error) {
      console.error('Cancel booking failed:', error);
      alert('❌ Failed to cancel booking: ' + error.message);
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
    
    console.log('💳 Navigating to payment page for booking:', booking.id);
    
    // Navigate to PaymentPage first (to collect customer info)
    navigate('/payment', {
      state: {
        bookingId: booking.id,
        booking: {
          id: booking.id,
          title: booking.title,
          totalPrice: booking.total_price,
          bookingType: booking.booking_type,
          amountCharged: booking.booking_type === 'reserve' 
            ? booking.deposit_amount || Math.round(booking.total_price * 0.5)
            : booking.total_price,
          isDepositPayment: booking.booking_type === 'reserve',
          dates: `${new Date(booking.start_date).toLocaleDateString()} - ${new Date(booking.end_date).toLocaleDateString()}`
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Navigation failed:', error);
    alert('Failed to navigate to payment page: ' + error.message);
  } finally {
    setProcessingPayment(null);
  }
};

  const handleExtendStay = (booking) => {
    navigate(`/listings/${booking.listing_id}`);
  };

  const handleViewRefunds = () => {
    setNavigating(true);
    navigate('/my-refunds');
  };

  // Utility functions
  const needsPayment = (booking) => {
    if (booking.booking_type === 'reserve') {
      if (booking.status === 'approved' && !booking.deposit_paid) {
        return true;
      }
      if (booking.status === 'confirmed' && !booking.remaining_paid && booking.remaining_payment_method === 'platform') {
        const dueDate = booking.payment_due_date ? new Date(booking.payment_due_date) : null;
        const now = new Date();
        if (dueDate && now >= dueDate) {
          return true;
        }
      }
      return false;
    } else {
      return booking.status === 'approved' && !booking.payment_status;
    }
  };
  
  const hasPaymentPending = (booking) => booking.payment_status === 'pending';
  const canExtend = (booking) => booking.status === 'confirmed' || booking.status === 'completed';
  
  // Updated: Allow cancellation for approved, confirmed, and arrived bookings (before completed)
  const canCancel = (booking) => {
    return ['approved', 'confirmed', 'arrived'].includes(booking.status) && 
           booking.status !== 'completed' && 
           booking.status !== 'cancelled';
  };

  // Check if booking has payment that can be refunded
  const hasRefundablePayment = (booking) => {
    if (booking.booking_type === 'reserve') {
      return booking.deposit_paid || booking.remaining_paid;
    }
    return booking.payment_status === 'succeeded';
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
      [BOOKING_STATUS.COMPLETED]: 'bg-purple-100 text-purple-800',
      [BOOKING_STATUS.ARRIVED]: 'bg-teal-100 text-teal-800'
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
    { key: BOOKING_STATUS.ARRIVED, label: 'Arrived' },
    { key: BOOKING_STATUS.COMPLETED, label: 'Completed' },
    { key: BOOKING_STATUS.CANCELLED, label: 'Cancelled' }
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
        
        <div className="flex items-center gap-3">
          {/* View Refunds Button */}
          <Button
            onClick={handleViewRefunds}
            variant="outline"
            size="sm"
            loading={navigating}
            className="border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            My Refunds
          </Button>

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
              Filter
            </Button>
          </div>
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
              onContactHost={() => navigate(`/messages?userId=${booking.host_id}`)}
              onViewReceipt={() => navigate(`/payment/${booking.id}/receipt`)}
              getStatusBadge={getStatusBadge}
              getPaymentStatusBadge={getPaymentStatusBadge}
              needsPayment={needsPayment(booking)}
              hasPaymentPending={hasPaymentPending(booking)}
              canExtend={canExtend(booking)}
              canCancel={canCancel(booking)}
              hasRefundablePayment={hasRefundablePayment(booking)}
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
          onConfirm={handleCancelBooking}
          cancelling={cancelling}
          hasRefundablePayment={hasRefundablePayment(showCancelModal)}
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

// Booking Card Component
const BookingCard = ({ 
  booking, onCancel, onReview, onPayNow, onExtend, onViewDetails, 
  onContactHost, onViewReceipt, getStatusBadge, getPaymentStatusBadge,
  needsPayment, hasPaymentPending, canExtend, canCancel, hasRefundablePayment, processingPayment
}) => {
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
          
          {/* NEW: Show if refund was requested for cancelled bookings */}
          {booking.status === 'cancelled' && booking.has_refund_request && (
            <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 border border-blue-300 font-medium">
              🔄 Refund Requested
            </span>
          )}
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

        {canCancel && (
          <Button
            size="sm"
            variant="outline"
            className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white w-full sm:w-auto"
            onClick={onCancel}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel Booking
          </Button>
        )}
      </div>
    </div>
  );
};

// Cancel Modal Component - ENHANCED WITH IMPROVED REFUND UI
const CancelModal = ({ booking, onClose, onConfirm, cancelling, hasRefundablePayment }) => {
  const [reason, setReason] = useState('');
  const [requestRefund, setRequestRefund] = useState(hasRefundablePayment);

  const handleCancel = async () => {
    if (!reason.trim() || reason.length < 10) {
      alert('Please provide a detailed reason (minimum 10 characters)');
      return;
    }

    // Validate refund request
    if (requestRefund && !hasRefundablePayment) {
      alert('Cannot request refund - no payment was made for this booking');
      return;
    }

    const refundInfo = getPotentialRefund();
    if (requestRefund && refundInfo && refundInfo.refundAmount === 0) {
      const confirmed = window.confirm(
        '⚠️ According to our cancellation policy, you are not eligible for a refund.\n\n' +
        'Policy: No refund after check-in date has passed.\n\n' +
        'Do you still want to proceed with cancellation?'
      );
      if (!confirmed) return;
    }

    await onConfirm(booking.id, reason, requestRefund);
  };

  // Calculate potential refund info
  const getPotentialRefund = () => {
    if (!hasRefundablePayment) return null;

    const now = new Date();
    const checkIn = new Date(booking.start_date);
    const hoursUntilCheckIn = (checkIn - now) / (1000 * 60 * 60);

    let totalPaid = 0;
    if (booking.booking_type === 'reserve') {
      if (booking.deposit_paid) totalPaid += booking.deposit_amount;
      if (booking.remaining_paid) totalPaid += booking.remaining_amount;
    } else {
      totalPaid = booking.total_price;
    }

    let refundPercentage = 0;
    let policy = '';

    if (hoursUntilCheckIn >= 24) {
      refundPercentage = 100;
      policy = 'Full refund (24+ hours before check-in)';
    } else if (hoursUntilCheckIn >= 0) {
      refundPercentage = 50;
      policy = '50% refund (less than 24 hours before check-in)';
    } else {
      refundPercentage = 0;
      policy = 'No refund (after check-in date)';
    }

    const refundAmount = (totalPaid * refundPercentage) / 100;
    const deduction = totalPaid - refundAmount;

    return {
      totalPaid,
      refundAmount,
      deduction,
      refundPercentage,
      policy,
      hoursUntilCheckIn: Math.floor(hoursUntilCheckIn)
    };
  };

  const refundInfo = getPotentialRefund();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Cancel Booking</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white" disabled={cancelling}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-gray-300 mb-4 text-sm">
          Are you sure you want to cancel your booking for <span className="font-semibold text-white">"{booking.title}"</span>?
        </p>
        
        {/* Refund Information */}
        {hasRefundablePayment && refundInfo && (
          <div className="mb-4 bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-lg p-4 border border-purple-600/50">
            <h4 className="text-white font-semibold text-sm mb-3 flex items-center">
              <RotateCcw className="w-4 h-4 mr-2 text-purple-400" />
              Refund Breakdown
            </h4>
            
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-300">Total Paid:</span>
                <span className="text-white font-semibold">₱{refundInfo.totalPaid.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-300">Refund Amount:</span>
                <span className="text-green-400 font-semibold text-base">
                  ₱{refundInfo.refundAmount.toLocaleString()}
                  <span className="text-xs ml-1">({refundInfo.refundPercentage}%)</span>
                </span>
              </div>
              
              {refundInfo.deduction > 0 && (
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-300">Cancellation Fee:</span>
                  <span className="text-red-400 font-semibold">-₱{refundInfo.deduction.toLocaleString()}</span>
                </div>
              )}
              
              <div className="pt-3 mt-2 border-t border-gray-600/50 space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 text-lg leading-none">📋</span>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    {refundInfo.policy}
                  </p>
                </div>
                {refundInfo.hoursUntilCheckIn > 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-blue-400 text-lg leading-none">⏰</span>
                    <p className="text-xs text-gray-300">
                      {refundInfo.hoursUntilCheckIn} hours until check-in
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-2">
            Cancellation Reason <span className="text-red-400">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please provide a detailed reason for cancellation (e.g., change of plans, emergency, etc.)..."
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            rows={3}
            maxLength={500}
            disabled={cancelling}
          />
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-400">
              {reason.length < 10 ? `Minimum 10 characters required` : '✓ Valid reason'}
            </span>
            <span className="text-xs text-gray-400">
              {reason.length}/500
            </span>
          </div>
        </div>

        {/* Refund Request Checkbox */}
        {hasRefundablePayment && refundInfo && (
          <div className="mb-4">
            <label className="flex items-start space-x-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={requestRefund}
                onChange={(e) => setRequestRefund(e.target.checked)}
                className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-2 mt-0.5"
                disabled={cancelling}
              />
              <div className="flex-1">
                <span className="text-sm text-gray-300 font-medium group-hover:text-white transition">
                  Request refund of ₱{refundInfo.refundAmount.toLocaleString()}
                </span>
                <p className={`text-xs mt-1 ${
                  refundInfo.refundPercentage === 100 
                    ? 'text-green-400'
                    : refundInfo.refundPercentage === 50
                      ? 'text-yellow-400'
                      : 'text-red-400'
                }`}>
                  {refundInfo.refundPercentage === 100 
                    ? '✅ Full refund eligible - cancelled more than 24 hours before check-in'
                    : refundInfo.refundPercentage === 50
                      ? '⚠️ 50% refund - cancelled less than 24 hours before check-in'
                      : '❌ No refund available - cancelled after check-in date'
                  }
                </p>
              </div>
            </label>
          </div>
        )}
        
        {/* Warning Box */}
        <div className={`rounded-lg p-3 mb-4 ${
          hasRefundablePayment 
            ? 'bg-blue-900/20 border border-blue-600' 
            : 'bg-yellow-900/20 border border-yellow-600'
        }`}>
          <div className="flex items-start">
            <AlertCircle className={`w-5 h-5 mr-2 mt-0.5 flex-shrink-0 ${
              hasRefundablePayment ? 'text-blue-400' : 'text-yellow-400'
            }`} />
            <div>
              <p className={`text-xs leading-relaxed ${
                hasRefundablePayment ? 'text-blue-300' : 'text-yellow-300'
              }`}>
                {hasRefundablePayment 
                  ? '💡 Your refund request will be reviewed by admin and processed within 2-5 business days. Funds will be returned via PayMongo to your original payment method within 5-10 business days after approval.'
                  : '⚠️ This booking has no payment on record. Once cancelled, it cannot be restored. Please ensure you want to proceed.'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1 border-gray-600 text-gray-300 hover:border-gray-500 hover:text-white" 
            onClick={onClose}
            disabled={cancelling}
          >
            Keep Booking
          </Button>
          <Button 
            variant="gradient" 
            className="flex-1 bg-red-600 hover:bg-red-700" 
            loading={cancelling} 
            onClick={handleCancel}
            disabled={!reason.trim() || reason.length < 10 || cancelling}
          >
            {cancelling ? 'Cancelling...' : (
              hasRefundablePayment && requestRefund ? 'Cancel & Request Refund' : 'Cancel Booking'
            )}
          </Button>
        </div>

        {/* Additional Info */}
        {!cancelling && (
          <p className="text-xs text-gray-400 text-center mt-4">
            This action cannot be undone. Please review carefully before proceeding.
          </p>
        )}
      </div>
    </div>
  );
};

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
          <button onClick={onClose} className="text-gray-400 hover:text-white" disabled={submitting}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star Rating */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="text-2xl transition-transform hover:scale-110 focus:outline-none"
                  disabled={submitting}
                >
                  {star <= rating ? (
                    <Star className="w-8 h-8 fill-yellow-400 text-yellow-400" />
                  ) : (
                    <Star className="w-8 h-8 text-gray-600 hover:text-gray-500" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {rating === 5 && '⭐ Excellent'}
              {rating === 4 && '👍 Very Good'}
              {rating === 3 && '😊 Good'}
              {rating === 2 && '😐 Fair'}
              {rating === 1 && '👎 Poor'}
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Your Review</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience about the property, host, cleanliness, location, etc..."
              rows={4}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              maxLength={500}
              disabled={submitting}
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-400">
                {comment.length < 10 ? 'Minimum 10 characters' : '✓ Valid review'}
              </span>
              <span className="text-xs text-gray-400">
                {comment.length}/500
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1 border-gray-600 text-gray-300" 
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="gradient" 
              className="flex-1" 
              loading={submitting}
              disabled={comment.length < 10 || submitting}
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