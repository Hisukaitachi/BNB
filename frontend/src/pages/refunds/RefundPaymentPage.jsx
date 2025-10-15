// frontend/src/pages/refund/RefundPaymentPage.jsx - ADMIN ONLY
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  CreditCard,
  AlertCircle,
  Shield,
  DollarSign,
  Calendar,
  User,
  Info,
  CheckCircle
} from 'lucide-react';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import refundService from '../../services/refundService';

const RefundPaymentPage = () => {
  const { refundId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [refundData, setRefundData] = useState(null);

  useEffect(() => {
    // Only admins can access this page
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    if (!refundId) {
      navigate('/admin/refunds');
      return;
    }

    // If we have refund data from navigation state, use it
    if (location.state?.refund) {
      setRefundData(location.state.refund);
      setLoading(false);
    } else {
      // Otherwise fetch it
      fetchRefundData();
    }
  }, [refundId, location.state, user, navigate]);

  const fetchRefundData = async () => {
    try {
      setLoading(true);
      const refund = await refundService.getRefundDetails(refundId);
      
      if (!refund) {
        setError('Refund not found');
        return;
      }

      if (refund.status !== 'approved') {
        setError('This refund is not ready for processing');
        return;
      }

      setRefundData(refund);
    } catch (err) {
      console.error('Error fetching refund:', err);
      setError('Failed to load refund information');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRefund = async () => {
    if (!window.confirm(
      `⚠️ Admin Confirmation Required\n\n` +
      `Refund Amount: ₱${refundData.refund_amount.toLocaleString()}\n` +
      `Client: ${refundData.client_name}\n` +
      `Booking: #${refundData.booking_id}\n\n` +
      `This will immediately process the refund via PayMongo.\n\n` +
      `Continue?`
    )) {
      return;
    }

    setProcessing(true);
    setError('');

    try {
      console.log('🔄 Admin processing refund confirmation for refund:', refundId);
      
      // Call backend to process refund (creates PayMongo refund)
      const result = await refundService.confirmRefundIntent(refundData.refund_intent_id);
      
      console.log('✅ Refund processed:', result);

      // Redirect to success page
      navigate(`/refund/success/${refundId}`, {
        state: {
          refund: refundData,
          result
        }
      });

    } catch (err) {
      console.error('❌ Refund processing error:', err);
      setError(err.message || 'Failed to process refund. Please try again.');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20">
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-gray-800 rounded-xl p-8 text-center">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-4">Error</h2>
              <p className="text-gray-400 mb-6">{error}</p>
              <Button onClick={() => navigate('/admin/refunds')} variant="gradient">
                Back to Refund Management
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!refundData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-20">
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate('/admin/refunds')}
            className="flex items-center space-x-2 text-gray-300 hover:text-white mb-6 transition"
            disabled={processing}
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Refund Management</span>
          </button>

          {/* Main Content */}
          <div className="bg-gray-800 rounded-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-white flex items-center">
                <DollarSign className="w-7 h-7 mr-2 text-purple-500" />
                Process Refund Payment
              </h1>
              <div className="flex items-center gap-2">
                <span className="bg-purple-100 text-purple-800 text-xs font-medium px-3 py-1 rounded-full">
                  ADMIN
                </span>
                <span className="bg-green-100 text-green-800 text-xs font-medium px-3 py-1 rounded-full">
                  ✓ APPROVED
                </span>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-500 text-red-400 rounded-lg p-4 mb-6 flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Admin Action Notice */}
            <div className="bg-indigo-900/20 border border-indigo-600 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-indigo-400 font-medium">Admin Action Required</p>
                  <p className="text-indigo-300 text-sm mt-1">
                    You are about to process this refund via PayMongo. The client will be notified automatically 
                    once the refund is completed.
                  </p>
                </div>
              </div>
            </div>

            {/* Client Information */}
            <div className="bg-gray-700 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Client Information
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Name:</span>
                  <span className="text-white font-medium">{refundData.client_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Email:</span>
                  <span className="text-white">{refundData.client_email}</span>
                </div>
                {refundData.client_phone && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Phone:</span>
                    <span className="text-white">{refundData.client_phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Booking Information */}
            <div className="bg-gray-700 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Booking Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Refund ID:</span>
                  <span className="text-white font-medium">#{refundData.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Booking ID:</span>
                  <span className="text-white font-medium">#{refundData.booking_id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Property:</span>
                  <span className="text-white">{refundData.listing_title}</span>
                </div>
                {refundData.listing_location && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Location:</span>
                    <span className="text-white text-sm">{refundData.listing_location}</span>
                  </div>
                )}
                {refundData.start_date && refundData.end_date && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Dates:</span>
                    <span className="text-white text-sm">
                      {new Date(refundData.start_date).toLocaleDateString()} - {new Date(refundData.end_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {refundData.booking_type && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Type:</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      refundData.booking_type === 'reserve' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {refundData.booking_type === 'reserve' ? 'Reserve (50%)' : 'Full Booking'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Refund Breakdown */}
            <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-lg p-6 border border-purple-600/50 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-purple-400" />
                Refund Breakdown
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-gray-600">
                  <span className="text-gray-300">Total Paid:</span>
                  <span className="text-white font-semibold">₱{Number(refundData.amount_paid).toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Refund Amount ({refundData.refund_percentage}%):</span>
                  <span className="text-green-400 font-semibold text-xl">
                    ₱{Number(refundData.refund_amount).toLocaleString()}
                  </span>
                </div>
                
                {refundData.deduction_amount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Cancellation Fee:</span>
                    <span className="text-red-400 font-medium">-₱{Number(refundData.deduction_amount).toLocaleString()}</span>
                  </div>
                )}

                {refundData.platform_paid > 0 && (
                  <div className="pt-3 border-t border-gray-600 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400 flex items-center">
                        <CreditCard className="w-4 h-4 mr-1" />
                        Platform Payment:
                      </span>
                      <span className="text-white">₱{Number(refundData.platform_paid).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400 ml-5">Platform Refund:</span>
                      <span className="text-green-400">₱{Number(refundData.platform_refund).toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {refundData.personal_paid > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400 flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        Personal Payment:
                      </span>
                      <span className="text-white">₱{Number(refundData.personal_paid).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400 ml-5">Personal Refund:</span>
                      <span className="text-yellow-400">₱{Number(refundData.personal_refund).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Policy Info */}
              <div className="mt-4 pt-4 border-t border-gray-600/50">
                <div className="flex items-start gap-2 text-xs text-gray-300">
                  <Info className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-purple-300">{refundData.policy_applied}</p>
                    {refundData.hours_before_checkin !== null && refundData.hours_before_checkin !== undefined && (
                      <p className="mt-1">Cancelled {refundData.hours_before_checkin} hours before check-in</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Cancellation Reason */}
            <div className="bg-gray-700 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Cancellation Reason</h3>
              <p className="text-gray-300 text-sm">{refundData.reason}</p>
            </div>

            {/* Admin Notes (if any) */}
            {refundData.admin_notes && (
              <div className="bg-gray-700 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">Admin Notes</h3>
                <p className="text-gray-300 text-sm">{refundData.admin_notes}</p>
              </div>
            )}

            {/* Personal Refund Notice */}
            {refundData.personal_refund > 0 && (
              <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-400 font-medium text-sm">Manual Refund Required</p>
                    <p className="text-yellow-300 text-xs mt-1">
                      ₱{Number(refundData.personal_refund).toLocaleString()} must be refunded manually after this process. 
                      You'll need to use the "Complete Manual Refund" option after confirming this payment refund.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* What Will Happen */}
            <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4 mb-6">
              <h4 className="text-blue-400 font-semibold mb-3 flex items-center">
                <Info className="w-5 h-5 mr-2" />
                What Will Happen When You Click Confirm:
              </h4>
              <ul className="space-y-2 text-sm text-blue-300">
                <li className="flex items-start">
                  <span className="mr-2">1.</span>
                  <span>PayMongo will immediately process the refund of ₱{Number(refundData.platform_refund || refundData.refund_amount).toLocaleString()}</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">2.</span>
                  <span>Refund status will be updated to "Completed" or "Partial Completed"</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">3.</span>
                  <span>Client will receive an automatic notification about the refund</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">4.</span>
                  <span>Funds will appear in client's account within 5-10 business days</span>
                </li>
                {refundData.personal_refund > 0 && (
                  <li className="flex items-start">
                    <span className="mr-2">5.</span>
                    <span className="text-yellow-300">You must manually process ₱{Number(refundData.personal_refund).toLocaleString()} separately</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Confirm Button */}
            <Button
              onClick={handleConfirmRefund}
              loading={processing}
              variant="gradient"
              size="lg"
              className="w-full mb-4"
              disabled={processing}
            >
              {processing ? 'Processing Refund via PayMongo...' : `Confirm & Process Refund of ₱${Number(refundData.platform_refund || refundData.refund_amount).toLocaleString()}`}
            </Button>

            {/* Security Notice */}
            <div className="text-center">
              <p className="text-xs text-gray-400 flex items-center justify-center mb-2">
                <Shield className="w-4 h-4 mr-1" />
                Secure refund processing via PayMongo API
              </p>
              <p className="text-xs text-gray-500">
                This action will immediately trigger the refund transaction
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefundPaymentPage;