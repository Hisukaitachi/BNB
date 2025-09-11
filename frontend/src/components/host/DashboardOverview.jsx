import React from 'react';
import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Home, 
  Users, 
  Star,
  RefreshCw,
  Eye,
  Clock
} from 'lucide-react';
import HostBookings from './HostBookings';
import Button from '../ui/Button';

const DashboardOverview = ({ data, onRefresh }) => {
  if (!data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
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
      title: 'Total Listings',
      value: data.totalListings,
      change: '+2 this month',
      icon: Home,
      color: 'text-blue-400'
    },
    {
      title: 'Pending Bookings',
      value: data.pendingBookings,
      change: 'Need attention',
      icon: Clock,
      color: 'text-yellow-400',
      urgent: data.pendingBookings > 0
    },
    {
      title: 'Total Earnings',
      value: `₱${data.totalEarnings.toLocaleString()}`,
      change: `${data.monthlyStats?.growth || 0}% vs last month`,
      icon: DollarSign,
      color: 'text-green-400'
    },
    {
      title: "Today's Check-ins",
      value: data.todaysCheckIns,
      change: 'Guests arriving',
      icon: Users,
      color: 'text-purple-400'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>
        <Button
          onClick={onRefresh}
          variant="outline"
          className="border-gray-600 text-gray-300"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className={`bg-gray-800 rounded-xl p-6 ${stat.urgent ? 'ring-2 ring-yellow-500' : ''}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{stat.title}</p>
                  <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                  <p className={`text-xs mt-1 ${stat.urgent ? 'text-yellow-400' : 'text-gray-500'}`}>
                    {stat.change}
                  </p>
                </div>
                <div className={`p-3 rounded-full bg-gray-700 ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Recent Bookings</h3>
            <Button
              onClick={() => navigate('/host/bookings')}
              variant="ghost"
              size="sm"
              className="text-purple-400"
            >
              View All
            </Button>
          </div>
          
          {data.recentBookings?.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No recent bookings</p>
          ) : (
            <div className="space-y-3">
              {data.recentBookings?.slice(0, 5).map((booking) => (
                <div key={booking.booking_id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{booking.title}</p>
                    <p className="text-sm text-gray-400">{booking.client_name}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded text-xs ${
                      booking.status === 'pending' ? 'bg-yellow-900 text-yellow-400' :
                      booking.status === 'approved' ? 'bg-green-900 text-green-400' :
                      'bg-gray-600 text-gray-300'
                    }`}>
                      {booking.status}
                    </span>
                    <p className="text-sm text-gray-400 mt-1">₱{Number(booking.total_price).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Listings */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Top Performing Listings</h3>
            <Button
              onClick={() => navigate('/host/listings')}
              variant="ghost"
              size="sm"
              className="text-purple-400"
            >
              View All
            </Button>
          </div>
          
          {data.topListings?.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No listings yet</p>
          ) : (
            <div className="space-y-3">
              {data.topListings?.map((listing) => (
                <div key={listing.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
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
                    <p className="text-sm text-green-400">₱{Number(listing.price_per_night).toLocaleString()}/night</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
