// frontend/src/pages/reservations/ReservationSuccessPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Home, FileText, Loader, Calendar } from 'lucide-react';
import Button from '../../components/ui/Button';
import reservationService from '../../services/reservationService';

const ReservationSuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [reservation, setReservation] = useState(null);
  const [error, setError] = useState('');
  
  const reservationId = searchParams.get('reservation_id');
  const paymentType = searchParams.get('type');

  useEffect(() => {
    if (!reservationId) {
      setError('No reservation ID found');
      setLoading(false);
      return;
    }

    loadReservationDetails();
  }, [reservationId]);

  const loadReservationDetails = async () => {
    try {
      setLoading(true);
      const result = await reservationService.getReservationDetails(reservationId);
      
      if (result.success) {
        setReservation(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load reservation details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Loading reservation...</h2>
          <p className="text-gray-400">Please wait while we confirm your payment</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-gray-800 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Error Loading Reservation</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Button 
            onClick={() => navigate('/my-reservations')}
            variant="gradient"
            className="w-full"
          >
            Go to My Reservations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        <div className="bg-gray-800 rounded-xl p-8">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-white text-center mb-2">
            {paymentType === 'deposit' ? 'Deposit Payment Successful!' : 'Payment Successful!'}
          </h1>

          {/* Subtitle */}
          <p className="text-gray-400 text-center mb-8">
            {paymentType === 'deposit' 
              ? 'Your reservation is confirmed! Remember to pay the remaining balance before check-in.'
              : 'Your reservation is fully paid and confirmed.'
            }
          </p>

          {/* Reservation Details */}
          {reservation && (
            <div className="bg-gray-700 rounded-lg p-6 mb-8">
              <h3 className="text-sm font-semibold text-gray-400 uppercase mb-4">Reservation Confirmed</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Property</span>
                  <span className="text-white font-medium">{reservation.listing_title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Check-in</span>
                  <span className="text-white">
                    {new Date(reservation.check_in_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Check-out</span>
                  <span className="text-white">
                    {new Date(reservation.check_out_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Guests</span>
                  <span className="text-white">{reservation.guest_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Reservation ID</span>
                  <span className="text-white font-mono">#{reservation.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className="text-green-400 font-medium">
                    {reservation.status === 'confirmed' ? 'Confirmed' : 'Processing'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Payment Info */}
          {paymentType === 'deposit' && reservation && (
            <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4 mb-8">
              <h4 className="text-blue-400 font-medium text-sm mb-2">Remaining Payment</h4>
              <p className="text-blue-300 text-xs mb-2">
                Amount due: ₱{reservation.remaining_amount?.toLocaleString()}
              </p>
              <p className="text-blue-300 text-xs">
                Due date: {reservation.payment_due_date ? new Date(reservation.payment_due_date).toLocaleDateString() : '3 days before check-in'}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={() => navigate('/my-reservations')}
              variant="gradient"
              className="w-full"
            >
              <FileText className="w-4 h-4 mr-2" />
              View My Reservations
            </Button>
            
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>

          {/* Confirmation Email Info */}
          <div className="mt-8 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
            <p className="text-sm text-green-400 text-center">
              📧 A confirmation email has been sent to {reservation?.guest_email}
            </p>
          </div>
        </div>

        {/* Support Link */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-sm">
            Need help? {' '}
            <a href="/support" className="text-purple-400 hover:text-purple-300 underline">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReservationSuccessPage;