// frontend/src/pages/payment/PaymentPage.jsx - FIXED VERSION
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, Smartphone, ArrowLeft, Eye, DollarSign, Shield } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import paymentService from '../../services/paymentService';
import { paymentAPI } from '../../services/api';

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('gcash');
  const [paymentData, setPaymentData] = useState(null);
  const [bookingDetails, setBookingDetails] = useState(null);
  
  // Get booking data from navigation state
  const { bookingId } = location.state || {};

  useEffect(() => {
    if (!bookingId) {
      navigate('/dashboard');
      return;
    }
    
    // Don't automatically create payment intent on load
    // Wait for user to click pay button
  }, [bookingId]);

  const handlePayment = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('Starting payment for booking:', bookingId);
      
      // Create payment intent and get checkout URL from backend
      const response = await paymentAPI.createPaymentIntent(bookingId);
      console.log('Payment response:', response.data);
      
      const { paymentIntent, booking } = response.data.data;
      
      // Check if we have the checkout URL
      if (paymentIntent?.checkout_url) {
        console.log('Redirecting to PayMongo checkout:', paymentIntent.checkout_url);
        // Redirect directly to PayMongo checkout page
        window.location.href = paymentIntent.checkout_url;
      } else {
        throw new Error('No payment URL received from server. Please try again.');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.response?.data?.message || err.message || 'Payment failed. Please try again.');
      setLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!confirm('Are you sure you want to process a refund for this payment?')) return;
    
    setLoading(true);
    try {
      // Admin-only refund functionality
      await paymentAPI.processRefund(paymentData.id);
      alert('Refund processed successfully');
      navigate('/admin/transactions');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get booking details for display
  const loadBookingDetails = async () => {
    try {
      // You might want to add an API endpoint to get booking details
      // For now, we'll just use what we have
      setBookingDetails(location.state?.bookingDetails || null);
    } catch (err) {
      console.error('Failed to load booking details:', err);
    }
  };

  

  useEffect(() => {
    if (bookingId) {
      loadBookingDetails();
    }
  }, [bookingId]);

  // CLIENT VIEW - Standard payment interface
  const renderClientView = () => (
    <div className="bg-gray-800 rounded-xl p-8">
      <h1 className="text-2xl font-bold text-white mb-6">Complete Payment</h1>
      
      {error && (
        <div className="bg-red-900/20 border border-red-500 text-red-400 rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {/* Booking Info */}
      {location.state?.amount && (
        <div className="bg-gray-700 rounded-lg p-6 mb-6">
          <h4 className="text-lg font-semibold text-white mb-4">Booking Details</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-gray-300">
              <span>Booking ID</span>
              <span>#{bookingId}</span>
            </div>
            {location.state?.listingTitle && (
              <div className="flex justify-between text-gray-300">
                <span>Property</span>
                <span>{location.state.listingTitle}</span>
              </div>
            )}
            {location.state?.dates && (
              <div className="flex justify-between text-gray-300">
                <span>Dates</span>
                <span>{location.state.dates}</span>
              </div>
            )}
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
      {location.state?.amount && (
        <div className="bg-gray-700 rounded-lg p-6 mb-8">
          <h4 className="text-lg font-semibold text-white mb-4">Payment Summary</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-gray-300">
              <span>Booking Amount</span>
              <span>₱{location.state.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Platform Fee (10%)</span>
              <span>₱{(location.state.amount * 0.1).toLocaleString()}</span>
            </div>
            <div className="border-t border-gray-600 pt-2 mt-2">
              <div className="flex justify-between text-white font-semibold">
                <span>Total to Pay</span>
                <span className="text-xl">₱{location.state.amount.toLocaleString()}</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Host will receive: ₱{(location.state.amount * 0.9).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pay Button */}
      <Button
        onClick={handlePayment}
        loading={loading}
        variant="gradient"
        size="lg"
        className="w-full"
        disabled={!paymentMethod || loading}
      >
        {loading ? 'Processing...' : 'Proceed to Payment'}
      </Button>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-400">
          You will be redirected to PayMongo secure checkout
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Powered by PayMongo - PCI DSS Compliant
        </p>
      </div>
    </div>
  );

  // ADMIN VIEW - Payment oversight and management
  const renderAdminView = () => (
    <div className="bg-gray-800 rounded-xl p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Shield className="w-8 h-8 text-purple-500" />
          <h1 className="text-2xl font-bold text-white">Payment Management</h1>
        </div>
        <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded">
          ADMIN VIEW
        </span>
      </div>
      
      {error && (
        <div className="bg-red-900/20 border border-red-500 text-red-400 rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {/* Payment Details */}
      <div className="bg-gray-700 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Payment Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Booking ID:</span>
            <span className="text-white ml-2">{bookingId}</span>
          </div>
          <div>
            <span className="text-gray-400">Amount:</span>
            <span className="text-white ml-2">₱{location.state?.amount?.toLocaleString() || '0'}</span>
          </div>
        </div>
      </div>

      {/* Admin Actions */}
      <div className="space-y-4">
        <div className="flex space-x-4">
          <Button
            onClick={() => navigate(`/admin/bookings/${bookingId}`)}
            variant="outline"
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Booking
          </Button>
          
          <Button
            onClick={handleRefund}
            variant="outline" 
            className="flex-1 border-red-500 text-red-400 hover:bg-red-900/20"
          >
            Process Refund
          </Button>
        </div>

        <Button
          onClick={() => navigate('/admin/transactions')}
          variant="secondary"
          className="w-full"
        >
          Back to Transactions
        </Button>
      </div>
    </div>
  );

  // HOST VIEW - Payment tracking and earnings
  const renderHostView = () => (
    <div className="bg-gray-800 rounded-xl p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <DollarSign className="w-8 h-8 text-green-500" />
          <h1 className="text-2xl font-bold text-white">Payment Details</h1>
        </div>
        <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
          HOST VIEW
        </span>
      </div>

      {/* Earnings Breakdown */}
      {location.state?.amount && (
        <div className="bg-gray-700 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Your Earnings</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-gray-300">
              <span>Total Payment</span>
              <span>₱{location.state.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Platform Fee (10%)</span>
              <span>-₱{(location.state.amount * 0.1).toLocaleString()}</span>
            </div>
            <div className="border-t border-gray-600 pt-2">
              <div className="flex justify-between text-green-400 font-semibold text-lg">
                <span>Your Earnings</span>
                <span>₱{(location.state.amount * 0.9).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Host Actions */}
      <div className="space-y-4">
        <Button
          onClick={() => navigate('/host/earnings')}
          variant="gradient"
          className="w-full"
        >
          View All Earnings
        </Button>
        
        <Button
          onClick={() => navigate('/host/bookings')}
          variant="outline"
          className="w-full"
        >
          Back to Bookings
        </Button>
      </div>
    </div>
  );

  if (!bookingId) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Invalid Payment Request</h2>
          <Button onClick={() => navigate('/dashboard')} variant="gradient">
            Go to Dashboard
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

          {/* Role-based Content */}
          {user?.role === 'client' && renderClientView()}
          {user?.role === 'admin' && renderAdminView()}
          {user?.role === 'host' && renderHostView()}
          
          {/* Fallback for unknown roles */}
          {!['client', 'admin', 'host'].includes(user?.role) && (
            <div className="bg-gray-800 rounded-xl p-8 text-center">
              <h2 className="text-xl font-bold text-white mb-4">Access Restricted</h2>
              <p className="text-gray-400 mb-6">You don't have permission to view this payment page.</p>
              <Button onClick={() => navigate('/dashboard')} variant="gradient">
                Go to Dashboard
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;