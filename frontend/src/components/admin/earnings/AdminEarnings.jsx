// src/components/admin/earnings/AdminEarnings.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Download, RefreshCw, DollarSign, CreditCard, Receipt, Package, FileText, Menu, X } from 'lucide-react';
import { adminAPI, payoutAPI, refundAPI } from '../../../services/api';
import Button from '../../ui/Button';
import { toast } from 'react-hot-toast';

// Import utilities
import { 
  calculatePlatformMetrics, 
  calculatePayoutSuccessRate 
} from './utils/calculations';
import { 
  generateMonthlyTrend, 
  analyzePaymentMethods, 
  getTopPerformingHosts, 
  analyzeBookings,
  exportFinancialReport 
} from './utils/analytics';

// Import views
import OverviewView from './views/OverviewView';
import DetailedView from './views/DetailedView';
import AnalyticsView from './views/AnalyticsView';

const AdminEarnings = () => {
  // State Management
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Data States
  const [dashboardStats, setDashboardStats] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [payoutStats, setPayoutStats] = useState(null);
  const [refunds, setRefunds] = useState([]);
  const [bookings, setBookings] = useState([]);
  
  // Filter States
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedMetric, setSelectedMetric] = useState('bookingRevenue');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    from: '',
    to: ''
  });
  const [viewMode, setViewMode] = useState('overview');

  // Load all data on mount and filter changes
  useEffect(() => {
    loadAllData();
  }, [selectedPeriod, statusFilter, dateRange]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Parallel API calls for better performance
      const [
        dashboardResponse,
        payoutStatsResponse,
        payoutsResponse,
        refundsResponse,
        bookingsResponse
      ] = await Promise.all([
        adminAPI.getDashboardStats(),
        payoutAPI.getPayoutStats(),
        payoutAPI.getAllPayouts({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          date_from: dateRange.from || undefined,
          date_to: dateRange.to || undefined,
          limit: 100,
          page: 1
        }),
        refundAPI.getAllRefundRequests({ limit: 50, page: 1 }),
        adminAPI.getAllBookings({ limit: 100, page: 1 })
      ]);

      // Set state with proper data extraction
      setDashboardStats(dashboardResponse.data.data || dashboardResponse.data);
      
      const payoutStatsData = payoutStatsResponse.data?.data?.stats || 
                             payoutStatsResponse.data?.stats || 
                             payoutStatsResponse.data;
      setPayoutStats(payoutStatsData);
      
      const payoutsData = payoutsResponse.data?.data?.payouts || 
                         payoutsResponse.data?.payouts || 
                         [];
      setPayouts(payoutsData);
      
      const refundsData = refundsResponse.data?.data?.refunds || 
                         refundsResponse.data?.refunds || 
                         [];
      setRefunds(refundsData);
      
      const bookingsData = bookingsResponse.data?.data?.bookings || 
                          bookingsResponse.data?.bookings || 
                          [];
      setBookings(bookingsData);

    } catch (err) {
      console.error('Failed to load earnings data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load data');
      toast.error('Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
    toast.success('Data refreshed successfully');
  };

  // Calculate comprehensive analytics
  const analytics = useMemo(() => {
    if (!dashboardStats || !payoutStats) return null;

    try {
      const platformMetrics = calculatePlatformMetrics(
        dashboardStats, 
        payoutStats, 
        payouts, 
        refunds
      );

      const monthlyTrend = generateMonthlyTrend(bookings, payouts, refunds);
      const paymentMethodStats = analyzePaymentMethods(payouts);
      const topHosts = getTopPerformingHosts(payouts, bookings);
      const bookingAnalytics = analyzeBookings(bookings);
      const payoutSuccessRate = calculatePayoutSuccessRate(payoutStats);

      const refundRate = bookings.length > 0 
        ? (refunds.length / bookings.length) * 100 
        : 0;

      const payoutStatusDistribution = {
        pending: parseInt(payoutStats.pending_count || 0),
        approved: parseInt(payoutStats.approved_count || 0),
        processing: parseInt(payoutStats.processing_count || 0),
        completed: parseInt(payoutStats.completed_count || 0),
        rejected: parseInt(payoutStats.rejected_count || 0),
        failed: parseInt(payoutStats.failed_count || 0)
      };

      const completedPayouts = payouts.filter(p => p.status === 'completed').length;
      const averagePayoutAmount = completedPayouts > 0 
        ? platformMetrics.totalPaidToHosts / completedPayouts 
        : 0;
      const averagePayoutFee = completedPayouts > 0 
        ? platformMetrics.payoutFeeRevenue / completedPayouts 
        : 0;

      return {
        ...platformMetrics,
        refundRate,
        monthlyTrend,
        paymentMethodStats,
        topHosts,
        bookingAnalytics,
        payoutSuccessRate,
        averagePayoutAmount,
        averagePayoutFee,
        revenueGrowth: 15.2,
        payoutGrowth: 8.5,
        bookingGrowth: 12.3,
        payoutStatusDistribution
      };
    } catch (error) {
      console.error('Error calculating analytics:', error);
      return null;
    }
  }, [dashboardStats, payoutStats, payouts, refunds, bookings]);

  const handleExportReport = () => {
    if (!analytics) {
      toast.error('No data to export');
      return;
    }
    exportFinancialReport(analytics, selectedPeriod);
    toast.success('Report exported successfully');
  };

  // Loading State
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm sm:text-base">Loading financial data...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 sm:p-6">
        <div className="text-center max-w-md">
          <div className="text-red-400 text-5xl sm:text-6xl mb-4">⚠️</div>
          <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">Failed to Load Data</h2>
          <p className="text-gray-400 mb-4 text-sm sm:text-base">{error}</p>
          <Button 
            onClick={loadAllData} 
            variant="gradient"
            className="bg-gradient-to-r from-red-500 to-red-600 text-sm sm:text-base"
          >
            <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // No Data State
  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-900 p-3 xs:p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-3 xs:space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 xs:gap-4">
            <div className="w-full sm:w-auto">
              <h1 className="text-xl xs:text-2xl sm:text-3xl font-bold text-white">
                Platform Earnings
              </h1>
              <p className="text-gray-400 mt-0.5 xs:mt-1 text-xs xs:text-sm sm:text-base">
                Financial analytics and revenue insights
              </p>
            </div>
            <Button 
              onClick={loadAllData} 
              variant="outline"
              className="border-gray-600 text-gray-300 text-xs xs:text-sm sm:text-base w-full sm:w-auto px-3 xs:px-4 py-2"
            >
              <RefreshCw className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 mr-1.5 xs:mr-2" />
              Refresh
            </Button>
          </div>

          <div className="text-center py-8 xs:py-10 sm:py-12 md:py-16 bg-gray-800 rounded-lg xs:rounded-xl px-4 xs:px-6 sm:px-8">
            <DollarSign className="w-10 h-10 xs:w-12 xs:h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-gray-400 mx-auto mb-3 xs:mb-4" />
            <h3 className="text-base xs:text-lg sm:text-xl font-semibold text-white mb-1.5 xs:mb-2">
              No earnings data available
            </h3>
            <p className="text-gray-400 mb-3 xs:mb-4 text-xs xs:text-sm sm:text-base max-w-md mx-auto px-2 xs:px-4 sm:px-0">
              Financial data will appear once transactions are processed
            </p>
            <Button 
              onClick={loadAllData} 
              variant="gradient"
              className="bg-gradient-to-r from-red-500 to-red-600 text-xs xs:text-sm sm:text-base px-4 xs:px-5 sm:px-6 py-2 xs:py-2.5"
            >
              Load Data
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main Render
  return (
    <div className="min-h-screen bg-gray-900 p-3 xs:p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-3 xs:space-y-4 sm:space-y-6">
        
        {/* Header Section - FIXED RESPONSIVE */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg xs:rounded-xl sm:rounded-2xl p-3 xs:p-4 sm:p-6 border border-gray-700">
          <div className="space-y-3 xs:space-y-4">
            {/* Title Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2 xs:gap-3">
                <div className="p-2 xs:p-2.5 sm:p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg sm:rounded-xl flex-shrink-0">
                  <DollarSign className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg xs:text-xl sm:text-2xl lg:text-3xl font-bold text-white truncate">
                    Platform Earnings
                  </h1>
                  <p className="text-gray-400 text-xs xs:text-sm sm:text-base">
                    Financial overview
                  </p>
                </div>
              </div>

              {/* Desktop Actions */}
              <div className="hidden lg:flex items-center gap-3">
                <Button
                  onClick={handleExportReport}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                
                <Button
                  onClick={handleRefresh}
                  variant="gradient"
                  disabled={refreshing}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Controls Section - Mobile & Tablet */}
            <div className="space-y-2 xs:space-y-3">
              {/* View Mode Tabs */}
              <div className="bg-gray-800 rounded-lg p-1 flex">
                {['overview', 'detailed', 'analytics'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`flex-1 px-2 xs:px-3 sm:px-4 py-1.5 xs:py-2 rounded-md text-xs xs:text-sm font-medium transition-all ${
                      viewMode === mode
                        ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {mode === 'overview' && 'Overview'}
                    {mode === 'detailed' && 'Details'}
                    {mode === 'analytics' && 'Analytics'}
                  </button>
                ))}
              </div>

              {/* Period & Actions Row */}
              <div className="flex flex-col xs:flex-row gap-2">
                {/* Period Selector */}
                <select
                  value={selectedPeriod}
                                    onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs xs:text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="quarter">This Quarter</option>
                  <option value="year">This Year</option>
                  <option value="all">All Time</option>
                </select>

                {/* Mobile/Tablet Actions */}
                <div className="flex gap-2 flex-1 xs:flex-initial lg:hidden">
                  <Button
                    onClick={handleExportReport}
                    variant="outline"
                    className="flex-1 xs:flex-initial border-gray-600 text-gray-300 hover:bg-gray-800 px-3 py-2"
                  >
                    <Download className="w-3.5 h-3.5 xs:w-4 xs:h-4 mr-1.5" />
                    <span className="text-xs xs:text-sm">Export</span>
                  </Button>
                  
                  <Button
                    onClick={handleRefresh}
                    variant="gradient"
                    disabled={refreshing}
                    className="flex-1 xs:flex-initial bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 px-3 py-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 xs:w-4 xs:h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
                    <span className="text-xs xs:text-sm">Refresh</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic View Content */}
        {viewMode === 'overview' && (
          <OverviewView 
            analytics={analytics}
            selectedMetric={selectedMetric}
            setSelectedMetric={setSelectedMetric}
          />
        )}

        {viewMode === 'detailed' && (
          <DetailedView 
            analytics={analytics}
            payouts={payouts}
            refunds={refunds}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
          />
        )}

        {viewMode === 'analytics' && (
          <AnalyticsView 
            analytics={analytics}
            bookings={bookings}
          />
        )}

        {/* Quick Actions Footer - FIXED RESPONSIVE */}
        <div className="bg-gray-800 rounded-lg xs:rounded-xl p-3 xs:p-4 sm:p-6 border border-gray-700">
          <h3 className="text-sm xs:text-base sm:text-lg font-semibold text-white mb-3 xs:mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 xs:gap-3 sm:gap-4">
            <Button
              onClick={() => window.location.href = '/admin/payouts'}
              variant="outline"
              className="border-green-500 text-green-400 hover:bg-green-500 hover:text-white transition-all px-2 xs:px-3 sm:px-4 py-2"
            >
              <CreditCard className="w-3.5 h-3.5 xs:w-4 xs:h-4 mr-1 xs:mr-1.5 sm:mr-2" />
              <span className="text-xs xs:text-sm">
                <span className="hidden xs:inline sm:hidden">Payouts</span>
                <span className="xs:hidden">Pay</span>
                <span className="hidden sm:inline">Manage Payouts</span>
              </span>
            </Button>
            
            <Button
              onClick={() => window.location.href = '/admin/refunds'}
              variant="outline"
              className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white transition-all px-2 xs:px-3 sm:px-4 py-2"
            >
              <Receipt className="w-3.5 h-3.5 xs:w-4 xs:h-4 mr-1 xs:mr-1.5 sm:mr-2" />
              <span className="text-xs xs:text-sm">
                <span className="hidden xs:inline sm:hidden">Refunds</span>
                <span className="xs:hidden">Ref</span>
                <span className="hidden sm:inline">Process Refunds</span>
              </span>
            </Button>
            
            <Button
              onClick={() => window.location.href = '/admin/bookings'}
              variant="outline"
              className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white transition-all px-2 xs:px-3 sm:px-4 py-2"
            >
              <Package className="w-3.5 h-3.5 xs:w-4 xs:h-4 mr-1 xs:mr-1.5 sm:mr-2" />
              <span className="text-xs xs:text-sm">
                <span className="hidden xs:inline sm:hidden">Bookings</span>
                <span className="xs:hidden">Book</span>
                <span className="hidden sm:inline">View Bookings</span>
              </span>
            </Button>
            
            <Button
              onClick={handleExportReport}
              variant="outline"
              className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white transition-all px-2 xs:px-3 sm:px-4 py-2"
            >
              <FileText className="w-3.5 h-3.5 xs:w-4 xs:h-4 mr-1 xs:mr-1.5 sm:mr-2" />
              <span className="text-xs xs:text-sm">
                <span className="hidden xs:inline sm:hidden">Report</span>
                <span className="xs:hidden">Rep</span>
                <span className="hidden sm:inline">Export Report</span>
              </span>
            </Button>
          </div>
        </div>

        {/* Date Range Filter - FIXED RESPONSIVE */}
        {viewMode === 'detailed' && (
          <div className="bg-gray-800 rounded-lg xs:rounded-xl p-3 xs:p-4 sm:p-6 border border-gray-700">
            <h3 className="text-sm xs:text-base sm:text-lg font-semibold text-white mb-3 xs:mb-4">Advanced Filters</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="sm:col-span-1">
                <label className="block text-xs sm:text-sm text-gray-400 mb-1.5 xs:mb-2">From Date</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs xs:text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-xs sm:text-sm text-gray-400 mb-1.5 xs:mb-2">To Date</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-xs xs:text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div className="sm:col-span-1 flex items-end">
                <Button
                  onClick={() => {
                    setDateRange({ from: '', to: '' });
                    setStatusFilter('all');
                  }}
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 text-xs xs:text-sm px-3 py-2"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Statistics - FIXED RESPONSIVE */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg xs:rounded-xl p-3 xs:p-4 sm:p-6 border border-gray-700">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 xs:gap-4 text-center">
            <div className="p-2 xs:p-3 bg-gray-800/50 rounded-lg">
              <p className="text-gray-400 text-xs sm:text-sm mb-1">Total Revenue</p>
              <p className="text-base xs:text-lg sm:text-xl lg:text-2xl font-bold text-green-400">
                <span className="hidden xs:inline">₱</span>
                <span className="xs:hidden text-xs">₱</span>
                {(analytics.totalPlatformRevenue || 0).toLocaleString('en-US', { 
                  minimumFractionDigits: window.innerWidth < 375 ? 0 : 2,
                  maximumFractionDigits: window.innerWidth < 375 ? 0 : 2
                })}
                <span className="xs:hidden text-xs">k</span>
              </p>
            </div>
            <div className="p-2 xs:p-3 bg-gray-800/50 rounded-lg">
              <p className="text-gray-400 text-xs sm:text-sm mb-1">Total Payouts</p>
              <p className="text-base xs:text-lg sm:text-xl lg:text-2xl font-bold text-blue-400">
                {analytics.payoutStatusDistribution ? 
                  Object.values(analytics.payoutStatusDistribution).reduce((a, b) => a + b, 0) : 0}
              </p>
            </div>
            <div className="p-2 xs:p-3 bg-gray-800/50 rounded-lg">
              <p className="text-gray-400 text-xs sm:text-sm mb-1">Success Rate</p>
              <p className="text-base xs:text-lg sm:text-xl lg:text-2xl font-bold text-purple-400">
                {(analytics.payoutSuccessRate || 0).toFixed(1)}%
              </p>
            </div>
            <div className="p-2 xs:p-3 bg-gray-800/50 rounded-lg">
              <p className="text-gray-400 text-xs sm:text-sm mb-1">Active Hosts</p>
              <p className="text-base xs:text-lg sm:text-xl lg:text-2xl font-bold text-orange-400">
                {analytics.topHosts ? analytics.topHosts.length : 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminEarnings;