// frontend/src/pages/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Users, 
  Home, 
  DollarSign, 
  Calendar,
  AlertTriangle,
  MessageSquare,
  Settings,
  Shield,
  TrendingUp,
  FileText,
  Star
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from '../../components/admin/AdminSidebar';
import AdminOverview from '../../components/admin/AdminOverview';
import UserManagement from '../../components/admin/UserManagement';
import ListingManagement from '../../components/admin/ListingManagement';
import PayoutManagement from '../../components/admin/PayoutManagement';
import AdminEarnings from '../../components/admin/AdminEarnings';
import BookingManagement from '../../components/admin/BookingManagement';
import ReportManagement from '../../components/admin/ReportManagement';
import PlatformFeedback from '../../components/admin/PlatformFeedback';
import AdminSettings from '../../components/admin/AdminSettings';
import adminService from '../../services/adminService';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({});

  useEffect(() => {
    // Redirect non-admins
    if (user && user.role !== 'admin') {
      navigate('/', { replace: true });
      return;
    }

    loadDashboardData();
  }, [user, navigate]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await adminService.getDashboardOverview();
      setDashboardData(data);
      setStats(data.stats || {});
    } catch (error) {
      console.error('Failed to load admin dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Navigation items for admin dashboard
  const navigationItems = [
    {
      path: '/admin/dashboard',
      icon: BarChart3,
      label: 'Overview',
      exact: true
    },
    {
      path: '/admin/users',
      icon: Users,
      label: 'User Management',
      badge: stats.pendingUsers
    },
    {
      path: '/admin/listings',
      icon: Home,
      label: 'Listing Management',
      badge: stats.pendingListings
    },
    {
      path: '/admin/payouts',
      icon: DollarSign,
      label: 'Payout Management',
      badge: stats.pendingPayouts
    },
    {
      path: '/admin/earnings',
      icon: TrendingUp,
      label: 'Platform Earnings'
    },
    {
      path: '/admin/bookings',
      icon: Calendar,
      label: 'Booking Management'
    },
    {
      path: '/admin/reports',
      icon: AlertTriangle,
      label: 'Reports & Disputes',
      badge: stats.pendingReports
    },
    {
      path: '/admin/feedback',
      icon: Star,
      label: 'Platform Feedback'
    },
    {
      path: '/admin/settings',
      icon: Settings,
      label: 'System Settings'
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
      <AdminSidebar 
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
                <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-sm text-gray-400">Platform Management Portal</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Quick Stats */}
              <div className="hidden md:flex items-center space-x-6 text-sm">
                {stats.pendingReports > 0 && (
                  <div className="text-red-400">
                    {stats.pendingReports} pending reports
                  </div>
                )}
                {stats.pendingPayouts > 0 && (
                  <div className="text-yellow-400">
                    ₱{stats.pendingPayouts?.toLocaleString()} pending payouts
                  </div>
                )}
                <div className="text-green-400">
                  {stats.activeUsers} active users
                </div>
              </div>

              {/* Admin Badge */}
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-red-400" />
                <span className="text-sm font-medium text-red-400">ADMIN</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
            <Route 
              path="/dashboard" 
              element={
                <AdminOverview 
                  data={dashboardData} 
                  onRefresh={loadDashboardData}
                />
              } 
            />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/listings" element={<ListingManagement />} />
            <Route path="/payouts" element={<PayoutManagement />} />
            <Route path="/earnings" element={<AdminEarnings />} />
            <Route path="/bookings" element={<BookingManagement />} />
            <Route path="/reports" element={<ReportManagement />} />
            <Route path="/feedback" element={<PlatformFeedback />} />
            <Route path="/settings" element={<AdminSettings />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;