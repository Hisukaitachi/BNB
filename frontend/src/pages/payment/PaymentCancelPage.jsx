// frontend/src/pages/payment/PaymentSuccessPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Home, FileText, Loader } from 'lucide-react';
import Button from '../../components/ui/Button';
import { paymentAPI } from '../../services/api';

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [error, setError] = useState('');
  
  // Get booking_id from URL params (PayMongo redirects with this)
  const bookingId = searchParams.get('booking_id');

  useEffect(() => {
    if (!bookingId) {
      setError('No booking ID found');
      setLoading(false);
      return;
    }

    verifyPayment();
  }, [bookingId]);

  const verifyPayment = async () => {
    try {
      console.log('Verifying payment for booking:', bookingId);
      
      // Get payment status from backend
      const response = await paymentAPI.getPaymentStatus(bookingId);
      const payment = response.data.data?.payment;
      
      if (payment) {
        setPaymentStatus(payment);
        
        // Log success for debugging
        console.log('Payment verified:', payment);
        
        // If payment is still pending, you might want to poll
        if (payment.status === 'pending') {
          setTimeout(verifyPayment, 3000); // Check again in 3 seconds
        }
      } else {
        setError('Payment not found');
      }
    } catch (err) {
      console.error('Error verifying payment:', err);
      setError('Failed to verify payment status');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Verifying Payment...</h2>
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
          <h1 className="text-2xl font-bold text-white mb-2">Payment Verification Failed</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Button 
            onClick={() => navigate('/dashboard')}
            variant="gradient"
            className="w-full"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isSuccessful = paymentStatus?.status === 'succeeded';
  const isPending = paymentStatus?.status === 'pending';

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-800 rounded-xl p-8">
          {/* Success Icon */}
          {isSuccessful && (
            <div className="w-20 h-20 bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
          )}
          
          {isPending && (
            <div className="w-20 h-20 bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader className="w-10 h-10 text-yellow-500 animate-spin" />
            </div>
          )}

          {/* Title */}
          <h1 className="text-3xl font-bold text-white text-center mb-2">
            {isSuccessful && 'Payment Successful!'}
            {isPending && 'Payment Processing...'}
            {!isSuccessful && !isPending && 'Payment Status'}
          </h1>

          {/* Subtitle */}
          <p className="text-gray-400 text-center mb-8">
            {isSuccessful && 'Your booking has been confirmed'}
            {isPending && 'Your payment is being processed. This may take a few moments.'}
            {!isSuccessful && !isPending && 'Please check your payment status'}
          </p>

          {/* Payment Details */}
          {paymentStatus && (
            <div className="bg-gray-700 rounded-lg p-6 mb-8">
              <h3 className="text-sm font-semibold text-gray-400 uppercase mb-4">Payment Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Booking ID</span>
                  <span className="text-white font-medium">#{bookingId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Amount</span>
                  <span className="text-white font-medium">
                    ₱{paymentStatus.amount?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className={`font-medium ${
                    isSuccessful ? 'text-green-400' : 
                    isPending ? 'text-yellow-400' : 'text-gray-400'
                  }`}>
                    {paymentStatus.status?.charAt(0).toUpperCase() + paymentStatus.status?.slice(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Payment Method</span>
                  <span className="text-white font-medium">
                    {paymentStatus.currency === 'PHP' ? 'GCash/Card' : 'Online Payment'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {isSuccessful && (
              <>
                <Button
                  onClick={() => navigate(`/booking/${bookingId}`)}
                  variant="gradient"
                  className="w-full"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Booking Details
                </Button>
                <Button
                  onClick={() => navigate('/dashboard')}
                  variant="outline"
                  className="w-full"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </>
            )}
            
            {isPending && (
              <Button
                onClick={() => window.location.reload()}
                variant="gradient"
                className="w-full"
              >
                Refresh Status
              </Button>
            )}
            
            {!isSuccessful && !isPending && (
              <Button
                onClick={() => navigate('/dashboard')}
                variant="gradient"
                className="w-full"
              >
                Back to Dashboard
              </Button>
            )}
          </div>

          {/* Additional Info */}
          {isSuccessful && (
            <div className="mt-8 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-400 text-center">
                A confirmation email has been sent to your registered email address.
              </p>
            </div>
          )}
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

export default PaymentSuccessPage;