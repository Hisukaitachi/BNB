// src/components/host/OverviewTab.jsx
import React, { useState, useEffect } from 'react';
import { 
  Building2, Calendar, DollarSign, Star, 
  TrendingUp, MessageSquare, Eye, Heart, MapPin, BarChart3 
} from 'lucide-react';
import api from '../../services/api';
import Loading from '../common/Loading';

const OverviewTab = () => {
  const [stats, setStats] = useState({
    totalListings: 0,
    totalBookings: 0,
    totalEarnings: 0,
    averageRating: 0,
    occupancyRate: 0,
    responseRate: 0
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [listingsRes, bookingsRes, earningsRes] = await Promise.all([
        api.getMyListings(),
        api.getHostBookings(),
        api.getHostEarnings()
      ]);

      const listings = listingsRes.data?.listings || [];
      const bookings = bookingsRes.data?.bookings || [];
      const earnings = earningsRes.data?.totalEarnings || 0;

      setStats({
        totalListings: listings.length,
        totalBookings: bookings.length,
        totalEarnings: earnings,
        averageRating: calculateAverageRating(listings),
        occupancyRate: calculateOccupancyRate(bookings),
        responseRate: 95 // Mock data - can be improved later
      });

      setRecentBookings(bookings.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAverageRating = (listings) => {
    if (listings.length === 0) return 0;
    const totalRating = listings.reduce((sum, listing) => sum + (listing.average_rating || 0), 0);
    return (totalRating / listings.length).toFixed(1);
  };

  const calculateOccupancyRate = (bookings) => {
    const approvedBookings = bookings.filter(b => ['approved', 'confirmed', 'completed'].includes(b.status));
    return Math.round((approvedBookings.length / Math.max(bookings.length, 1)) * 100);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(price);
  };

  if (loading) {
    return <Loading message="Loading dashboard..." fullScreen={false} />;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome back!</h1>
        <p className="opacity-90">Here's what's happening with your properties today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 hover:bg-gray-750 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Listings</p>
              <p className="text-2xl font-bold">{stats.totalListings}</p>
              <p className="text-green-400 text-xs mt-1">Active properties</p>
            </div>
            <Building2 className="w-8 h-8 text-purple-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 hover:bg-gray-750 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Bookings</p>
              <p className="text-2xl font-bold">{stats.totalBookings}</p>
              <p className="text-blue-400 text-xs mt-1">All time</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 hover:bg-gray-750 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Earnings</p>
              <p className="text-2xl font-bold">{formatPrice(stats.totalEarnings)}</p>
              <p className="text-green-400 text-xs mt-1">Lifetime earnings</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 hover:bg-gray-750 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Average Rating</p>
              <p className="text-2xl font-bold">{stats.averageRating}★</p>
              <p className="text-yellow-400 text-xs mt-1">Guest satisfaction</p>
            </div>
            <Star className="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 hover:bg-gray-750 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Occupancy Rate</p>
              <p className="text-2xl font-bold">{stats.occupancyRate}%</p>
              <p className="text-orange-400 text-xs mt-1">Booking success</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 hover:bg-gray-750 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Response Rate</p>
              <p className="text-2xl font-bold">{stats.responseRate}%</p>
              <p className="text-pink-400 text-xs mt-1">Message replies</p>
            </div>
            <MessageSquare className="w-8 h-8 text-pink-400" />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Bookings</h3>
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          {recentBookings.length > 0 ? (
            <div className="space-y-4">
              {recentBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                  <div className="flex-1">
                    <h4 className="font-medium text-white">{booking.listing_title || 'Unknown Listing'}</h4>
                    <p className="text-sm text-gray-400">
                      {booking.client_name || 'Guest'} • {new Date(booking.start_date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {Math.ceil((new Date(booking.end_date) - new Date(booking.start_date)) / (1000 * 60 * 60 * 24))} nights
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                      booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      booking.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {booking.status}
                    </span>
                    <p className="text-sm font-medium mt-1 text-white">{formatPrice(booking.total_price)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No recent bookings</p>
              <p className="text-gray-500 text-sm">New bookings will appear here</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Quick Actions</h3>
            <Star className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <button className="w-full text-left p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
              <div className="flex items-center space-x-3">
                <Building2 className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="font-medium">Add New Listing</p>
                  <p className="text-sm text-gray-400">List a new property</p>
                </div>
              </div>
            </button>
            
            <button className="w-full text-left p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
              <div className="flex items-center space-x-3">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="font-medium">Check Messages</p>
                  <p className="text-sm text-gray-400">Respond to guest inquiries</p>
                </div>
              </div>
            </button>
            
            <button className="w-full text-left p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
              <div className="flex items-center space-x-3">
                <BarChart3 className="w-5 h-5 text-green-400" />
                <div>
                  <p className="font-medium">View Analytics</p>
                  <p className="text-sm text-gray-400">Track your performance</p>
                </div>
              </div>
            </button>
            
            <button className="w-full text-left p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
              <div className="flex items-center space-x-3">
                <DollarSign className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="font-medium">View Earnings</p>
                  <p className="text-sm text-gray-400">Check your payouts</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Performance Tips */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Tips to Improve Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="font-medium text-sm">Boost Your Rating</span>
            </div>
            <p className="text-xs text-gray-400">Respond to guest messages within 1 hour to improve your response rate.</p>
          </div>
          
          <div className="p-4 bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Eye className="w-4 h-4 text-blue-400" />
              <span className="font-medium text-sm">Increase Visibility</span>
            </div>
            <p className="text-xs text-gray-400">Add high-quality photos and detailed descriptions to attract more guests.</p>
          </div>
          
          <div className="p-4 bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="font-medium text-sm">Optimize Pricing</span>
            </div>
            <p className="text-xs text-gray-400">Adjust your prices based on local events and seasonal demand.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;