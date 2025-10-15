// frontend/src/pages/payment/PaymentSuccessPage.jsx - UPDATED WITH PAYMENT SERVICE
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Home, FileText, Loader, RefreshCw, AlertCircle } from 'lucide-react';
import Button from '../../components/ui/Button';
import paymentService from '../../services/paymentService'; // ✅ Use payment service
import { PAYMENT_STATUS } from '../../services/paymentService';

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(true);
  const [paymentResult, setPaymentResult] = useState(null);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  
  const bookingId = searchParams.get('booking_id');

  useEffect(() => {
    if (!bookingId) {
      setError('No booking ID found');
      setLoading(false);
      setVerifying(false);
      return;
    }

    verifyPayment();
  }, [bookingId]);

  // ✅ UPDATED: Use payment service with retry logic
  const verifyPayment = async () => {
    try {
      console.log('✅ Verifying payment for booking:', bookingId);
      setVerifying(true);
      
      // Use payment service's verification with retries
      // This will poll up to 5 times with 2 second delays
      const result = await paymentService.verifyPaymentAfterRedirect(bookingId, {
        maxAttempts: 5,
        delayMs: 2000
      });
      
      setPaymentResult(result);
      console.log('Payment verification result:', result);

      // If successful, redirect after 3 seconds
      if (result.success) {
        setTimeout(() => {
          const returnUrl = paymentService.getReturnUrl();
          paymentService.clearPaymentSession();
          navigate(returnUrl);
        }, 3000);
      }
      
    } catch (err) {
      console.error('❌ Error verifying payment:', err);
      setError(err.message || 'Failed to verify payment status');
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  // Manual retry function
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setError('');
    verifyPayment();
  };

  // Still verifying
  if (loading || verifying) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Verifying Payment...</h2>
          <p className="text-gray-400">Please wait while we confirm your payment</p>
          {retryCount > 0 && (
            <p className="text-sm text-gray-500 mt-2">Attempt {retryCount + 1}</p>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-gray-800 rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Verification Error</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          
          <div className="space-y-3">
            <Button 
              onClick={handleRetry} 
              variant="gradient" 
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button 
              onClick={() => navigate('/my-bookings')} 
              variant="outline" 
              className="w-full"
            >
              Go to My Bookings
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Success/Pending state
  const isSuccessful = paymentResult?.success;
  const isPending = paymentResult?.payment?.status === PAYMENT_STATUS.PENDING;

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-800 rounded-xl p-8">
          {/* Icon */}
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
            isSuccessful 
              ? 'bg-green-900/20' 
              : isPending 
                ? 'bg-yellow-900/20' 
                : 'bg-red-900/20'
          }`}>
            {isSuccessful ? (
              <CheckCircle className="w-10 h-10 text-green-500" />
            ) : isPending ? (
              <Loader className="w-10 h-10 text-yellow-500 animate-spin" />
            ) : (
              <AlertCircle className="w-10 h-10 text-red-500" />
            )}
          </div>

          {/* Title */}
          <h1 className={`text-3xl font-bold text-center mb-2 ${
            isSuccessful 
              ? 'text-white' 
              : isPending 
                ? 'text-yellow-400' 
                : 'text-red-400'
          }`}>
            {isSuccessful 
              ? 'Payment Successful!' 
              : isPending 
                ? 'Payment Processing' 
                : 'Payment Failed'
            }
          </h1>

          {/* Message */}
          <p className="text-gray-400 text-center mb-8">
            {isSuccessful 
              ? 'Your booking has been confirmed' 
              : isPending 
                ? 'Please wait while we process your payment' 
                : paymentResult?.message || 'Payment could not be completed'
            }
          </p>

          {/* Payment Details */}
          {paymentResult?.verification && (
            <div className="bg-gray-700 rounded-lg p-6 mb-8">
              <h3 className="text-sm font-semibold text-gray-400 uppercase mb-4">Payment Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Booking ID</span>
                  <span className="text-white font-medium">#{bookingId}</span>
                </div>
                
                {paymentResult.verification.paymentIntentId && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Payment ID</span>
                    <span className="text-white font-medium text-xs">
                      {paymentResult.verification.paymentIntentId.slice(0, 20)}...
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className={`font-medium ${
                    paymentResult.verification.paid 
                      ? 'text-green-400' 
                      : paymentResult.verification.paymongoStatus === PAYMENT_STATUS.PENDING 
                        ? 'text-yellow-400' 
                        : 'text-red-400'
                  }`}>
                    {paymentResult.verification.paid 
                      ? 'Paid' 
                      : paymentResult.verification.paymongoStatus?.charAt(0).toUpperCase() + 
                        paymentResult.verification.paymongoStatus?.slice(1)
                    }
                  </span>
                </div>

                {/* Sync Status */}
                <div className="flex justify-between">
                  <span className="text-gray-400">Database Sync</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    paymentResult.verification.synced 
                      ? 'bg-green-900/30 text-green-400' 
                      : 'bg-yellow-900/30 text-yellow-400'
                  }`}>
                    {paymentResult.verification.synced ? '✓ Synced' : '⏳ Syncing'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Payment from state (fallback) */}
          {!paymentResult?.verification && paymentResult?.payment && (
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
                    ₱{paymentResult.payment.amount?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className={`font-medium ${
                    paymentResult.payment.status === PAYMENT_STATUS.SUCCEEDED 
                      ? 'text-green-400' 
                      : paymentResult.payment.status === PAYMENT_STATUS.PENDING 
                        ? 'text-yellow-400' 
                        : 'text-red-400'
                  }`}>
                    {paymentResult.payment.status?.charAt(0).toUpperCase() + 
                     paymentResult.payment.status?.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {isSuccessful && (
              <p className="text-sm text-gray-400 text-center mb-4">
                Redirecting to your bookings in 3 seconds...
              </p>
            )}

            <Button
              onClick={() => {
                paymentService.clearPaymentSession();
                navigate('/my-bookings');
              }}
              variant="gradient"
              className="w-full"
            >
              <FileText className="w-4 h-4 mr-2" />
              View My Bookings
            </Button>

            {!isSuccessful && (
              <Button
                onClick={handleRetry}
                variant="outline"
                className="w-full border-purple-600 text-purple-400"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Status Again
              </Button>
            )}

            <Button
              onClick={() => {
                paymentService.clearPaymentSession();
                navigate('/');
              }}
              variant="outline"
              className="w-full"
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>

          {/* Help Text */}
          {isPending && (
            <div className="mt-6 p-4 bg-blue-900/20 border border-blue-600 rounded-lg">
              <p className="text-sm text-blue-300 text-center">
                💡 Your payment is being processed. This usually takes a few seconds. 
                You can safely check your bookings page.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;