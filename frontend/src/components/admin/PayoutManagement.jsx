// frontend/src/components/admin/PayoutManagement.jsx - Simplified Manual Payout System
import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Search, 
  Filter, 
  Check, 
  X,
  Clock,
  RefreshCw,
  Download,
  AlertCircle,
  Eye,
  CheckCircle
} from 'lucide-react';
import payoutService from '../../services/payoutService';
import Button from '../ui/Button';
import Input from '../ui/Input';

const PayoutManagement = () => {
  const [payouts, setPayouts] = useState([]);
  const [filteredPayouts, setFilteredPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [stats, setStats] = useState({});

  useEffect(() => {
    loadPayouts();
    loadPayoutStats();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [payouts, searchTerm, statusFilter]);

  const loadPayouts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await payoutService.getAllPayouts();
      
      if (result.success) {
        setPayouts(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Error loading payouts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPayoutStats = async () => {
    try {
      const result = await payoutService.getPayoutStats();
      if (result.success) {
        setStats(result.data.stats || {});
      }
    } catch (err) {
      console.error('Failed to load payout stats:', err);
    }
  };

  const applyFilters = () => {
    let filtered = [...payouts];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(payout => 
        payout.host_name?.toLowerCase().includes(term) ||
        payout.host_email?.toLowerCase().includes(term) ||
        payout.id?.toString().includes(term) ||
        payout.host_id?.toString().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(payout => payout.status === statusFilter);
    }

    setFilteredPayouts(filtered);
  };

  const handleApprovePayout = async (payoutId) => {
    try {
      setActionLoading(prev => ({ ...prev, [payoutId]: 'approve' }));
      
      const result = await payoutService.approvePayout(payoutId);

      if (result.success) {
        alert(result.message);
        setShowProcessModal(false);
        await loadPayouts();
        await loadPayoutStats();
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert(`Failed to approve payout: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [payoutId]: false }));
    }
  };

  const handleCompletePayout = async (payoutId) => {
    const proof = prompt('Enter proof of transfer URL or reference (optional):');

    try {
      setActionLoading(prev => ({ ...prev, [payoutId]: 'complete' }));
      
      const result = await payoutService.completePayout(payoutId, proof || '');

      if (result.success) {
        alert(result.message);
        await loadPayouts();
        await loadPayoutStats();
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert(`Failed to complete payout: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [payoutId]: false }));
    }
  };

  const handleRejectPayout = async (payoutId) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      setActionLoading(prev => ({ ...prev, [payoutId]: 'reject' }));
      
      const result = await payoutService.rejectPayout(payoutId, reason);

      if (result.success) {
        alert(result.message);
        await loadPayouts();
        await loadPayoutStats();
      } else {
        alert(result.error);
      }
    } catch (error) {
      alert(`Failed to reject payout: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [payoutId]: false }));
    }
  };

  const getStatusBadge = (status) => {
    const color = payoutService.getStatusColor(status);
    const text = payoutService.getStatusText(status);
    
    const colorMap = {
      warning: { 
        bg: 'bg-yellow-100', 
        text: 'text-yellow-800', 
        icon: <Clock className="w-3 h-3 mr-1" />
      },
      info: { 
        bg: 'bg-blue-100', 
        text: 'text-blue-800', 
        icon: <Check className="w-3 h-3 mr-1" />
      },
      success: { 
        bg: 'bg-green-100', 
        text: 'text-green-800', 
        icon: <CheckCircle className="w-3 h-3 mr-1" />
      },
      danger: { 
        bg: 'bg-red-100', 
        text: 'text-red-800', 
        icon: <X className="w-3 h-3 mr-1" />
      },
      secondary: { 
        bg: 'bg-gray-100', 
        text: 'text-gray-800', 
        icon: <AlertCircle className="w-3 h-3 mr-1" />
      }
    };
    
    const config = colorMap[color] || colorMap.secondary;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.icon}
        {text}
      </span>
    );
  };

  const getUrgencyIndicator = (payout) => {
    if (payout.status !== 'pending') return null;
    
    const daysSinceRequest = Math.floor(
      (new Date() - new Date(payout.created_at || payout.requested_at)) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceRequest >= 3) {
      return (
        <div className="flex items-center text-red-400 text-xs mt-1">
          <AlertCircle className="w-3 h-3 mr-1" />
          Urgent ({daysSinceRequest} days old)
        </div>
      );
    } else if (daysSinceRequest >= 2) {
      return (
        <div className="flex items-center text-yellow-400 text-xs mt-1">
          <Clock className="w-3 h-3 mr-1" />
          {daysSinceRequest} days old
        </div>
      );
    }
    return null;
  };

  const exportPayouts = () => {
    const csv = [
      ['ID', 'Host', 'Amount', 'Fee', 'Net Amount', 'Status', 'Method', 'Requested Date'],
      ...filteredPayouts.map(p => [
        p.id,
        p.host_name,
        p.amount,
        p.fee || 0,
        p.net_amount || p.amount,
        p.status,
        p.payment_method || 'bank_transfer',
        new Date(p.created_at || p.requested_at).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payouts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={loadPayouts} variant="gradient">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Payout Management</h1>
          <p className="text-gray-400">
            {filteredPayouts.length} of {payouts.length} payouts
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button
            onClick={exportPayouts}
            variant="outline"
            className="border-gray-600 text-gray-300"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={() => {
              loadPayouts();
              loadPayoutStats();
            }}
            variant="outline"
            className="border-gray-600 text-gray-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-yellow-400">
                {stats.pending_count || 0}
              </p>
              <p className="text-xs text-gray-500">
                {payoutService.formatCurrency(stats.pending_amount || 0)}
              </p>
            </div>
            <Clock className="w-6 h-6 text-yellow-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Approved</p>
              <p className="text-2xl font-bold text-indigo-400">
                {stats.approved_count || 0}
              </p>
              <p className="text-xs text-gray-500">
                {payoutService.formatCurrency(stats.approved_amount || 0)}
              </p>
            </div>
            <Check className="w-6 h-6 text-indigo-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-green-400">
                {stats.completed_count || 0}
              </p>
              <p className="text-xs text-gray-500">
                {payoutService.formatCurrency(stats.total_paid_out || 0)}
              </p>
            </div>
            <CheckCircle className="w-6 h-6 text-green-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Fees</p>
              <p className="text-2xl font-bold text-purple-400">
                {payoutService.formatCurrency(stats.total_fees_paid || 0)}
              </p>
              <p className="text-xs text-gray-500">Processing fees</p>
            </div>
            <DollarSign className="w-6 h-6 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search host name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-700 border-gray-600 text-white"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="failed">Failed</option>
          </select>

          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <Filter className="w-4 h-4" />
            <span>
              {filteredPayouts.filter(p => p.status === 'pending').length} needs action
            </span>
          </div>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        {filteredPayouts.length === 0 ? (
          <div className="text-center py-16">
            <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No payouts found</h3>
            <p className="text-gray-400">Payouts will appear here when hosts request them</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">ID</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Host</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Amount</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Method</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Requested</th>
                  <th className="text-left py-3 px-4 text-gray-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredPayouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-gray-700/50">
                    <td className="py-4 px-4 text-white">
                      #{payout.id}
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <div className="text-white font-medium">
                          {payout.host_name || `Host #${payout.host_id}`}
                        </div>
                        <div className="text-gray-400 text-sm">{payout.host_email}</div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <div className="text-white font-semibold">
                          {payoutService.formatCurrency(payout.amount)}
                        </div>
                        {payout.fee > 0 && (
                          <div className="text-xs text-gray-400">
                            Fee: {payoutService.formatCurrency(payout.fee)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-gray-300 text-sm capitalize">
                        {payout.payment_method?.replace('_', ' ') || 'Bank Transfer'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        {getStatusBadge(payout.status)}
                        {getUrgencyIndicator(payout)}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-white text-sm">
                        {new Date(payout.created_at || payout.requested_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">

                        <span className="text-yellow-400 text-xs mr-2">
                          [{payout.status}]
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-400"
                          onClick={() => {
                            setSelectedPayout(payout);
                            setShowPayoutModal(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

                        {payout.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-400 hover:text-green-300"
                              loading={actionLoading[payout.id] === 'approve'}
                              onClick={() => {
                                setSelectedPayout(payout);
                                setShowProcessModal(true);
                              }}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-400 hover:text-red-300"
                              loading={actionLoading[payout.id] === 'reject'}
                              onClick={() => handleRejectPayout(payout.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}

                        {payout.status === 'approved' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-purple-400"
                            loading={actionLoading[payout.id] === 'complete'}
                            onClick={() => handleCompletePayout(payout.id)}
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout Detail Modal */}
      {showPayoutModal && selectedPayout && (
        <PayoutDetailModal 
          payout={selectedPayout}
          onClose={() => {
            setShowPayoutModal(false);
            setSelectedPayout(null);
          }}
        />
      )}

      {/* Process Payout Modal */}
      {showProcessModal && selectedPayout && (
        <ProcessPayoutModal
          payout={selectedPayout}
          onApprove={() => handleApprovePayout(selectedPayout.id)}
          onClose={() => {
            setShowProcessModal(false);
            setSelectedPayout(null);
          }}
          loading={actionLoading[selectedPayout.id] === 'approve'}
        />
      )}
    </div>
  );
};

// Process Payout Modal
const ProcessPayoutModal = ({ payout, onApprove, onClose, loading }) => {
  const bankDetails = typeof payout.bank_details === 'string' 
    ? JSON.parse(payout.bank_details) 
    : payout.bank_details || {};

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Approve Payout</h2>
          
          <div className="bg-gray-700 rounded-lg p-4 mb-4">
            <h3 className="text-sm text-gray-400 mb-2">Payout Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Amount:</span>
                <span className="text-white font-bold">
                  {payoutService.formatCurrency(payout.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Fee:</span>
                <span className="text-white">
                  {payoutService.formatCurrency(payout.fee || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Net Amount:</span>
                <span className="text-green-400 font-bold">
                  {payoutService.formatCurrency(payout.net_amount || payout.amount - (payout.fee || 0))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Method:</span>
                <span className="text-white capitalize">
                  {payout.payment_method?.replace('_', ' ') || 'Bank Transfer'}
                </span>
              </div>
              
              {payout.payment_method === 'gcash' || payout.payment_method === 'paymaya' ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Mobile:</span>
                    <span className="text-white">{bankDetails.mobile_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Name:</span>
                    <span className="text-white">{bankDetails.account_name}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Account:</span>
                    <span className="text-white">{bankDetails.account_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Number:</span>
                    <span className="text-white">{bankDetails.account_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Bank:</span>
                    <span className="text-white">{bankDetails.bank_name || bankDetails.bank_code}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3 mb-4">
            <p className="text-blue-400 text-sm">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              After approval, you'll need to manually transfer the money to the host's account
            </p>
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 border-gray-600"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={onApprove}
              variant="gradient"
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Approve Payout'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Payout Detail Modal Component
const PayoutDetailModal = ({ payout, onClose }) => {
  const bankDetails = typeof payout.bank_details === 'string' 
    ? JSON.parse(payout.bank_details) 
    : payout.bank_details || {};

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Payout Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Payout Information</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-400">Payout ID:</span>
                  <span className="text-white ml-2">#{payout.id}</span>
                </div>
                <div>
                  <span className="text-gray-400">Amount:</span>
                  <span className="text-white ml-2 font-semibold">
                    {payoutService.formatCurrency(payout.amount)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Fee:</span>
                  <span className="text-white ml-2">
                    {payoutService.formatCurrency(payout.fee || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Net Amount:</span>
                  <span className="text-green-400 ml-2 font-semibold">
                    {payoutService.formatCurrency(payout.net_amount || payout.amount - (payout.fee || 0))}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>
                  <span className="ml-2">{payoutService.getStatusText(payout.status)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Payment Method:</span>
                  <span className="text-white ml-2 capitalize">
                    {payout.payment_method?.replace('_', ' ') || 'Bank Transfer'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-4">Payment Details</h3>
              <div className="space-y-3">
                {payout.payment_method === 'gcash' || payout.payment_method === 'paymaya' ? (
                  <>
                    <div>
                      <span className="text-gray-400">Mobile Number:</span>
                      <span className="text-white ml-2">{bankDetails.mobile_number}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Account Name:</span>
                      <span className="text-white ml-2">{bankDetails.account_name}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-gray-400">Account Name:</span>
                      <span className="text-white ml-2">{bankDetails.account_name}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Account Number:</span>
                      <span className="text-white ml-2">{bankDetails.account_number}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Bank:</span>
                      <span className="text-white ml-2">{bankDetails.bank_name || bankDetails.bank_code}</span>
                    </div>
                  </>
                )}
              </div>

              <h3 className="text-lg font-medium text-white mb-4 mt-6">Timeline</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-400">Requested:</span>
                  <span className="text-white ml-2">
                    {new Date(payout.created_at).toLocaleString()}
                  </span>
                </div>
                {payout.updated_at && (
                  <div>
                    <span className="text-gray-400">Last Updated:</span>
                    <span className="text-white ml-2">
                      {new Date(payout.updated_at).toLocaleString()}
                    </span>
                  </div>
                )}
                {payout.completed_at && (
                  <div>
                    <span className="text-gray-400">Completed:</span>
                    <span className="text-white ml-2">
                      {new Date(payout.completed_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {payout.rejection_reason && (
            <div className="mt-6 p-4 bg-red-900/20 border border-red-600 rounded-lg">
              <p className="text-red-400 text-sm">
                <strong>Rejection Reason:</strong> {payout.rejection_reason}
              </p>
            </div>
          )}

          {payout.proof_url && (
            <div className="mt-6 p-4 bg-green-900/20 border border-green-600 rounded-lg">
              <p className="text-green-400 text-sm">
                <strong>Proof of Transfer:</strong> {payout.proof_url}
              </p>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button onClick={onClose} variant="outline" className="border-gray-600">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayoutManagement;