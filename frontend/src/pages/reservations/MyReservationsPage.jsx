// frontend/src/pages/reservations/MyReservations.jsx - Complete Final Version
import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, MapPin, DollarSign, MessageSquare, Star, X, 
  CreditCard, RefreshCw, Eye, Filter, AlertCircle, CheckCircle,
  User, Phone, Mail, Home, Loader
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import reservationService, { RESERVATION_STATUS } from '../../services/reservationService';
import reviewService from '../../services/reviewService';
import Button from '../../components/ui/Button';

const MyReservations = () => {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showCancelModal, setShowCancelModal] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(null);
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      else setRefreshing(true);
      
      setError(null);
      const result = await reservationService.getMyReservations();
      
      if (result.success) {
        const formattedReservations = result.data.reservations.map(reservation => 
          reservationService.formatReservationSummary(reservation)
        );
        setReservations(formattedReservations);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message || 'Failed to load reservations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCancelReservation = async (reservationId, reason = 'User requested cancellation') => {
    try {
      setCancelling(true);
      const result = await reservationService.cancelReservation(reservationId, reason);
      
      if (result.success) {
        await loadReservations(false);
        setShowCancelModal(null);
        
        // Show cancellation details with refund info
        if (result.data.cancellationDetails) {
          const details = result.data.cancellationDetails;
          const refundInfo = details.refundAmount > 0 
            ? `\n\nRefund Details:\n- Cancellation Fee: ₱${details.cancellationFee.toLocaleString()}\n- Refund Amount: ₱${details.refundAmount.toLocaleString()}\n- Processing Time: 5-10 business days`
            : '\n\nNo refund applicable based on cancellation policy.';
          
          alert(`Reservation cancelled successfully!${refundInfo}`);
        } else {
          alert('Reservation cancelled successfully!');
        }
      } else {
        alert('Failed to cancel reservation: ' + result.error);
      }
    } catch (error) {
      alert('Failed to cancel reservation: ' + error.message);
    } finally {
      setCancelling(false);
    }
  };

  const handleSubmitReview = async (reviewData) => {
    try {
      await reviewService.createReview(reviewData);
      setShowReviewModal(null);
      alert('Review submitted successfully! Thank you for your feedback.');
      await loadReservations(false);
    } catch (error) {
      alert('Failed to submit review: ' + error.message);
    }
  };

  const handlePayRemaining = (reservation) => {
    navigate(`/reservations/${reservation.id}/payment`, {
      state: {
        reservationId: reservation.id,
        amount: reservation.remaining_amount,
        listingTitle: reservation.listing_title,
        dates: reservation.formattedDates,
        paymentType: 'remaining'
      }
    });
  };

  const handlePayDeposit = (reservation) => {
    navigate(`/reservations/${reservation.id}/payment`, {
      state: {
        reservationId: reservation.id,
        amount: reservation.deposit_amount,
        listingTitle: reservation.listing_title,
        dates: reservation.formattedDates,
        paymentType: 'deposit'
      }
    });
  };

  const handleContactHost = (reservation) => {
    navigate(`/messages?host=${reservation.host_id}`);
  };

  const handleViewDetails = (reservation) => {
    navigate(`/listings/${reservation.listing_id}`);
  };

  const handleViewReceipt = (reservation) => {
    navigate(`/reservations/${reservation.id}/receipt`);
  };

  const filteredReservations = reservations.filter(reservation => {
    if (filter === 'all') return true;
    if (filter === 'needs_action') {
      return reservation.status === RESERVATION_STATUS.AWAITING_PAYMENT || 
             (reservation.status === RESERVATION_STATUS.CONFIRMED && !reservation.full_amount_paid);
    }
    return reservation.status === filter;
  });

  const filterOptions = [
    { key: 'all', label: 'All', count: reservations.length },
    { key: 'needs_action', label: 'Needs Action', count: reservations.filter(r => 
      r.status === RESERVATION_STATUS.AWAITING_PAYMENT || 
      (r.status === RESERVATION_STATUS.CONFIRMED && !r.full_amount_paid)
    ).length },
    { key: RESERVATION_STATUS.PENDING, label: 'Pending', count: reservations.filter(r => r.status === RESERVATION_STATUS.PENDING).length },
    { key: RESERVATION_STATUS.AWAITING_PAYMENT, label: 'Awaiting Payment', count: reservations.filter(r => r.status === RESERVATION_STATUS.AWAITING_PAYMENT).length },
    { key: RESERVATION_STATUS.CONFIRMED, label: 'Confirmed', count: reservations.filter(r => r.status === RESERVATION_STATUS.CONFIRMED).length },
    { key: RESERVATION_STATUS.COMPLETED, label: 'Completed', count: reservations.filter(r => r.status === RESERVATION_STATUS.COMPLETED).length },
    { key: RESERVATION_STATUS.CANCELLED, label: 'Cancelled', count: reservations.filter(r => r.status === RESERVATION_STATUS.CANCELLED).length }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-64">
            <div className="text-center">
              <Loader className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading your reservations...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Failed to load reservations</h3>
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={() => loadReservations()} variant="gradient">Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-20">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">My Reservations</h1>
            <p className="text-gray-400">Manage your property reservations</p>
          </div>
          
          <div className="flex gap-2">
            {/* Desktop Filter Tabs */}
            <div className="hidden md:flex space-x-2">
              {filterOptions.map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-3 py-2 rounded-lg text-sm transition relative ${
                    filter === key
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {label}
                  {count > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-white/20 rounded-full">
                      {count}
                    </span>
                  )}
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
                Filter ({filterOptions.find(o => o.key === filter)?.label || 'All'})
              </Button>
            </div>
            
            {/* Refresh Button */}
            <Button
              onClick={() => loadReservations(false)}
              variant="outline"
              size="sm"
              className="border-gray-600"
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Mobile Filter Modal */}
        {showMobileFilter && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Filter Reservations</h3>
                <button onClick={() => setShowMobileFilter(false)} className="text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2">
                {filterOptions.map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setFilter(key);
                      setShowMobileFilter(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg transition flex justify-between items-center ${
                      filter === key
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <span>{label}</span>
                    {count > 0 && (
                      <span className="px-2 py-0.5 text-xs bg-white/20 rounded-full">
                        {count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Reservations List */}
        {filteredReservations.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No reservations found</h3>
            <p className="text-gray-400 mb-6">
              {filter === 'all' ? 'You haven\'t made any reservations yet.' : `No ${filterOptions.find(o => o.key === filter)?.label.toLowerCase()} reservations.`}
            </p>
            <Button onClick={() => navigate('/listings')} variant="gradient">
              Browse Properties
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredReservations.map((reservation) => (
              <ReservationCard
                key={reservation.id}
                reservation={reservation}
                onCancel={() => setShowCancelModal(reservation)}
                onReview={() => setShowReviewModal(reservation)}
                onPayDeposit={() => handlePayDeposit(reservation)}
                onPayRemaining={() => handlePayRemaining(reservation)}
                onContactHost={() => handleContactHost(reservation)}
                onViewDetails={() => handleViewDetails(reservation)}
                onViewReceipt={() => handleViewReceipt(reservation)}
              />
            ))}
          </div>
        )}

        {/* Cancel Modal */}
        {showCancelModal && (
          <CancelReservationModal
            reservation={showCancelModal}
            onClose={() => setShowCancelModal(null)}
            onConfirm={(reservationId, reason) => handleCancelReservation(reservationId, reason)}
            cancelling={cancelling}
          />
        )}

        {/* Review Modal */}
        {showReviewModal && (
          <ReviewModal 
            reservation={showReviewModal}
            onSubmit={handleSubmitReview}
            onClose={() => setShowReviewModal(null)}
          />
        )}
      </div>
    </div>
  );
};

// Reservation Card Component
const ReservationCard = ({ 
  reservation, onCancel, onReview, onPayDeposit, onPayRemaining, 
  onContactHost, onViewDetails, onViewReceipt
}) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case RESERVATION_STATUS.CONFIRMED:
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case RESERVATION_STATUS.AWAITING_PAYMENT:
        return <CreditCard className="w-4 h-4 text-blue-400" />;
      case RESERVATION_STATUS.PENDING:
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case RESERVATION_STATUS.CANCELLED:
        return <X className="w-4 h-4 text-red-400" />;
      case RESERVATION_STATUS.COMPLETED:
        return <Star className="w-4 h-4 text-purple-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusMessage = (reservation) => {
    switch (reservation.status) {
      case RESERVATION_STATUS.PENDING:
        return 'Waiting for host approval';
      case RESERVATION_STATUS.AWAITING_PAYMENT:
        return `Deposit payment required: ₱${reservation.deposit_amount?.toLocaleString()}`;
      case RESERVATION_STATUS.CONFIRMED:
        return reservation.full_amount_paid 
          ? 'Fully paid and confirmed' 
          : `Remaining payment due: ₱${reservation.remaining_amount?.toLocaleString()}`;
      case RESERVATION_STATUS.COMPLETED:
        return 'Stay completed - How was your experience?';
      case RESERVATION_STATUS.CANCELLED:
        return 'Reservation cancelled';
      case RESERVATION_STATUS.DECLINED:
        return 'Host declined this reservation';
      default:
        return '';
    }
  };

  const needsDepositPayment = reservation.status === RESERVATION_STATUS.AWAITING_PAYMENT && !reservation.deposit_paid;
  const needsRemainingPayment = reservation.status === RESERVATION_STATUS.CONFIRMED && !reservation.full_amount_paid;
  const isFullyPaid = reservation.deposit_paid && reservation.full_amount_paid;

  return (
    <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700 hover:border-gray-600 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg sm:text-xl font-semibold text-white">{reservation.listing_title}</h3>
            {(needsDepositPayment || needsRemainingPayment) && (
              <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500 text-white animate-pulse">
                ACTION NEEDED
              </span>
            )}
          </div>
          <div className="flex items-center text-gray-400 text-sm mb-1">
            <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
            <span>{reservation.listing_location || 'Location not specified'}</span>
          </div>
          <div className="flex items-center text-gray-400 text-sm">
            <User className="w-4 h-4 mr-1 flex-shrink-0" />
            <span>Hosted by {reservation.host_name || 'Host'}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${reservation.statusColor}`}>
            {getStatusIcon(reservation.status)}
            <span className="ml-1">{reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}</span>
          </span>
        </div>
      </div>

      {/* Status Message */}
      {getStatusMessage(reservation) && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          reservation.status === RESERVATION_STATUS.AWAITING_PAYMENT ? 'bg-blue-900/20 border border-blue-600 text-blue-400' :
          reservation.status === RESERVATION_STATUS.PENDING ? 'bg-yellow-900/20 border border-yellow-600 text-yellow-400' :
          reservation.status === RESERVATION_STATUS.CONFIRMED ? 'bg-green-900/20 border border-green-600 text-green-400' :
          reservation.status === RESERVATION_STATUS.COMPLETED ? 'bg-purple-900/20 border border-purple-600 text-purple-400' :
          'bg-gray-700 text-gray-300'
        }`}>
          <div className="flex items-start">
            {reservation.status === RESERVATION_STATUS.AWAITING_PAYMENT && <CreditCard className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />}
            {reservation.status === RESERVATION_STATUS.PENDING && <Clock className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />}
            {reservation.status === RESERVATION_STATUS.CONFIRMED && <CheckCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />}
            {reservation.status === RESERVATION_STATUS.COMPLETED && <Star className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />}
            <span>{getStatusMessage(reservation)}</span>
          </div>
        </div>
      )}

      {/* Reservation Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4 text-sm">
        <div className="flex items-center text-gray-300">
          <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="truncate">{reservation.formattedDates}</span>
        </div>
        <div className="flex items-center text-gray-300">
          <User className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="truncate">{reservation.guest_count} guest{reservation.guest_count > 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center text-gray-300">
          <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="truncate">{reservation.nights} night{reservation.nights > 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Payment Information */}
      <div className="mb-4 p-4 bg-gray-700 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm font-medium text-gray-300">Payment Information</h4>
          <span className="text-lg font-bold text-white">{reservation.formattedPrice}</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {reservation.deposit_amount && (
            <div className="flex justify-between items-center p-2 bg-gray-600 rounded">
              <span className="text-gray-300">Deposit (50%):</span>
              <div className="flex items-center">
                <span className={reservation.deposit_paid ? 'text-green-400' : 'text-gray-300'}>
                  {reservation.formattedDeposit}
                </span>
                {reservation.deposit_paid && <CheckCircle className="w-3 h-3 text-green-400 ml-1" />}
              </div>
            </div>
          )}
          
          {reservation.remaining_amount && (
            <div className="flex justify-between items-center p-2 bg-gray-600 rounded">
              <span className="text-gray-300">Remaining (50%):</span>
              <div className="flex items-center">
                <span className={reservation.full_amount_paid ? 'text-green-400' : 'text-gray-300'}>
                  {reservation.formattedRemaining}
                </span>
                {reservation.full_amount_paid && <CheckCircle className="w-3 h-3 text-green-400 ml-1" />}
              </div>
            </div>
          )}
        </div>
        
        {reservation.payment_due_date && !reservation.full_amount_paid && (
          <div className="mt-2 pt-2 border-t border-gray-600">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Remaining payment due:</span>
              <span className={reservation.isOverdue ? 'text-red-400 font-medium' : 'text-gray-300'}>
                {new Date(reservation.payment_due_date).toLocaleDateString()}
                {reservation.isOverdue && ' (OVERDUE)'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {/* Payment Actions */}
          {needsDepositPayment && (
            <Button 
              size="sm" 
              variant="gradient" 
              onClick={onPayDeposit}
              className="bg-green-600 hover:bg-green-700"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Pay Deposit (₱{reservation.deposit_amount?.toLocaleString()})
            </Button>
          )}

          {needsRemainingPayment && (
            <Button 
              size="sm" 
              variant="gradient" 
              onClick={onPayRemaining}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Pay Remaining (₱{reservation.remaining_amount?.toLocaleString()})
            </Button>
          )}

          {/* Standard Actions */}
          <Button size="sm" variant="outline" className="border-gray-600 text-gray-300" onClick={onContactHost}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Contact Host
          </Button>
          
          <Button size="sm" variant="outline" className="border-purple-500 text-purple-400" onClick={onViewDetails}>
            <Eye className="w-4 h-4 mr-2" />
            View Property
          </Button>
          
          {reservation.canReview && (
            <Button size="sm" variant="gradient" onClick={onReview}>
              <Star className="w-4 h-4 mr-2" />
              Leave Review
            </Button>
          )}

          {isFullyPaid && (
            <Button 
              size="sm" 
              variant="outline" 
              className="border-green-600 text-green-400" 
              onClick={onViewReceipt}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              View Receipt
            </Button>
          )}
        </div>

        {reservation.canCancel && (
          <Button
            size="sm"
            variant="outline"
            className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white w-full sm:w-auto"
            onClick={onCancel}
          >
            Cancel Reservation
          </Button>
        )}
      </div>
    </div>
  );
};

// Cancel Reservation Modal
const CancelReservationModal = ({ reservation, onClose, onConfirm, cancelling }) => {
  const [reason, setReason] = useState('');
  const [refundInfo, setRefundInfo] = useState(null);

  useEffect(() => {
    // Calculate refund information
    const refundDetails = reservationService.calculateCancellationRefund(reservation);
    setRefundInfo(refundDetails);
  }, [reservation]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Leave a Review</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-4">
          <h4 className="text-white font-medium mb-2">{reservation.listing_title}</h4>
          <p className="text-gray-400 text-sm">How was your stay? Your feedback helps other guests and hosts.</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Rating */}
          <div className="mb-4">
            <label className="block text-sm text-gray-300 mb-2">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`p-1 transition-colors ${
                    star <= rating ? 'text-yellow-400' : 'text-gray-500'
                  }`}
                >
                  <Star className={`w-6 h-6 ${star <= rating ? 'fill-current' : ''}`} />
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </p>
          </div>

          {/* Comment */}
          <div className="mb-6">
            <label className="block text-sm text-gray-300 mb-2">Your Review</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with future guests..."
              rows={4}
              required
              minLength={10}
              maxLength={500}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 resize-none"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Minimum 10 characters</span>
              <span>{comment.length}/500</span>
            </div>
          </div>

          {/* Actions */}
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
              disabled={comment.length < 10}
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MyReservations;