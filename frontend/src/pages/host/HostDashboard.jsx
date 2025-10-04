// frontend/src/pages/host/HostDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Home, 
  DollarSign, 
  MessageSquare, 
  BarChart3, 
  Settings,
  Bell,
  Plus,
  Users,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import HostSidebar from '../../components/host/HostSidebar';
import DashboardOverview from '../../components/host/DashboardOverview';
import HostBookings from '../../components/host/HostBookings';
import HostCalendar from '../../components/host/HostCalendar';
import HostListings from '../../components/host/HostListings';
import HostEarnings from '../../components/host/HostEarnings';
import HostReports from '../../components/host/HostReports';
import CreateListing from '../../components/host/CreateListing';
import EditListing from '../../components/host/EditListing';
import HostNotifications from '../../components/host/HostNotifications';
import ViewRequests from '../../components/host/ViewRequest';
import hostService from '../../services/hostService';


const HostDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Redirect non-hosts
    if (user && user.role !== 'host') {
      navigate('/', { replace: true });
      return;
    }

    loadDashboardData();
  }, [user, navigate]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await hostService.getDashboardOverview();
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Navigation items for the host dashboard
  const navigationItems = [
    {
      path: '/host/dashboard',
      icon: BarChart3,
      label: 'Overview',
      exact: true
    },
    {
      path: '/host/bookings',
      icon: Calendar,
      label: 'Manage Bookings',
      badge: dashboardData?.pendingBookings
    },
    {
      path: '/host/calendar',
      icon: Calendar,
      label: 'Big Calendar'
    },
    {
      path: '/host/listings',
      icon: Home,
      label: 'My Listings',
      badge: dashboardData?.totalListings
    },
    {
      path: '/host/earnings',
      icon: DollarSign,
      label: 'Earnings & Payouts'
    },
    {
      path: '/host/reports',
      icon: AlertTriangle,
      label: 'Reports & Disputes'
    },
    {
      path: '/host/notifications',
      icon: Bell,
      label: 'Notifications',
      badge: dashboardData?.unreadNotifications
    },
    {
        path: '/host/view-requests',
        icon: Users,
        label: 'View Requests',
        badge: dashboardData?.viewRequests
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <HostSidebar 
        navigationItems={navigationItems}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Header */}
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <div>
                <h1 className="text-xl font-bold text-white">Host Dashboard</h1>
                <p className="text-sm text-gray-400">Welcome back, {user?.name}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Quick Stats */}
              <div className="hidden md:flex items-center space-x-6 text-sm">
                {dashboardData?.pendingBookings > 0 && (
                  <div className="text-yellow-400">
                    {dashboardData.pendingBookings} pending bookings
                  </div>
                )}
                {dashboardData?.todaysCheckIns > 0 && (
                  <div className="text-green-400">
                    {dashboardData.todaysCheckIns} check-ins today
                  </div>
                )}
              </div>

              {/* Quick Action Button */}
              <button
                onClick={() => navigate('/host/listings/create')}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg transition flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:block">Add Listing</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/host/dashboard" replace />} />
            <Route 
              path="/dashboard" 
              element={
                <DashboardOverview 
                  data={dashboardData} 
                  onRefresh={loadDashboardData}
                />
              } 
            />
            <Route path="/bookings" element={<HostBookings />} />
            <Route path="/calendar" element={<HostCalendar />} />
            <Route path="/listings" element={<HostListings />} />
            <Route path="/listings/create" element={<CreateListing />} />
            <Route path="/listings/edit/:id" element={<EditListing />} />
            <Route path="/earnings" element={<HostEarnings />} />
            <Route path="/reports" element={<HostReports />} />
            <Route path="/notifications" element={<HostNotifications />} />
            <Route path="/view-requests" element={<ViewRequests />} />
            <Route path="*" element={<Navigate to="/host/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default HostDashboard;