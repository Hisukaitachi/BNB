// frontend/src/pages/payment/PaymentStatus.jsx - Success/Failure Handler
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import paymentService from '../../services/paymentService';

const PaymentStatus = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [error, setError] = useState('');

  // Get parameters from URL
  const status = searchParams.get('status') || 'pending';
  const bookingId = searchParams.get('booking_id');
  const paymentIntentId = searchParams.get('payment_intent_id');

  useEffect(() => {
    if (bookingId) {
      checkPaymentStatus();
    } else {
      setLoading(false);
      setError('Missing booking information');
    }
  }, [bookingId]);

  const checkPaymentStatus = async () => {
    try {
      setLoading(true);
      const payment = await paymentService.getPaymentStatus(bookingId);
      setPaymentStatus(payment);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'succeeded':
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />;
      case 'failed':
      case 'error':
        return <XCircle className="w-16 h-16 text-red-500 mx-auto" />;
      default:
        return <Clock className="w-16 h-16 text-yellow-500 mx-auto" />;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'succeeded':
      case 'success':
        return {
          title: 'Payment Successful!',
          message: 'Your booking has been confirmed. You will receive an email confirmation shortly.',
          color: 'text-green-500'
        };
      case 'failed':
      case 'error':
        return {
          title: 'Payment Failed',
          message: 'There was an issue processing your payment. Please try again or contact support.',
          color: 'text-red-500'
        };
      default:
        return {
          title: 'Payment Processing',
          message: 'Your payment is being processed. This may take a few moments.',
          color: 'text-yellow-500'
        };
    }
  };

  const getActionButtons = () => {
    const buttons = [];

    switch (user?.role) {
      case 'client':
        if (status === 'succeeded' || status === 'success') {
          buttons.push(
            <Button
              key="bookings"
              onClick={() => navigate('/my-bookings')}
              variant="gradient"
              className="flex items-center"
            >
              View My Bookings
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          );
        } else if (status === 'failed' || status === 'error') {
          buttons.push(
            <Button
              key="retry"
              onClick={() => navigate(`/payment`, { 
                state: { bookingId, retryPayment: true } 
              })}
              variant="gradient"
            >
              Try Again
            </Button>
          );
        }
        buttons.push(
          <Button
            key="home"
            onClick={() => navigate('/dashboard')}
            variant="outline"
          >
            Back to Dashboard
          </Button>
        );
        break;

      case 'host':
        buttons.push(
          <Button
            key="earnings"
            onClick={() => navigate('/host/earnings')}
            variant="gradient"
          >
            View Earnings
          </Button>
        );
        buttons.push(
          <Button
            key="bookings"
            onClick={() => navigate('/host/bookings')}
            variant="outline"
          >
            Manage Bookings
          </Button>
        );
        break;

      case 'admin':
        buttons.push(
          <Button
            key="transactions"
            onClick={() => navigate('/admin/transactions')}
            variant="gradient"
          >
            View All Transactions
          </Button>
        );
        buttons.push(
          <Button
            key="dashboard"
            onClick={() => navigate('/admin/dashboard')}
            variant="outline"
          >
            Admin Dashboard
          </Button>
        );
        break;

      default:
        buttons.push(
          <Button
            key="home"
            onClick={() => navigate('/dashboard')}
            variant="gradient"
          >
            Go to Dashboard
          </Button>
        );
    }

    return buttons;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Checking payment status...</p>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusMessage();

  return (
    <div className="min-h-screen bg-gray-900 pt-20">
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            {/* Status Icon */}
            <div className="mb-6">
              {getStatusIcon()}
            </div>

            {/* Status Message */}
            <h1 className={`text-3xl font-bold mb-4 ${statusInfo.color}`}>
              {statusInfo.title}
            </h1>
            
            <p className="text-gray-300 text-lg mb-8">
              {statusInfo.message}
            </p>

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/20 border border-red-500 text-red-400 rounded-lg p-4 mb-6">
                {error}
              </div>
            )}

            {/* Payment Details */}
            {paymentStatus && (
              <div className="bg-gray-700 rounded-lg p-6 mb-8 text-left">
                <h3 className="text-lg font-semibold text-white mb-4">Payment Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Booking ID:</span>
                    <span className="text-white">{bookingId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Amount:</span>
                    <span className="text-white">₱{Number(paymentStatus.amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Payment Method:</span>
                    <span className="text-white">{paymentStatus.currency || 'GCash'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className={`font-medium ${
                      paymentStatus.status === 'succeeded' ? 'text-green-400' :
                      paymentStatus.status === 'failed' ? 'text-red-400' :
                      'text-yellow-400'
                    }`}>
                      {paymentStatus.status}
                    </span>
                  </div>
                  {paymentStatus.created_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Date:</span>
                      <span className="text-white">
                        {new Date(paymentStatus.created_at).toLocaleDateString('en-PH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {getActionButtons()}
            </div>

            {/* Additional Information */}
            <div className="mt-8 text-sm text-gray-400">
              {status === 'succeeded' && (
                <p>
                  A confirmation email has been sent to your registered email address.
                  If you don't receive it within 10 minutes, please check your spam folder.
                </p>
              )}
              
              {status === 'failed' && (
                <p>
                  If you continue to experience issues, please contact our support team at{' '}
                  <a href="mailto:support@stay.com" className="text-purple-400 hover:underline">
                    support@stay.com
                  </a>
                </p>
              )}
              
              {status === 'pending' && (
                <p>
                  Please do not close this window. You will be automatically redirected once the payment is processed.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentStatus;