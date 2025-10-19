// frontend/src/components/host/HostEarnings.jsx - Updated with Refund Tracking
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
  CheckCircle,
  X,
  Clock,
  AlertCircle
} from 'lucide-react';
import payoutService from '../../services/payoutService';
import Button from '../ui/Button';

const HostEarnings = () => {
  const [earningsData, setEarningsData] = useState(null);
  const [balance, setBalance] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    amount: '',
    payment_method: 'bank_transfer',
    bank_details: {
      account_name: '',
      account_number: '',
      bank_code: '',
      bank_name: '',
      mobile_number: ''
    }
  });
  const [submitting, setSubmitting] = useState(false);

  // Bank codes for Philippines
  const bankOptions = [
    { code: 'BDO', name: 'BDO Unibank' },
    { code: 'BPI', name: 'Bank of the Philippine Islands' },
    { code: 'MBTC', name: 'Metrobank' },
    { code: 'PNB', name: 'Philippine National Bank' },
    { code: 'RCBC', name: 'RCBC' },
    { code: 'UBP', name: 'UnionBank' },
    { code: 'LANDBANK', name: 'LandBank' },
    { code: 'CHINABANK', name: 'China Bank' },
    { code: 'SECB', name: 'Security Bank' },
    { code: 'AUB', name: 'Asia United Bank' },
    { code: 'EWB', name: 'EastWest Bank' },
    { code: 'PSB', name: 'Philippine Savings Bank' }
  ];

  useEffect(() => {
    loadEarningsData();
  }, []);

  const loadEarningsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [earningsResult, balanceResult, payoutsResult] = 
      await Promise.all([
        payoutService.getMyEarnings(),
        payoutService.getAvailableBalance(),
        payoutService.getReceivedPayouts()
      ]);
      
      if (!earningsResult.success) {
        throw new Error(earningsResult.error);
      }
      
      setEarningsData(earningsResult.data);
      setBalance(balanceResult.data);
      setPayouts(payoutsResult.data);
      
      console.log('=== BALANCE DATA ===');
      console.log('Full balance object:', balanceResult.data);
      console.log('Total Earned:', balanceResult.data?.total_earned);
      console.log('Available:', balanceResult.data?.available_for_payout);
      console.log('Pending:', balanceResult.data?.pending_payout);
      console.log('Withdrawn:', balanceResult.data?.total_withdrawn);
      console.log('Pending Refunds:', balanceResult.data?.pending_refunds);
      console.log('Completed Refunds:', balanceResult.data?.completed_refunds);
      console.log('===================');
    
      // Set default payout amount to available balance
      if (balanceResult.data?.available_for_payout) {
        setPayoutForm(prev => ({
          ...prev,
          amount: balanceResult.data.available_for_payout.toString()
        }));
      }
    } catch (err) {
      console.error('Error loading earnings:', err);
      setError(err.message || 'Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    try {
      setSubmitting(true);
      
      // Validate using service
      const validation = payoutService.validatePayoutRequest(payoutForm);
      if (!validation.isValid) {
        alert(validation.errors.join('\n'));
        return;
      }
      
      // Prepare bank details based on payment method
      let bankDetails = {};
      
      if (payoutForm.payment_method === 'bank_transfer') {
        const selectedBank = bankOptions.find(b => b.code === payoutForm.bank_details.bank_code);
        bankDetails = {
          bank_code: payoutForm.bank_details.bank_code,
          bank_name: selectedBank?.name || payoutForm.bank_details.bank_name,
          account_number: payoutForm.bank_details.account_number,
          account_name: payoutForm.bank_details.account_name
        };
      } else if (payoutForm.payment_method === 'gcash' || payoutForm.payment_method === 'paymaya') {
        bankDetails = {
          mobile_number: payoutForm.bank_details.mobile_number,
          account_name: payoutForm.bank_details.account_name
        };
      }
      
      // Submit payout request
      const result = await payoutService.requestPayout({
        amount: parseFloat(payoutForm.amount),
        payment_method: payoutForm.payment_method,
        bank_details: bankDetails
      });
      
      if (result.success) {
        alert(result.message || 'Payout request submitted successfully!');
        setShowPayoutModal(false);
        loadEarningsData(); // Refresh data
        
        // Reset form
        setPayoutForm({
          amount: '',
          payment_method: 'bank_transfer',
          bank_details: {
            account_name: '',
            account_number: '',
            bank_code: '',
            bank_name: '',
            mobile_number: ''
          }
        });
      } else {
        alert(result.error || 'Failed to request payout');
      }
    } catch (error) {
      alert('Failed to request payout: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getPayoutStatusBadge = (status) => {
    const color = payoutService.getStatusColor(status);
    const text = payoutService.getStatusText(status);
    
    const colorMap = {
      warning: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <Clock className="w-3 h-3 mr-1" /> },
      info: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <RefreshCw className="w-3 h-3 mr-1" /> },
      success: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-3 h-3 mr-1" /> },
      danger: { bg: 'bg-red-100', text: 'text-red-800', icon: <AlertTriangle className="w-3 h-3 mr-1" /> },
      secondary: { bg: 'bg-gray-100', text: 'text-gray-800', icon: <Info className="w-3 h-3 mr-1" /> }
    };
    
    const config = colorMap[color] || colorMap.secondary;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.icon}
        {text}
      </span>
    );
  };

  // ✅ UPDATED: Calculate totals from balance data
  const totalEarnings = balance?.total_earned || 0;
  const availableForPayout = balance?.available_for_payout || 0;
  const pendingPayout = balance?.pending_payout || 0;
  const totalWithdrawn = balance?.total_withdrawn || 0;
  const pendingRefunds = balance?.pending_refunds || 0;
  const completedRefunds = balance?.completed_refunds || 0;
  const netEarnings = earningsData?.netEarnings || (totalEarnings - completedRefunds);

  // Calculate fees for current amount
  const payoutFees = payoutForm.amount && parseFloat(payoutForm.amount) > 0
    ? payoutService.calculateNetAmount(parseFloat(payoutForm.amount), payoutForm.payment_method)
    : null;

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

      {/* ✅ UPDATED: Earnings Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* 1. TOTAL EARNED */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Earned</p>
              <p className="text-2xl font-bold text-white">
                {payoutService.formatCurrency(totalEarnings)}
              </p>
              <p className="text-xs text-green-400 mt-1">From active bookings</p>
            </div>
            <div className="p-3 rounded-full bg-green-600/20">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        {/* 2. AVAILABLE */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Available</p>
              <p className="text-2xl font-bold text-white">
                {payoutService.formatCurrency(availableForPayout)}
              </p>
              <p className="text-xs text-blue-400 mt-1">Ready to withdraw</p>
            </div>
            <div className="p-3 rounded-full bg-blue-600/20">
              <Wallet className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        {/* 3. PENDING */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-white">
                {payoutService.formatCurrency(pendingPayout)}
              </p>
              <p className="text-xs text-yellow-400 mt-1">Being processed</p>
            </div>
            <div className="p-3 rounded-full bg-yellow-600/20">
              <Clock className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </div>

        {/* 4. WITHDRAWN */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Withdrawn</p>
              <p className="text-2xl font-bold text-white">
                {payoutService.formatCurrency(totalWithdrawn)}
              </p>
              <p className="text-xs text-purple-400 mt-1">Total paid out</p>
            </div>
            <div className="p-3 rounded-full bg-purple-600/20">
              <CreditCard className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* ✅ NEW: Refund Information Cards (if refunds exist) */}
      {(pendingRefunds > 0 || completedRefunds > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pending Refunds */}
          {pendingRefunds > 0 && (
            <div className="bg-orange-900/20 border border-orange-600 rounded-xl p-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-orange-400 font-semibold mb-1">Pending Refunds</h4>
                  <p className="text-2xl font-bold text-white mb-2">
                    {payoutService.formatCurrency(pendingRefunds)}
                  </p>
                  <p className="text-gray-300 text-sm">
                    Refunds being processed for cancelled bookings. This amount is on hold and not available for payout.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Completed Refunds */}
          {completedRefunds > 0 && (
            <div className="bg-red-900/20 border border-red-600 rounded-xl p-6">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-red-400 font-semibold mb-1">Completed Refunds</h4>
                  <p className="text-2xl font-bold text-white mb-2">
                    {payoutService.formatCurrency(completedRefunds)}
                  </p>
                  <p className="text-gray-300 text-sm">
                    Total refunded to customers for cancelled bookings. Deducted from your earnings.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ✅ NEW: Earnings Breakdown */}
      {completedRefunds > 0 && (
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Earnings Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Total Earned (Active Bookings)</span>
              <span className="text-white font-semibold">
                {payoutService.formatCurrency(totalEarnings)}
              </span>
            </div>
            <div className="flex justify-between items-center text-red-400">
              <span>Less: Completed Refunds</span>
              <span className="font-semibold">
                - {payoutService.formatCurrency(completedRefunds)}
              </span>
            </div>
            <div className="border-t border-gray-700 pt-3 flex justify-between items-center">
              <span className="text-white font-semibold">Net Earnings</span>
              <span className="text-green-400 font-bold text-lg">
                {payoutService.formatCurrency(netEarnings)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Request Payout Button */}
      {availableForPayout >= 100 && (
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Ready for Payout</h3>
          <p className="text-green-100 mb-4">
            You have {payoutService.formatCurrency(availableForPayout)} available for withdrawal
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
      {availableForPayout > 0 && availableForPayout < 100 && (
        <div className="bg-yellow-900/20 border border-yellow-600 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div>
              <h4 className="text-yellow-500 font-semibold mb-1">Below Minimum Payout</h4>
              <p className="text-gray-300 text-sm">
                You have {payoutService.formatCurrency(availableForPayout)} available, but the minimum payout amount is ₱100.
                Continue earning to reach the minimum threshold.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ✅ UPDATED: No Available Balance Notice */}
      {availableForPayout === 0 && totalEarnings > 0 && (
        <div className="bg-blue-900/20 border border-blue-600 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <h4 className="text-blue-400 font-semibold mb-1">No Available Balance</h4>
              <p className="text-gray-300 text-sm">
                {pendingPayout > 0 && `₱${pendingPayout.toFixed(2)} is currently being processed. `}
                {pendingRefunds > 0 && `₱${pendingRefunds.toFixed(2)} is on hold for pending refunds. `}
                {totalWithdrawn > 0 && `₱${totalWithdrawn.toFixed(2)} has already been withdrawn.`}
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
                  <th className="text-left py-3 text-gray-400 font-medium">Fee</th>
                  <th className="text-left py-3 text-gray-400 font-medium">Net</th>
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
                      {payoutService.formatCurrency(payout.amount)}
                    </td>
                    <td className="py-4 text-gray-300">
                      {payoutService.formatCurrency(payout.fee || 0)}
                    </td>
                    <td className="py-4 text-green-400 font-semibold">
                      {payoutService.formatCurrency(payout.net_amount || payout.amount)}
                    </td>
                    <td className="py-4 text-gray-300 capitalize">
                      {payout.payment_method?.replace('_', ' ') || 'Bank Transfer'}
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
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Request Payout</h3>
              <button 
                onClick={() => setShowPayoutModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-6">
              <div className="bg-gray-700 rounded-lg p-4">
                <p className="text-gray-400 text-sm mb-2">Available Balance</p>
                <p className="text-2xl font-bold text-green-400">
                  {payoutService.formatCurrency(availableForPayout)}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-2">Payout Amount</label>
              <input
                type="number"
                min="100"
                max={availableForPayout}
                value={payoutForm.amount}
                onChange={(e) => setPayoutForm(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="Enter amount (min ₱100)"
              />
              
              {payoutFees && (
                <div className="mt-2 text-xs space-y-1">
                  <div className="flex justify-between text-gray-400">
                    <span>Processing Fee:</span>
                    <span>{payoutService.formatCurrency(payoutFees.fee)}</span>
                  </div>
                  <div className="flex justify-between text-green-400 font-semibold">
                    <span>You'll receive:</span>
                    <span>{payoutService.formatCurrency(payoutFees.netAmount)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-2">Payout Method</label>
              <select 
                value={payoutForm.payment_method}
                onChange={(e) => setPayoutForm(prev => ({ ...prev, payment_method: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="bank_transfer">Bank Transfer (₱25 fee)</option>
                <option value="gcash">GCash (₱15 fee)</option>
                <option value="paymaya">PayMaya (₱15 fee)</option>
              </select>
            </div>

            {/* Bank Transfer Fields */}
            {payoutForm.payment_method === 'bank_transfer' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm text-gray-300 mb-2">Bank</label>
                  <select
                    value={payoutForm.bank_details.bank_code}
                    onChange={(e) => setPayoutForm(prev => ({ 
                      ...prev, 
                      bank_details: { ...prev.bank_details, bank_code: e.target.value }
                    }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="">Select Bank</option>
                    {bankOptions.map(bank => (
                      <option key={bank.code} value={bank.code}>{bank.name}</option>
                    ))}
                  </select>
                </div>

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
              </>
            )}

            {/* GCash/PayMaya Fields */}
            {(payoutForm.payment_method === 'gcash' || payoutForm.payment_method === 'paymaya') && (
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
                  <label className="block text-sm text-gray-300 mb-2">
                    {payoutForm.payment_method === 'gcash' ? 'GCash' : 'PayMaya'} Number
                  </label>
                  <input
                    type="text"
                    value={payoutForm.bank_details.mobile_number}
                    onChange={(e) => setPayoutForm(prev => ({ 
                      ...prev, 
                      bank_details: { ...prev.bank_details, mobile_number: e.target.value }
                    }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="09123456789"
                  />
                </div>
              </>
            )}

            <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3 mb-6">
              <p className="text-blue-400 text-sm">
                <Info className="w-4 h-4 inline mr-1" />
                Payouts are processed manually by admin within 2-3 business days. Please ensure your details are correct.
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