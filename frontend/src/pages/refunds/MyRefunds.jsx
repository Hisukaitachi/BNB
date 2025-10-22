// frontend/src/pages/refunds/MyRefunds.jsx - UPDATED WITH NEW REFUND SERVICE
import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Clock, CheckCircle, XCircle, AlertCircle, 
  ArrowLeft, Info, CreditCard, User, Calendar, MapPin,
  FileText, TrendingDown, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import refundService, { REFUND_STATUS } from '../../services/refundService';
import Button from '../../components/ui/Button';

const MyRefunds = () => {
  const navigate = useNavigate();
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [statistics, setStatistics] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    loadRefunds();
  }, [filter]);

  const loadRefunds = async () => {
    try {
      setLoading(true);
      setError(null);
      const status = filter === 'all' ? null : filter;
      const data = await refundService.getMyRefunds(status);
      
      const formatted = data.map(refund => refundService.formatRefund(refund));
      setRefunds(formatted);
      
      const stats = refundService.calculateStatistics(formatted);
      setStatistics(stats);
    } catch (err) {
      console.error('Failed to load refunds:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterOptions = [
    { key: 'all', label: 'All', count: statistics?.total || 0 },
    { key: REFUND_STATUS.PENDING, label: 'Pending', count: statistics?.pending || 0 },
    { key: REFUND_STATUS.APPROVED, label: 'Approved', count: statistics?.approved || 0 },
    { key: REFUND_STATUS.PROCESSING, label: 'Processing', count: statistics?.processing || 0 },
    { key: REFUND_STATUS.COMPLETED, label: 'Completed', count: statistics?.completed || 0 },
    { key: REFUND_STATUS.PARTIAL_COMPLETED, label: 'Partial', count: statistics?.partialCompleted || 0 },
    { key: REFUND_STATUS.MANUAL_REVIEW, label: 'Manual', count: statistics?.manualReview || 0 },
    { key: REFUND_STATUS.REJECTED, label: 'Rejected', count: statistics?.rejected || 0 }
  ];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={loadRefunds} variant="gradient">Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => navigate('/my-bookings')}
              className="text-gray-400 hover:text-white transition"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">My Refunds</h1>
          </div>
          <p className="text-gray-400 text-sm sm:ml-9">
            Track your refund requests and their status
          </p>
        </div>
        
        <Button
          onClick={loadRefunds}
          variant="outline"
          size="sm"
          className="border-gray-600 w-full sm:w-auto"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Summary */}
      {statistics && statistics.total > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Requested</p>
                <p className="text-xl sm:text-2xl font-bold text-white">
                  ₱{Number(statistics.totalAmountPaid ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-blue-500 p-2 sm:p-3 rounded-lg">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Refunded</p>
                <p className="text-xl sm:text-2xl font-bold text-green-400">
                  ₱{Number(statistics.totalRefunded ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-green-500 p-2 sm:p-3 rounded-lg">
                <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Deductions</p>
                <p className="text-xl sm:text-2xl font-bold text-red-400">
                  ₱{Number(statistics.totalDeductions ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-red-500 p-2 sm:p-3 rounded-lg">
                <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Section */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 mb-6">
        {/* Mobile Filter Toggle */}
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="sm:hidden w-full flex items-center justify-between text-white mb-3 p-2 bg-gray-700 rounded-lg"
        >
          <span className="font-medium">Filter: {filterOptions.find(f => f.key === filter)?.label}</span>
          {showMobileFilters ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {/* Filter Buttons */}
        <div className={`flex flex-wrap gap-2 ${showMobileFilters ? 'block' : 'hidden sm:flex'}`}>
          {filterOptions.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => {
                setFilter(key);
                setShowMobileFilters(false);
              }}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm transition whitespace-nowrap flex items-center gap-2 ${
                filter === key
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <span>{label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                filter === key ? 'bg-white/20' : 'bg-gray-600'
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Refunds List */}
      {refunds.length === 0 ? (
        <div className="text-center py-12 sm:py-16 bg-gray-800 rounded-xl border border-gray-700">
          <DollarSign className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">No refunds found</h3>
          <p className="text-gray-400 mb-6 text-sm sm:text-base px-4">
            {filter === 'all' 
              ? 'You haven\'t requested any refunds yet.' 
              : `No ${filter} refunds.`}
          </p>
          <Button
            onClick={() => navigate('/my-bookings')}
            variant="gradient"
            className="w-full sm:w-auto mx-4 sm:mx-0"
          >
            View My Bookings
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {refunds.map((refund) => (
            <RefundCard key={refund.id} refund={refund} />
          ))}
        </div>
      )}
    </div>
  );
};

// Refund Card Component
const RefundCard = ({ refund }) => {
  const [expanded, setExpanded] = useState(false);

  const getStatusIcon = () => {
    switch (refund.status) {
      case REFUND_STATUS.PENDING:
        return <Clock className="w-5 h-5 text-yellow-400" />;
      case REFUND_STATUS.APPROVED:
        return <CheckCircle className="w-5 h-5 text-indigo-400" />;
      case REFUND_STATUS.PROCESSING:
        return <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />;
      case REFUND_STATUS.COMPLETED:
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case REFUND_STATUS.PARTIAL_COMPLETED:
        return <AlertCircle className="w-5 h-5 text-teal-400" />;
      case REFUND_STATUS.MANUAL_REVIEW:
        return <User className="w-5 h-5 text-purple-400" />;
      case REFUND_STATUS.REJECTED:
        return <XCircle className="w-5 h-5 text-red-400" />;
      case REFUND_STATUS.FAILED:
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusMessage = () => {
    switch (refund.status) {
      case REFUND_STATUS.PENDING:
        return {
          icon: '⏳',
          text: 'Your refund is pending review by admin. You will be notified once processed.',
          color: 'bg-yellow-900/20 border-yellow-600 text-yellow-400'
        };
      case REFUND_STATUS.APPROVED:
        return {
          icon: '✓',
          text: 'Your refund has been approved and will be processed shortly.',
          color: 'bg-indigo-900/20 border-indigo-600 text-indigo-400'
        };
      case REFUND_STATUS.PROCESSING:
        return {
          icon: '🔄',
          text: 'Your refund is being processed via PayMongo. Funds will appear in 5-10 business days.',
          color: 'bg-blue-900/20 border-blue-600 text-blue-400'
        };
      case REFUND_STATUS.COMPLETED:
        return {
          icon: '✅',
          text: 'Refund completed! Funds should appear in your account within 5-10 business days.',
          color: 'bg-green-900/20 border-green-600 text-green-400'
        };
      case REFUND_STATUS.PARTIAL_COMPLETED:
        return {
          icon: '⚠️',
          text: `Platform refund of ${refund.formattedPlatformRefund} completed. Personal refund of ${refund.formattedPersonalRefund} is being processed manually. Our team will contact you within 24-48 hours.`,
          color: 'bg-teal-900/20 border-teal-600 text-teal-400'
        };
      case REFUND_STATUS.MANUAL_REVIEW:
        return {
          icon: '👤',
          text: 'Your refund requires manual processing. Our team will contact you within 24-48 hours.',
          color: 'bg-purple-900/20 border-purple-600 text-purple-400'
        };
      case REFUND_STATUS.REJECTED:
        return {
          icon: '❌',
          text: 'Refund request was rejected. Please contact support if you have questions.',
          color: 'bg-red-900/20 border-red-600 text-red-400'
        };
      case REFUND_STATUS.FAILED:
        return {
          icon: '⚠️',
          text: 'Refund processing failed. Our team has been notified and will resolve this manually.',
          color: 'bg-red-900/20 border-red-600 text-red-400'
        };
      default:
        return null;
    }
  };

  const statusMessage = getStatusMessage();

  return (
    <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-2">
            <h3 className="text-base sm:text-lg font-semibold text-white break-words">
              {refund.listing_title}
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <FileText className="w-4 h-4 flex-shrink-0" />
              Refund #{refund.id}
            </span>
            <span>•</span>
            <span>Booking #{refund.booking_id}</span>
            <span>•</span>
            <span>{refund.timeAgo}</span>
          </div>
        </div>
        
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${refund.statusColor} flex items-center gap-1 whitespace-nowrap`}>
          {getStatusIcon()}
          <span className="hidden sm:inline">{refund.statusLabel}</span>
        </span>
      </div>

      {/* Amount Breakdown */}
      <div className="bg-gray-700/50 rounded-lg p-3 sm:p-4 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Total Paid</p>
            <p className="text-base sm:text-lg font-bold text-white">{refund.formattedTotalPaid}</p>
          </div>
          
          <div>
            <p className="text-xs text-gray-400 mb-1">Refund ({refund.refundPercentageText})</p>
            <p className="text-base sm:text-lg font-bold text-green-400">{refund.formattedRefundAmount}</p>
          </div>
          
          {refund.hasDeduction && (
            <div className="col-span-2 sm:col-span-1">
              <p className="text-xs text-gray-400 mb-1">Cancellation Fee</p>
              <p className="text-base sm:text-lg font-bold text-red-400">{refund.formattedDeduction}</p>
            </div>
          )}
        </div>
        
        {/* Platform vs Personal Breakdown */}
        {(refund.platform_refund > 0 || refund.personal_refund > 0) && (
          <div className="mt-3 pt-3 border-t border-gray-600 space-y-2">
            {refund.platform_refund > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400 flex items-center gap-1">
                  <CreditCard className="w-4 h-4" />
                  Platform Refund:
                </span>
                <span className="text-white font-medium">{refund.formattedPlatformRefund}</span>
              </div>
            )}
            
            {refund.personal_refund > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400 flex items-center gap-1">
                  <User className="w-4 h-4" />
                  Personal Refund:
                </span>
                <span className="text-white font-medium">{refund.formattedPersonalRefund}</span>
              </div>
            )}
          </div>
        )}
        
        {/* Policy Info */}
        <div className="mt-3 pt-3 border-t border-gray-600">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400 break-words">{refund.policyText}</p>
          </div>
        </div>
      </div>

      {/* Booking Details */}
      {refund.start_date && refund.end_date && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-sm">
          <div className="flex items-center gap-2 text-gray-300">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span className="truncate text-xs sm:text-sm">
              {new Date(refund.start_date).toLocaleDateString()} - {new Date(refund.end_date).toLocaleDateString()}
            </span>
          </div>
          
          {refund.listing_location && (
            <div className="flex items-center gap-2 text-gray-300">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate text-xs sm:text-sm">{refund.listing_location}</span>
            </div>
          )}
        </div>
      )}

      {/* Expand/Collapse Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-center text-sm text-purple-400 hover:text-purple-300 py-2 border-t border-gray-700 transition"
      >
        {expanded ? '▲ Hide Details' : '▼ Show Details'}
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-4 space-y-4 pt-4 border-t border-gray-700">
          {/* Cancellation Reason */}
          <div>
            <label className="text-sm text-gray-400 block mb-2">Cancellation Reason:</label>
            <div className="bg-gray-700/50 rounded-lg p-3">
              <p className="text-white text-sm break-words">{refund.reason}</p>
            </div>
          </div>

          {/* Admin Notes */}
          {refund.admin_notes && (
            <div>
              <label className="text-sm text-gray-400 block mb-2">Admin Notes:</label>
              <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3">
                <p className="text-blue-300 text-sm break-words">{refund.admin_notes}</p>
              </div>
            </div>
          )}

          {/* Payment Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Platform Paid:</label>
              <p className="text-white font-medium">₱{Number(refund.platform_paid || 0).toLocaleString()}</p>
            </div>
            
            {refund.personal_paid > 0 && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">Personal Paid:</label>
                <p className="text-white font-medium">₱{Number(refund.personal_paid || 0).toLocaleString()}</p>
              </div>
            )}
            
            {refund.hours_before_checkin !== undefined && (
              <div>
                <label className="text-xs text-gray-400 block mb-1">Hours Before Check-in:</label>
                <p className="text-white font-medium">{refund.hours_before_checkin}h</p>
              </div>
            )}
          </div>

          {/* PayMongo Refund IDs */}
          {refund.paymongo_refund_ids && (
            <div>
              <label className="text-sm text-gray-400 block mb-2">Transaction IDs:</label>
              <div className="bg-gray-700/50 rounded-lg p-3 overflow-x-auto">
                <p className="text-white text-xs font-mono break-all">
                  {typeof refund.paymongo_refund_ids === 'string' 
                    ? refund.paymongo_refund_ids 
                    : JSON.stringify(refund.paymongo_refund_ids)}
                </p>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-gray-400 block mb-1">Requested:</label>
              <p className="text-gray-300">{refund.formattedDate}</p>
            </div>
            
            {refund.processed_at && (
              <div>
                <label className="text-gray-400 block mb-1">Processed:</label>
                <p className="text-gray-300">
                  {new Date(refund.processed_at).toLocaleDateString('en-PH', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status Message */}
      {statusMessage && (
        <div className={`mt-4 border rounded-lg p-3 ${statusMessage.color}`}>
          <p className="text-xs break-words">
            {statusMessage.icon} {statusMessage.text}
          </p>
        </div>
      )}
    </div>
  );
};

export default MyRefunds;