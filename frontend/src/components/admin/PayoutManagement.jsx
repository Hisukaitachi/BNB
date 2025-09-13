// frontend/src/components/admin/PayoutManagement.jsx - Updated Version
import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Search, 
  Filter, 
  Check, 
  X,
  Clock,
  User,
  Calendar,
  CreditCard,
  RefreshCw,
  Download,
  AlertCircle,
  TrendingUp,
  Eye,
  Send,
  CheckCircle
} from 'lucide-react';
import { payoutAPI } from '../../services/api';
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
  const [transactionRef, setTransactionRef] = useState('');
  const [proofUrl, setProofUrl] = useState('');

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
      const response = await payoutAPI.getAllPayouts();
      const payoutsData = response.data?.payouts || [];
      setPayouts(payoutsData);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPayoutStats = async () => {
    try {
      const response = await payoutAPI.getPayoutStats();
      const statsData = response.data?.data?.stats || response.data?.stats || {};
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load payout stats:', err);
    }
  };

  const applyFilters = () => {
    let filtered = [...payouts];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(payout => 
        payout.host_name?.toLowerCase().includes(term) ||
        payout.host_email?.toLowerCase().includes(term) ||
        payout.id?.toString().includes(term) ||
        payout.host_id?.toString().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(payout => payout.status === statusFilter);
    }

    setFilteredPayouts(filtered);
  };

  const handleApprovePayout = async (payoutId) => {
    if (!transactionRef) {
      alert('Please enter a transaction reference number');
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, [payoutId]: 'approve' }));
      
      const response = await payoutAPI.approvePayout(payoutId, {
        transaction_ref: transactionRef
      });

      if (response.data.status === 'success') {
        alert('Payout approved! Now transfer the money and mark as complete.');
        setShowProcessModal(false);
        setTransactionRef('');
        await loadPayouts();
        await loadPayoutStats();
      }
    } catch (error) {
      alert(`Failed to approve payout: ${error.response?.data?.message || error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [payoutId]: false }));
    }
  };

  const handleCompletePayout = async (payoutId) => {
    if (!proofUrl) {
      proofUrl = prompt('Enter proof of transfer URL or reference (optional):');
    }

    try {
      setActionLoading(prev => ({ ...prev, [payoutId]: 'complete' }));
      
      const response = await payoutAPI.completePayout(payoutId, {
        proof_url: proofUrl || ''
      });

      if (response.data.status === 'success') {
        alert('Payout marked as completed!');
        setProofUrl('');
        await loadPayouts();
        await loadPayoutStats();
      }
    } catch (error) {
      alert(`Failed to complete payout: ${error.response?.data?.message || error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [payoutId]: false }));
    }
  };

  const handleRejectPayout = async (payoutId) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      setActionLoading(prev => ({ ...prev, [payoutId]: 'reject' }));
      
      const response = await payoutAPI.rejectPayout({
        payout_id: payoutId,
        reason: reason
      });

      if (response.data.status === 'success') {
        alert('Payout rejected successfully');
        await loadPayouts();
        await loadPayoutStats();
      }
    } catch (error) {
      alert(`Failed to reject payout: ${error.response?.data?.message || error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [payoutId]: false }));
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { 
        bg: 'bg-yellow-100', 
        text: 'text-yellow-800', 
        icon: <Clock className="w-3 h-3 mr-1" />,
        label: 'Pending' 
      },
      processing: { 
        bg: 'bg-blue-100', 
        text: 'text-blue-800', 
        icon: <Send className="w-3 h-3 mr-1" />,
        label: 'Processing' 
      },
      completed: { 
        bg: 'bg-green-100', 
        text: 'text-green-800', 
        icon: <CheckCircle className="w-3 h-3 mr-1" />,
        label: 'Completed' 
      },
      rejected: { 
        bg: 'bg-red-100', 
        text: 'text-red-800', 
        icon: <X className="w-3 h-3 mr-1" />,
        label: 'Rejected' 
      }
    };
    
    const badge = badges[status] || badges.pending;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.icon}
        {badge.label}
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
      ['ID', 'Host', 'Amount', 'Status', 'Method', 'Requested Date', 'Bank Details'],
      ...filteredPayouts.map(p => [
        p.id,
        p.host_name,
        p.amount,
        p.status,
        p.payment_method || 'bank_transfer',
        new Date(p.created_at || p.requested_at).toLocaleDateString(),
        JSON.stringify(p.bank_details || {})
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
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
            Export CSV
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-yellow-400">
                {stats.pending_count || 0}
              </p>
              <p className="text-xs text-gray-500">
                ₱{(stats.pending_amount || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-full bg-yellow-600/20">
              <Clock className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Processing</p>
              <p className="text-2xl font-bold text-blue-400">
                {stats.processing_count || 0}
              </p>
              <p className="text-xs text-gray-500">In Transfer</p>
            </div>
            <div className="p-3 rounded-full bg-blue-600/20">
              <Send className="w-6 h-6 text-blue-400" />
            </div>
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
                ₱{(stats.total_paid_out || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-600/20">
              <CheckCircle className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Rejected</p>
              <p className="text-2xl font-bold text-red-400">
                {stats.rejected_count || 0}
              </p>
              <p className="text-xs text-gray-500">Declined</p>
            </div>
            <div className="p-3 rounded-full bg-red-600/20">
              <X className="w-6 h-6 text-red-400" />
            </div>
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
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
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
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">ID</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Host</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Amount</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Method</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Status</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Requested</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredPayouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-gray-700/50">
                    <td className="py-4 px-6 text-white">#{payout.id}</td>
                    <td className="py-4 px-6">
                      <div>
                        <div className="text-white font-medium">
                          {payout.host_name || `Host #${payout.host_id}`}
                        </div>
                        <div className="text-gray-400 text-sm">{payout.host_email}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-white font-semibold">
                        ₱{Number(payout.amount).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-gray-300 text-sm">
                        {payout.payment_method === 'gcash' ? 'GCash' : 'Bank Transfer'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        {getStatusBadge(payout.status)}
                        {getUrgencyIndicator(payout)}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-white text-sm">
                        {new Date(payout.created_at || payout.requested_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
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

                        {payout.status === 'processing' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-blue-400"
                            loading={actionLoading[payout.id] === 'complete'}
                            onClick={() => handleCompletePayout(payout.id)}
                          >
                            Mark Complete
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
          transactionRef={transactionRef}
          onTransactionRefChange={setTransactionRef}
          onApprove={() => handleApprovePayout(selectedPayout.id)}
          onClose={() => {
            setShowProcessModal(false);
            setSelectedPayout(null);
            setTransactionRef('');
          }}
          loading={actionLoading[selectedPayout.id] === 'approve'}
        />
      )}
    </div>
  );
};

// Process Payout Modal
const ProcessPayoutModal = ({ payout, transactionRef, onTransactionRefChange, onApprove, onClose, loading }) => {
  const bankDetails = typeof payout.bank_details === 'string' 
    ? JSON.parse(payout.bank_details) 
    : payout.bank_details || {};

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Process Payout</h2>
          
          <div className="bg-gray-700 rounded-lg p-4 mb-4">
            <h3 className="text-sm text-gray-400 mb-2">Transfer Details</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Amount:</span>
                <span className="text-white font-bold">₱{Number(payout.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Method:</span>
                <span className="text-white">{payout.payment_method === 'gcash' ? 'GCash' : 'Bank Transfer'}</span>
              </div>
              
              {payout.payment_method === 'gcash' ? (
                <div className="flex justify-between">
                  <span className="text-gray-400">GCash:</span>
                  <span className="text-white">{bankDetails.account_number}</span>
                </div>
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
                    <span className="text-white">{bankDetails.bank_name}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm text-gray-300 mb-2">Transaction Reference</label>
            <input
              type="text"
              value={transactionRef}
              onChange={(e) => onTransactionRefChange(e.target.value)}
              placeholder="Enter reference number after transfer"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>

          <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3 mb-4">
            <p className="text-blue-400 text-sm">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              Transfer the money first, then enter the reference number above
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
              disabled={!transactionRef || loading}
            >
              {loading ? 'Processing...' : 'Approve & Process'}
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
                  <span className="text-white ml-2 font-semibold">₱{Number(payout.amount).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>
                  <span className="ml-2">{payout.status}</span>
                </div>
                <div>
                  <span className="text-gray-400">Payment Method:</span>
                  <span className="text-white ml-2">
                    {payout.payment_method === 'gcash' ? 'GCash' : 'Bank Transfer'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-4">Bank/GCash Details</h3>
              <div className="space-y-3">
                {payout.payment_method === 'gcash' ? (
                  <div>
                    <span className="text-gray-400">GCash Number:</span>
                    <span className="text-white ml-2">{bankDetails.account_number}</span>
                  </div>
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
                      <span className="text-gray-400">Bank Name:</span>
                      <span className="text-white ml-2">{bankDetails.bank_name}</span>
                    </div>
                  </>
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