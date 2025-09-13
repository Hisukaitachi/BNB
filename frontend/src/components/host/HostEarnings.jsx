// frontend/src/components/host/HostEarnings.jsx - Updated with Payout System
import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Download, 
  Eye, 
  CreditCard,
  Wallet,
  BarChart3,
  RefreshCw,
  AlertTriangle,
  Info,
  CheckCircle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { payoutAPI } from '../../services/api';
import Button from '../ui/Button';

const HostEarnings = () => {
  const [earningsData, setEarningsData] = useState(null);
  const [balance, setBalance] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('month');
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    amount: '',
    payment_method: 'bank_transfer',
    bank_details: {
      account_name: '',
      account_number: '',
      bank_name: ''
    }
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadEarningsData();
  }, [timeRange]);

  const loadEarningsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all data in parallel
      const [earningsResponse, balanceResponse] = await Promise.all([
        payoutAPI.getMyEarnings(),
        payoutAPI.getAvailableBalance()
      ]);
      
      // Extract data from responses
      const earningsInfo = earningsResponse.data;
      const balanceInfo = balanceResponse.data;
      
      setEarningsData(earningsInfo);
      setBalance(balanceInfo.data?.balance || balanceInfo.balance);
      setPayouts(earningsInfo.payouts || []);
      
      // Set default payout amount to available balance
      if (balanceInfo.data?.balance?.available_for_payout) {
        setPayoutForm(prev => ({
          ...prev,
          amount: balanceInfo.data.balance.available_for_payout.toString()
        }));
      }
    } catch (err) {
      console.error('Error loading earnings:', err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    try {
      setSubmitting(true);
      
      // Validate form
      if (!payoutForm.amount || parseFloat(payoutForm.amount) < 500) {
        alert('Minimum payout amount is ₱500');
        return;
      }
      
      if (payoutForm.payment_method === 'bank_transfer') {
        if (!payoutForm.bank_details.account_name || 
            !payoutForm.bank_details.account_number || 
            !payoutForm.bank_details.bank_name) {
          alert('Please fill in all bank details');
          return;
        }
      } else if (payoutForm.payment_method === 'gcash') {
        if (!payoutForm.bank_details.account_number) {
          alert('Please enter your GCash number');
          return;
        }
      }
      
      // Submit payout request
      const response = await payoutAPI.requestPayout({
        amount: parseFloat(payoutForm.amount),
        payment_method: payoutForm.payment_method,
        bank_details: payoutForm.bank_details
      });
      
      if (response.data.status === 'success') {
        alert('Payout request submitted successfully! Processing time: 2-3 business days.');
        setShowPayoutModal(false);
        loadEarningsData(); // Refresh data
      }
    } catch (error) {
      alert('Failed to request payout: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const getPayoutStatusBadge = (status) => {
    const configs = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <Calendar className="w-3 h-3 mr-1" />, label: 'Pending' },
      processing: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <RefreshCw className="w-3 h-3 mr-1" />, label: 'Processing' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-3 h-3 mr-1" />, label: 'Completed' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: <AlertTriangle className="w-3 h-3 mr-1" />, label: 'Rejected' },
      failed: { bg: 'bg-red-100', text: 'text-red-800', icon: <AlertTriangle className="w-3 h-3 mr-1" />, label: 'Failed' }
    };
    
    const config = configs[status] || configs.pending;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  // Calculate totals from balance data
  const totalEarnings = balance?.total_earned || earningsData?.totalEarnings || 0;
  const availableForPayout = balance?.available_for_payout || 0;
  const pendingPayout = balance?.pending_payout || 0;
  const totalWithdrawn = balance?.total_withdrawn || 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Failed to load earnings</h3>
        <p className="text-gray-400 mb-6">{error}</p>
        <Button onClick={loadEarningsData} variant="gradient">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Earnings & Payouts</h1>
          <p className="text-gray-400">Track your income and manage payouts</p>
        </div>
        
        <div className="flex space-x-3">
          <Button onClick={loadEarningsData} variant="outline" className="border-gray-600">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Earnings Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Earned</p>
              <p className="text-2xl font-bold text-white">
                ₱{totalEarnings.toLocaleString()}
              </p>
              <p className="text-xs text-green-400 mt-1">Lifetime earnings</p>
            </div>
            <div className="p-3 rounded-full bg-green-600/20">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Available</p>
              <p className="text-2xl font-bold text-white">
                ₱{availableForPayout.toLocaleString()}
              </p>
              <p className="text-xs text-blue-400 mt-1">Ready to withdraw</p>
            </div>
            <div className="p-3 rounded-full bg-blue-600/20">
              <Wallet className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-white">
                ₱{pendingPayout.toLocaleString()}
              </p>
              <p className="text-xs text-yellow-400 mt-1">Being processed</p>
            </div>
            <div className="p-3 rounded-full bg-yellow-600/20">
              <RefreshCw className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Withdrawn</p>
              <p className="text-2xl font-bold text-white">
                ₱{totalWithdrawn.toLocaleString()}
              </p>
              <p className="text-xs text-purple-400 mt-1">Total paid out</p>
            </div>
            <div className="p-3 rounded-full bg-purple-600/20">
              <CreditCard className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Request Payout Button */}
      {availableForPayout >= 500 && (
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Ready for Payout</h3>
          <p className="text-green-100 mb-4">
            You have ₱{availableForPayout.toLocaleString()} available for withdrawal
          </p>
          <Button 
            onClick={() => setShowPayoutModal(true)}
            variant="secondary"
            className="bg-white text-green-600 hover:bg-gray-100"
          >
            <Download className="w-4 h-4 mr-2" />
            Request Payout
          </Button>
        </div>
      )}

      {/* Minimum Payout Notice */}
      {availableForPayout > 0 && availableForPayout < 500 && (
        <div className="bg-yellow-900/20 border border-yellow-600 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div>
              <h4 className="text-yellow-500 font-semibold mb-1">Below Minimum Payout</h4>
              <p className="text-gray-300 text-sm">
                You have ₱{availableForPayout.toLocaleString()} available, but the minimum payout amount is ₱500.
                Continue earning to reach the minimum threshold.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payout History */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-white">Payout History</h3>
        </div>

        {payouts.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-white mb-2">No payouts yet</h4>
            <p className="text-gray-400">Your payout history will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 text-gray-400 font-medium">Date</th>
                  <th className="text-left py-3 text-gray-400 font-medium">Amount</th>
                  <th className="text-left py-3 text-gray-400 font-medium">Method</th>
                  <th className="text-left py-3 text-gray-400 font-medium">Status</th>
                  <th className="text-left py-3 text-gray-400 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr key={payout.id} className="border-b border-gray-700/50">
                    <td className="py-4 text-white">
                      {new Date(payout.created_at || payout.requested_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 text-white font-semibold">
                      ₱{Number(payout.amount).toLocaleString()}
                    </td>
                    <td className="py-4 text-gray-300">
                      {payout.payment_method || 'Bank Transfer'}
                    </td>
                    <td className="py-4">
                      {getPayoutStatusBadge(payout.status)}
                    </td>
                    <td className="py-4 text-gray-400 text-xs">
                      {payout.rejection_reason || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout Request Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-4">Request Payout</h3>
            
            <div className="mb-6">
              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2">Available Balance</p>
                <p className="text-2xl font-bold text-green-400">
                  ₱{availableForPayout.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-2">Payout Amount</label>
              <input
                type="number"
                min="500"
                max={availableForPayout}
                value={payoutForm.amount}
                onChange={(e) => setPayoutForm(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="Enter amount (min ₱500)"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-2">Payout Method</label>
              <select 
                value={payoutForm.payment_method}
                onChange={(e) => setPayoutForm(prev => ({ ...prev, payment_method: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="gcash">GCash</option>
              </select>
            </div>

            {payoutForm.payment_method === 'bank_transfer' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm text-gray-300 mb-2">Account Name</label>
                  <input
                    type="text"
                    value={payoutForm.bank_details.account_name}
                    onChange={(e) => setPayoutForm(prev => ({ 
                      ...prev, 
                      bank_details: { ...prev.bank_details, account_name: e.target.value }
                    }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="Juan Dela Cruz"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm text-gray-300 mb-2">Account Number</label>
                  <input
                    type="text"
                    value={payoutForm.bank_details.account_number}
                    onChange={(e) => setPayoutForm(prev => ({ 
                      ...prev, 
                      bank_details: { ...prev.bank_details, account_number: e.target.value }
                    }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="1234567890"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm text-gray-300 mb-2">Bank Name</label>
                  <input
                    type="text"
                    value={payoutForm.bank_details.bank_name}
                    onChange={(e) => setPayoutForm(prev => ({ 
                      ...prev, 
                      bank_details: { ...prev.bank_details, bank_name: e.target.value }
                    }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="BDO, BPI, Metrobank, etc."
                  />
                </div>
              </>
            )}

            {payoutForm.payment_method === 'gcash' && (
              <div className="mb-4">
                <label className="block text-sm text-gray-300 mb-2">GCash Number</label>
                <input
                  type="text"
                  value={payoutForm.bank_details.account_number}
                  onChange={(e) => setPayoutForm(prev => ({ 
                    ...prev, 
                    bank_details: { ...prev.bank_details, account_number: e.target.value }
                  }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="09123456789"
                />
              </div>
            )}

            <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3 mb-6">
              <p className="text-blue-400 text-sm">
                <Info className="w-4 h-4 inline mr-1" />
                Payouts are processed within 2-3 business days. Please ensure your details are correct.
              </p>
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300"
                onClick={() => setShowPayoutModal(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="gradient"
                className="flex-1"
                onClick={handleRequestPayout}
                disabled={submitting}
              >
                {submitting ? 'Processing...' : 'Request Payout'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostEarnings;