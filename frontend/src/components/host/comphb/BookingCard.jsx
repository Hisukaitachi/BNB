// frontend/src/components/host/components/BookingCard.jsx - With property image
import React from 'react';
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  User, 
  Check, 
  X, 
  MessageSquare,
  Eye,
  MapPin,
  Star,
  CreditCard,
  AlertCircle,
  Info,
  Home
} from 'lucide-react';
import Button from '../../ui/Button';
import UserProfileLink from '../../ui/UserProfileLink';
import { getImageUrl } from '../../../services/api';

const BookingCard = ({ booking, isLoading, onUpdateStatus, onViewDetails, onOpenReview }) => {
  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      approved: { color: 'bg-blue-100 text-blue-800', label: 'Approved (Awaiting Payment)' },
      confirmed: { color: 'bg-green-100 text-green-800', label: 'Confirmed' },
      arrived: { color: 'bg-purple-100 text-purple-800', label: 'Arrived' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
      cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Cancelled' },
      completed: { color: 'bg-indigo-100 text-indigo-800', label: 'Completed' }
    };
    return statusConfig[status] || statusConfig.pending;
  };

  const getEnhancedBookingTypeBadge = () => {
    if (booking.booking_type === 'reserve') {
      return (
        <div className="flex items-center space-x-2">
          <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800 font-medium">
            Reserve (50% Deposit)
          </span>
          {booking.remaining_payment_method && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              booking.remaining_payment_method === 'personal' 
                ? 'bg-yellow-100 text-yellow-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {booking.remaining_payment_method === 'personal' ? '🤝 Direct' : '💳 Platform'}
            </span>
          )}
        </div>
      );
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 font-medium">
        Full Booking
      </span>
    );
  };

  const getPaymentStatusDisplay = () => {
    if (booking.booking_type === 'reserve') {
      const depositPaid = booking.deposit_paid === 1;
      const remainingPaid = booking.remaining_paid === 1;
      
      if (!depositPaid && booking.status === 'approved') {
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-yellow-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Awaiting 50% deposit</span>
            </div>
            <div className="ml-6 space-y-1">
              <p className="text-sm text-gray-400">
                Deposit required: <span className="text-white font-medium">₱{Number(booking.deposit_amount).toLocaleString()}</span>
              </p>
              <p className="text-sm text-gray-400">
                Remaining balance: ₱{Number(booking.remaining_amount).toLocaleString()}
              </p>
              {booking.remaining_payment_method && (
                <div className="flex items-center space-x-2 mt-2 p-2 bg-gray-700/50 rounded">
                  <Info className="w-4 h-4 text-blue-400" />
                  <p className="text-xs text-gray-300">
                    Guest selected: <span className="font-medium text-white">
                      {booking.remaining_payment_method === 'platform' 
                        ? '💳 Remaining payment through platform' 
                        : '🤝 Remaining payment direct to host'}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      } else if (depositPaid && !remainingPaid) {
        const dueDate = booking.payment_due_date ? new Date(booking.payment_due_date) : null;
        const isOverdue = dueDate && dueDate < new Date();
        
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-green-600">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">Deposit paid</span>
              <span className="text-sm text-gray-400">(₱{Number(booking.deposit_amount).toLocaleString()})</span>
            </div>
            
            <div className={`ml-6 space-y-2`}>
              <div className={`flex items-center space-x-2 ${isOverdue ? 'text-red-600' : 'text-yellow-600'}`}>
                <CreditCard className="w-4 h-4" />
                <span className="text-sm">
                  Remaining balance: <span className="font-medium">₱{Number(booking.remaining_amount).toLocaleString()}</span>
                </span>
              </div>
              
              {dueDate && (
                <p className={`text-sm ${isOverdue ? 'text-red-400 font-medium' : 'text-gray-400'}`}>
                  Due date: {dueDate.toLocaleDateString()} {isOverdue && '⚠️ OVERDUE'}
                </p>
              )}
              
              <div className={`flex items-center space-x-2 p-2 rounded ${
                booking.remaining_payment_method === 'personal' 
                  ? 'bg-yellow-900/20 border border-yellow-600' 
                  : 'bg-blue-900/20 border border-blue-600'
              }`}>
                {booking.remaining_payment_method === 'personal' ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                    <div className="flex-1">
                      <p className="text-sm text-yellow-400 font-medium">
                        🤝 Guest will pay remaining balance directly to you
                      </p>
                      <p className="text-xs text-yellow-400/80 mt-1">
                        Please coordinate with guest for payment collection before check-in
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Info className="w-4 h-4 text-blue-400" />
                    <div className="flex-1">
                      <p className="text-sm text-blue-400 font-medium">
                        💳 Remaining payment through platform
                      </p>
                      <p className="text-xs text-blue-400/80 mt-1">
                        Payment will be collected automatically 3 days before check-in
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      } else if (depositPaid && remainingPaid) {
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-green-600">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">Fully paid</span>
              <span className="text-sm text-gray-400">(₱{Number(booking.total_price).toLocaleString()})</span>
            </div>
            {booking.remaining_payment_method === 'personal' && (
              <div className="ml-6 text-xs text-gray-400">
                ✓ Guest paid remaining balance directly as requested
              </div>
            )}
          </div>
        );
      }
    } else {
      if (booking.payment_status === 'succeeded') {
        return (
          <div className="flex items-center space-x-2 text-green-600">
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">Paid in full</span>
            <span className="text-sm text-gray-400">(₱{Number(booking.total_price).toLocaleString()})</span>
          </div>
        );
      } else if (booking.status === 'approved') {
        return (
          <div className="flex items-center space-x-2 text-yellow-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Awaiting full payment (₱{Number(booking.total_price).toLocaleString()})</span>
          </div>
        );
      }
    }
    
    return null;
  };

  const isCheckInDay = (checkInDate) => {
    const today = new Date().toISOString().split('T')[0];
    const checkIn = new Date(checkInDate).toISOString().split('T')[0];
    const dayAfter = new Date(new Date(checkInDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return today === checkIn || today === dayAfter;
  };

  const handleApprove = () => {
    const bookingTypeText = booking.booking_type === 'reserve' 
      ? 'The guest will need to pay the 50% deposit to confirm their reservation.' 
      : 'The guest will need to complete full payment to confirm their reservation.';
    
    if (confirm(`Approve this booking request? ${bookingTypeText}`)) {
      onUpdateStatus(booking.id, 'approved');
    }
  };

  const handleDecline = () => {
    const reason = prompt('Please provide a reason for declining (optional):');
    onUpdateStatus(booking.id, 'rejected', reason || 'Host declined');
  };

  const handleMarkArrived = () => {
    if (!isCheckInDay(booking.check_in_date || booking.start_date)) {
      alert('Guests can only be marked as arrived on their check-in date.');
      return;
    }
    
    if (booking.booking_type === 'reserve' && booking.remaining_paid !== 1) {
      if (!confirm('Warning: The remaining balance has not been paid. Do you still want to mark the guest as arrived?')) {
        return;
      }
    }
    
    if (confirm('Mark this guest as arrived? This will check them into the property.')) {
      onUpdateStatus(booking.id, 'arrived');
    }
  };

  const handleMarkCompleted = () => {
    if (confirm('Mark this booking as completed? This action cannot be undone.')) {
      onUpdateStatus(booking.id, 'completed');
    }
  };

  const statusBadge = getStatusBadge(booking.status);

  return (
    <div className={`bg-gray-800 rounded-xl overflow-hidden border ${
      booking.status === 'pending' ? 'border-yellow-500' : 
      booking.status === 'approved' ? 'border-blue-500' :
      booking.status === 'arrived' ? 'border-purple-500' : 
      booking.status === 'completed' ? 'border-indigo-500' : 'border-gray-700'
    }`}>
      
      {/* Property Image & Title Section */}
      <div className="flex flex-col sm:flex-row">
        {/* Property Image */}
        <div className="w-full sm:w-60 md:w-60 h-60 sm:h-auto flex-shrink-0 bg-gray-700">
          {booking.image_url ? (
            <img 
              src={getImageUrl(booking.image_url)}
              alt={booking.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/placeholder.jpg';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
              <Home className="w-12 h-12 text-gray-500" />
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 space-y-2 sm:space-y-0">
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                <h3 className="text-lg sm:text-xl font-semibold text-white">{booking.title}</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadge.color}`}>
                    {statusBadge.label}
                  </span>
                  {getEnhancedBookingTypeBadge()}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center text-gray-400 space-y-1 sm:space-y-0 sm:space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <span>Guest:</span>
                  <UserProfileLink
                    userId={booking.client_id}
                    name={booking.client_name}
                    role="client"
                    size="sm"
                    showAvatar={false}
                    className="inline-flex"
                  />
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>Booking #{booking.id}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status Messages */}
          <StatusMessage booking={booking} />

          {/* Payment Status for Reserve Bookings */}
          {(booking.booking_type === 'reserve' || booking.status === 'approved') && (
            <div className="bg-gray-700/50 rounded-lg p-3 mb-4">
              {getPaymentStatusDisplay()}
            </div>
          )}

          {/* Booking Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center text-gray-300">
              <Calendar className="w-5 h-5 mr-3 text-purple-400" />
              <div>
                <p className="text-sm text-gray-400">Check-in</p>
                <p className="font-medium text-sm sm:text-base">
                  {new Date(booking.start_date || booking.check_in_date).toLocaleDateString('en-US', {
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
                <p className="font-medium text-sm sm:text-base">
                  {new Date(booking.end_date || booking.check_out_date).toLocaleDateString('en-US', {
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
                <p className="font-medium text-sm sm:text-base">₱{Number(booking.total_price).toLocaleString()}</p>
                {booking.booking_type === 'reserve' && (
                  <p className="text-xs text-gray-400">
                    Deposit: ₱{Number(booking.deposit_amount || 0).toLocaleString()} | 
                    Remaining: ₱{Number(booking.remaining_amount || 0).toLocaleString()}
                  </p>
                )}
                {((booking.booking_type === 'reserve' && booking.deposit_paid && booking.remaining_paid) || 
                  (booking.payment_status === 'succeeded')) && (
                  <p className="text-xs text-green-400">
                    Your earnings: ₱{Number(booking.total_price * 0.9).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Warning for overdue payments */}
          {booking.booking_type === 'reserve' && 
           booking.deposit_paid === 1 && 
           booking.remaining_paid === 0 && 
           booking.payment_due_date &&
           new Date(booking.payment_due_date) < new Date() && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-600 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                <div>
                  <p className="text-sm text-red-400 font-medium">Remaining Payment Overdue</p>
                  <p className="text-xs text-red-400/80 mt-1">
                    The remaining balance of ₱{Number(booking.remaining_amount).toLocaleString()} is overdue. 
                    Consider contacting the guest or cancelling the booking.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
              <Button
                size="sm"
                variant="outline"
                className="border-gray-600 text-gray-300 w-full sm:w-auto"
                onClick={() => onViewDetails(booking)}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                className="border-purple-500 text-purple-400 w-full sm:w-auto"
                onClick={() => window.open(`/messages?client=${booking.client_id}`, '_blank')}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Message Guest
              </Button>

              {booking.status === 'completed' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-yellow-500 text-yellow-400 w-full sm:w-auto"
                  onClick={() => onOpenReview(booking)}
                >
                  <Star className="w-4 h-4 mr-2" />
                  Review Guest
                </Button>
              )}
            </div>

            {/* Status Actions */}
            <StatusActions 
              booking={booking}
              isLoading={isLoading}
              isCheckInDay={isCheckInDay(booking.start_date || booking.check_in_date)}
              onApprove={handleApprove}
              onDecline={handleDecline}
              onMarkArrived={handleMarkArrived}
              onMarkCompleted={handleMarkCompleted}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// StatusMessage component
const StatusMessage = ({ booking }) => {
  if (booking.status === 'approved' && !booking.payment_status && booking.booking_type !== 'reserve') {
    return (
      <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3 mb-4">
        <p className="text-blue-400 text-sm">
          💳 This booking has been approved. The guest can now complete payment to confirm their reservation.
        </p>
      </div>
    );
  }

  if (booking.status === 'approved' && booking.booking_type === 'reserve' && !booking.deposit_paid) {
    return (
      <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3 mb-4">
        <p className="text-blue-400 text-sm">
          💳 This reservation has been approved. The guest needs to pay the 50% deposit to confirm.
        </p>
      </div>
    );
  }

  if (booking.status === 'arrived') {
    return (
      <div className="bg-purple-900/20 border border-purple-600 rounded-lg p-3 mb-4">
        <p className="text-purple-400 text-sm">
          🏠 Guest has arrived and checked in. You can mark as completed when their stay ends.
        </p>
      </div>
    );
  }

  if (booking.status === 'completed') {
    return (
      <div className="bg-indigo-900/20 border border-indigo-600 rounded-lg p-3 mb-4">
        <p className="text-indigo-400 text-sm">
          ✅ Booking completed! Consider leaving a review for your guest.
        </p>
      </div>
    );
  }

  return null;
};

// StatusActions component
const StatusActions = ({ booking, isLoading, isCheckInDay, onApprove, onDecline, onMarkArrived, onMarkCompleted }) => {
  if (booking.status === 'pending') {
    return (
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
        <Button
          size="sm"
          variant="outline"
          className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white w-full sm:w-auto"
          onClick={onDecline}
          loading={isLoading}
        >
          <X className="w-4 h-4 mr-2" />
          Decline
        </Button>
        <Button
          size="sm"
          variant="gradient"
          onClick={onApprove}
          loading={isLoading}
          className="w-full sm:w-auto"
        >
          <Check className="w-4 h-4 mr-2" />
          Approve
        </Button>
      </div>
    );
  }

  if (booking.status === 'approved') {
    return (
      <div className="text-right w-full sm:w-auto">
        <div className="bg-blue-900/20 text-blue-400 px-3 py-2 rounded-lg text-sm">
          ✓ Approved - Awaiting Payment
        </div>
      </div>
    );
  }

  if (booking.status === 'confirmed') {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
        <div className="bg-green-900/20 text-green-400 px-3 py-2 rounded-lg text-sm">
          ✓ Confirmed & Paid
        </div>
        <Button
          size="sm"
          variant="outline"
          className={`border-purple-500 w-full sm:w-auto ${
            isCheckInDay 
              ? 'text-purple-400 hover:bg-purple-500 hover:text-white' 
              : 'text-gray-500 border-gray-500 cursor-not-allowed opacity-50'
          }`}
          onClick={onMarkArrived}
          loading={isLoading}
          disabled={!isCheckInDay}
        >
          <MapPin className="w-4 h-4 mr-2" />
          {isCheckInDay ? 'Mark Arrived' : 'Not Check-in Day'}
        </Button>
      </div>
    );
  }

  if (booking.status === 'arrived') {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
        <div className="bg-purple-900/20 text-purple-400 px-3 py-2 rounded-lg text-sm">
          ✓ Guest Arrived
        </div>
        <Button
          size="sm"
          variant="gradient"
          onClick={onMarkCompleted}
          loading={isLoading}
          className="w-full sm:w-auto"
        >
          <Check className="w-4 h-4 mr-2" />
          Mark Completed
        </Button>
      </div>
    );
  }

  if (booking.status === 'completed') {
    return (
      <div className="text-right w-full sm:w-auto">
        <div className="bg-indigo-900/20 text-indigo-400 px-3 py-2 rounded-lg text-sm">
          ✓ Completed
        </div>
      </div>
    );
  }

  return null;
};

export default BookingCard;