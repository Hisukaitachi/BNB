// frontend/src/pages/refund/RefundSuccessPage.jsx - ADMIN SUCCESS PAGE
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { CheckCircle, ArrowLeft, Eye, DollarSign, User, Bell, AlertCircle } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

const RefundSuccessPage = () => {
  const { refundId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [refundData, setRefundData] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    // Only admins can access
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    // Trigger confetti animation
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#a855f7', '#ec4899', '#3b82f6']
      });
      
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#a855f7', '#ec4899', '#3b82f6']
      });
    }, 250);

    // Get refund data from location state
    if (location.state?.refund) {
      setRefundData(location.state.refund);
    }
    if (location.state?.result) {
      setResult(location.state.result);
    }

    return () => clearInterval(interval);
  }, [refundId, location.state, user, navigate]);

  return (
    <div className="min-h-screen bg-gray-900 pt-20">
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Success Card */}
          <div className="bg-gray-800 rounded-2xl p-8 md:p-12 border-2 border-green-500 shadow-2xl shadow-green-500/20">
            {/* Admin Badge */}
            <div className="flex justify-center mb-4">
              <span className="bg-purple-100 text-purple-800 text-xs font-medium px-3 py-1 rounded-full">
                ADMIN ACTION
              </span>
            </div>

            {/* Success Icon */}
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full mb-6 mx-auto animate-bounce">
              <CheckCircle className="w-14 h-14 text-white" />
            </div>

            {/* Success Message */}
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">
              Refund Processed Successfully!
            </h1>
            
            <p className="text-gray-300 text-lg mb-8 text-center">
              The refund has been processed via PayMongo and the client has been notified.
            </p>

            {/* Refund Details */}
            {refundData && (
              <div className="bg-gray-700 rounded-xl p-6 mb-6">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
                  Refund Details
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-600">
                    <span className="text-gray-400">Refund ID</span>
                    <span className="text-white font-mono">#{refundData.id}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-gray-600">
                    <span className="text-gray-400">Booking ID</span>
                    <span className="text-white font-mono">#{refundData.booking_id}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b border-gray-600">
                    <span className="text-gray-400 flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      Client
                    </span>
                    <span className="text-white">{refundData.client_name}</span>
                  </div>
                  
                  {refundData.listing_title && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-600">
                      <span className="text-gray-400">Property</span>
                      <span className="text-white">{refundData.listing_title}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-400 flex items-center">
                      <DollarSign className="w-4 h-4 mr-1" />
                      Refund Amount
                    </span>
                    <span className="text-green-400 font-bold text-2xl">
                      ₱{Number(refundData.refund_amount || result?.totalRefunded || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* PayMongo Results */}
            {result?.paymongoResults && result.paymongoResults.length > 0 && (
              <div className="bg-gray-700 rounded-xl p-6 mb-6">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
                  PayMongo Refund IDs
                </h3>
                <div className="space-y-2">
                  {result.paymongoResults.map((pmResult, index) => (
                    <div key={index} className="flex justify-between items-center text-sm py-2 border-b border-gray-600 last:border-0">
                      <span className="text-gray-400">Refund #{index + 1}</span>
                      <span className="text-white font-mono text-xs">{pmResult.refundId}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Client Notification Info */}
            <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-6 mb-6">
              <h4 className="text-blue-400 font-semibold mb-3 flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Client Notification Sent
              </h4>
              <ul className="space-y-2 text-sm text-blue-300">
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>In-app notification sent to client</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  <span>Email notification sent to {refundData?.client_email}</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">⏱️</span>
                  <span>Client will receive funds in 5-10 business days</span>
                </li>
              </ul>
            </div>

            {/* Manual Refund Reminder */}
            {refundData?.personal_refund > 0 && (
              <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-400 font-medium text-sm">Action Still Required</p>
                    <p className="text-yellow-300 text-xs mt-1">
                      Don't forget to manually process the personal payment refund of ₱{Number(refundData.personal_refund).toLocaleString()} 
                      and mark it as complete in the refund management panel.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={() => navigate('/admin/refunds')}
                variant="gradient"
                size="lg"
                className="flex-1"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Refund Management
              </Button>
              
              <Button
                onClick={() => navigate(`/admin/refunds/${refundId}/details`)}
                variant="outline"
                size="lg"
                className="flex-1 border-gray-600 text-gray-300"
              >
                <Eye className="w-5 h-5 mr-2" />
                View Details
              </Button>
            </div>

            {/* Admin Note */}
            <p className="text-gray-500 text-sm mt-8 text-center">
              Refund processed on {new Date().toLocaleString('en-PH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefundSuccessPage;