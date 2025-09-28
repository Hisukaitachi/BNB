// frontend/src/pages/reservations/components/ReservationDetailsModal.jsx
import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  MapPin, 
  User, 
  DollarSign, 
  Phone, 
  Mail, 
  MessageSquare,
  Clock,
  Home,
  AlertCircle,
  CheckCircle,
  FileText,
  CreditCard
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { reservationAPI } from '../../services/api';
import { reservationUtils } from '../../services/reservationService';

const ReservationDetailsModal = ({ reservation, onClose, onCancel }) => {
  const navigate = useNavigate();
  const [reservationDetails, setReservationDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (reservation?.id) {
      loadReservationDetails();
    }
  }, [reservation]);

  const loadReservationDetails = async () => {
    try {
      setLoading(true);
      const response = await reservationAPI.getReservationDetails(reservation.id);
      
      if (response.data.status === 'success') {
        setReservationDetails(response.data.data.reservation);
      }
    } catch (err) {
      console.error('Error loading reservation details:', err);
      setError('Failed to load reservation details');
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = () => {
    navigate('/payment', {
      state: {
        bookingId: reservation.id,
        amount: reservation.total_amount,
        listingTitle: reservation.listing_title,
        dates: `${reservationUtils.formatDate(reservation.check_in_date)} - ${reservationUtils.formatDate(reservation.check_out_date)}`
      }
    });
    onClose();
  };

  const handleContactHost = () => {
    // Navigate to messaging with host
    navigate(`/messages/${reservation.host_id || 'host'}`);
    onClose();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <span className="ml-3 text-white">Loading details...</span>
          </div>
        </div>
      </div>
    );
  }

  const details = reservationDetails || reservation;
  const canCancel = details.status === 'pending' || details.status === 'confirmed';
  const needsPayment = details.status === 'confirmed' && !details.payment_status;
  const isUpcoming = new Date(details.check_in_date) > new Date();
  const cancellationInfo = canCancel ? reservationUtils.calculateCancellationRefund(details) : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Reservation Details</h2>
            <p className="text-gray-400">ID: #{details.id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="p-6 border-b border-gray-700">
            <div className="bg-red-900/20 border border-red-500 text-red-400 rounded-lg p-4 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status and Payment Alert */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Status Badge */}
            <div className="flex items-center space-x-3">
              <span className={`px-4 py-2 rounded-full text-sm font-medium border ${
                reservationUtils.getStatusBadgeClass(details.status)
              }`}>
                {details.status.charAt(0).toUpperCase() + details.status.slice(1)}
              </span>
              
              {details.status === 'confirmed' && (
                <div className="flex items-center text-green-400">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  <span className="text-sm">Host Approved</span>
                </div>
              )}
            </div>

            {/* Payment Status */}
            {needsPayment && (
              <div className="bg-yellow-900/20 border border-yellow-500 text-yellow-400 rounded-lg p-3 flex items-center">
                <CreditCard className="w-4 h-4 mr-2" />
                <span className="text-sm">Payment required to complete booking</span>
              </div>
            )}
          </div>

          {/* Property Information */}
          <div className="bg-gray-700 rounded-lg p-6">
            <div className="flex items-start space-x-4">
              {details.image_url && (
                <img
                  src={details.image_url}
                  alt={details.listing_title}
                  className="w-20 h-20 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white mb-1">
                  {details.listing_title}
                </h3>
                <div className="flex items-center text-gray-400 mb-2">
                  <MapPin className="w-4 h-4 mr-1" />
                  {details.listing_location}
                </div>
                <div className="text-sm text-gray-300">
                  Host: {details.host_name}
                </div>
              </div>
            </div>
          </div>

          {/* Reservation Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dates and Duration */}
            <div className="bg-gray-700 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-purple-400" />
                Stay Details
              </h4>
              
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-400">Check-in</div>
                  <div className="text-white font-medium">
                    {reservationUtils.formatDate(details.check_in_date)}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-400">Check-out</div>
                  <div className="text-white font-medium">
                    {reservationUtils.formatDate(details.check_out_date)}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-400">Duration</div>
                  <div className="text-white font-medium">
                    {details.nights} night{details.nights > 1 ? 's' : ''}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-400">Guests</div>
                  <div className="text-white font-medium">
                    {details.guest_count} guest{details.guest_count > 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>

            {/* Guest Information */}
            <div className="bg-gray-700 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-purple-400" />
                Guest Information
              </h4>
              
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-400">Name</div>
                  <div className="text-white font-medium">{details.guest_name}</div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-400">Email</div>
                  <div className="text-white font-medium flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    {details.guest_email}
                  </div>
                </div>
                
                {details.guest_phone && (
                  <div>
                    <div className="text-sm text-gray-400">Phone</div>
                    <div className="text-white font-medium flex items-center">
                      <Phone className="w-4 h-4 mr-2" />
                      {details.guest_phone}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Special Requests */}
          {details.special_requests && (
            <div className="bg-gray-700 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                <MessageSquare className="w-5 h-5 mr-2 text-purple-400" />
                Special Requests
              </h4>
              <p className="text-gray-300">{details.special_requests}</p>
            </div>
          )}

          {/* Pricing Breakdown */}
          <div className="bg-gray-700 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-purple-400" />
              Price Breakdown
            </h4>
            
            <div className="space-y-2">
              <div className="flex justify-between text-gray-300">
                <span>Base price ({details.nights} nights)</span>
                <span>₱{((details.total_amount || 0) / 1.22).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Service fee</span>
                <span>₱{(((details.total_amount || 0) / 1.22) * 0.1).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Cleaning fee</span>
                <span>₱50.00</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Taxes</span>
                <span>₱{(((details.total_amount || 0) / 1.22) * 0.12).toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-600 pt-2">
                <div className="flex justify-between font-semibold text-white text-lg">
                  <span>Total</span>
                  <span>₱{details.total_amount?.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cancellation Policy */}
          {canCancel && cancellationInfo && (
            <div className="bg-gray-700 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-yellow-400" />
                Cancellation Policy
              </h4>
              
              <div className="space-y-2">
                <p className="text-gray-300">{cancellationInfo.policy}</p>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-400">Refund amount:</span>
                  <span className="text-white font-medium">
                    ₱{cancellationInfo.refundAmount.toLocaleString()} 
                    ({cancellationInfo.refundPercentage}%)
                  </span>
                </div>
                <p className="text-sm text-gray-400">
                  {cancellationInfo.daysUntilCheckIn} days until check-in
                </p>
              </div>
            </div>
          )}

          {/* Reservation History */}
          {details.history && details.history.length > 0 && (
            <div className="bg-gray-700 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-purple-400" />
                Reservation History
              </h4>
              
              <div className="space-y-3">
                {details.history.map((entry, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <div className="text-white">{entry.action}</div>
                      <div className="text-sm text-gray-400">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-gray-300">{entry.user_name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 p-6">
          <div className="flex flex-col lg:flex-row lg:justify-between space-y-3 lg:space-y-0 lg:space-x-3">
            <div className="flex space-x-3">
              <Button
                onClick={handleContactHost}
                variant="outline"
                className="border-gray-600 text-gray-300"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Contact Host
              </Button>
              
              {details.listing_id && (
                <Button
                  onClick={() => {
                    navigate(`/listings/${details.listing_id}`);
                    onClose();
                  }}
                  variant="outline"
                  className="border-gray-600 text-gray-300"
                >
                  <Home className="w-4 h-4 mr-2" />
                  View Property
                </Button>
              )}
            </div>

            <div className="flex space-x-3">
              {needsPayment && (
                <Button
                  onClick={handlePayNow}
                  variant="gradient"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pay Now
                </Button>
              )}
              
              {canCancel && isUpcoming && (
                <Button
                  onClick={() => {
                    if (confirm(`Are you sure you want to cancel this reservation? You will receive ₱${cancellationInfo?.refundAmount.toLocaleString()} refund (${cancellationInfo?.refundPercentage}%).`)) {
                      onCancel(details.id);
                    }
                  }}
                  variant="outline"
                  className="border-red-600 text-red-400 hover:bg-red-900/20"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel Reservation
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationDetailsModal;