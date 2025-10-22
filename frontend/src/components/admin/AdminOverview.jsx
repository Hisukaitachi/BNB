// frontend/src/components/admin/AdminOverview.jsx
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Home, 
  DollarSign, 
  Calendar,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Eye,
  Star,
  Shield,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  CreditCard,
  UserCheck,
  UserX,
  BarChart3,
  PieChart,
  FileText,
  Settings,
  Menu,
  X
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar,
  AreaChart,
  Area,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  Legend
} from 'recharts';
import Button from '../ui/Button';
import { formatCurrency, formatNumber, formatPercentage } from '../../utils/formatters';

const AdminOverview = ({ data, onRefresh, loading = false }) => {
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [timeRange, setTimeRange] = useState('month');
  const [refreshing, setRefreshing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh();
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  // Loading skeleton
  if (loading || !data) {
    return (
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-xl p-4 sm:p-6 animate-pulse">
              <div className="h-4 bg-gray-700 rounded mb-4"></div>
              <div className="h-8 bg-gray-700 rounded mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-2/3"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-xl p-4 sm:p-6 animate-pulse">
              <div className="h-64 bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Calculate additional metrics
  const calculateGrowth = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const userGrowth = calculateGrowth(data.totalUsers, data.previousMonthUsers);
  const revenueGrowth = calculateGrowth(data.totalRevenue, data.previousMonthRevenue);
  const bookingGrowth = calculateGrowth(data.totalBookings, data.previousMonthBookings);

  // Enhanced stats with more details - CONNECTED TO YOUR BACKEND
  const stats = [
    {
      title: 'Total Users',
      value: formatNumber(data.totalUsers || 0),
      change: userGrowth,
      changeText: `${formatNumber(data.newUsersThisMonth || 0)} new this month`,
      icon: Users,
      color: 'blue',
      details: {
        clients: data.totalClients || data.userBreakdown?.clients || 0,
        hosts: data.totalHosts || data.userBreakdown?.hosts || 0,
        admins: data.totalAdmins || data.userBreakdown?.admins || 0,
        banned: data.bannedUsers || data.userBreakdown?.banned || 0
      }
    },
    {
      title: 'Active Listings',
      value: formatNumber(data.totalListings || 0),
      change: data.listingGrowth || 0,
      changeText: `${data.pendingListings || 0} pending review`,
      icon: Home,
      color: 'green',
      urgent: data.pendingListings > 5
    },
    {
      title: 'Platform Revenue',
      value: formatCurrency(data.totalRevenue || 0),
      change: revenueGrowth,
      changeText: `${formatCurrency(data.monthlyRevenue || 0)} this month`,
      icon: DollarSign,
      color: 'yellow',
      trend: 'up'
    },
    {
      title: 'Total Bookings',
      value: formatNumber(data.totalBookings || 0),
      change: bookingGrowth,
      changeText: `${data.activeBookings || 0} active`,
      icon: Calendar,
      color: 'purple',
      details: {
        pending: data.pendingBookings || 0,
        confirmed: data.confirmedBookings || 0,
        completed: data.completedBookings || 0
      }
    },
    {
      title: 'Pending Reports',
      value: formatNumber(data.pendingReports || 0),
      change: 0,
      changeText: data.pendingReports > 0 ? 'Need immediate attention' : 'All clear',
      icon: AlertTriangle,
      color: 'red',
      urgent: data.pendingReports > 0,
      pulse: data.pendingReports > 5
    },
    {
      title: 'Pending Payouts',
      value: formatCurrency(data.pendingPayoutAmount || 0),
      change: 0,
      changeText: `${data.pendingPayoutCount || 0} payouts waiting`,
      icon: CreditCard,
      color: 'orange',
      urgent: data.pendingPayoutCount > 10
    },
  ];

  // Color configurations
  const colorConfig = {
    blue: {
      bg: 'bg-blue-600/20',
      text: 'text-blue-400',
      border: 'border-blue-500',
      gradient: 'from-blue-500 to-blue-600'
    },
    green: {
      bg: 'bg-green-600/20',
      text: 'text-green-400',
      border: 'border-green-500',
      gradient: 'from-green-500 to-emerald-600'
    },
    yellow: {
      bg: 'bg-yellow-600/20',
      text: 'text-yellow-400',
      border: 'border-yellow-500',
      gradient: 'from-yellow-500 to-orange-500'
    },
    purple: {
      bg: 'bg-purple-600/20',
      text: 'text-purple-400',
      border: 'border-purple-500',
      gradient: 'from-purple-500 to-pink-600'
    },
    red: {
      bg: 'bg-red-600/20',
      text: 'text-red-400',
      border: 'border-red-500',
      gradient: 'from-red-500 to-red-600'
    },
    orange: {
      bg: 'bg-orange-600/20',
      text: 'text-orange-400',
      border: 'border-orange-500',
      gradient: 'from-orange-500 to-red-500'
    },
    pink: {
      bg: 'bg-pink-600/20',
      text: 'text-pink-400',
      border: 'border-pink-500',
      gradient: 'from-pink-500 to-rose-500'
    },
    cyan: {
      bg: 'bg-cyan-600/20',
      text: 'text-cyan-400',
      border: 'border-cyan-500',
      gradient: 'from-cyan-500 to-blue-500'
    }
  };

  // CHART DATA - PROPERLY FORMATTED FOR YOUR BACKEND
  const revenueChartData = data.revenueChart || [];
  const userGrowthData = data.userGrowthChart || [];
  const bookingStatusData = [
    { name: 'Pending', value: data.pendingBookings || 0, color: '#F59E0B' },
    { name: 'Confirmed', value: data.confirmedBookings || 0, color: '#3B82F6' },
    { name: 'Completed', value: data.completedBookings || 0, color: '#10B981' },
    { name: 'Cancelled', value: data.cancelledBookings || 0, color: '#EF4444' }
  ].filter(item => item.value > 0);

  const systemHealthData = [
    { name: 'System Health', value: data.systemHealthScore || 98, fill: '#10B981' }
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Responsive */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-700">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="w-full lg:w-auto">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-lg sm:rounded-xl">
                <Activity className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="truncate">Platform Overview</span>
            </h2>
            <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
              Real-time monitoring of your platform
            </p>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 sm:mt-3">
              <span className="text-xs sm:text-sm text-gray-500">
                Last updated: {new Date().toLocaleTimeString()}
              </span>
              <span className="flex items-center gap-1 text-xs sm:text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400">Live</span>
              </span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 sm:gap-3 w-full lg:w-auto">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="flex-1 lg:flex-initial px-3 sm:px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs sm:text-sm"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
            
            <Button
              onClick={handleRefresh}
              variant="gradient"
              disabled={refreshing}
              className="flex-1 lg:flex-initial bg-gradient-to-r from-red-500 to-red-600 text-xs sm:text-sm px-3 sm:px-4 py-2"
            >
              <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Grid - Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const colors = colorConfig[stat.color];
          
          return (
            <div 
              key={index} 
              className={`bg-gray-800 rounded-xl p-4 sm:p-6 border ${
                stat.urgent ? colors.border : 'border-gray-700'
              } ${stat.pulse ? 'animate-pulse' : ''} hover:scale-105 transition-transform cursor-pointer`}
            >
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br ${colors.gradient}`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                {stat.change !== 0 && (
                  <div className={`flex items-center gap-1 text-xs sm:text-sm ${
                    stat.change > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {stat.change > 0 ? (
                      <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 sm:w-4 sm:h-4" />
                    )}
                    <span>{Math.abs(stat.change).toFixed(1)}%</span>
                  </div>
                )}
              </div>
              
              <p className="text-xs sm:text-sm text-gray-400 mb-1">{stat.title}</p>
              
              <div className="flex items-baseline gap-2">
                <p className="text-xl sm:text-2xl font-bold text-white">{stat.value}</p>
              </div>
              
              <p className={`text-xs mt-2 ${stat.urgent ? 'text-red-400' : 'text-gray-500'}`}>
                {stat.changeText}
              </p>
              
              {stat.details && (
                <div className="mt-3 pt-3 border-t border-gray-700 grid grid-cols-2 gap-2">
                  {Object.entries(stat.details).map(([key, value]) => (
                    <div key={key} className="text-xs">
                      <span className="text-gray-500 capitalize">{key}:</span>
                      <span className="text-gray-300 ml-1">{formatNumber(value)}</span>
                    </div>
                  ))}
                </div>
              )}
                        </div>
          );
        })}
      </div>

      {/* Charts Section - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Revenue Chart - Takes 2 columns on large screens, full width on mobile */}
        <div className="lg:col-span-2 bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-white">Revenue & Growth Trends</h3>
            <div className="flex gap-1 sm:gap-2 w-full sm:w-auto">
              {['revenue', 'bookings', 'users'].map((metric) => (
                <button
                  key={metric}
                  onClick={() => setSelectedMetric(metric)}
                  className={`flex-1 sm:flex-initial px-2 sm:px-3 py-1 text-xs sm:text-sm rounded transition-colors ${
                    selectedMetric === metric
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {metric.charAt(0).toUpperCase() + metric.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-64 sm:h-80">
            {revenueChartData && revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#9CA3AF" 
                    fontSize={window.innerWidth < 640 ? 10 : 12}
                  />
                  <YAxis 
                    stroke="#9CA3AF" 
                    fontSize={window.innerWidth < 640 ? 10 : 12}
                    tickFormatter={(value) => {
                      if (selectedMetric === 'revenue') {
                        return value >= 1000 ? `₱${(value / 1000).toFixed(0)}k` : `₱${value}`;
                      }
                      return value.toLocaleString();
                    }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6',
                      fontSize: window.innerWidth < 640 ? '12px' : '14px'
                    }}
                    formatter={(value) => {
                      if (selectedMetric === 'revenue') {
                        return [`₱${value.toLocaleString()}`, 'Revenue'];
                      }
                      return [value.toLocaleString(), selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)];
                    }}
                  />
                  {selectedMetric === 'revenue' && (
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  )}
                  {selectedMetric === 'bookings' && (
                    <Area 
                      type="monotone" 
                      dataKey="bookings" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorBookings)"
                    />
                  )}
                  {selectedMetric === 'users' && (
                    <Area 
                      type="monotone" 
                      dataKey="users" 
                      stroke="#F59E0B" 
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorUsers)"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <BarChart3 className="w-10 h-10 sm:w-12 sm:h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm sm:text-base">No data available</p>
                  <p className="text-gray-500 text-xs sm:text-sm">Data will appear once you have bookings</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Booking Status Distribution - Responsive */}
        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-4 sm:mb-6">Booking Status</h3>
          <div className="h-48 sm:h-64">
            {bookingStatusData && bookingStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={bookingStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={window.innerWidth < 640 ? 40 : 60}
                    outerRadius={window.innerWidth < 640 ? 60 : 80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {bookingStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      fontSize: window.innerWidth < 640 ? '12px' : '14px'
                    }}
                    formatter={(value) => [`${value} bookings`, '']}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <PieChart className="w-10 h-10 sm:w-12 sm:h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm sm:text-base">No bookings yet</p>
                </div>
              </div>
            )}
          </div>
          {bookingStatusData && bookingStatusData.length > 0 && (
            <div className="mt-4 space-y-2">
              {bookingStatusData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 sm:w-3 sm:h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-gray-300 text-xs sm:text-sm">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="text-white font-medium text-xs sm:text-sm">{formatNumber(item.value)}</span>
                    <span className="text-gray-500 text-xs">
                      ({((item.value / bookingStatusData.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User Growth and Activity - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* User Growth Chart */}
        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-4 sm:mb-6">User Growth & Composition</h3>
          <div className="h-48 sm:h-64">
            {userGrowthData && userGrowthData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#9CA3AF" 
                    fontSize={window.innerWidth < 640 ? 10 : 12}
                  />
                  <YAxis 
                    stroke="#9CA3AF" 
                    fontSize={window.innerWidth < 640 ? 10 : 12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6',
                      fontSize: window.innerWidth < 640 ? '12px' : '14px'
                    }}
                    formatter={(value, name) => [value, name]}
                  />
                  <Legend 
                    wrapperStyle={{ 
                      paddingTop: '10px',
                      fontSize: window.innerWidth < 640 ? '12px' : '14px'
                    }}
                    iconType="rect"
                  />
                  <Bar dataKey="clients" stackId="a" fill="#3B82F6" name="Clients" />
                  <Bar dataKey="hosts" stackId="a" fill="#10B981" name="Hosts" />
                  <Bar dataKey="total" fill="#F59E0B" name="Total New" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Users className="w-10 h-10 sm:w-12 sm:h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm sm:text-base">No user data available</p>
                  <p className="text-gray-500 text-xs sm:text-sm">User growth will appear here</p>
                </div>
              </div>
            )}
          </div>
          
          {/* User Growth Summary */}
          {userGrowthData && userGrowthData.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-gray-700 rounded">
                <p className="text-xs text-gray-400">Total Clients</p>
                <p className="text-sm sm:text-lg font-semibold text-blue-400">
                  {data.totalClients || data.userBreakdown?.clients || 0}
                </p>
              </div>
              <div className="text-center p-2 bg-gray-700 rounded">
                <p className="text-xs text-gray-400">Total Hosts</p>
                <p className="text-sm sm:text-lg font-semibold text-green-400">
                  {data.totalHosts || data.userBreakdown?.hosts || 0}
                </p>
              </div>
              <div className="text-center p-2 bg-gray-700 rounded">
                <p className="text-xs text-gray-400">Total Users</p>
                <p className="text-sm sm:text-lg font-semibold text-yellow-400">
                  {data.totalUsers || 0}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* System Health Radial */}
        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-4 sm:mb-6">System Performance</h3>
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="90%" data={systemHealthData}>
                <RadialBar dataKey="value" cornerRadius={10} fill="#10B981" />
                <Legend />
                <Tooltip />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-4">
            <div className="text-center p-2 sm:p-3 bg-gray-700 rounded-lg">
              <p className="text-gray-400 text-xs sm:text-sm">Uptime</p>
              <p className="text-white font-semibold text-sm sm:text-base">99.9%</p>
            </div>
            <div className="text-center p-2 sm:p-3 bg-gray-700 rounded-lg">
              <p className="text-gray-400 text-xs sm:text-sm">Response Time</p>
              <p className="text-white font-semibold text-sm sm:text-base">45ms</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Reports */}
        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-white">Recent Reports</h3>
            <Button
              onClick={() => window.location.href = '/admin/reports'}
                            variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300 text-xs sm:text-sm"
            >
              View All
            </Button>
          </div>
          
          {!data.recentReports || data.recentReports.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm sm:text-base">No pending reports</p>
              <p className="text-gray-500 text-xs sm:text-sm">All clear!</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {data.recentReports.slice(0, 5).map((report) => (
                <div key={report.id} className="p-2 sm:p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-xs sm:text-sm truncate">
                        Report #{report.id}
                      </p>
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        From: {report.reporter_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {report.reason || 'No reason provided'}
                      </p>
                    </div>
                    <div className="text-right ml-2 sm:ml-3 flex-shrink-0">
                      <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-xs ${
                        report.status === 'pending' 
                          ? 'bg-orange-900 text-orange-400' 
                          : report.status === 'resolved'
                          ? 'bg-green-900 text-green-400'
                          : 'bg-gray-600 text-gray-300'
                      }`}>
                        {report.status || 'pending'}
                      </span>
                      <p className="text-gray-400 text-xs mt-1">{report.timeAgo}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Performing Listings - Responsive */}
        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-white">Top Listings</h3>
            <Button
              onClick={() => window.location.href = '/admin/listings'}
              variant="ghost"
              size="sm"
              className="text-green-400 hover:text-green-300 text-xs sm:text-sm"
            >
              View All
            </Button>
          </div>
          
          {!data.topListings || data.topListings.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <Home className="w-10 h-10 sm:w-12 sm:h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm sm:text-base">No listings data</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {data.topListings.slice(0, 5).map((listing, index) => (
                <div key={listing.id} className="p-2 sm:p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                      <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0 ${
                        index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                        index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                        index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                        'bg-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-xs sm:text-sm truncate">{listing.title}</p>
                        <div className="flex items-center gap-2 sm:gap-3 mt-1">
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            <span className="text-xs text-gray-400">
                              {Number(listing.avg_rating || listing.average_rating || 0).toFixed(1)}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 truncate">
                            {listing.location}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-2 sm:ml-3 flex-shrink-0">
                      <p className="text-xs sm:text-sm text-green-400 font-semibold">
                        ₱{Number(listing.total_revenue || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {listing.total_bookings || listing.booking_count || 0} bookings
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions - Responsive */}
      <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
        <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          <QuickActionButton
            label="Manage Users"
            icon={Users}
            color="blue"
            onClick={() => window.location.href = '/admin/users'}
            badge={data.newUsersToday}
          />
          <QuickActionButton
            label="Process Payouts"
            icon={CreditCard}
            color="green"
            onClick={() => window.location.href = '/admin/payouts'}
            badge={data.pendingPayoutCount}
            urgent={data.pendingPayoutCount > 5}
          />
          <QuickActionButton
            label="Review Reports"
            icon={AlertTriangle}
            color="red"
            onClick={() => window.location.href = '/admin/reports'}
            badge={data.pendingReports}
            urgent={data.pendingReports > 0}
          />
          <QuickActionButton
            label="View Bookings"
            icon={Calendar}
            color="purple"
            onClick={() => window.location.href = '/admin/bookings'}
            badge={data.todayBookings}
          />
          <QuickActionButton
            label="Manage Listings"
            icon={Home}
            color="orange"
            onClick={() => window.location.href = '/admin/listings'}
            badge={data.pendingListings}
          />
        </div>
      </div>
    </div>
  );
};

const QuickActionButton = ({ label, icon: Icon, color, onClick, badge, urgent }) => {
  const colorConfig = {
    blue: 'border-blue-500 text-blue-400 hover:bg-blue-500',
    green: 'border-green-500 text-green-400 hover:bg-green-500',
    red: 'border-red-500 text-red-400 hover:bg-red-500',
    purple: 'border-purple-500 text-purple-400 hover:bg-purple-500',
    orange: 'border-orange-500 text-orange-400 hover:bg-orange-500',
    cyan: 'border-cyan-500 text-cyan-400 hover:bg-cyan-500'
  };

  return (
    <button
      onClick={onClick}
      className={`relative p-3 sm:p-4 border ${colorConfig[color]} hover:text-white rounded-lg transition-all group`}
    >
      {badge > 0 && (
        <span className={`absolute -top-1 -right-1 sm:-top-2 sm:-right-2 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs rounded-full ${
          urgent ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-600 text-white'
        }`}>
          {badge}
        </span>
      )}
      <Icon className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2 group-hover:scale-110 transition-transform" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
};

export default AdminOverview;