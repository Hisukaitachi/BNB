// frontend/src/components/host/HostEarnings.jsx - Earnings & Payouts Management
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
  AlertTriangle
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import hostService from '../../services/hostService';
import Button from '../ui/Button';

const HostEarnings = () => {
  const [earningsData, setEarningsData] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('month'); // week, month, year
  const [showPayoutModal, setShowPayoutModal] = useState(false);

  useEffect(() => {
    loadEarningsData();
  }, [timeRange]);

  const loadEarningsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [earnings, payoutHistory] = await Promise.all([
        hostService.getHostEarnings(),
        hostService.getReceivedPayouts()
      ]);
      
      setEarningsData(earnings);
      setPayouts(payoutHistory);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    try {
      // TODO: Implement payout request
      alert('Payout request feature coming soon!');
      setShowPayoutModal(false);
    } catch (error) {
      alert('Failed to request payout: ' + error.message);
    }
  };

  const getPayoutStatusBadge = (status) => {
    const configs = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      processing: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Processing' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
      failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' }
    };
    
    const config = configs[status] || configs.pending;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  // Prepare chart data
  const chartData = earningsData?.monthlyBreakdown ? 
    Object.entries(earningsData.monthlyBreakdown).map(([month, amount]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      earnings: amount,
      monthKey: month
    })).reverse() : [];

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
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-gray-800 border border-gray-600 text-white rounded-lg px-4 py-2"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          
          <Button onClick={loadEarningsData} variant="outline" className="border-gray-600">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Earnings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Earnings</p>
              <p className="text-2xl font-bold text-white">
                ₱{earningsData?.totalEarnings?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-green-400 mt-1">All time</p>
            </div>
            <div className="p-3 rounded-full bg-green-600/20">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Available for Payout</p>
              <p className="text-2xl font-bold text-white">
                ₱{earningsData?.pendingPayout?.toLocaleString() || 0}
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
              <p className="text-sm text-gray-400">Paid Out</p>
              <p className="text-2xl font-bold text-white">
                ₱{earningsData?.paidOut?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-purple-400 mt-1">Total withdrawn</p>
            </div>
            <div className="p-3 rounded-full bg-purple-600/20">
              <CreditCard className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">This Month</p>
              <p className="text-2xl font-bold text-white">
                ₱{(earningsData?.monthlyBreakdown?.[new Date().toISOString().slice(0, 7)] || 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-1">Current month</p>
            </div>
            <div className="p-3 rounded-full bg-orange-600/20">
              <TrendingUp className="w-6 h-6 text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Request Payout Button */}
      {earningsData?.pendingPayout > 0 && (
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Ready for Payout</h3>
          <p className="text-green-100 mb-4">
            You have ₱{earningsData.pendingPayout.toLocaleString()} available for withdrawal
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

      {/* Earnings Chart */}
      {chartData.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white">Earnings Trend</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <BarChart3 className="w-4 h-4" />
              <span>Last 12 months</span>
            </div>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="month" 
                  stroke="#9CA3AF" 
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9CA3AF" 
                  fontSize={12}
                  tickFormatter={(value) => `₱${value.toLocaleString()}`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                  formatter={(value) => [`₱${value.toLocaleString()}`, 'Earnings']}
                />
                <Line 
                  type="monotone" 
                  dataKey="earnings" 
                  stroke="#8B5CF6" 
                  strokeWidth={3}
                  dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#8B5CF6', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Payout History */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-white">Payout History</h3>
          <Button
            size="sm"
            variant="ghost" 
            className="text-gray-400"
            onClick={() => {
              // TODO: Export payouts to CSV
              console.log('Export payouts');
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
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
                  <th className="text-left py-3 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((payout) => (
                  <tr key={payout.id} className="border-b border-gray-700/50">
                    <td className="py-4 text-white">
                      {new Date(payout.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-4 text-white font-semibold">
                      ₱{Number(payout.amount).toLocaleString()}
                    </td>
                    <td className="py-4 text-gray-300">
                      {payout.payout_method || 'Bank Transfer'}
                    </td>
                    <td className="py-4">
                      {getPayoutStatusBadge(payout.status)}
                    </td>
                    <td className="py-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-400"
                        onClick={() => {
                          // TODO: View payout details
                          console.log('View payout:', payout.id);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Details
                      </Button>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Request Payout</h3>
            
            <div className="mb-6">
              <div className="bg-gray-700 rounded-lg p-4 text-center">
                <p className="text-gray-400 text-sm">Available Amount</p>
                <p className="text-2xl font-bold text-green-400">
                  ₱{earningsData?.pendingPayout?.toLocaleString() || 0}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm text-gray-300 mb-2">Payout Method</label>
              <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                <option value="bank">Bank Transfer</option>
                <option value="gcash">GCash</option>
              </select>
            </div>

            <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3 mb-6">
              <p className="text-blue-400 text-sm">
                ⓘ Payouts are processed within 2-3 business days. A small processing fee may apply.
              </p>
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300"
                onClick={() => setShowPayoutModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="gradient"
                className="flex-1"
                onClick={handleRequestPayout}
              >
                Request Payout
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HostEarnings;