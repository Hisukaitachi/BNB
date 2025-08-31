// frontend/src/components/admin/PayoutManagement.jsx
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
  Eye
} from 'lucide-react';
import adminService from '../../services/adminService';
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
      const data = await adminService.getAllPayouts();
      setPayouts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPayoutStats = async () => {
    try {
      // This would be a separate API call for payout statistics
      const stats = {
        totalPending: payouts.filter(p => p.status === 'pending').length,
        totalPendingAmount: payouts
          .filter(p => p.status === 'pending')
          .reduce((sum, p) => sum + Number(p.amount), 0),
        totalProcessed: payouts.filter(p => p.status === 'completed').length,
        totalProcessedAmount: payouts
          .filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + Number(p.amount), 0)
      };
      setStats(stats);
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
        payout.id.toString().includes(term) ||
        payout.booking_id?.toString().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(payout => payout.status === statusFilter);
    }

    setFilteredPayouts(filtered);
  };

  const handlePayoutAction = async (payoutId, action, reason = '') => {
    try {
      setActionLoading(prev => ({ ...prev, [payoutId]: action }));
      
      let result;
      switch (action) {
        case 'approve':
          if (!confirm('Are you sure you want to process this payout?')) return;
          result = await adminService.processPayout(payoutId);
          break;
        case 'reject':
          if (!reason) {
            reason = prompt('Reason for rejection:');
            if (!reason) return;
          }
          result = await adminService.rejectPayout(payoutId, reason);
          break;
        default:
          throw new Error('Invalid action');
      }

      if (result.success) {
        await loadPayouts(); // Refresh payouts
        await loadPayoutStats(); // Refresh stats
        alert(`Payout ${action}d successfully`);
      }
    } catch (error) {
      alert(`Failed to ${action} payout: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [payoutId]: false }));
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      processing: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Processing' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
      failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' }
    };
    
    const badge = badges[status] || badges.pending;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getUrgencyIndicator = (payout) => {
    const daysSinceRequest = Math.floor(
      (new Date() - new Date(payout.created_at)) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceRequest >= 7) {
      return (
        <div className="flex items-center text-red-400 text-xs">
          <AlertCircle className="w-3 h-3 mr-1" />
          Overdue ({daysSinceRequest} days)
        </div>
      );
    } else if (daysSinceRequest >= 3) {
      return (
        <div className="flex items-center text-yellow-400 text-xs">
          <Clock className="w-3 h-3 mr-1" />
          Due soon ({daysSinceRequest} days)
        </div>
      );
    }
    return null;
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
            onClick={() => {/* Export functionality */}}
            variant="outline"
            className="border-gray-600 text-gray-300"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={loadPayouts}
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
              <p className="text-sm text-gray-400">Pending Payouts</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.totalPending || 0}</p>
              <p className="text-xs text-gray-500">
                ₱{(stats.totalPendingAmount || 0).toLocaleString()}
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
                {payouts.filter(p => p.status === 'processing').length}
              </p>
              <p className="text-xs text-gray-500">
                ₱{payouts
                  .filter(p => p.status === 'processing')
                  .reduce((sum, p) => sum + Number(p.amount), 0)
                  .toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-600/20">
              <TrendingUp className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-green-400">{stats.totalProcessed || 0}</p>
              <p className="text-xs text-gray-500">
                ₱{(stats.totalProcessedAmount || 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-600/20">
              <Check className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">This Month</p>
              <p className="text-2xl font-bold text-purple-400">
                ₱{payouts
                  .filter(p => {
                    const payoutDate = new Date(p.created_at);
                    const now = new Date();
                    return payoutDate.getMonth() === now.getMonth() && 
                           payoutDate.getFullYear() === now.getFullYear();
                  })
                  .reduce((sum, p) => sum + Number(p.amount), 0)
                  .toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">Total payouts</p>
            </div>
            <div className="p-3 rounded-full bg-purple-600/20">
              <DollarSign className="w-6 h-6 text-purple-400" />
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
              placeholder="Search host, email, or booking ID..."
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
            <option value="failed">Failed</option>
          </select>

          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <Filter className="w-4 h-4" />
            <span>
              {filteredPayouts.filter(p => p.status === 'pending').length} urgent
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
            <p className="text-gray-400">Try adjusting your search criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Host</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Amount</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Booking</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Status</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Requested</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredPayouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-gray-700/50">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {payout.host_name?.charAt(0).toUpperCase() || 'H'}
                          </span>
                        </div>
                        <div>
                          <div className="text-white font-medium">{payout.host_name || 'Unknown Host'}</div>
                          <div className="text-gray-400 text-sm">{payout.host_email}</div>
                          <div className="text-gray-500 text-xs">ID: {payout.host_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-white font-semibold text-lg">
                        ₱{Number(payout.amount).toLocaleString()}
                      </div>
                      <div className="text-gray-400 text-sm">
                        Commission: ₱{Number(payout.commission || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-white">#{payout.booking_id}</div>
                      <div className="text-gray-400 text-sm">{payout.listing_title}</div>
                      <div className="text-gray-500 text-xs">
                        {payout.check_in_date && payout.check_out_date && (
                          `${new Date(payout.check_in_date).toLocaleDateString()} - ${new Date(payout.check_out_date).toLocaleDateString()}`
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        {getStatusBadge(payout.status)}
                        {getUrgencyIndicator(payout)}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-white text-sm">
                        {new Date(payout.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-gray-400 text-xs">
                        {new Date(payout.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
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
                              onClick={() => handlePayoutAction(payout.id, 'approve')}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-400 hover:text-red-300"
                              loading={actionLoading[payout.id] === 'reject'}
                              onClick={() => handlePayoutAction(payout.id, 'reject')}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}

                        {payout.status === 'processing' && (
                          <div className="flex items-center text-blue-400 text-xs">
                            <Clock className="w-3 h-3 mr-1 animate-spin" />
                            Processing...
                          </div>
                        )}

                        {payout.status === 'completed' && (
                          <div className="flex items-center text-green-400 text-xs">
                            <Check className="w-3 h-3 mr-1" />
                            Paid
                          </div>
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

      {/* Quick Actions */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            onClick={() => {
              // Process all pending payouts
              const pendingPayouts = payouts.filter(p => p.status === 'pending');
              if (pendingPayouts.length > 0) {
                const totalAmount = pendingPayouts.reduce((sum, p) => sum + Number(p.amount), 0);
                if (confirm(`Process ${pendingPayouts.length} pending payouts totaling ₱${totalAmount.toLocaleString()}?`)) {
                  // Batch process payouts
                  alert('Batch processing not implemented yet');
                }
              } else {
                alert('No pending payouts to process');
              }
            }}
            variant="outline"
            className="border-green-500 text-green-400 hover:bg-green-500 hover:text-white"
          >
            <Check className="w-4 h-4 mr-2" />
            Process All Pending
          </Button>
          
          <Button
            onClick={() => {
              // Export payouts
              alert('Export functionality to be implemented');
            }}
            variant="outline"
            className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Payouts
          </Button>
          
          <Button
            onClick={() => {
              // View payout analytics
              alert('Analytics view to be implemented');
            }}
            variant="outline"
            className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            View Analytics
          </Button>
          
          <Button
            onClick={() => {
              // Payout settings
              alert('Settings to be implemented');
            }}
            variant="outline"
            className="border-gray-500 text-gray-400 hover:bg-gray-500 hover:text-white"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Payout Settings
          </Button>
        </div>
      </div>

      {/* Payout Detail Modal */}
      {showPayoutModal && selectedPayout && (
        <PayoutDetailModal 
          payout={selectedPayout}
          onClose={() => {
            setShowPayoutModal(false);
            setSelectedPayout(null);
          }}
          onAction={handlePayoutAction}
        />
      )}
    </div>
  );
};

// Payout Detail Modal Component
const PayoutDetailModal = ({ payout, onClose, onAction }) => {
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
            <div className="space-y-4">
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
                    <span className="text-gray-400">Commission:</span>
                    <span className="text-white ml-2">₱{Number(payout.commission || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Net Amount:</span>
                    <span className="text-green-400 ml-2 font-semibold">
                      ₱{(Number(payout.amount) - Number(payout.commission || 0)).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Status:</span>
                    <span className="ml-2">{payout.status}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Requested:</span>
                    <span className="text-white ml-2">
                      {new Date(payout.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Host Information</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400">Name:</span>
                    <span className="text-white ml-2">{payout.host_name || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Email:</span>
                    <span className="text-white ml-2">{payout.host_email}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Host ID:</span>
                    <span className="text-white ml-2">#{payout.host_id}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Payment Method:</span>
                    <span className="text-white ml-2">{payout.payment_method || 'Bank Transfer'}</span>
                  </div>
                  {payout.bank_account && (
                    <div>
                      <span className="text-gray-400">Account:</span>
                      <span className="text-white ml-2">****{payout.bank_account.slice(-4)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Booking Details */}
          <div className="mt-6">
            <h3 className="text-lg font-medium text-white mb-4">Booking Details</h3>
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Booking ID:</span>
                  <span className="text-white ml-2">#{payout.booking_id}</span>
                </div>
                <div>
                  <span className="text-gray-400">Listing:</span>
                  <span className="text-white ml-2">{payout.listing_title}</span>
                </div>
                {payout.check_in_date && (
                  <div>
                    <span className="text-gray-400">Check-in:</span>
                    <span className="text-white ml-2">{new Date(payout.check_in_date).toLocaleDateString()}</span>
                  </div>
                )}
                {payout.check_out_date && (
                  <div>
                    <span className="text-gray-400">Check-out:</span>
                    <span className="text-white ml-2">{new Date(payout.check_out_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-700">
            <Button
              onClick={onClose}
              variant="outline"
              className="border-gray-600 text-gray-300"
            >
              Close
            </Button>
            
            {payout.status === 'pending' && (
              <>
                <Button
                  onClick={() => {
                    onAction(payout.id, 'reject');
                    onClose();
                  }}
                  variant="outline"
                  className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                >
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    onAction(payout.id, 'approve');
                    onClose();
                  }}
                  variant="gradient"
                  className="bg-green-600 hover:bg-green-700"
                >
                  Process Payout
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayoutManagement;