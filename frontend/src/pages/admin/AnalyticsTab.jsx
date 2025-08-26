// src/pages/admin/AnalyticsTab.jsx
import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Building2, DollarSign, Calendar, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import api from '../../services/api';
import Loading from '../../components/common/Loading';

const AnalyticsTab = () => {
  const [analytics, setAnalytics] = useState({
    overview: {},
    revenue: [],
    bookings: [],
    users: [],
    listings: [],
    performance: {}
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const { showToast } = useApp();

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/analytics?range=${timeRange}`);
      if (response.status === 'success') {
        setAnalytics(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      showToast('Failed to load analytics data', 'error');
      // Set mock data for demonstration
      setAnalytics({
        overview: {
          totalRevenue: 125000,
          totalBookings: 456,
          totalUsers: 1234,
          totalListings: 89,
          revenueGrowth: 15.5,
          bookingsGrowth: 8.2,
          usersGrowth: 12.1,
          listingsGrowth: 5.7
        },
        revenue: [
          { month: 'Jan', amount: 8500 },
          { month: 'Feb', amount: 9200 },
          { month: 'Mar', amount: 10100 },
          { month: 'Apr', amount: 11500 },
          { month: 'May', amount: 12800 },
          { month: 'Jun', amount: 14200 }
        ],
        bookings: [
          { month: 'Jan', count: 45 },
          { month: 'Feb', count: 52 },
          { month: 'Mar', count: 48 },
          { month: 'Apr', count: 61 },
          { month: 'May', count: 58 },
          { month: 'Jun', count: 67 }
        ],
        performance: {
          occupancyRate: 78.5,
          averageBookingValue: 2850,
          customerRetention: 65.2,
          hostSatisfaction: 4.6
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const formatGrowth = (growth) => {
    const isPositive = growth > 0;
    const isNeutral = growth === 0;
    const Icon = isPositive ? ArrowUp : isNeutral ? Minus : ArrowDown;
    const colorClass = isPositive ? 'text-green-400' : isNeutral ? 'text-gray-400' : 'text-red-400';
    
    return (
      <div className={`flex items-center ${colorClass}`}>
        <Icon className="w-4 h-4 mr-1" />
        <span>{Math.abs(growth).toFixed(1)}%</span>
      </div>
    );
  };

  if (loading) {
    return <Loading message="Loading analytics..." fullScreen={false} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-gray-400">Platform performance and insights</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="1y">Last year</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Revenue</p>
              <p className="text-2xl font-bold">{formatPrice(analytics.overview.totalRevenue || 0)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-400" />
          </div>
          <div className="mt-2">
            {formatGrowth(analytics.overview.revenueGrowth || 0)}
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Bookings</p>
              <p className="text-2xl font-bold">{analytics.overview.totalBookings || 0}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-400" />
          </div>
          <div className="mt-2">
            {formatGrowth(analytics.overview.bookingsGrowth || 0)}
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Users</p>
              <p className="text-2xl font-bold">{analytics.overview.totalUsers || 0}</p>
            </div>
            <Users className="w-8 h-8 text-purple-400" />
          </div>
          <div className="mt-2">
            {formatGrowth(analytics.overview.usersGrowth || 0)}
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Listings</p>
              <p className="text-2xl font-bold">{analytics.overview.totalListings || 0}</p>
            </div>
            <Building2 className="w-8 h-8 text-orange-400" />
          </div>
          <div className="mt-2">
            {formatGrowth(analytics.overview.listingsGrowth || 0)}
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Revenue Trend</h3>
          <TrendingUp className="w-6 h-6 text-green-400" />
        </div>
        <div className="h-64 flex items-end justify-between space-x-2">
          {analytics.revenue?.map((item, index) => {
            const maxAmount = Math.max(...analytics.revenue.map(r => r.amount));
            const height = (item.amount / maxAmount) * 100;
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="text-xs text-gray-400 mb-2">
                  {formatPrice(item.amount)}
                </div>
                <div
                  className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t-md transition-all duration-300 hover:opacity-80"
                  style={{ height: `${height}%` }}
                ></div>
                <div className="text-xs text-gray-400 mt-2">{item.month}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bookings Chart */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">Booking Trends</h3>
            <BarChart3 className="w-6 h-6 text-blue-400" />
          </div>
          <div className="h-48 flex items-end justify-between space-x-2">
            {analytics.bookings?.map((item, index) => {
              const maxCount = Math.max(...analytics.bookings.map(b => b.count));
              const height = (item.count / maxCount) * 100;
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="text-xs text-gray-400 mb-2">{item.count}</div>
                  <div
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md transition-all duration-300 hover:opacity-80"
                    style={{ height: `${height}%` }}
                  ></div>
                  <div className="text-xs text-gray-400 mt-2">{item.month}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance KPIs */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold mb-6">Key Performance Indicators</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Occupancy Rate</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-700 rounded-full h-2 mr-3">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${analytics.performance.occupancyRate || 0}%` }}
                  ></div>
                </div>
                <span className="text-white font-semibold">
                  {analytics.performance.occupancyRate || 0}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">Average Booking Value</span>
              <span className="text-white font-semibold">
                {formatPrice(analytics.performance.averageBookingValue || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">Customer Retention</span>
              <div className="flex items-center">
                <div className="w-32 bg-gray-700 rounded-full h-2 mr-3">
                  <div
                    className="bg-purple-500 h-2 rounded-full"
                    style={{ width: `${analytics.performance.customerRetention || 0}%` }}
                  ></div>
                </div>
                <span className="text-white font-semibold">
                  {analytics.performance.customerRetention || 0}%
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">Host Satisfaction</span>
              <div className="flex items-center">
                <div className="flex text-yellow-400 mr-2">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={i < Math.floor(analytics.performance.hostSatisfaction || 0) ? 'text-yellow-400' : 'text-gray-600'}>
                      ★
                    </span>
                  ))}
                </div>
                <span className="text-white font-semibold">
                  {analytics.performance.hostSatisfaction || 0}/5
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Summary */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-xl font-semibold mb-6">Platform Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {analytics.overview.totalRevenue ? `+${((analytics.overview.revenueGrowth || 0) / 100 * analytics.overview.totalRevenue).toFixed(0)}` : '0'}
            </div>
            <div className="text-sm text-gray-400">Revenue Growth This Period</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {Math.round((analytics.overview.totalBookings || 0) / 30)}
            </div>
            <div className="text-sm text-gray-400">Average Daily Bookings</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">
              {analytics.performance.occupancyRate || 0}%
            </div>
            <div className="text-sm text-gray-400">Platform Utilization</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsTab;