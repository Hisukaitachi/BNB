// frontend/src/pages/payment/PaymentReceiptPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, Printer, CheckCircle, Calendar, MapPin, User, CreditCard, ArrowLeft } from 'lucide-react';
import Button from '../../components/ui/Button';
import { paymentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const PaymentReceiptPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPaymentDetails();
  }, [bookingId]);

  const fetchPaymentDetails = async () => {
    try {
      const response = await paymentAPI.getPaymentStatus(bookingId);
      const paymentData = response.data.data?.payment;
      
      if (paymentData && paymentData.status === 'succeeded') {
        setPayment(paymentData);
      } else {
        setError('Payment receipt not available');
      }
    } catch (err) {
      setError('Failed to load payment receipt');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a text version of the receipt
    const receiptText = `
STAY - PAYMENT RECEIPT
========================
Receipt #: ${payment.payment_intent_id}
Date: ${new Date(payment.created_at).toLocaleDateString()}

BOOKING DETAILS
------------------------
Booking ID: #${bookingId}
Status: Confirmed

PAYMENT INFORMATION
------------------------
Amount Paid: ₱${payment.amount.toLocaleString()}
Payment Method: ${payment.currency === 'PHP' ? 'GCash/Card' : 'Online Payment'}
Transaction ID: ${payment.payment_intent_id}
Payment Date: ${new Date(payment.created_at).toLocaleString()}

BREAKDOWN
------------------------
Booking Amount: ₱${payment.amount.toLocaleString()}
Platform Fee (10%): ₱${(payment.platform_fee || payment.amount * 0.1).toLocaleString()}
Host Earnings: ₱${(payment.host_earnings || payment.amount * 0.9).toLocaleString()}

Thank you for your payment!
For support, contact: support@stay.com
    `;

    // Create blob and download
    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${bookingId}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Receipt Not Available</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <Button onClick={() => navigate(-1)} variant="gradient">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-20">
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Actions Bar - Hidden in print */}
          <div className="flex justify-between items-center mb-6 print:hidden">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-gray-300 hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            
            <div className="flex gap-2">
              <Button
                onClick={handlePrint}
                variant="outline"
                size="sm"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button
                onClick={handleDownload}
                variant="outline"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>

          {/* Receipt Container */}
          <div className="bg-white rounded-xl overflow-hidden print:rounded-none print:shadow-none shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold mb-2">STAY</h1>
                  <p className="text-purple-100">Payment Receipt</p>
                </div>
                <div className="text-right">
                  <div className="bg-white/20 backdrop-blur rounded-lg px-4 py-2">
                    <CheckCircle className="w-8 h-8 mx-auto mb-1" />
                    <p className="text-xs font-medium">PAID</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Receipt Details */}
            <div className="p-8">
              {/* Receipt Info */}
              <div className="border-b pb-6 mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Receipt Number</p>
                    <p className="font-mono text-gray-900">{payment.payment_intent_id?.slice(0, 20)}...</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-600">Date Issued</p>
                    <p className="text-gray-900">{new Date(payment.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Billing Details */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Details</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="font-medium text-gray-900">{user?.name || 'Guest'}</p>
                  <p className="text-gray-600 text-sm">{user?.email || 'Email'}</p>
                  <p className="text-gray-600 text-sm">User ID: #{payment.client_id}</p>
                </div>
              </div>

              {/* Payment Details */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Booking ID</span>
                    <span className="font-medium text-gray-900">#{bookingId}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Payment Method</span>
                    <span className="font-medium text-gray-900">
                      {payment.currency === 'PHP' ? 'GCash/Card' : 'Online Payment'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Transaction ID</span>
                    <span className="font-mono text-sm text-gray-900">
                      {payment.payment_intent_id?.slice(0, 25)}...
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-gray-600">Payment Date</span>
                    <span className="font-medium text-gray-900">
                      {new Date(payment.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Amount Breakdown */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Amount Breakdown</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Booking Amount</span>
                    <span className="text-gray-900">₱{payment.amount.toLocaleString()}</span>
                  </div>
                  {payment.platform_fee && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Platform Fee (10%)</span>
                        <span className="text-gray-700">₱{payment.platform_fee.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Host Earnings</span>
                        <span className="text-gray-700">₱{payment.host_earnings.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-semibold text-lg">
                      <span className="text-gray-900">Total Paid</span>
                      <span className="text-green-600">₱{payment.amount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t pt-6 text-center text-sm text-gray-600">
                <p className="mb-2">Thank you for your payment!</p>
                <p>This is an official receipt for your records.</p>
                <p className="mt-4 text-xs">
                  For questions about this payment, please contact support@stay.com
                </p>
              </div>
            </div>
          </div>

          {/* Additional Actions - Hidden in print */}
          <div className="mt-6 text-center print:hidden">
            <p className="text-gray-400 text-sm mb-4">
              Need help with this payment?
            </p>
            <Button
              onClick={() => navigate('/support')}
              variant="outline"
            >
              Contact Support
            </Button>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:rounded-none {
            border-radius: 0 !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PaymentReceiptPage;