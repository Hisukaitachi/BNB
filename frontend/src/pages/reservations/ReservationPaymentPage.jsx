// frontend/src/pages/reservations/ReservationPaymentPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { 
  CreditCard, Smartphone, ArrowLeft, Clock, Shield, 
  AlertCircle, CheckCircle, Calendar, Home, User
} from 'lucide-react';
import Button from '../../components/ui/Button';
import reservationService from '../../services/reservationService';

const ReservationPaymentPage = () => {
  const { reservationId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('gcash');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (reservationId) {
      loadReservationDetails();
    } else {
      setError('No reservation ID provided');
      setLoading(false);
    }
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

  const getPaymentAmount = () => {
    if (!reservation) return 0;
    
    // Determine what needs to be paid based on reservation status
    if (reservation.status === 'awaiting_payment' && !reservation.deposit_paid) {
      return reservation.deposit_amount;
    } else if (reservation.status === 'confirmed' && !reservation.full_amount_paid) {
      return reservation.remaining_amount;
    }
    
    return 0;
  };

  const getPaymentType = () => {
    if (!reservation) return 'payment';
    
    if (reservation.status === 'awaiting_payment' && !reservation.deposit_paid) {
      return 'deposit';
    } else if (reservation.status === 'confirmed' && !reservation.full_amount_paid) {
      return 'remaining';
    }
    
    return 'payment';
  };

  const handlePayment = async () => {
    setProcessing(true);
    setError('');

    try {
      const paymentType = getPaymentType();
      const amount = getPaymentAmount();

      // Create payment intent for reservation
      const response = await fetch('/api/payments/reservation/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          reservationId: reservation.id,
          paymentType,
          amount,
          paymentMethod
        })
      });

      const result = await response.json();

      if (result.status === 'success' && result.data.paymentIntent?.checkout_url) {
        // Store reservation info for success/cancel pages
        localStorage.setItem(`reservation_${reservationId}_amount`, amount);
        localStorage.setItem(`reservation_${reservationId}_type`, paymentType);
        localStorage.setItem(`reservation_${reservationId}_title`, reservation.listing_title);
        
        // Redirect to PayMongo checkout
        window.location.href = result.data.paymentIntent.checkout_url;
      } else {
        throw new Error(result.message || 'Payment initiation failed');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Payment Error</h2>
          <p className="text-red-400 mb-6">{error}</p>
          <Button onClick={() => navigate('/my-reservations')} variant="gradient">
            Back to Reservations
          </Button>
        </div>
      </div>
    );
  }

  const paymentAmount = getPaymentAmount();
  const paymentType = getPaymentType();

  if (paymentAmount <= 0) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20 flex items-center justify-center">
        <div className="text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Payment Complete</h2>
          <p className="text-gray-400 mb-6">This reservation is fully paid.</p>
          <Button onClick={() => navigate('/my-reservations')} variant="gradient">
            Back to Reservations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-20">
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-300 hover:text-white mb-6 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <div className="bg-gray-800 rounded-xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">
                Complete {paymentType === 'deposit' ? 'Deposit' : 'Remaining'} Payment
              </h1>
              <p className="text-gray-400">
                Secure payment for your reservation
              </p>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-500 text-red-400 rounded-lg p-4 mb-6 flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Reservation Summary */}
            <div className="bg-gray-700 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Home className="w-5 h-5 mr-2" />
                Reservation Details
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Property</span>
                  <span className="text-white font-medium">{reservation.listing_title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Guest</span>
                  <span className="text-white">{reservation.guest_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Dates</span>
                  <span className="text-white">
                    {new Date(reservation.check_in_date).toLocaleDateString()} - {new Date(reservation.check_out_date).toLocaleDateString()}
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
              </div>
            </div>

            {/* Payment Type Info */}
            {paymentType === 'deposit' && (
              <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <Shield className="w-5 h-5 text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-blue-400 font-medium text-sm mb-1">50% Deposit Payment</h4>
                    <p className="text-blue-300 text-xs">
                      Pay 50% now to secure your reservation. The remaining 50% (₱{reservation.remaining_amount?.toLocaleString()}) 
                      will be due 3 days before your check-in date.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {paymentType === 'remaining' && (
              <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <Clock className="w-5 h-5 text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-yellow-400 font-medium text-sm mb-1">Remaining Payment Due</h4>
                    <p className="text-yellow-300 text-xs">
                      Complete your reservation by paying the remaining 50% balance.
                      {reservation.payment_due_date && (
                        <span className="block mt-1">
                          Due date: {new Date(reservation.payment_due_date).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Methods */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">Select Payment Method</h3>
              
              <div className="space-y-3">
                <label className="flex items-center p-4 border border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="gcash"
                    checked={paymentMethod === 'gcash'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-4 text-purple-600"
                  />
                  <Smartphone className="w-6 h-6 text-blue-500 mr-3" />
                  <div>
                    <div className="text-white font-medium">GCash</div>
                    <div className="text-sm text-gray-400">Pay securely with GCash</div>
                  </div>
                </label>

                <label className="flex items-center p-4 border border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-4 text-purple-600"
                  />
                  <CreditCard className="w-6 h-6 text-green-500 mr-3" />
                  <div>
                    <div className="text-white font-medium">Credit/Debit Card</div>
                    <div className="text-sm text-gray-400">Visa, Mastercard, JCB</div>
                  </div>
                </label>

                <label className="flex items-center p-4 border border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 transition">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="grab_pay"
                    checked={paymentMethod === 'grab_pay'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-4 text-purple-600"
                  />
                  <Smartphone className="w-6 h-6 text-green-500 mr-3" />
                  <div>
                    <div className="text-white font-medium">GrabPay</div>
                    <div className="text-sm text-gray-400">Pay with GrabPay wallet</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-gray-700 rounded-lg p-6 mb-8">
              <h4 className="text-lg font-semibold text-white mb-4">Payment Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-gray-300">
                  <span>
                    {paymentType === 'deposit' ? 'Deposit Payment (50%)' : 'Remaining Payment (50%)'}
                  </span>
                  <span>₱{paymentAmount.toLocaleString()}</span>
                </div>
                
                {paymentType === 'deposit' && (
                  <div className="flex justify-between text-gray-400 text-sm">
                    <span>Remaining balance due later</span>
                    <span>₱{reservation.remaining_amount?.toLocaleString()}</span>
                  </div>
                )}
                
                <div className="border-t border-gray-600 pt-2 mt-2">
                  <div className="flex justify-between text-white font-semibold text-xl">
                    <span>Amount to Pay</span>
                    <span>₱{paymentAmount.toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="text-xs text-gray-400 mt-2">
                  Total reservation value: ₱{reservation.total_amount?.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Pay Button */}
            <Button
              onClick={handlePayment}
              loading={processing}
              variant="gradient"
              size="lg"
              className="w-full mb-4"
              disabled={!paymentMethod || processing}
            >
              {processing ? 'Processing...' : `Pay ₱${paymentAmount.toLocaleString()}`}
            </Button>

            {/* Security Info */}
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-2">
                You will be redirected to PayMongo secure checkout
              </p>
              <div className="flex items-center justify-center text-xs text-gray-500">
                <Shield className="w-4 h-4 mr-1" />
                <span>Powered by PayMongo - PCI DSS Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationPaymentPage;