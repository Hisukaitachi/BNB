// frontend/src/components/host/components/BookingCard.jsx - Updated with clickable names
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
  Star
} from 'lucide-react';
import Button from '../../ui/Button';
import UserProfileLink from '../../ui/UserProfileLink';

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

  const isCheckInDay = (checkInDate) => {
    const today = new Date().toISOString().split('T')[0];
    const checkIn = new Date(checkInDate).toISOString().split('T')[0];
    const dayAfter = new Date(new Date(checkInDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return today === checkIn || today === dayAfter;
  };

  const handleApprove = () => {
    if (confirm('Approve this booking request? The guest will then need to complete payment to confirm their reservation.')) {
      onUpdateStatus(booking.booking_id, 'approved');
    }
  };

  const handleDecline = () => {
    const reason = prompt('Please provide a reason for declining (optional):');
    onUpdateStatus(booking.booking_id, 'rejected', reason || 'Host declined');
  };

  const handleMarkArrived = () => {
    if (!isCheckInDay(booking.check_in_date)) {
      alert('Guests can only be marked as arrived on their check-in date.');
      return;
    }
    if (confirm('Mark this guest as arrived? This will check them into the property.')) {
      onUpdateStatus(booking.booking_id, 'arrived');
    }
  };

  const handleMarkCompleted = () => {
    if (confirm('Mark this booking as completed? This action cannot be undone.')) {
      onUpdateStatus(booking.booking_id, 'completed');
    }
  };

  const statusBadge = getStatusBadge(booking.status);

  return (
    <div className={`bg-gray-800 rounded-xl p-4 sm:p-6 border ${
      booking.status === 'pending' ? 'border-yellow-500' : 
      booking.status === 'approved' ? 'border-blue-500' :
      booking.status === 'arrived' ? 'border-purple-500' : 
      booking.status === 'completed' ? 'border-indigo-500' : 'border-gray-700'
    }`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 space-y-2 sm:space-y-0">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
            <h3 className="text-lg sm:text-xl font-semibold text-white">{booking.title}</h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadge.color}`}>
                {statusBadge.label}
              </span>
              
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
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center text-gray-400 space-y-1 sm:space-y-0 sm:space-x-4 text-sm">
            {/* Clickable Guest Name */}
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
              <span>Booking #{booking.booking_id}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      <StatusMessage booking={booking} />

      {/* Booking Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="flex items-center text-gray-300">
          <Calendar className="w-5 h-5 mr-3 text-purple-400" />
          <div>
            <p className="text-sm text-gray-400">Check-in</p>
            <p className="font-medium text-sm sm:text-base">
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
            <p className="font-medium text-sm sm:text-base">
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
            <p className="font-medium text-sm sm:text-base">₱{Number(booking.total_price).toLocaleString()}</p>
            {booking.payment_status === 'succeeded' && (
              <p className="text-xs text-green-400">Your earnings: ₱{Number(booking.total_price * 0.9).toLocaleString()}</p>
            )}
          </div>
        </div>
      </div>

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
          isCheckInDay={isCheckInDay(booking.check_in_date)}
          onApprove={handleApprove}
          onDecline={handleDecline}
          onMarkArrived={handleMarkArrived}
          onMarkCompleted={handleMarkCompleted}
        />
      </div>
    </div>
  );
};

// Status Message Component (unchanged)
const StatusMessage = ({ booking }) => {
  if (booking.status === 'approved' && !booking.payment_status) {
    return (
      <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3 mb-4">
        <p className="text-blue-400 text-sm">
          💳 This booking has been approved. The guest can now complete payment to confirm their reservation.
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

// Status Actions Component (unchanged from previous version)
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