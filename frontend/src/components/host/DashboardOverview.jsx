import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  // Handle refresh with loading state
  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    }
  };

  // Handle navigation to bookings
  const handleViewAllBookings = () => {
    navigate('/host/bookings');
  };

  // Handle navigation to listings
  const handleViewAllListings = () => {
    navigate('/host/listings');
  };

  // Handle clicking on a specific booking
  const handleBookingClick = (bookingId) => {
    navigate(`/host/bookings/${bookingId}`);
  };

  // Handle clicking on a specific listing
  const handleListingClick = (listingId) => {
    navigate(`/host/listings/${listingId}`);
  };

  // Handle clicking on stats cards
  const handleStatClick = (statType) => {
    switch(statType) {
      case 'listings':
        navigate('/host/listings');
        break;
      case 'bookings':
        navigate('/host/bookings?status=pending');
        break;
      case 'earnings':
        navigate('/host/earnings');
        break;
      case 'checkins':
        navigate('/host/bookings?filter=today');
        break;
      default:
        break;
    }
  };

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
      color: 'text-blue-400',
      type: 'listings'
    },
    {
      title: 'Pending Bookings',
      value: data.pendingBookings,
      change: 'Need attention',
      icon: Clock,
      color: 'text-yellow-400',
      urgent: data.pendingBookings > 0,
      type: 'bookings'
    },
    {
      title: 'Total Earnings',
      value: `₱${data.totalEarnings.toLocaleString()}`,
      change: `${data.monthlyStats?.growth || 0}% vs last month`,
      icon: DollarSign,
      color: 'text-green-400',
      type: 'earnings'
    },
    {
      title: "Today's Check-ins",
      value: data.todaysCheckIns,
      change: 'Guests arriving',
      icon: Users,
      color: 'text-purple-400',
      type: 'checkins'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>
        <Button
          onClick={handleRefresh}
          variant="outline"
          className="border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards - Now Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div 
              key={index} 
              className={`bg-gray-800 rounded-xl p-6 cursor-pointer hover:bg-gray-750 transition-all hover:scale-105 ${
                stat.urgent ? 'ring-2 ring-yellow-500' : ''
              }`}
              onClick={() => handleStatClick(stat.type)}
            >
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
              onClick={handleViewAllBookings}
              variant="ghost"
              size="sm"
              className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
            >
              View All
            </Button>
          </div>
          
          {data.recentBookings?.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No recent bookings</p>
              <Button
                onClick={() => navigate('/host/listings')}
                variant="outline"
                size="sm"
                className="mt-4 border-gray-600 text-gray-300"
              >
                Manage Listings
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentBookings?.slice(0, 5).map((booking) => (
                <div 
                  key={booking.booking_id} 
                  className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-650 cursor-pointer transition-colors"
                  onClick={() => handleBookingClick(booking.booking_id)}
                >
                  <div>
                    <p className="text-white font-medium">{booking.title}</p>
                    <p className="text-sm text-gray-400">{booking.client_name}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded text-xs ${
                      booking.status === 'pending' ? 'bg-yellow-900 text-yellow-400' :
                      booking.status === 'approved' ? 'bg-green-900 text-green-400' :
                      booking.status === 'confirmed' ? 'bg-blue-900 text-blue-400' :
                      booking.status === 'completed' ? 'bg-gray-600 text-gray-300' :
                      booking.status === 'cancelled' ? 'bg-red-900 text-red-400' :
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
              onClick={handleViewAllListings}
              variant="ghost"
              size="sm"
              className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
            >
              View All
            </Button>
          </div>
          
          {data.topListings?.length === 0 ? (
            <div className="text-center py-8">
              <Home className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No listings yet</p>
              <Button
                onClick={() => navigate('/host/listings/create')}
                variant="gradient"
                size="sm"
                className="mt-4 bg-gradient-to-r from-purple-500 to-pink-600"
              >
                Create Listing
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {data.topListings?.map((listing) => (
                <div 
                  key={listing.id} 
                  className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-650 cursor-pointer transition-colors"
                  onClick={() => handleListingClick(listing.id)}
                >
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
                        <span className="text-xs text-gray-500">
                          ({listing.total_reviews || 0} reviews)
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-green-400">₱{Number(listing.price_per_night).toLocaleString()}/night</p>
                    <p className="text-xs text-gray-500">
                      {listing.total_bookings || 0} bookings
                    </p>
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
            onClick={() => navigate('/host/listings/create')}
            variant="outline"
            className="border-purple-500 text-purple-400 hover:bg-purple-900/20"
          >
            <Home className="w-4 h-4 mr-2" />
            New Listing
          </Button>
          
          <Button
            onClick={() => navigate('/host/bookings?status=pending')}
            variant="outline"
            className="border-yellow-500 text-yellow-400 hover:bg-yellow-900/20"
          >
            <Clock className="w-4 h-4 mr-2" />
            Pending ({data.pendingBookings || 0})
          </Button>
          
          <Button
            onClick={() => navigate('/host/calendar')}
            variant="outline"
            className="border-blue-500 text-blue-400 hover:bg-blue-900/20"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Calendar
          </Button>
          
          <Button
            onClick={() => navigate('/host/earnings')}
            variant="outline"
            className="border-green-500 text-green-400 hover:bg-green-900/20"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Earnings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
