// frontend/src/components/host/HostEarnings.jsx - FULLY RESPONSIVE VERSION
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
  AlertCircle,
  Menu
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
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
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      warning: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <Clock className="w-3 h-3 mr-0.5 sm:mr-1" /> },
      info: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <RefreshCw className="w-3 h-3 mr-0.5 sm:mr-1" /> },
      success: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-3 h-3 mr-0.5 sm:mr-1" /> },
      danger: { bg: 'bg-red-100', text: 'text-red-800', icon: <AlertTriangle className="w-3 h-3 mr-0.5 sm:mr-1" /> },
      secondary: { bg: 'bg-gray-100', text: 'text-gray-800', icon: <Info className="w-3 h-3 mr-0.5 sm:mr-1" /> }
    };
    
    const config = colorMap[color] || colorMap.secondary;
    
    return (
      <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.icon}
        <span className="hidden xs:inline">{text}</span>
        <span className="xs:hidden">{text.substring(0, 3)}</span>
      </span>
    );
  };

  // Calculate totals from balance data - Convert all to numbers
  const totalEarnings = Number(balance?.total_earned) || 0;
  const availableForPayout = Number(balance?.available_for_payout) || 0;
  const pendingPayout = Number(balance?.pending_payout) || 0;
  const totalWithdrawn = Number(balance?.total_withdrawn) || 0;
  const pendingRefunds = Number(balance?.pending_refunds) || 0;
  const completedRefunds = Number(balance?.completed_refunds) || 0;
  const netEarnings = Number(earningsData?.netEarnings) || (totalEarnings - completedRefunds);

  // Calculate fees for current amount
  const payoutFees = payoutForm.amount && parseFloat(payoutForm.amount) > 0
    ? payoutService.calculateNetAmount(parseFloat(payoutForm.amount), payoutForm.payment_method)
    : null;

  // Format currency for mobile
  const formatMobileCurrency = (amount) => {
    if (amount >= 1000000) {
      return `₱${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 10000) {
      return `₱${(amount / 1000).toFixed(0)}k`;
    }
    return payoutService.formatCurrency(amount);
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
        <div className="flex justify-center items-center min-h-[50vh] sm:min-h-64">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 sm:py-16 px-4">
        <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-red-500 mx-auto mb-3 sm:mb-4" />
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">Failed to load earnings</h3>
        <p className="text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base">{error}</p>
        <Button onClick={loadEarningsData} variant="gradient" className="text-sm sm:text-base">
          <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Earnings & Payouts</h1>
          <p className="text-gray-400 text-sm sm:text-base">Track your income and manage payouts</p>
        </div>
        
        <Button 
          onClick={loadEarningsData} 
          variant="outline" 
          className="border-gray-600 text-xs sm:text-sm px-3 sm:px-4 py-2"
        >
          <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
          Refresh
        </Button>
      </div>

      {/* Earnings Overview Cards - Responsive Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {/* 1. TOTAL EARNED */}
        <div className="bg-gray-800 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6">
          <div className="flex items-start sm:items-center justify-between">
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-gray-400">Total Earned</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-white mt-0.5">
                <span className="sm:hidden">{formatMobileCurrency(totalEarnings)}</span>
                <span className="hidden sm:inline">{payoutService.formatCurrency(totalEarnings)}</span>
              </p>
              <p className="text-xs text-green-400 mt-0.5 sm:mt-1 hidden xs:block">From bookings</p>
            </div>
            <div className="p-2 sm:p-3 rounded-full bg-green-600/20">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-400" />
            </div>
          </div>
        </div>

        {/* 2. AVAILABLE */}
        <div className="bg-gray-800 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6">
          <div className="flex items-start sm:items-center justify-between">
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-gray-400">Available</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-white mt-0.5">
                <span className="sm:hidden">{formatMobileCurrency(availableForPayout)}</span>
                <span className="hidden sm:inline">{payoutService.formatCurrency(availableForPayout)}</span>
              </p>
              <p className="text-xs text-blue-400 mt-0.5 sm:mt-1 hidden xs:block">To withdraw</p>
            </div>
            <div className="p-2 sm:p-3 rounded-full bg-blue-600/20">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-400" />
            </div>
          </div>
        </div>

        {/* 3. PENDING */}
        <div className="bg-gray-800 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6">
          <div className="flex items-start sm:items-center justify-between">
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-gray-400">Pending</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-white mt-0.5">
                <span className="sm:hidden">{formatMobileCurrency(pendingPayout)}</span>
                <span className="hidden sm:inline">{payoutService.formatCurrency(pendingPayout)}</span>
              </p>
              <p className="text-xs text-yellow-400 mt-0.5 sm:mt-1 hidden xs:block">Processing</p>
            </div>
            <div className="p-2 sm:p-3 rounded-full bg-yellow-600/20">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-yellow-400" />
            </div>
          </div>
                  </div>

        {/* 4. WITHDRAWN */}
        <div className="bg-gray-800 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6">
          <div className="flex items-start sm:items-center justify-between">
            <div className="flex-1">
              <p className="text-xs sm:text-sm text-gray-400">Withdrawn</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-white mt-0.5">
                <span className="sm:hidden">{formatMobileCurrency(totalWithdrawn)}</span>
                <span className="hidden sm:inline">{payoutService.formatCurrency(totalWithdrawn)}</span>
              </p>
              <p className="text-xs text-purple-400 mt-0.5 sm:mt-1 hidden xs:block">Paid out</p>
            </div>
            <div className="p-2 sm:p-3 rounded-full bg-purple-600/20">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Refund Information Cards - Responsive */}
      {(pendingRefunds > 0 || completedRefunds > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
          {/* Pending Refunds */}
          {pendingRefunds > 0 && (
            <div className="bg-orange-900/20 border border-orange-600 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6">
              <div className="flex items-start space-x-2 sm:space-x-3">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-orange-400 font-semibold mb-1 text-sm sm:text-base">Pending Refunds</h4>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1 sm:mb-2">
                    {payoutService.formatCurrency(pendingRefunds)}
                  </p>
                  <p className="text-gray-300 text-xs sm:text-sm">
                    Refunds being processed. This amount is on hold.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Completed Refunds */}
          {completedRefunds > 0 && (
            <div className="bg-red-900/20 border border-red-600 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6">
              <div className="flex items-start space-x-2 sm:space-x-3">
                <Info className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-red-400 font-semibold mb-1 text-sm sm:text-base">Completed Refunds</h4>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1 sm:mb-2">
                    {payoutService.formatCurrency(completedRefunds)}
                  </p>
                  <p className="text-gray-300 text-xs sm:text-sm">
                    Total refunded. Deducted from earnings.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Earnings Breakdown - Responsive */}
      {completedRefunds > 0 && (
        <div className="bg-gray-800 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Earnings Breakdown</h3>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-xs sm:text-sm">Total Earned</span>
              <span className="text-white font-semibold text-sm sm:text-base">
                {payoutService.formatCurrency(totalEarnings)}
              </span>
            </div>
            <div className="flex justify-between items-center text-red-400">
              <span className="text-xs sm:text-sm">Less: Refunds</span>
              <span className="font-semibold text-sm sm:text-base">
                - {payoutService.formatCurrency(completedRefunds)}
              </span>
            </div>
            <div className="border-t border-gray-700 pt-2 sm:pt-3 flex justify-between items-center">
              <span className="text-white font-semibold text-sm sm:text-base">Net Earnings</span>
              <span className="text-green-400 font-bold text-base sm:text-lg">
                {payoutService.formatCurrency(netEarnings)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Request Payout Button - Responsive */}
      {availableForPayout >= 100 && (
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg sm:rounded-xl p-4 sm:p-6 text-center">
          <h3 className="text-lg sm:text-xl font-bold text-white mb-1 sm:mb-2">Ready for Payout</h3>
          <p className="text-green-100 mb-3 sm:mb-4 text-sm sm:text-base">
            You have {payoutService.formatCurrency(availableForPayout)} available
          </p>
          <Button 
            onClick={() => setShowPayoutModal(true)}
            variant="secondary"
            className="bg-white text-green-600 hover:bg-gray-100 text-sm sm:text-base px-4 sm:px-6 py-2"
          >
            <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
            Request Payout
          </Button>
        </div>
      )}

      {/* Minimum Payout Notice - Responsive */}
      {availableForPayout > 0 && availableForPayout < 100 && (
        <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <Info className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-yellow-500 font-semibold mb-1 text-sm sm:text-base">Below Minimum</h4>
              <p className="text-gray-300 text-xs sm:text-sm">
                You have {payoutService.formatCurrency(availableForPayout)}, but minimum is ₱100.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* No Available Balance Notice - Responsive */}
      {availableForPayout === 0 && totalEarnings > 0 && (
        <div className="bg-blue-900/20 border border-blue-600 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-blue-400 font-semibold mb-1 text-sm sm:text-base">No Available Balance</h4>
              <p className="text-gray-300 text-xs sm:text-sm">
                {pendingPayout > 0 && `₱${pendingPayout.toLocaleString()} processing. `}
                {pendingRefunds > 0 && `₱${pendingRefunds.toLocaleString()} on hold. `}
                {totalWithdrawn > 0 && `₱${totalWithdrawn.toLocaleString()} withdrawn.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payout History - Responsive Table */}
      <div className="bg-gray-800 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg font-semibold text-white">Payout History</h3>
        </div>

        {payouts.length === 0 ? (
          <div className="text-center py-6 sm:py-8">
            <CreditCard className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
            <h4 className="text-base sm:text-lg font-semibold text-white mb-1 sm:mb-2">No payouts yet</h4>
            <p className="text-gray-400 text-sm sm:text-base">Your payout history will appear here</p>
          </div>
        ) : (
          <>
            {/* Mobile View - Cards */}
            <div className="sm:hidden space-y-3">
              {payouts.map((payout) => (
                <div key={payout.id} className="bg-gray-700 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-white font-semibold">
                        {payoutService.formatCurrency(payout.amount)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(payout.created_at || payout.requested_at).toLocaleDateString()}
                      </p>
                    </div>
                    {getPayoutStatusBadge(payout.status)}
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Method:</span>
                      <span className="text-gray-300 capitalize">
                        {payout.payment_method?.replace('_', ' ') || 'Bank'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Fee:</span>
                      <span className="text-gray-300">
                        {payoutService.formatCurrency(payout.fee || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Net:</span>
                      <span className="text-green-400 font-semibold">
                        {payoutService.formatCurrency(payout.net_amount || payout.amount)}
                      </span>
                    </div>
                    {payout.rejection_reason && (
                      <p className="text-red-400 mt-2">{payout.rejection_reason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View - Table */}
            <div className="hidden sm:block overflow-x-auto">
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
          </>
        )}
      </div>

      {/* Payout Request Modal - Responsive */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-4 sm:p-6 max-w-full sm:max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-white">Request Payout</h3>
              <button 
                onClick={() => setShowPayoutModal(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
            
                        <div className="mb-4 sm:mb-6">
              <div className="bg-gray-700 rounded-lg p-3 sm:p-4">
                <p className="text-gray-400 text-xs sm:text-sm mb-1 sm:mb-2">Available Balance</p>
                <p className="text-xl sm:text-2xl font-bold text-green-400">
                  {payoutService.formatCurrency(availableForPayout)}
                </p>
              </div>
            </div>

            <div className="mb-3 sm:mb-4">
              <label className="block text-xs sm:text-sm text-gray-300 mb-1.5 sm:mb-2">Payout Amount</label>
              <input
                type="number"
                min="100"
                max={availableForPayout}
                value={payoutForm.amount}
                onChange={(e) => setPayoutForm(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm sm:text-base"
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

            <div className="mb-3 sm:mb-4">
              <label className="block text-xs sm:text-sm text-gray-300 mb-1.5 sm:mb-2">Payout Method</label>
              <select 
                value={payoutForm.payment_method}
                onChange={(e) => setPayoutForm(prev => ({ ...prev, payment_method: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm sm:text-base"
              >
                <option value="bank_transfer">Bank Transfer (₱25 fee)</option>
                <option value="gcash">GCash (₱15 fee)</option>
                <option value="paymaya">PayMaya (₱15 fee)</option>
              </select>
            </div>

            {/* Bank Transfer Fields - Responsive */}
            {payoutForm.payment_method === 'bank_transfer' && (
              <>
                <div className="mb-3 sm:mb-4">
                  <label className="block text-xs sm:text-sm text-gray-300 mb-1.5 sm:mb-2">Bank</label>
                  <select
                    value={payoutForm.bank_details.bank_code}
                    onChange={(e) => setPayoutForm(prev => ({ 
                      ...prev, 
                      bank_details: { ...prev.bank_details, bank_code: e.target.value }
                    }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm sm:text-base"
                  >
                    <option value="">Select Bank</option>
                    {bankOptions.map(bank => (
                      <option key={bank.code} value={bank.code}>
                        {isMobile && bank.name.length > 20 ? bank.code : bank.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3 sm:mb-4">
                  <label className="block text-xs sm:text-sm text-gray-300 mb-1.5 sm:mb-2">Account Name</label>
                  <input
                    type="text"
                    value={payoutForm.bank_details.account_name}
                    onChange={(e) => setPayoutForm(prev => ({ 
                      ...prev, 
                      bank_details: { ...prev.bank_details, account_name: e.target.value }
                    }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm sm:text-base"
                    placeholder="Juan Dela Cruz"
                  />
                </div>

                <div className="mb-3 sm:mb-4">
                  <label className="block text-xs sm:text-sm text-gray-300 mb-1.5 sm:mb-2">Account Number</label>
                  <input
                    type="text"
                    value={payoutForm.bank_details.account_number}
                    onChange={(e) => setPayoutForm(prev => ({ 
                      ...prev, 
                      bank_details: { ...prev.bank_details, account_number: e.target.value }
                    }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm sm:text-base"
                    placeholder="1234567890"
                  />
                </div>
              </>
            )}

            {/* GCash/PayMaya Fields - Responsive */}
            {(payoutForm.payment_method === 'gcash' || payoutForm.payment_method === 'paymaya') && (
              <>
                <div className="mb-3 sm:mb-4">
                  <label className="block text-xs sm:text-sm text-gray-300 mb-1.5 sm:mb-2">Account Name</label>
                  <input
                    type="text"
                    value={payoutForm.bank_details.account_name}
                    onChange={(e) => setPayoutForm(prev => ({ 
                      ...prev, 
                      bank_details: { ...prev.bank_details, account_name: e.target.value }
                    }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm sm:text-base"
                    placeholder="Juan Dela Cruz"
                  />
                </div>

                <div className="mb-3 sm:mb-4">
                  <label className="block text-xs sm:text-sm text-gray-300 mb-1.5 sm:mb-2">
                    {payoutForm.payment_method === 'gcash' ? 'GCash' : 'PayMaya'} Number
                  </label>
                  <input
                    type="text"
                    value={payoutForm.bank_details.mobile_number}
                    onChange={(e) => setPayoutForm(prev => ({ 
                      ...prev, 
                      bank_details: { ...prev.bank_details, mobile_number: e.target.value }
                    }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm sm:text-base"
                    placeholder="09123456789"
                  />
                </div>
              </>
            )}

            <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-2.5 sm:p-3 mb-4 sm:mb-6">
              <p className="text-blue-400 text-xs sm:text-sm">
                <Info className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                Payouts are processed within 2-3 business days.
              </p>
            </div>

            <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
              <Button
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 text-sm sm:text-base px-3 sm:px-4 py-2"
                onClick={() => setShowPayoutModal(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="gradient"
                className="flex-1 text-sm sm:text-base px-3 sm:px-4 py-2"
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