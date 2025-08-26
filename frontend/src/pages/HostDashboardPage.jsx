// src/pages/HostDashboardPage.jsx - Fixed Hook Issues
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, Plus, Building2, Calendar, BarChart3, 
  Users, DollarSign, Star, MessageSquare, Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';

// Import all tab components
import OverviewTab from '../components/host/OverviewTab';
import ListingsTab from '../components/host/ListingsTab';
import BookingsTab from '../components/host/BookingsTab';
import AnalyticsTab from '../components/host/AnalyticsTab';
import EarningsTab from '../components/host/EarningsTab';
import ReviewsTab from '../components/host/ReviewsTab';
import MessagesTab from '../components/host/MessagesTab';
import SettingsTab from '../components/host/SettingsTab';

// Sidebar component moved inside to ensure proper hook context
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

  const handleNavigation = (item) => {
    setActiveTab(item.id);
    navigate(item.path);
  };

  const handleAddListing = () => {
    navigate('/host/listings/new');
  };

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
                  onClick={() => handleNavigation(item)}
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
            onClick={handleAddListing}
            icon={<Plus className="w-4 h-4" />}
          >
            Add New Listing
          </Button>
        </div>
      </nav>
    </div>
  );
};

// Main component
const HostDashboardPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overview');

  // Effect to set active tab based on route
  useEffect(() => {
    const path = location.pathname;
    
    if (path.includes('/listings')) {
      setActiveTab('listings');
    } else if (path.includes('/bookings')) {
      setActiveTab('bookings');
    } else if (path.includes('/analytics')) {
      setActiveTab('analytics');
    } else if (path.includes('/earnings')) {
      setActiveTab('earnings');
    } else if (path.includes('/reviews')) {
      setActiveTab('reviews');
    } else if (path.includes('/messages')) {
      setActiveTab('messages');
    } else if (path.includes('/settings')) {
      setActiveTab('settings');
    } else {
      setActiveTab('overview');
    }
  }, [location.pathname]);

  // Check permissions first
  if (!user) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-400 mb-4">Loading...</h1>
          <p className="text-gray-500">Please wait while we load your dashboard.</p>
        </div>
      </div>
    );
  }

  if (user.role !== 'host' && user.role !== 'admin') {
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
              <Route path="/bookings" element={<BookingsTab />} />
              <Route path="/analytics" element={<AnalyticsTab />} />
              <Route path="/earnings" element={<EarningsTab />} />
              <Route path="/reviews" element={<ReviewsTab />} />
              <Route path="/messages" element={<MessagesTab />} />
              <Route path="/settings" element={<SettingsTab />} />
              <Route path="*" element={<Navigate to="/host" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostDashboardPage;