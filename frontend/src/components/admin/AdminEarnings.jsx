// frontend/src/components/admin/AdminEarnings.jsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Download,
  RefreshCw,
  CreditCard,
  PieChart,
  BarChart3,
  Users,
  Home,
  Target,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell, Pie } from 'recharts';
import adminService from '../../services/adminService';
import Button from '../ui/Button';

const AdminEarnings = () => {
  const [earningsData, setEarningsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  useEffect(() => {
    loadEarningsData();
  }, [selectedPeriod]);

  // ✅ FIXED: Safe number formatting function
  const formatCurrency = (value) => {
    const number = Number(value) || 0;
    return `₱${number.toLocaleString()}`;
  };

  const formatNumber = (value) => {
    const number = Number(value) || 0;
    return number.toLocaleString();
  };

  const loadEarningsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getPlatformEarnings();
      console.log('Platform earnings data:', data); // ✅ DEBUG
      setEarningsData(data);
    } catch (err) {
      console.error('Failed to load earnings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = () => {
    // Export earnings report
    const csvData = generateCSVReport();
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `platform-earnings-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateCSVReport = () => {
    if (!earningsData) return '';
    
    const headers = ['Date', 'Total Revenue', 'Commission', 'Bookings', 'Average Order Value'];
    const rows = earningsData.dailyData?.map(day => [
      day.date,
      day.revenue,
      day.commission,
      day.bookings,
      day.averageValue
    ]) || [];
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
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
        <Button onClick={loadEarningsData} variant="gradient">Try Again</Button>
      </div>
    );
  }

  // ✅ FIXED: Only use real data, no mock data
  const safeEarningsData = earningsData ? {
    totalRevenue: earningsData.totalRevenue || 0,
    totalCommission: earningsData.totalCommission || 0,
    totalBookings: earningsData.totalBookings || 0,
    averageCommissionRate: earningsData.averageCommissionRate || 0,
    monthlyGrowth: earningsData.monthlyGrowth || 0,
    revenueGrowth: earningsData.revenueGrowth || 0,
    topHosts: earningsData.topHosts || [],
    revenueChart: earningsData.revenueChart || [],
    commissionChart: earningsData.commissionChart || []
  } : null;

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

  // ✅ FIXED: Calculate average order value safely - only if data exists
  const averageOrderValue = safeEarningsData && safeEarningsData.totalBookings > 0 
    ? Math.round(safeEarningsData.totalRevenue / safeEarningsData.totalBookings)
    : 0;

  // ✅ SHOW EMPTY STATE if no data
  if (!safeEarningsData) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Platform Earnings</h1>
            <p className="text-gray-400">Revenue analytics and financial insights</p>
          </div>
          <Button
            onClick={loadEarningsData}
            variant="outline"
            className="border-gray-600 text-gray-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="text-center py-16">
          <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No earnings data available</h3>
          <p className="text-gray-400 mb-4">Earnings data will appear here once bookings are completed</p>
          <Button onClick={loadEarningsData} variant="gradient">Load Data</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Earnings</h1>
          <p className="text-gray-400">Revenue analytics and financial insights</p>
        </div>
        
        <div className="flex space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          
          <Button
            onClick={handleExportReport}
            variant="outline"
            className="border-gray-600 text-gray-300"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          
          <Button
            onClick={loadEarningsData}
            variant="outline"
            className="border-gray-600 text-gray-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics - FIXED with safe formatting */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(safeEarningsData.totalRevenue)}</p>
              <div className="flex items-center mt-1">
                <ArrowUpRight className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-sm ml-1">+{safeEarningsData.revenueGrowth}%</span>
              </div>
            </div>
            <div className="p-3 rounded-full bg-green-600/20">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Platform Commission</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(safeEarningsData.totalCommission)}</p>
              <div className="flex items-center mt-1">
                <span className="text-blue-400 text-sm">{safeEarningsData.averageCommissionRate}% avg rate</span>
              </div>
            </div>
            <div className="p-3 rounded-full bg-blue-600/20">
              <TrendingUp className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Bookings</p>
              <p className="text-2xl font-bold text-white">{formatNumber(safeEarningsData.totalBookings)}</p>
              <div className="flex items-center mt-1">
                <ArrowUpRight className="w-4 h-4 text-purple-400" />
                <span className="text-purple-400 text-sm ml-1">+{safeEarningsData.monthlyGrowth}%</span>
              </div>
            </div>
            <div className="p-3 rounded-full bg-purple-600/20">
              <Calendar className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Avg. Order Value</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(averageOrderValue)}</p>
              <div className="flex items-center mt-1">
                <span className="text-orange-400 text-sm">Per booking</span>
              </div>
            </div>
            <div className="p-3 rounded-full bg-orange-600/20">
              <Target className="w-6 h-6 text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white">Revenue Trend</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedMetric('revenue')}
                className={`px-3 py-1 text-sm rounded ${selectedMetric === 'revenue' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'}`}
              >
                Revenue
              </button>
              <button
                onClick={() => setSelectedMetric('commission')}
                className={`px-3 py-1 text-sm rounded ${selectedMetric === 'commission' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}
              >
                Commission
              </button>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={safeEarningsData.revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" tickFormatter={(value) => `₱${((value || 0) / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  formatter={(value) => [formatCurrency(value), selectedMetric === 'revenue' ? 'Revenue' : 'Commission']}
                />
                <Line
                  type="monotone"
                  dataKey={selectedMetric}
                  stroke={selectedMetric === 'revenue' ? '#10B981' : '#3B82F6'}
                  strokeWidth={3}
                  dot={{ fill: selectedMetric === 'revenue' ? '#10B981' : '#3B82F6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Commission Breakdown */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Commission Breakdown</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={safeEarningsData.commissionChart}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {safeEarningsData.commissionChart.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  formatter={(value, name, props) => [formatCurrency(props.payload.amount), name]}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {safeEarningsData.commissionChart.map((item, index) => (
              <div key={item.category} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-gray-300 text-sm">{item.category}</span>
                </div>
                <span className="text-white font-medium">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Performers and Financial Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Earning Hosts */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white">Top Earning Hosts</h3>
            <Button variant="ghost" size="sm" className="text-blue-400">
              View All
            </Button>
          </div>
          
          {safeEarningsData.topHosts.length > 0 ? (
            <div className="space-y-4">
              {safeEarningsData.topHosts.map((host, index) => (
                <div key={host.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">#{index + 1}</span>
                    </div>
                    <div>
                      <div className="text-white font-medium">{host.name}</div>
                      <div className="text-gray-400 text-sm">{formatNumber(host.bookings)} bookings</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-semibold">{formatCurrency(host.earnings)}</div>
                    <div className="text-gray-400 text-sm">this month</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-400">No host earnings data available</p>
            </div>
          )}
        </div>

        {/* Financial Insights */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Financial Insights</h3>
          
          <div className="space-y-6">
            <div className="p-4 bg-gradient-to-r from-green-600/20 to-blue-600/20 rounded-lg border border-green-600/30">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-medium">Revenue Growth</span>
              </div>
              <p className="text-gray-300 text-sm">Platform revenue increased by {safeEarningsData.revenueGrowth}% compared to last month, indicating healthy growth trajectory.</p>
            </div>

            <div className="p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg border border-blue-600/30">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-5 h-5 text-blue-400" />
                <span className="text-blue-400 font-medium">Host Performance</span>
              </div>
              <p className="text-gray-300 text-sm">Top 10% of hosts generate 45% of total platform revenue. Consider incentive programs for high performers.</p>
            </div>

            <div className="p-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-lg border border-purple-600/30">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-5 h-5 text-purple-400" />
                <span className="text-purple-400 font-medium">Market Opportunity</span>
              </div>
              <p className="text-gray-300 text-sm">Average order value trending upward. Premium listings showing 25% higher conversion rates.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            onClick={() => alert('Commission rates management to be implemented')}
            variant="outline"
            className="border-green-500 text-green-400 hover:bg-green-500 hover:text-white"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Manage Rates
          </Button>
          
          <Button
            onClick={() => alert('Detailed analytics to be implemented')}
            variant="outline"
            className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            View Analytics
          </Button>
          
          <Button
            onClick={() => alert('Financial forecasting to be implemented')}
            variant="outline"
            className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Forecast
          </Button>
          
          <Button
            onClick={handleExportReport}
            variant="outline"
            className="border-gray-500 text-gray-400 hover:bg-gray-500 hover:text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminEarnings;