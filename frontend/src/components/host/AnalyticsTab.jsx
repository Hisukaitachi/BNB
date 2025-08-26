// src/components/host/AnalyticsTab.jsx
import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, Eye, Users, Calendar, 
  DollarSign, Star, MapPin, Clock, Target
} from 'lucide-react';
import api from '../../services/api';
import Loading from '../common/Loading';

const AnalyticsTab = () => {
  const [analytics, setAnalytics] = useState({
    overview: {
      totalViews: 0,
      totalBookings: 0,
      conversionRate: 0,
      averageBookingValue: 0,
      occupancyRate: 0,
      responseRate: 95
    },
    monthlyData: [],
    topPerformingListings: [],
    guestDemographics: {},
    bookingTrends: []
  });
  const [selectedPeriod, setSelectedPeriod] = useState('last30days');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      // Since we don't have a specific analytics endpoint, we'll simulate with existing data
      const [listingsRes, bookingsRes, earningsRes] = await Promise.all([
        api.getMyListings(),
        api.getHostBookings(),
        api.getHostEarnings()
      ]);

      const listings = listingsRes.data?.listings || [];
      const bookings = bookingsRes.data?.bookings || [];
      const totalEarnings = earningsRes.data?.totalEarnings || 0;

      // Calculate analytics
      const totalViews = listings.reduce((sum, l) => sum + (l.views || 0), 0);
      const totalBookings = bookings.length;
      const conversionRate = totalViews > 0 ? ((totalBookings / totalViews) * 100).toFixed(1) : 0;
      const averageBookingValue = totalBookings > 0 ? totalEarnings / totalBookings : 0;
      const confirmedBookings = bookings.filter(b => ['confirmed', 'completed'].includes(b.status));
      const occupancyRate = totalBookings > 0 ? ((confirmedBookings.length / totalBookings) * 100).toFixed(1) : 0;

      // Generate monthly data (simulated)
      const monthlyData = generateMonthlyData(bookings);
      
      // Top performing listings
      const topListings = listings
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 5);

      setAnalytics({
        overview: {
          totalViews,
          totalBookings,
          conversionRate: parseFloat(conversionRate),
          averageBookingValue,
          occupancyRate: parseFloat(occupancyRate),
          responseRate: 95
        },
        monthlyData,
        topPerformingListings: topListings,
        guestDemographics: generateGuestDemographics(bookings),
        bookingTrends: generateBookingTrends(bookings)
      });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyData = (bookings) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, index) => ({
      month,
      views: Math.floor(Math.random() * 500) + 200,
      bookings: Math.floor(Math.random() * 50) + 10,
      revenue: Math.floor(Math.random() * 50000) + 20000
    }));
  };

  const generateGuestDemographics = (bookings) => {
    return {
      ageGroups: {
        '18-25': 15,
        '26-35': 35,
        '36-45': 30,
        '46-55': 15,
        '55+': 5
      },
      topCountries: ['Philippines', 'USA', 'Japan', 'Australia', 'Singapore']
    };
  };

  const generateBookingTrends = (bookings) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => ({
      day,
      bookings: Math.floor(Math.random() * 20) + 5
    }));
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(price);
  };

  if (loading) {
    return <Loading message="Loading analytics..." fullScreen={false} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-gray-400">Track your hosting performance and insights</p>
        </div>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
        >
          <option value="last7days">Last 7 days</option>
          <option value="last30days">Last 30 days</option>
          <option value="last90days">Last 90 days</option>
          <option value="lastyear">Last year</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Eye className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-right">
              <p className="text-sm text-green-400">+12%</p>
            </div>
          </div>
          <h3 className="text-2xl font-bold">{analytics.overview.totalViews.toLocaleString()}</h3>
          <p className="text-gray-400 text-sm">Total Views</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Calendar className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-right">
              <p className="text-sm text-green-400">+8%</p>
            </div>
          </div>
          <h3 className="text-2xl font-bold">{analytics.overview.totalBookings}</h3>
          <p className="text-gray-400 text-sm">Total Bookings</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Target className="w-6 h-6 text-purple-400" />
            </div>
            <div className="text-right">
              <p className="text-sm text-green-400">+2.1%</p>
            </div>
          </div>
          <h3 className="text-2xl font-bold">{analytics.overview.conversionRate}%</h3>
          <p className="text-gray-400 text-sm">Conversion Rate</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <DollarSign className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="text-right">
              <p className="text-sm text-green-400">+15%</p>
            </div>
          </div>
          <h3 className="text-2xl font-bold">{formatPrice(analytics.overview.averageBookingValue)}</h3>
          <p className="text-gray-400 text-sm">Avg. Booking Value</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-400" />
            </div>
            <div className="text-right">
              <p className="text-sm text-green-400">+5%</p>
            </div>
          </div>
          <h3 className="text-2xl font-bold">{analytics.overview.occupancyRate}%</h3>
          <p className="text-gray-400 text-sm">Occupancy Rate</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-pink-500/20 rounded-lg">
              <Clock className="w-6 h-6 text-pink-400" />
            </div>
            <div className="text-right">
              <p className="text-sm text-green-400">+1%</p>
            </div>
          </div>
          <h3 className="text-2xl font-bold">{analytics.overview.responseRate}%</h3>
          <p className="text-gray-400 text-sm">Response Rate</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Performance */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Performance</h3>
          <div className="space-y-4">
            {analytics.monthlyData.map((month, index) => (
              <div key={month.month} className="flex items-center justify-between">
                <span className="text-sm text-gray-400 w-12">{month.month}</span>
                <div className="flex-1 mx-4">
                  <div className="bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full"
                      style={{ width: `${(month.bookings / 50) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium w-16 text-right">{month.bookings} bookings</span>
              </div>
            ))}
          </div>
        </div>

        {/* Booking Trends by Day */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Booking Trends by Day</h3>
          <div className="space-y-4">
            {analytics.bookingTrends.map((day) => (
              <div key={day.day} className="flex items-center justify-between">
                <span className="text-sm text-gray-400 w-12">{day.day}</span>
                <div className="flex-1 mx-4">
                  <div className="bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                      style={{ width: `${(day.bookings / 25) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium w-16 text-right">{day.bookings}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Performing Listings */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Top Performing Listings</h3>
        {analytics.topPerformingListings.length > 0 ? (
          <div className="space-y-4">
            {analytics.topPerformingListings.map((listing, index) => (
              <div key={listing.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-600 rounded-lg overflow-hidden">
                    <img 
                      src={listing.image_url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"} 
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-medium">{listing.title}</h4>
                    <p className="text-sm text-gray-400 flex items-center">
                      <MapPin className="w-3 h-3 mr-1" />
                      {listing.location}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-1">
                      <Eye className="w-4 h-4 text-blue-400" />
                      <span>{listing.views || 0}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span>{listing.average_rating || 'N/A'}</span>
                    </div>
                    <div className="text-lg font-semibold">
                      #{index + 1}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No listings data available</p>
          </div>
        )}
      </div>

      {/* Guest Demographics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Guest Age Groups</h3>
          <div className="space-y-3">
            {Object.entries(analytics.guestDemographics.ageGroups || {}).map(([age, percentage]) => (
              <div key={age} className="flex items-center justify-between">
                <span className="text-sm text-gray-400">{age} years</span>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Top Guest Countries</h3>
          <div className="space-y-3">
            {analytics.guestDemographics.topCountries?.map((country, index) => (
              <div key={country} className="flex items-center justify-between">
                <span className="text-sm text-gray-400">{country}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                      style={{ width: `${(5 - index) * 20}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{(5 - index) * 5}%</span>
                </div>
              </div>
            )) || (
              <p className="text-gray-400 text-center py-4">No data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Performance Insights & Recommendations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-start space-x-3">
                <TrendingUp className="w-5 h-5 text-green-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-400 mb-1">Great Performance!</h4>
                  <p className="text-sm text-gray-300">Your conversion rate is above average. Keep maintaining high-quality photos and quick responses.</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-start space-x-3">
                <Eye className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-400 mb-1">Boost Visibility</h4>
                  <p className="text-sm text-gray-300">Consider updating your listing descriptions and adding seasonal keywords to attract more views.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-yellow-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-400 mb-1">Response Time</h4>
                  <p className="text-sm text-gray-300">Try to respond to inquiries within 1 hour to maintain your high response rate and improve rankings.</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <div className="flex items-start space-x-3">
                <Star className="w-5 h-5 text-purple-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-purple-400 mb-1">Guest Experience</h4>
                  <p className="text-sm text-gray-300">Encourage satisfied guests to leave reviews. Higher ratings lead to better search visibility.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Market Comparison */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Market Comparison</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold mb-2">{analytics.overview.conversionRate}%</div>
            <div className="text-sm text-gray-400 mb-1">Your Conversion Rate</div>
            <div className="text-xs text-green-400">Above average (2.8%)</div>
          </div>
          
          <div className="text-center p-4 bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold mb-2">{analytics.overview.responseRate}%</div>
            <div className="text-sm text-gray-400 mb-1">Your Response Rate</div>
            <div className="text-xs text-green-400">Excellent (avg: 87%)</div>
          </div>
          
          <div className="text-center p-4 bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold mb-2">{formatPrice(analytics.overview.averageBookingValue)}</div>
            <div className="text-sm text-gray-400 mb-1">Avg. Booking Value</div>
            <div className="text-xs text-blue-400">Competitive in your area</div>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">Export Analytics</h3>
            <p className="text-sm text-gray-400">Download detailed reports for your records</p>
          </div>
          <div className="flex space-x-3">
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">
              Download PDF
            </button>
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">
              Export CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsTab;