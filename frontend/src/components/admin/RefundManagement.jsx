// frontend/src/components/admin/RefundManagement.jsx - COMPLETE ADMIN REFUND MANAGEMENT
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, Eye, Check, X, Search, RefreshCw, AlertCircle, 
  Clock, User, Calendar, MapPin, CreditCard, Info, FileText, CheckCircle
} from 'lucide-react';
import refundService, { REFUND_STATUS } from '../../services/refundService';
import Button from '../ui/Button';

const RefundManagement = () => {
  const navigate = useNavigate();
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statistics, setStatistics] = useState({});
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 50 });

  useEffect(() => {
    loadRefunds();
  }, [filter, pagination.page]);

  const loadRefunds = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(filter !== 'all' && { status: filter })
      };
      
      const data = await refundService.getAllRefundRequests(params);
      
      const formattedRefunds = data.refunds.map(refund => 
        refundService.formatRefund(refund)
      );
      
      setRefunds(formattedRefunds);
      setStatistics(data.statistics || {});
      setPagination(prev => ({ ...prev, ...data.pagination }));
    } catch (error) {
      console.error('Failed to load refunds:', error);
      alert('Failed to load refunds: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRefund = async (refundId, action, notes = '', customAmount = null) => {
    const actionText = action === 'approve' ? 'approve' : 'reject';
    
    if (!window.confirm(`Are you sure you want to ${actionText} this refund?`)) {
      return;
    }

    try {
      setProcessing(refundId);
      const result = await refundService.processRefund(refundId, action, notes, customAmount);
      
      if (action === 'approve' && result.data?.requiresConfirmation) {
        // ✅ FIXED: Store refund intent ID for later confirmation
        alert(
          `✅ Refund Approved!\n\n` +
          `Refund Amount: ₱${result.data.refundBreakdown?.total?.toLocaleString() || 'N/A'}\n` +
          `Platform: ₱${result.data.refundBreakdown?.platform?.toLocaleString() || 'N/A'}\n` +
          `${result.data.refundBreakdown?.personal > 0 ? `Personal: ₱${result.data.refundBreakdown.personal.toLocaleString()}\n` : ''}` +
          `\nRefund intent ID: ${result.data.refundIntentId}\n\n` +
          `Refund approved! You can now confirm and process it.`
        );
      } else if (action === 'approve') {
        alert('✅ Refund approved and processed successfully!');
      } else {
        alert('❌ Refund rejected successfully!');
      }
      
      await loadRefunds();
      setSelectedRefund(null);
      
    } catch (error) {
      console.error(`Failed to ${actionText} refund:`, error);
      alert(`❌ Failed to ${actionText} refund: ` + error.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleConfirmRefundIntent = async (refundIntentId) => {
    if (!window.confirm('⚠️ Confirm to process this refund via PayMongo? This action cannot be undone.')) {
      return;
    }

    try {
      setProcessing(selectedRefund?.id);
      const result = await refundService.confirmRefundIntent(refundIntentId);
      
      alert(
        `✅ Refund Processed Successfully!\n\n` +
        `Total Refunded: ₱${result.totalRefunded?.toLocaleString() || 'N/A'}\n` +
        `Status: ${result.status}\n\n` +
        `Funds will be returned to the customer within 5-10 business days.`
      );
      
      await loadRefunds();
      setSelectedRefund(null);
      
    } catch (error) {
      console.error('Failed to confirm refund intent:', error);
      alert('❌ Failed to process refund: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleCompletePersonalRefund = async (refundId, notes) => {
    if (!notes || notes.trim().length < 10) {
      alert('⚠️ Please provide details on how the refund was processed (minimum 10 characters)');
      return;
    }

    if (!window.confirm('✅ Confirm that you have manually refunded the personal payment amount?')) {
      return;
    }

    try {
      setProcessing(refundId);
      await refundService.completePersonalRefund(refundId, notes);
      alert('✅ Personal refund marked as completed!');
      await loadRefunds();
      setSelectedRefund(null);
    } catch (error) {
      console.error('Failed to complete personal refund:', error);
      alert('❌ Failed to complete personal refund: ' + error.message);
    } finally {
      setProcessing(null);
    }
  };

  const filteredRefunds = refunds.filter(refund => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      refund.client_name?.toLowerCase().includes(search) ||
      refund.listing_title?.toLowerCase().includes(search) ||
      refund.booking_id?.toString().includes(search) ||
      refund.id?.toString().includes(search)
    );
  });

  const filterOptions = [
    { key: 'all', label: 'All Refunds', count: statistics.total || 0, color: 'bg-gray-600' },
    { key: REFUND_STATUS.PENDING, label: 'Pending', count: statistics.pending || 0, color: 'bg-yellow-600' },
    { key: REFUND_STATUS.APPROVED, label: 'Approved', count: statistics.approved || 0, color: 'bg-indigo-600' },
    { key: REFUND_STATUS.PROCESSING, label: 'Processing', count: statistics.processing || 0, color: 'bg-blue-600' },
    { key: REFUND_STATUS.COMPLETED, label: 'Completed', count: statistics.completed || 0, color: 'bg-green-600' },
    { key: REFUND_STATUS.PARTIAL_COMPLETED, label: 'Partial', count: statistics.partialCompleted || 0, color: 'bg-teal-600' },
    { key: REFUND_STATUS.MANUAL_REVIEW, label: 'Manual Review', count: statistics.manualReview || 0, color: 'bg-purple-600' },
    { key: REFUND_STATUS.REJECTED, label: 'Rejected', count: statistics.rejected || 0, color: 'bg-red-600' },
    { key: REFUND_STATUS.FAILED, label: 'Failed', count: statistics.failed || 0, color: 'bg-red-700' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Refund Management</h2>
          <p className="text-gray-400 text-sm mt-1">
            Process and manage refund requests with automatic deduction calculations
          </p>
        </div>
        <Button onClick={loadRefunds} variant="outline" className="border-gray-600">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Refunds"
          value={statistics.total || 0}
          subtitle={`${statistics.requiresManualAction || 0} need action`}
          icon={DollarSign}
          color="bg-blue-500"
        />
        <StatCard
          title="Pending Review"
          value={statistics.pending || 0}
          subtitle="Waiting for approval"
          icon={AlertCircle}
          color="bg-yellow-500"
          highlight={statistics.pending > 0}
        />
        <StatCard
          title="Total Refunded"
          value={`₱${Number(statistics.total_refunded || 0).toLocaleString()}`}
          subtitle={`${statistics.completed || 0} completed`}
          icon={Check}
          color="bg-green-500"
        />
        <StatCard
          title="Total Deductions"
          value={`₱${Number(statistics.total_deductions || 0).toLocaleString()}`}
          subtitle="Cancellation fees"
          icon={DollarSign}
          color="bg-purple-500"
        />
      </div>

      {/* Filters and Search */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {filterOptions.map(option => (
              <button
                key={option.key}
                onClick={() => setFilter(option.key)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition flex items-center gap-2 ${
                  filter === option.key
                    ? `${option.color} text-white`
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <span>{option.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  filter === option.key ? 'bg-white/20' : 'bg-gray-600'
                }`}>
                  {option.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[250px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by ID, client, listing, or booking..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Refunds Table */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      ) : filteredRefunds.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
          <DollarSign className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No refunds found</h3>
          <p className="text-gray-400">
            {searchTerm ? 'No refunds match your search.' : filter === 'all' ? 'No refund requests yet.' : `No ${filter} refunds.`}
          </p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Client / Booking
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Amount Details
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Policy
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredRefunds.map((refund) => (
                  <RefundRow
                    key={refund.id}
                    refund={refund}
                    onView={() => setSelectedRefund(refund)}
                    onProcess={handleProcessRefund}
                    onConfirmIntent={handleConfirmRefundIntent}
                    onCompletePersonal={handleCompletePersonalRefund}
                    processing={processing === refund.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Refund Details Modal */}
      {selectedRefund && (
        <RefundDetailsModal
          refund={selectedRefund}
          onClose={() => setSelectedRefund(null)}
          onProcess={handleProcessRefund}
          onConfirmIntent={handleConfirmRefundIntent}
          onCompletePersonal={handleCompletePersonalRefund}
          processing={processing === selectedRefund.id}
        />
      )}
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, subtitle, icon: Icon, color, highlight }) => (
  <div className={`bg-gray-800 rounded-xl p-6 border ${highlight ? 'border-yellow-500 shadow-lg shadow-yellow-500/20' : 'border-gray-700'}`}>
    <div className="flex items-center justify-between mb-2">
      <div className={`${color} p-3 rounded-lg`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
    <p className="text-gray-400 text-sm">{title}</p>
    <p className="text-2xl font-bold text-white mt-1">{value}</p>
    {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
  </div>
);

// Refund Row Component
const RefundRow = ({ refund, onView, onProcess, onConfirmIntent, onCompletePersonal, processing }) => (
  <tr className="hover:bg-gray-700/50 transition">
    <td className="px-4 py-4 whitespace-nowrap">
      <div className="text-sm font-mono text-white">#{refund.id}</div>
      <div className="text-xs text-gray-400">Bkg #{refund.booking_id}</div>
    </td>
    <td className="px-4 py-4">
      <div className="text-sm font-medium text-white">{refund.client_name}</div>
      <div className="text-xs text-gray-400 truncate max-w-[200px]">{refund.listing_title}</div>
    </td>
    <td className="px-4 py-4">
      <div className="text-sm space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-xs">Paid:</span>
          <span className="text-white font-medium">{refund.formattedTotalPaid}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-xs">Refund:</span>
          <span className="text-green-400 font-medium">{refund.formattedRefundAmount}</span>
        </div>
        {refund.hasDeduction && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-xs">Fee:</span>
            <span className="text-red-400 font-medium">-{refund.formattedDeduction}</span>
          </div>
        )}
        {refund.hasPersonalPayment && (
          <div className="text-xs text-yellow-400 mt-1">
            👤 {refund.formattedPersonalRefund} personal
          </div>
        )}
      </div>
    </td>
    <td className="px-4 py-4">
      <div className="text-xs space-y-1">
        <div className="text-white font-medium">{refund.refundPercentageText}</div>
        <div className="text-gray-400 max-w-[150px] truncate">{refund.policyText}</div>
      </div>
    </td>
    <td className="px-4 py-4 whitespace-nowrap">
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${refund.statusColor}`}>
        {refund.statusIcon} {refund.statusLabel}
      </span>
    </td>
    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-400">
      <div>{refund.timeAgo}</div>
    </td>
    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => onView()}
          className="text-purple-400 hover:text-purple-300 p-1"
          title="View Details"
        >
          <Eye className="w-5 h-5" />
        </button>
        
        {/* Pending - Show Approve/Reject */}
        {refund.canProcess && !processing && (
          <>
            <button
              onClick={() => onProcess(refund.id, 'approve')}
              className="text-green-400 hover:text-green-300 p-1"
              title="Approve Refund"
            >
              <Check className="w-5 h-5" />
            </button>
            <button
              onClick={() => onProcess(refund.id, 'reject')}
              className="text-red-400 hover:text-red-300 p-1"
              title="Reject Refund"
            >
              <X className="w-5 h-5" />
            </button>
          </>
        )}
        
        {/* Approved - Show Confirm Button */}
        {refund.canConfirm && refund.refund_intent_id && !processing && (
          <button
            onClick={() => onConfirmIntent(refund.refund_intent_id)}
            className="text-indigo-400 hover:text-indigo-300 p-1"
            title="Confirm & Process Refund"
          >
            <CreditCard className="w-5 h-5" />
          </button>
        )}
        
        {/* Manual Review - Show Complete Button */}
        {refund.canCompleteManual && !processing && (
          <button
            onClick={() => {
              const notes = prompt('Enter completion notes (how refund was processed):');
              if (notes) onCompletePersonal(refund.id, notes);
            }}
            className="text-blue-400 hover:text-blue-300 p-1"
            title="Complete Manual Refund"
          >
            <User className="w-5 h-5" />
          </button>
        )}
        
        {processing && (
          <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
        )}
      </div>
    </td>
  </tr>
);

// Refund Details Modal Component
const RefundDetailsModal = ({ refund, onClose, onProcess, onConfirmIntent, onCompletePersonal, processing }) => {
  const [notes, setNotes] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [showCustomAmount, setShowCustomAmount] = useState(false);
  const [manualNotes, setManualNotes] = useState('');

  const handleApprove = () => {
    const amount = showCustomAmount && customAmount ? parseFloat(customAmount) : null;
    
    if (amount && (amount < 0 || amount > refund.amount_paid)) {
      alert(`⚠️ Refund amount must be between ₱0 and ₱${refund.amount_paid.toLocaleString()}`);
      return;
    }
    
    onProcess(refund.id, 'approve', notes, amount);
  };

  const handleReject = () => {
    if (!notes.trim()) {
      alert('⚠️ Please provide a reason for rejection');
      return;
    }
    onProcess(refund.id, 'reject', notes);
  };

  const handleCompleteManual = () => {
    if (!manualNotes.trim() || manualNotes.length < 10) {
      alert('⚠️ Please provide details on how the refund was processed (minimum 10 characters)');
      return;
    }
    onCompletePersonal(refund.id, manualNotes);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-xl p-6 max-w-4xl w-full my-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6" />
            Refund Details #{refund.id}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white" disabled={processing}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Status & Amount */}
          <div className="space-y-4">
            {/* Status Card */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <Info className="w-5 h-5" />
                Refund Status
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Status:</span>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${refund.statusColor}`}>
                    {refund.statusIcon} {refund.statusLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Requested:</span>
                  <span className="text-white text-sm">{refund.formattedDate}</span>
                </div>
                {refund.processed_by_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Processed by:</span>
                    <span className="text-white text-sm">{refund.processed_by_name}</span>
                  </div>
                )}
                {refund.refund_intent_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Intent ID:</span>
                    <span className="text-white text-xs font-mono">#{refund.refund_intent_id}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Amount Breakdown */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Amount Breakdown
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-gray-600">
                  <span className="text-gray-400 text-sm">Total Paid:</span>
                  <span className="text-white font-medium">{refund.formattedTotalPaid}</span>
                </div>
                
                {refund.platform_paid > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />
                      Platform Payment:
                    </span>
                    <span className="text-white text-sm">{refund.formattedPlatformRefund}</span>
                  </div>
                )}
                
                {refund.personal_paid > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Personal Payment:
                    </span>
                    <span className="text-white text-sm">{refund.formattedPersonalRefund}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-2 border-t border-gray-600">
                  <span className="text-gray-400 text-sm">Refund Amount ({refund.refundPercentageText}):</span>
                  <span className="text-green-400 font-medium text-lg">{refund.formattedRefundAmount}</span>
                </div>
                
                {refund.hasDeduction && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Cancellation Fee:</span>
                    <span className="text-red-400 font-medium">-{refund.formattedDeduction}</span>
                  </div>
                )}
              </div>
              
              {/* Policy Info */}
              <div className="mt-3 pt-3 border-t border-gray-600">
                <div className="text-xs text-gray-400">
                  📋 {refund.policyText}
                </div>
                {refund.hours_before_checkin !== null && refund.hours_before_checkin !== undefined && (
                  <div className="text-xs text-gray-400 mt-1">
                    ⏰ Cancelled {refund.hours_before_checkin} hours before check-in
                  </div>
                )}
              </div>
            </div>

            {/* Client Information */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <User className="w-5 h-5" />
                Client Information
              </h4>
              <div className="space-y-2">
                <div>
                  <span className="text-gray-400 text-sm block">Name:</span>
                  <span className="text-white">{refund.client_name}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-sm block">Email:</span>
                  <span className="text-white">{refund.client_email}</span>
                </div>
                {refund.client_phone && (
                  <div>
                    <span className="text-gray-400 text-sm block">Phone:</span>
                    <span className="text-white">{refund.client_phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Booking & Reason */}
          <div className="space-y-4">
            {/* Booking Information */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Booking Information
              </h4>
              <div className="space-y-2">
                <div>
                  <span className="text-gray-400 text-sm block">Listing:</span>
                  <span className="text-white font-medium">{refund.listing_title}</span>
                </div>
                {refund.listing_location && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-400 text-sm">{refund.listing_location}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-400 text-sm block">Booking ID:</span>
                  <span className="text-white">#{refund.booking_id}</span>
                </div>
                {refund.booking_type && (
                  <div>
                    <span className="text-gray-400 text-sm block">Booking Type:</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      refund.booking_type === 'reserve' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {refund.booking_type === 'reserve' ? 'Reserve (50% Deposit)' : 'Full Booking'}
                    </span>
                  </div>
                )}
                {refund.start_date && refund.end_date && (
                  <div>
                    <span className="text-gray-400 text-sm block">Dates:</span>
                    <span className="text-white text-sm">
                      {new Date(refund.start_date).toLocaleDateString()} - {new Date(refund.end_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Refund Reason */}
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Cancellation Reason
              </h4>
              <div className="bg-gray-800 rounded-lg p-3">
                <p className="text-white text-sm">{refund.reason}</p>
              </div>
            </div>

            {/* Admin Notes (if exists) */}
            {refund.admin_notes && (
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">Admin Notes</h4>
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-white text-sm">{refund.admin_notes}</p>
                </div>
              </div>
            )}

            {/* PayMongo Refund IDs (if processed) */}
            {refund.paymongo_refund_ids && (
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  PayMongo Refund IDs
                </h4>
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-white text-xs font-mono break-all">
                    {typeof refund.paymongo_refund_ids === 'string' 
                      ? refund.paymongo_refund_ids 
                      : JSON.stringify(refund.paymongo_refund_ids, null, 2)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Section */}
        <div className="mt-6 pt-6 border-t border-gray-700">
          {/* Pending - Show Approve/Reject */}
          {refund.canProcess && (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  Admin Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this refund decision..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
                  rows={3}
                  maxLength={500}
                  disabled={processing}
                />
                <div className="text-xs text-gray-400 text-right mt-1">
                  {notes.length}/500
                </div>
              </div>

              {/* Custom Amount Option */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={showCustomAmount}
                    onChange={(e) => setShowCustomAmount(e.target.checked)}
                    className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500"
                    disabled={processing}
                  />
                  <span className="text-sm text-gray-300">Override refund amount</span>
                </label>
                
                {showCustomAmount && (
                  <div className="flex items-center gap-2">
                    <span className="text-white">₱</span>
                    <input
                      type="number"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder={refund.refund_amount?.toString()}
                      min="0"
                      max={refund.amount_paid}
                      step="0.01"
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
                      disabled={processing}
                    />
                    <span className="text-gray-400 text-sm">
                      Max: ₱{Number(refund.amount_paid).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleReject}
                  variant="outline"
                  className="flex-1 border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                  loading={processing}
                  disabled={processing}
                >
                  <X className="w-4 h-4 mr-2" />
                  Reject Refund
                </Button>
                <Button
                  onClick={handleApprove}
                  variant="gradient"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  loading={processing}
                  disabled={processing}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Approve Refund
                </Button>
              </div>
            </div>
          )}

          {/* Approved - Show Confirm Refund Button */}
          {refund.canConfirm && refund.refund_intent_id && (
            <div className="space-y-4">
              <div className="bg-indigo-900/20 border border-indigo-600 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-indigo-400 font-medium">Refund Approved - Ready to Process</p>
                    <p className="text-indigo-300 text-sm mt-1">
                      This refund has been approved. Click the button below to process the refund via PayMongo.
                      Funds will be returned to the customer within 5-10 business days.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => onConfirmIntent(refund.refund_intent_id)}
                variant="gradient"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                loading={processing}
                disabled={processing}
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Confirm & Process Refund via PayMongo
              </Button>
            </div>
          )}

          {/* Partial Completed or Manual Review - Show Complete Manual Button */}
          {refund.canCompleteManual && (
            <div className="space-y-4">
              <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-400 font-medium">Manual Refund Required</p>
                    <p className="text-yellow-300 text-sm mt-1">
                      This refund includes ₱{refund.formattedPersonalRefund} from personal payment method. 
                      You need to manually refund this amount to the customer via their original payment method (cash/GCash/bank transfer).
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-2">
                  Confirmation Notes <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Describe how you processed the manual refund (e.g., 'Refunded ₱5,000 via GCash to 09123456789 on Jan 15, 2025. Transaction ID: ABC123.')"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
                  rows={3}
                  maxLength={500}
                  disabled={processing}
                />
                <div className="text-xs text-gray-400 text-right mt-1">
                  {manualNotes.length}/500 (minimum 10 characters)
                </div>
              </div>

              <Button
                onClick={handleCompleteManual}
                variant="gradient"
                className="w-full bg-blue-600 hover:bg-blue-700"
                loading={processing}
                disabled={processing || manualNotes.length < 10}
              >
                <Check className="w-4 h-4 mr-2" />
                Mark Manual Refund as Completed
              </Button>
            </div>
          )}

          {/* Already Processed - Show Status */}
          {!refund.canProcess && !refund.canConfirm && !refund.canCompleteManual && (
            <div className={`rounded-lg p-4 ${
              refund.status === REFUND_STATUS.COMPLETED 
                ? 'bg-green-900/20 border border-green-600' 
                : refund.status === REFUND_STATUS.REJECTED 
                  ? 'bg-red-900/20 border border-red-600'
                  : refund.status === REFUND_STATUS.PROCESSING
                    ? 'bg-blue-900/20 border border-blue-600'
                    : refund.status === REFUND_STATUS.PARTIAL_COMPLETED
                      ? 'bg-teal-900/20 border border-teal-600'
                      : refund.status === REFUND_STATUS.FAILED
                        ? 'bg-red-900/20 border border-red-600'
                        : 'bg-gray-900/20 border border-gray-600'
            }`}>
              <div className="flex items-start gap-3">
                {refund.status === REFUND_STATUS.COMPLETED && <Check className="w-6 h-6 text-green-400 flex-shrink-0" />}
                {refund.status === REFUND_STATUS.REJECTED && <X className="w-6 h-6 text-red-400 flex-shrink-0" />}
                {refund.status === REFUND_STATUS.PROCESSING && <Clock className="w-6 h-6 text-blue-400 flex-shrink-0" />}
                {refund.status === REFUND_STATUS.PARTIAL_COMPLETED && <AlertCircle className="w-6 h-6 text-teal-400 flex-shrink-0" />}
                {refund.status === REFUND_STATUS.FAILED && <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />}
                
                <div className="flex-1">
                  <p className={`font-medium ${
                    refund.status === REFUND_STATUS.COMPLETED ? 'text-green-400' :
                    refund.status === REFUND_STATUS.REJECTED ? 'text-red-400' :
                    refund.status === REFUND_STATUS.PROCESSING ? 'text-blue-400' :
                    refund.status === REFUND_STATUS.PARTIAL_COMPLETED ? 'text-teal-400' :
                    refund.status === REFUND_STATUS.FAILED ? 'text-red-400' :
                    'text-gray-400'
                  }`}>
                    {refund.status === REFUND_STATUS.COMPLETED && '✅ Refund Completed'}
                    {refund.status === REFUND_STATUS.REJECTED && '❌ Refund Rejected'}
                    {refund.status === REFUND_STATUS.PROCESSING && '🔄 Refund Processing'}
                    {refund.status === REFUND_STATUS.PARTIAL_COMPLETED && '⚠️ Partially Completed'}
                    {refund.status === REFUND_STATUS.FAILED && '❌ Refund Failed'}
                    {!Object.values(REFUND_STATUS).includes(refund.status) && `⚠️ Status: ${refund.status}`}
                  </p>
                  
                  <p className={`text-sm mt-1 ${
                    refund.status === REFUND_STATUS.COMPLETED ? 'text-green-300' :
                    refund.status === REFUND_STATUS.REJECTED ? 'text-red-300' :
                    refund.status === REFUND_STATUS.PROCESSING ? 'text-blue-300' :
                    refund.status === REFUND_STATUS.PARTIAL_COMPLETED ? 'text-teal-300' :
                    refund.status === REFUND_STATUS.FAILED ? 'text-red-300' :
                    'text-gray-300'
                  }`}>
                    {refund.status === REFUND_STATUS.COMPLETED && 'This refund has been successfully processed. Funds have been returned to the customer.'}
                    {refund.status === REFUND_STATUS.REJECTED && 'This refund request was rejected and cannot be processed.'}
                    {refund.status === REFUND_STATUS.PROCESSING && 'This refund is currently being processed through PayMongo.'}
                    {refund.status === REFUND_STATUS.PARTIAL_COMPLETED && 'Platform refund completed. Personal payment refund still pending manual processing.'}
                    {refund.status === REFUND_STATUS.FAILED && 'Refund processing failed. Please review the payment details and try creating a new refund request, or contact support for assistance.'}
                    {!Object.values(REFUND_STATUS).includes(refund.status) && 'Unknown refund status.'}
                  </p>
                  
                  {refund.processed_by_name && (
                    <p className="text-xs text-gray-400 mt-2">
                      Processed by: {refund.processed_by_name} on {refund.formattedDate}
                    </p>
                  )}
                  
                  {/* Show retry option for failed refunds */}
                  {refund.status === REFUND_STATUS.FAILED && (
                    <div className="mt-4 pt-3 border-t border-red-700">
                      <p className="text-xs text-red-200 mb-2">
                        <strong>💡 Suggested Actions:</strong>
                      </p>
                      <ul className="text-xs text-red-200 space-y-1 list-disc list-inside">
                        <li>Verify the payment intent ID matches PayMongo dashboard</li>
                        <li>Check if payment was actually completed successfully</li>
                        <li>Review server logs for detailed error messages</li>
                        <li>Consider manual refund processing if needed</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RefundManagement;