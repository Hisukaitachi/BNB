// frontend/src/components/host/HostReservations.jsx
import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, MapPin, DollarSign, MessageSquare, Check, X, 
  Eye, Filter, AlertCircle, User, Phone, Mail, CreditCard
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import reservationService, { RESERVATION_STATUS } from '../../services/reservationService';
import Button from '../ui/Button';

const HostReservations = () => {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showActionModal, setShowActionModal] = useState(null);
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await reservationService.getHostReservations();
      
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
    }
  };

  const handleHostAction = async (reservationId, action, reason = '') => {
    try {
      setProcessing(true);
      
      // Call the backend host action endpoint
      const response = await fetch(`/api/reservations/${reservationId}/host-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ action, reason })
      });

      const result = await response.json();

      if (result.status === 'success') {
        await loadReservations();
        setShowActionModal(null);
        
        if (action === 'approve') {
          alert('Reservation approved! Guest will receive payment instructions.');
        } else {
          alert('Reservation declined. Guest has been notified.');
        }
      } else {
        throw new Error(result.message || 'Action failed');
      }
    } catch (error) {
      alert('Failed to process action: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleContactGuest = (reservation) => {
    navigate(`/messages?guest=${reservation.client_id}`);
  };

  const handleViewProperty = (reservation) => {
    navigate(`/listings/${reservation.listing_id}`);
  };

  const filteredReservations = reservations.filter(reservation => {
    if (filter === 'all') return true;
    if (filter === 'pending_action') {
      return reservation.status === RESERVATION_STATUS.PENDING;
    }
    return reservation.status === filter;
  });

  const filterOptions = [
    { key: 'all', label: 'All' },
    { key: 'pending_action', label: 'Needs Action' },
    { key: RESERVATION_STATUS.PENDING, label: 'Pending' },
    { key: RESERVATION_STATUS.CONFIRMED, label: 'Confirmed' },
    { key: RESERVATION_STATUS.COMPLETED, label: 'Completed' },
    { key: RESERVATION_STATUS.CANCELLED, label: 'Cancelled' }
  ];

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
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Failed to load reservations</h3>
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={loadReservations} variant="gradient">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Manage Reservations</h1>
          <p className="text-gray-400">Review and manage guest reservation requests</p>
        </div>
        
        {/* Desktop Filter Tabs */}
        <div className="hidden md:flex space-x-2">
          {filterOptions.map(({ key, label }) => {
            const count = key === 'all' ? reservations.length : 
                         key === 'pending_action' ? reservations.filter(r => r.status === RESERVATION_STATUS.PENDING).length :
                         reservations.filter(r => r.status === key).length;
            
            return (
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
            );
          })}
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
            Filter ({filter === 'all' ? 'All' : filterOptions.find(o => o.key === filter)?.label})
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

      {/* Reservations List */}
      {filteredReservations.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No reservations found</h3>
          <p className="text-gray-400">
            {filter === 'all' ? 'No reservation requests yet.' : `No ${filterOptions.find(o => o.key === filter)?.label.toLowerCase()} reservations.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredReservations.map((reservation) => (
            <HostReservationCard
              key={reservation.id}
              reservation={reservation}
              onAction={(action, reason) => setShowActionModal({ reservation, action, reason })}
              onContactGuest={() => handleContactGuest(reservation)}
              onViewProperty={() => handleViewProperty(reservation)}
            />
          ))}
        </div>
      )}

      {/* Action Modal */}
      {showActionModal && (
        <ActionModal
          reservation={showActionModal.reservation}
          action={showActionModal.action}
          onClose={() => setShowActionModal(null)}
          onConfirm={(action, reason) => handleHostAction(showActionModal.reservation.id, action, reason)}
          processing={processing}
        />
      )}
    </div>
  );
};

// Host Reservation Card Component
const HostReservationCard = ({ reservation, onAction, onContactGuest, onViewProperty }) => {
  const getUrgencyLevel = (reservation) => {
    if (reservation.status !== RESERVATION_STATUS.PENDING) return null;
    
    const createdDate = new Date(reservation.created_at);
    const hoursOld = (new Date() - createdDate) / (1000 * 60 * 60);
    
    if (hoursOld > 24) return 'high';
    if (hoursOld > 12) return 'medium';
    return 'low';
  };

  const urgency = getUrgencyLevel(reservation);

  return (
    <div className={`bg-gray-800 rounded-xl p-4 sm:p-6 border transition-colors ${
      reservation.status === RESERVATION_STATUS.PENDING 
        ? urgency === 'high' ? 'border-red-500/50' : 
          urgency === 'medium' ? 'border-yellow-500/50' : 'border-purple-500/50'
        : 'border-gray-700'
    }`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg sm:text-xl font-semibold text-white">{reservation.listing_title}</h3>
            {reservation.status === RESERVATION_STATUS.PENDING && urgency && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                urgency === 'high' ? 'bg-red-900/20 text-red-400 border border-red-600' :
                urgency === 'medium' ? 'bg-yellow-900/20 text-yellow-400 border border-yellow-600' :
                'bg-blue-900/20 text-blue-400 border border-blue-600'
              }`}>
                {urgency === 'high' ? 'URGENT' : urgency === 'medium' ? 'PRIORITY' : 'NEW'}
              </span>
            )}
          </div>
          <div className="flex items-center text-gray-400 text-sm">
            <User className="w-4 h-4 mr-1 flex-shrink-0" />
            <span>Guest: {reservation.guest_name}</span>
          </div>
        </div>
        
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${reservation.statusColor}`}>
          {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
        </span>
      </div>

      {/* Action Required Alert */}
      {reservation.status === RESERVATION_STATUS.PENDING && (
        <div className="mb-4 p-3 bg-purple-900/20 border border-purple-600 rounded-lg">
          <div className="flex items-start">
            <Clock className="w-4 h-4 text-purple-400 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-purple-400 font-medium text-sm">Action Required</p>
              <p className="text-purple-300 text-xs mt-1">
                Guest is waiting for your response. Please approve or decline this reservation request.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Guest Information */}
      <div className="mb-4 p-3 bg-gray-700 rounded-lg">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Guest Information</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center text-gray-300">
            <User className="w-3 h-3 mr-2" />
            <span>{reservation.guest_name}</span>
          </div>
          <div className="flex items-center text-gray-300">
            <Mail className="w-3 h-3 mr-2" />
            <span>{reservation.guest_email}</span>
          </div>
          {reservation.guest_phone && (
            <div className="flex items-center text-gray-300 sm:col-span-2">
              <Phone className="w-3 h-3 mr-2" />
              <span>{reservation.guest_phone}</span>
            </div>
          )}
          <div className="flex items-center text-gray-300">
            <User className="w-3 h-3 mr-2" />
            <span>{reservation.guest_count} guest{reservation.guest_count > 1 ? 's' : ''}</span>
          </div>
        </div>
        
        {reservation.special_requests && (
          <div className="mt-3 pt-3 border-t border-gray-600">
            <p className="text-xs text-gray-400 mb-1">Special Requests:</p>
            <p className="text-xs text-gray-300">{reservation.special_requests}</p>
          </div>
        )}
      </div>

      {/* Reservation Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4 text-sm">
        <div className="flex items-center text-gray-300">
          <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="truncate">{reservation.formattedDates}</span>
        </div>
        <div className="flex items-center text-gray-300">
          <DollarSign className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="truncate">Total: {reservation.formattedPrice}</span>
        </div>
        <div className="flex items-center text-gray-300">
          <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="truncate">{reservation.nights} night{reservation.nights > 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Payment Information */}
      {(reservation.deposit_amount || reservation.remaining_amount) && (
        <div className="mb-4 p-3 bg-gray-700 rounded-lg">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Payment Schedule</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {reservation.deposit_amount && (
              <div className="flex justify-between">
                <span className="text-gray-400">Deposit (50%):</span>
                <span className={reservation.deposit_paid ? 'text-green-400' : 'text-gray-300'}>
                  {reservation.formattedDeposit} {reservation.deposit_paid && '✓ Paid'}
                </span>
              </div>
            )}
            {reservation.remaining_amount && (
              <div className="flex justify-between">
                <span className="text-gray-400">Remaining (50%):</span>
                <span className={reservation.full_amount_paid ? 'text-green-400' : 'text-gray-300'}>
                  {reservation.formattedRemaining} {reservation.full_amount_paid && '✓ Paid'}
                </span>
              </div>
            )}
          </div>
          
          {reservation.payment_due_date && !reservation.full_amount_paid && (
            <div className="mt-2 pt-2 border-t border-gray-600">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Payment due date:</span>
                <span className="text-gray-300">{new Date(reservation.payment_due_date).toLocaleDateString()}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button size="sm" variant="outline" className="border-gray-600 text-gray-300" onClick={onContactGuest}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Contact Guest
          </Button>
          
          <Button size="sm" variant="outline" className="border-purple-500 text-purple-400" onClick={onViewProperty}>
            <Eye className="w-4 h-4 mr-2" />
            View Property
          </Button>
        </div>

        {/* Host Actions */}
        {reservation.status === RESERVATION_STATUS.PENDING && (
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 sm:flex-none border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
              onClick={() => onAction('decline')}
            >
              <X className="w-4 h-4 mr-2" />
              Decline
            </Button>
            <Button
              size="sm"
              variant="gradient"
              className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
              onClick={() => onAction('approve')}
            >
              <Check className="w-4 h-4 mr-2" />
              Approve
            </Button>
          </div>
        )}

        {reservation.status === RESERVATION_STATUS.AWAITING_PAYMENT && (
          <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-2 text-center">
            <CreditCard className="w-4 h-4 text-blue-400 mx-auto mb-1" />
            <p className="text-xs text-blue-300">Waiting for guest payment</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Action Modal Component
const ActionModal = ({ reservation, action, onClose, onConfirm, processing }) => {
  const [reason, setReason] = useState('');

  const isApproval = action === 'approve';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">
            {isApproval ? 'Approve Reservation' : 'Decline Reservation'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-gray-300 mb-4 text-sm">
          {isApproval 
            ? `Approve reservation for "${reservation.guest_name}" at "${reservation.listing_title}"?`
            : `Decline reservation for "${reservation.guest_name}" at "${reservation.listing_title}"?`
          }
        </p>

        {isApproval ? (
          <div className="bg-green-900/20 border border-green-600 rounded-lg p-4 mb-4">
            <h4 className="text-green-400 font-medium text-sm mb-2">What happens next:</h4>
            <div className="text-green-300 text-xs space-y-1">
              <p>• Guest will receive payment instructions</p>
              <p>• Payment link will be sent via email</p>
              <p>• Reservation confirmed after payment</p>
              <p>• You'll receive booking confirmation</p>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <label className="block text-sm text-gray-300 mb-2">
              Reason for declining {!isApproval && '*'}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isApproval 
                ? "Optional message for the guest..." 
                : "Please explain why you're declining this reservation..."
              }
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 resize-none"
              maxLength={300}
            />
            <div className="text-xs text-gray-400 mt-1 text-right">{reason.length}/300</div>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 border-gray-600 text-gray-300" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="gradient" 
            className={`flex-1 ${isApproval ? 'bg-green-600 hover:bg-green-700' : ''}`}
            loading={processing} 
            onClick={() => onConfirm(action, reason)}
            disabled={!isApproval && !reason.trim()}
          >
            {processing ? 'Processing...' : (isApproval ? 'Approve Reservation' : 'Decline Reservation')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HostReservations;