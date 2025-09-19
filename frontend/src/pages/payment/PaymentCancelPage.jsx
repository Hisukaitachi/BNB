// frontend/src/pages/payment/PaymentCancelPage.jsx
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import Button from '../../components/ui/Button';

const PaymentCancelPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('booking_id');

  useEffect(() => {
    console.log('Payment cancelled for booking:', bookingId);
  }, [bookingId]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-800 rounded-xl p-8">
          <div className="w-20 h-20 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>

          <h1 className="text-3xl font-bold text-white text-center mb-2">
            Payment Cancelled
          </h1>

          <p className="text-gray-400 text-center mb-8">
            Your payment was cancelled. No charges have been made.
          </p>

          {bookingId && (
            <div className="bg-gray-700 rounded-lg p-4 mb-8">
              <div className="flex justify-between">
                <span className="text-gray-400">Booking ID</span>
                <span className="text-white font-medium">#{bookingId}</span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={() => navigate('/payment', { 
                state: { bookingId } 
              })}
              variant="gradient"
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Payment Again
            </Button>
            
            <Button
              onClick={() => navigate('/my-bookings')}
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to My Bookings
            </Button>
            
            <Button
              onClick={() => navigate('/')}
              variant="secondary"
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancelPage;