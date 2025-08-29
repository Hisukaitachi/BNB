// frontend/src/pages/payment/PaymentPage.jsx
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, Smartphone, ArrowLeft } from 'lucide-react';
import Button from '../../components/ui/Button';
import paymentService from '../../services/paymentService';

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('gcash');
  
  // Get booking data from navigation state
  const { bookingId, paymentIntent } = location.state || {};

  useEffect(() => {
    if (!bookingId || !paymentIntent) {
      navigate('/my-bookings');
    }
  }, [bookingId, paymentIntent, navigate]);

  const handlePayment = async () => {
    setLoading(true);
    setError('');
    
    try {
      // For GCash, redirect to PayMongo checkout
      if (paymentMethod === 'gcash') {
        const { success, redirectUrl } = await paymentService.processGCashPayment({
          paymentIntent,
          paymentMethod: 'gcash'
        });
        
        if (success && redirectUrl) {
          // Redirect to GCash payment page
          window.location.href = redirectUrl;
        } else {
          throw new Error('Failed to initiate GCash payment');
        }
      }
    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!bookingId) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Invalid Payment Request</h2>
          <Button onClick={() => navigate('/my-bookings')} variant="gradient">
            Go to My Bookings
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

          {/* Payment Form */}
          <div className="bg-gray-800 rounded-xl p-8">
            <h1 className="text-2xl font-bold text-white mb-6">Complete Payment</h1>
            
            {error && (
              <div className="bg-red-900/20 border border-red-500 text-red-400 rounded-lg p-4 mb-6">
                {error}
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

                <label className="flex items-center p-4 border border-gray-600 rounded-lg cursor-not-allowed opacity-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    disabled
                    className="mr-4"
                  />
                  <CreditCard className="w-6 h-6 text-gray-500 mr-3" />
                  <div>
                    <div className="text-gray-400 font-medium">Credit/Debit Card</div>
                    <div className="text-sm text-gray-500">Coming soon</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-gray-700 rounded-lg p-6 mb-8">
              <h4 className="text-lg font-semibold text-white mb-4">Payment Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-gray-300">
                  <span>Booking Amount</span>
                  <span>₱{paymentIntent?.amount ? (paymentIntent.amount / 100).toLocaleString() : '0'}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Processing Fee</span>
                  <span>₱{paymentIntent?.amount ? ((paymentIntent.amount / 100) * 0.025).toLocaleString() : '0'}</span>
                </div>
                <div className="border-t border-gray-600 pt-2 mt-2">
                  <div className="flex justify-between text-white font-semibold">
                    <span>Total</span>
                    <span>₱{paymentIntent?.amount ? ((paymentIntent.amount / 100) * 1.025).toLocaleString() : '0'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pay Button */}
            <Button
              onClick={handlePayment}
              loading={loading}
              variant="gradient"
              size="lg"
              className="w-full"
              disabled={!paymentMethod}
            >
              {loading ? 'Processing...' : `Pay with ${paymentMethod === 'gcash' ? 'GCash' : 'Card'}`}
            </Button>

            <div className="mt-4 text-center">
              <p className="text-sm text-gray-400">
                Your payment is secured by PayMongo
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;