// frontend/src/components/admin/AdminOverview.jsx
import React from 'react';
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
  Shield
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import Button from '../ui/Button';

const AdminOverview = ({ data, onRefresh }) => {
  if (!data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-gray-700 rounded mb-4"></div>
            <div className="h-8 bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Users',
      value: data.totalUsers?.toLocaleString() || '0',
      change: `+${data.newUsersThisMonth || 0} this month`,
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-600/20'
    },
    {
      title: 'Active Listings',
      value: data.totalListings?.toLocaleString() || '0',
      change: `${data.pendingListings || 0} pending review`,
      icon: Home,
      color: 'text-green-400',
      bgColor: 'bg-green-600/20'
    },
    {
      title: 'Platform Revenue',
      value: `₱${data.totalPlatformRevenue?.toLocaleString() || '0'}`,
      change: `${data.revenueGrowth || 0}% vs last month`,
      icon: DollarSign,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-600/20'
    },
    {
      title: 'Active Bookings',
      value: data.activeBookings?.toLocaleString() || '0',
      change: `${data.totalBookings || 0} total bookings`,
      icon: Calendar,
      color: 'text-purple-400',
      bgColor: 'bg-purple-600/20'
    },
    {
      title: 'Pending Reports',
      value: data.pendingReports || '0',
      change: 'Need attention',
      icon: AlertTriangle,
      color: 'text-red-400',
      bgColor: 'bg-red-600/20',
      urgent: data.pendingReports > 0
    },
    {
      title: 'Pending Payouts',
      value: `₱${data.pendingPayoutAmount?.toLocaleString() || '0'}`,
      change: `${data.pendingPayoutCount || 0} payouts pending`,
      icon: TrendingUp,
      color: 'text-orange-400',
      bgColor: 'bg-orange-600/20',
      urgent: data.pendingPayoutCount > 0
    },
    {
      title: 'Platform Rating',
      value: (data.averagePlatformRating || 0).toFixed(1),
      change: `${data.totalReviews || 0} reviews`,
      icon: Star,
      color: 'text-pink-400',
      bgColor: 'bg-pink-600/20'
    },
    {
      title: 'System Health',
      value: data.systemHealth || 'Good',
      change: 'All systems operational',
      icon: Shield,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-600/20'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Platform Overview</h2>
          <p className="text-gray-400">Monitor your platform's performance and health</p>
        </div>
        <Button
          onClick={onRefresh}
          variant="outline"
          className="border-gray-600 text-gray-300"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div 
              key={index} 
              className={`bg-gray-800 rounded-xl p-6 border-l-4 ${
                stat.urgent ? 'border-red-500' : 'border-transparent'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{stat.title}</p>
                  <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                  <p className={`text-xs mt-1 ${stat.urgent ? 'text-red-400' : 'text-gray-500'}`}>
                    {stat.change}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Platform Revenue</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.revenueChart || []}>
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
                  formatter={(value) => [`₱${value.toLocaleString()}`, 'Revenue']}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10B981" 
                  strokeWidth={3}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Growth Chart */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">User Growth</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.userGrowthChart || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="month" 
                  stroke="#9CA3AF" 
                  fontSize={12}
                />
                <YAxis 
                  stroke="#9CA3AF" 
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                  formatter={(value) => [value, 'New Users']}
                />
                <Bar dataKey="newUsers" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Reports */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Recent Reports</h3>
            <Button
              onClick={() => window.location.href = '/admin/reports'}
              variant="ghost"
              size="sm"
              className="text-red-400"
            >
              View All
            </Button>
          </div>
          
          {data.recentReports?.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No recent reports</p>
          ) : (
            <div className="space-y-3">
              {data.recentReports?.slice(0, 5).map((report) => (
                <div key={report.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{report.type}</p>
                    <p className="text-sm text-gray-400">From: {report.reporter_name}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-1 rounded text-xs bg-red-900 text-red-400">
                      {report.status}
                    </span>
                    <p className="text-gray-400 text-xs mt-1">{report.timeAgo}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Performing Listings */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Top Performing Listings</h3>
            <Button
              onClick={() => window.location.href = '/admin/listings'}
              variant="ghost"
              size="sm"
              className="text-green-400"
            >
              View All
            </Button>
          </div>
          
          {data.topListings?.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No listings data</p>
          ) : (
            <div className="space-y-3">
              {data.topListings?.slice(0, 5).map((listing) => (
                <div key={listing.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                      <Home className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium truncate">{listing.title}</p>
                      <div className="flex items-center space-x-2">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm text-gray-400">
                          {Number(listing.average_rating || 0).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-green-400">
                      ₱{Number(listing.total_revenue || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">{listing.booking_count} bookings</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            onClick={() => window.location.href = '/admin/users'}
            variant="outline"
            className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white"
          >
            <Users className="w-4 h-4 mr-2" />
            Manage Users
          </Button>
          <Button
            onClick={() => window.location.href = '/admin/payouts'}
            variant="outline"
            className="border-green-500 text-green-400 hover:bg-green-500 hover:text-white"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Process Payouts
          </Button>
          <Button
            onClick={() => window.location.href = '/admin/reports'}
            variant="outline"
            className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Review Reports
          </Button>
          <Button
            onClick={() => window.location.href = '/admin/settings'}
            variant="outline"
            className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white"
          >
            <Shield className="w-4 h-4 mr-2" />
            System Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;