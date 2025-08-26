// src/components/host/EarningsTab.jsx
import React, { useState, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, Calendar, Download, 
  CreditCard, Clock, CheckCircle, AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import Button from '../common/Button';
import Loading from '../common/Loading';
import { useApp } from '../../context/AppContext';

const EarningsTab = () => {
  const [earnings, setEarnings] = useState({
    totalEarnings: 0,
    pendingPayouts: 0,
    thisMonth: 0,
    lastMonth: 0,
    yearToDate: 0
  });
  const [payouts, setPayouts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('thisMonth');
  const [loading, setLoading] = useState(true);
  const { showToast } = useApp();

  useEffect(() => {
    fetchEarningsData();
  }, []);

  const fetchEarningsData = async () => {
    try {
      setLoading(true);
      const [earningsRes, payoutsRes, bookingsRes] = await Promise.all([
        api.getHostEarnings(),
        api.getReceivedPayouts(),
        api.getHostBookings()
      ]);

      const totalEarnings = earningsRes.data?.totalEarnings || 0;
      const payoutsData = payoutsRes.data?.payouts || [];
      const bookingsData = bookingsRes.data?.bookings || [];

      // Calculate earnings breakdown
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const yearStart = new Date(now.getFullYear(), 0, 1);

      const thisMonthEarnings = bookingsData
        .filter(b => new Date(b.created_at) >= thisMonthStart && ['confirmed', 'completed'].includes(b.status))
        .reduce((sum, b) => sum + (b.total_price || 0), 0);

      const lastMonthEarnings = bookingsData
        .filter(b => new Date(b.created_at) >= lastMonthStart && new Date(b.created_at) <= lastMonthEnd && ['confirmed', 'completed'].includes(b.status))
        .reduce((sum, b) => sum + (b.total_price || 0), 0);

      const yearToDateEarnings = bookingsData
        .filter(b => new Date(b.created_at) >= yearStart && ['confirmed', 'completed'].includes(b.status))
        .reduce((sum, b) => sum + (b.total_price || 0), 0);

      const pendingPayouts = bookingsData
        .filter(b => b.status === 'completed' && !payoutsData.find(p => p.booking_id === b.id))
        .reduce((sum, b) => sum + ((b.total_price || 0) * 0.85), 0); // 85% after platform fee

      setEarnings({
        totalEarnings,
        pendingPayouts,
        thisMonth: thisMonthEarnings,
        lastMonth: lastMonthEarnings,
        yearToDate: yearToDateEarnings
      });

      setPayouts(payoutsData);
      setTransactions(generateTransactions(bookingsData, payoutsData));
    } catch (error) {
      console.error('Failed to fetch earnings data:', error);
      showToast('Failed to load earnings data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateTransactions = (bookings, payouts) => {
    const transactions = [];
    
    // Add booking transactions
    bookings.forEach(booking => {
      if (['confirmed', 'completed'].includes(booking.status)) {
        transactions.push({
          id: `booking-${booking.id}`,
          type: 'booking',
          amount: booking.total_price || 0,
          date: booking.created_at,
          description: `Booking: ${booking.listing_title}`,
          status: booking.status,
          guestName: booking.client_name
        });
      }
    });

    // Add payout transactions
    payouts.forEach(payout => {
      transactions.push({
        id: `payout-${payout.id}`,
        type: 'payout',
        amount: -(payout.amount || 0),
        date: payout.created_at,
        description: `Payout to ${payout.payment_method}`,
        status: payout.status
      });
    });

    return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(Math.abs(price));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'confirmed': return 'text-blue-400';
      case 'pending': return 'text-yellow-400';
      case 'paid': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status, type) => {
    if (type === 'payout') {
      return status === 'paid' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />;
    }
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'confirmed': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const calculateGrowth = (current, previous) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const downloadEarningsReport = () => {
    // Simulate report download
    showToast('Earnings report downloaded successfully', 'success');
  };

  if (loading) {
    return <Loading message="Loading earnings..." fullScreen={false} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Earnings Overview</h2>
          <p className="text-gray-400">Track your income and payout history</p>
        </div>
        <Button
          onClick={downloadEarningsReport}
          icon={<Download className="w-4 h-4" />}
          variant="outline"
        >
          Download Report
        </Button>
      </div>

      {/* Earnings Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-right">
              <p className="text-sm text-green-400">Lifetime</p>
            </div>
          </div>
          <h3 className="text-2xl font-bold">{formatPrice(earnings.totalEarnings)}</h3>
          <p className="text-gray-400 text-sm">Total Earnings</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Calendar className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-right">
              <p className={`text-sm ${calculateGrowth(earnings.thisMonth, earnings.lastMonth) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {calculateGrowth(earnings.thisMonth, earnings.lastMonth) >= 0 ? '+' : ''}{calculateGrowth(earnings.thisMonth, earnings.lastMonth)}%
              </p>
            </div>
          </div>
          <h3 className="text-2xl font-bold">{formatPrice(earnings.thisMonth)}</h3>
          <p className="text-gray-400 text-sm">This Month</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="text-right">
              <p className="text-sm text-yellow-400">Pending</p>
            </div>
          </div>
          <h3 className="text-2xl font-bold">{formatPrice(earnings.pendingPayouts)}</h3>
          <p className="text-gray-400 text-sm">Pending Payouts</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
            <div className="text-right">
              <p className="text-sm text-purple-400">YTD</p>
            </div>
          </div>
          <h3 className="text-2xl font-bold">{formatPrice(earnings.yearToDate)}</h3>
          <p className="text-gray-400 text-sm">Year to Date</p>
        </div>
      </div>

      {/* Earnings Chart Placeholder */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Earnings Trend</h3>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
          >
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="last3Months">Last 3 Months</option>
            <option value="thisYear">This Year</option>
          </select>
        </div>
        
        {/* Simple bar chart visualization */}
        <div className="space-y-4">
          {['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((week, index) => {
            const amount = Math.floor(Math.random() * 15000) + 5000;
            const maxAmount = 20000;
            const percentage = (amount / maxAmount) * 100;
            
            return (
              <div key={week} className="flex items-center justify-between">
                <span className="text-sm text-gray-400 w-16">{week}</span>
                <div className="flex-1 mx-4">
                  <div className="bg-gray-700 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium w-24 text-right">{formatPrice(amount)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Recent Transactions</h3>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.slice(0, 10).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-650 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${
                    transaction.type === 'booking' ? 'bg-green-500/20' : 'bg-blue-500/20'
                  }`}>
                    {transaction.type === 'booking' ? (
                      <DollarSign className="w-5 h-5 text-green-400" />
                    ) : (
                      <CreditCard className="w-5 h-5 text-blue-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium">{transaction.description}</h4>
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <span>{formatDate(transaction.date)}</span>
                      {transaction.guestName && (
                        <>
                          <span>•</span>
                          <span>{transaction.guestName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <div className={`flex items-center space-x-1 ${getStatusColor(transaction.status)}`}>
                      {getStatusIcon(transaction.status, transaction.type)}
                      <span className="text-xs capitalize">{transaction.status}</span>
                    </div>
                  </div>
                  <p className={`font-semibold ${
                    transaction.amount > 0 ? 'text-green-400' : 'text-blue-400'
                  }`}>
                    {transaction.amount > 0 ? '+' : ''}{formatPrice(transaction.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payout Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Payout Schedule</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
              <span className="text-sm text-gray-400">Next Payout</span>
              <span className="font-medium">Every 7 days</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
              <span className="text-sm text-gray-400">Processing Time</span>
              <span className="font-medium">3-5 business days</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
              <span className="text-sm text-gray-400">Platform Fee</span>
              <span className="font-medium">15%</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Earnings Breakdown</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Gross Earnings</span>
              <span className="font-medium">{formatPrice(earnings.thisMonth)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Platform Fee (15%)</span>
              <span className="font-medium text-red-400">-{formatPrice(earnings.thisMonth * 0.15)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Processing Fee</span>
              <span className="font-medium text-red-400">-{formatPrice(50)}</span>
            </div>
            <div className="border-t border-gray-600 pt-3 flex justify-between items-center">
              <span className="font-medium">Net Earnings</span>
              <span className="font-bold text-green-400">{formatPrice(earnings.thisMonth * 0.85 - 50)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarningsTab;