// src/pages/HostDashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, Plus, Building2, Calendar, BarChart3, 
  Users, DollarSign, Star, MessageSquare, Settings,
  TrendingUp, Eye, Heart, MapPin
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import Modal from '../components/common/Modal';

const HostSidebar = ({ activeTab, setActiveTab }) => {
  const navigate = useNavigate();
  
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: Home, path: '/host' },
    { id: 'listings', label: 'My Listings', icon: Building2, path: '/host/listings' },
    { id: 'bookings', label: 'Bookings', icon: Calendar, path: '/host/bookings' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/host/analytics' },
    { id: 'earnings', label: 'Earnings', icon: DollarSign, path: '/host/earnings' },
    { id: 'reviews', label: 'Reviews', icon: Star, path: '/host/reviews' },
    { id: 'messages', label: 'Messages', icon: MessageSquare, path: '/host/messages' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/host/settings' },
  ];

  return (
    <div className="w-64 bg-gray-800 h-full border-r border-gray-700">
      <div className="p-6 border-b border-gray-700">
        <h2 className="text-lg font-semibold">Host Dashboard</h2>
        <p className="text-sm text-gray-400">Manage your properties</p>
      </div>
      
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => {
                    setActiveTab(item.id);
                    navigate(item.path);
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                    activeTab === item.id
                      ? 'bg-purple-500 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
        
        <div className="mt-8 pt-6 border-t border-gray-700">
          <Button
            className="w-full"
            onClick={() => navigate('/host/listings/new')}
            icon={<Plus className="w-4 h-4" />}
          >
            Add New Listing
          </Button>
        </div>
      </nav>
    </div>
  );
};

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
        responseRate: 95 // Mock data
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
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Listings</p>
              <p className="text-2xl font-bold">{stats.totalListings}</p>
            </div>
            <Building2 className="w-8 h-8 text-purple-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Bookings</p>
              <p className="text-2xl font-bold">{stats.totalBookings}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Earnings</p>
              <p className="text-2xl font-bold">{formatPrice(stats.totalEarnings)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Average Rating</p>
              <p className="text-2xl font-bold">{stats.averageRating}★</p>
            </div>
            <Star className="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Occupancy Rate</p>
              <p className="text-2xl font-bold">{stats.occupancyRate}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Response Rate</p>
              <p className="text-2xl font-bold">{stats.responseRate}%</p>
            </div>
            <MessageSquare className="w-8 h-8 text-pink-400" />
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Bookings</h3>
        {recentBookings.length > 0 ? (
          <div className="space-y-4">
            {recentBookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                <div>
                  <h4 className="font-medium">{booking.listing_title}</h4>
                  <p className="text-sm text-gray-400">
                    {booking.client_name} • {new Date(booking.start_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                    booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                    booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {booking.status}
                  </span>
                  <p className="text-sm font-medium mt-1">{formatPrice(booking.total_price)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center py-8">No recent bookings</p>
        )}
      </div>
    </div>
  );
};

const ListingsTab = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const response = await api.getMyListings();
      if (response.status === 'success') {
        setListings(response.data.listings || []);
      }
    } catch (error) {
      console.error('Failed to fetch listings:', error);
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

  if (loading) {
    return <Loading message="Loading your listings..." fullScreen={false} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Listings</h2>
        <Button 
          onClick={() => navigate('/host/listings/new')}
          icon={<Plus className="w-4 h-4" />}
        >
          Add New Listing
        </Button>
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No listings yet</h3>
          <p className="text-gray-500 mb-6">Create your first listing to start hosting</p>
          <Button onClick={() => navigate('/host/listings/new')}>
            Create Your First Listing
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <div key={listing.id} className="bg-gray-800 rounded-xl overflow-hidden">
              <div className="relative h-48">
                <img
                  src={listing.image_url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3 bg-black/50 rounded-full px-2 py-1">
                  <div className="flex items-center space-x-1">
                    <Eye className="w-3 h-3 text-white" />
                    <span className="text-white text-xs">{listing.views || 0}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2">{listing.title}</h3>
                <div className="flex items-center text-gray-400 text-sm mb-3">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>{listing.location}</span>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span>{listing.average_rating || 'New'}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Heart className="w-4 h-4 text-red-400" />
                      <span>{listing.favorites || 0}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold">{formatPrice(listing.price_per_night)}</span>
                    <span className="text-gray-400 text-sm block">/ night</span>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => navigate(`/listing/${listing.id}`)}
                  >
                    View
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => navigate(`/host/listings/${listing.id}/edit`)}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const HostDashboardPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Set active tab based on current route
    const path = location.pathname;
    if (path.includes('/listings')) setActiveTab('listings');
    else if (path.includes('/bookings')) setActiveTab('bookings');
    else if (path.includes('/analytics')) setActiveTab('analytics');
    else if (path.includes('/earnings')) setActiveTab('earnings');
    else if (path.includes('/reviews')) setActiveTab('reviews');
    else if (path.includes('/messages')) setActiveTab('messages');
    else if (path.includes('/settings')) setActiveTab('settings');
    else setActiveTab('overview');
  }, [location.pathname]);

  if (user?.role !== 'host' && user?.role !== 'admin') {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-6">You need to be a host to access this page.</p>
          <Button onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20">
      <div className="flex h-[calc(100vh-5rem)]">
        <HostSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            <Routes>
              <Route path="/" element={<OverviewTab />} />
              <Route path="/listings" element={<ListingsTab />} />
              <Route path="/bookings" element={<div>Bookings Tab - Coming Soon</div>} />
              <Route path="/analytics" element={<div>Analytics Tab - Coming Soon</div>} />
              <Route path="/earnings" element={<div>Earnings Tab - Coming Soon</div>} />
              <Route path="/reviews" element={<div>Reviews Tab - Coming Soon</div>} />
              <Route path="/messages" element={<div>Messages Tab - Coming Soon</div>} />
              <Route path="/settings" element={<div>Settings Tab - Coming Soon</div>} />
              <Route path="*" element={<Navigate to="/host" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostDashboardPage;