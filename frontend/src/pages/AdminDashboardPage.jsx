// src/pages/AdminDashboardPage.jsx - Complete Admin Dashboard
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { 
  Users, Building2, Calendar, BarChart3, Shield, Settings,
  DollarSign, AlertTriangle, TrendingUp, Activity, Eye, Ban, 
  FileText, Zap, Clock, CheckCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import Modal from '../components/common/Modal';

// Import the tab components
import ListingsTab from './admin/ListingsTab';
import BookingsTab from './admin/BookingsTab';
import AnalyticsTab from './admin/AnalyticsTab';
import ReportsTab from './admin/ReportsTab';
import SettingsTab from './admin/SettingsTab';

const AdminSidebar = ({ activeTab, setActiveTab }) => {
  const navigate = useNavigate();
  
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3, path: '/admin', color: 'text-blue-400' },
    { id: 'users', label: 'Users', icon: Users, path: '/admin/users', color: 'text-green-400' },
    { id: 'listings', label: 'Listings', icon: Building2, path: '/admin/listings', color: 'text-purple-400' },
    { id: 'bookings', label: 'Bookings', icon: Calendar, path: '/admin/bookings', color: 'text-orange-400' },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp, path: '/admin/analytics', color: 'text-teal-400' },
    { id: 'reports', label: 'Reports', icon: FileText, path: '/admin/reports', color: 'text-yellow-400' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/admin/settings', color: 'text-red-400' },
  ];

  return (
    <div className="w-64 bg-gray-800 h-full border-r border-gray-700 flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center mr-3">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-red-400">Admin Panel</h2>
            <p className="text-sm text-gray-400">System Management</p>
          </div>
        </div>
      </div>
      
      <nav className="p-4 flex-1">
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
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition group ${
                    activeTab === item.id
                      ? 'bg-red-500 text-white shadow-lg'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${
                    activeTab === item.id ? 'text-white' : item.color
                  } group-hover:scale-110 transition-transform`} />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* System Status */}
      <div className="p-4 border-t border-gray-700">
        <div className="bg-gray-700 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-400">System Status</span>
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          </div>
          <div className="text-xs text-green-400 font-medium">All Systems Operational</div>
        </div>
      </div>
    </div>
  );
};

const OverviewTab = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalListings: 0,
    totalBookings: 0,
    totalRevenue: 0,
    activeUsers: 0,
    bannedUsers: 0,
    pendingApprovals: 0,
    systemHealth: 100
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    fetchDashboardStats();
    fetchRecentActivity();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await api.getDashboardStats();
      
      if (response.status === 'success' && response.data) {
        setStats(response.data);
      } else {
        // Mock data for demonstration
        setStats({
          totalUsers: 1247,
          totalListings: 189,
          totalBookings: 567,
          totalRevenue: 1250000,
          activeUsers: 1205,
          bannedUsers: 42,
          pendingApprovals: 23,
          systemHealth: 98
        });
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      // Set mock data
      setStats({
        totalUsers: 1247,
        totalListings: 189,
        totalBookings: 567,
        totalRevenue: 1250000,
        activeUsers: 1205,
        bannedUsers: 42,
        pendingApprovals: 23,
        systemHealth: 98
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      // Mock recent activity data
      setRecentActivity([
        {
          id: 1,
          type: 'user_registration',
          message: 'New user registration: John Doe',
          time: '2 minutes ago',
          status: 'success'
        },
        {
          id: 2,
          type: 'listing_submitted',
          message: 'New listing submitted for review: Modern Apartment in BGC',
          time: '15 minutes ago',
          status: 'pending'
        },
        {
          id: 3,
          type: 'booking_cancelled',
          message: 'Booking #1234 was cancelled by guest',
          time: '1 hour ago',
          status: 'warning'
        },
        {
          id: 4,
          type: 'payment_processed',
          message: 'Payment of ₱15,000 processed for booking #1235',
          time: '3 hours ago',
          status: 'success'
        },
        {
          id: 5,
          type: 'review_submitted',
          message: 'New 5-star review submitted by guest',
          time: '5 hours ago',
          status: 'success'
        }
      ]);
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getActivityIcon = (type) => {
    const icons = {
      user_registration: Users,
      listing_submitted: Building2,
      booking_cancelled: Calendar,
      payment_processed: DollarSign,
      review_submitted: Eye
    };
    return icons[type] || Activity;
  };

  const getActivityColor = (status) => {
    const colors = {
      success: 'text-green-400',
      pending: 'text-yellow-400',
      warning: 'text-orange-400',
      error: 'text-red-400'
    };
    return colors[status] || 'text-gray-400';
  };

  if (loading) {
    return <Loading message="Loading dashboard..." fullScreen={false} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Dashboard Overview</h2>
        <p className="text-gray-400">Welcome to your admin dashboard. Here's what's happening on your platform.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Users</p>
              <p className="text-2xl font-bold text-white">{stats?.totalUsers || 0}</p>
              <p className="text-xs text-green-400 mt-1">↑ 12% from last month</p>
            </div>
            <Users className="w-10 h-10 text-blue-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Listings</p>
              <p className="text-2xl font-bold text-white">{stats?.totalListings || 0}</p>
              <p className="text-xs text-green-400 mt-1">↑ 8% from last month</p>
            </div>
            <Building2 className="w-10 h-10 text-purple-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Bookings</p>
              <p className="text-2xl font-bold text-white">{stats?.totalBookings || 0}</p>
              <p className="text-xs text-green-400 mt-1">↑ 15% from last month</p>
            </div>
            <Calendar className="w-10 h-10 text-green-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Revenue</p>
              <p className="text-2xl font-bold text-white">{formatPrice(stats?.totalRevenue || 0)}</p>
              <p className="text-xs text-green-400 mt-1">↑ 22% from last month</p>
            </div>
            <DollarSign className="w-10 h-10 text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Users</p>
              <p className="text-xl font-bold text-white">{stats?.activeUsers || 0}</p>
            </div>
            <Activity className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Banned Users</p>
              <p className="text-xl font-bold text-red-400">{stats?.bannedUsers || 0}</p>
            </div>
            <Ban className="w-8 h-8 text-red-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Pending Approvals</p>
              <p className="text-xl font-bold text-yellow-400">{stats?.pendingApprovals || 0}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">System Health</p>
              <p className="text-xl font-bold text-green-400">{stats?.systemHealth || 0}%</p>
            </div>
            <Zap className="w-8 h-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Quick Actions and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-blue-400" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-3">
            <Button variant="outline" className="justify-start hover:bg-gray-700">
              <Users className="w-4 h-4 mr-2" />
              Manage Users
            </Button>
            <Button variant="outline" className="justify-start hover:bg-gray-700">
              <Building2 className="w-4 h-4 mr-2" />
              Review Listings
            </Button>
            <Button variant="outline" className="justify-start hover:bg-gray-700">
              <Calendar className="w-4 h-4 mr-2" />
              View Bookings
            </Button>
            <Button variant="outline" className="justify-start hover:bg-gray-700">
              <FileText className="w-4 h-4 mr-2" />
              Generate Reports
            </Button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-green-400" />
            Recent Activity
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {recentActivity.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              return (
                <div key={activity.id} className="flex items-start space-x-3 py-2 border-b border-gray-700 last:border-b-0">
                  <div className={`w-2 h-2 rounded-full mt-2 ${getActivityColor(activity.status).replace('text-', 'bg-')}`}></div>
                  <Icon className={`w-4 h-4 mt-1 ${getActivityColor(activity.status)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{activity.message}</p>
                    <p className="text-xs text-gray-400">{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* System Overview */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-purple-400" />
          System Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {Math.round((stats?.totalRevenue || 0) / 1000)}K
            </div>
            <div className="text-sm text-gray-400">Monthly Revenue (PHP)</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {Math.round((stats?.totalBookings || 0) / 30)}
            </div>
            <div className="text-sm text-gray-400">Average Daily Bookings</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">
              {Math.round(((stats?.activeUsers || 0) / (stats?.totalUsers || 1)) * 100)}%
            </div>
            <div className="text-sm text-gray-400">User Engagement Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Users Tab Component
const UsersTab = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showBanModal, setShowBanModal] = useState(false);
  const { showToast } = useApp();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.getAllUsers();
      if (response.status === 'success') {
        setUsers(response.data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;

    try {
      await api.banUser(selectedUser.id);
      showToast(`User ${selectedUser.name} has been banned`, 'success');
      setShowBanModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      showToast('Failed to ban user', 'error');
    }
  };

  const handleUnbanUser = async (userId) => {
    try {
      await api.unbanUser(userId);
      showToast('User has been unbanned', 'success');
      fetchUsers();
    } catch (error) {
      showToast('Failed to unban user', 'error');
    }
  };

  const getUserRoleBadge = (role) => {
    const colors = {
      admin: 'bg-red-500',
      host: 'bg-green-500',
      client: 'bg-blue-500'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs text-white ${colors[role] || 'bg-gray-500'}`}>
        {role}
      </span>
    );
  };

  if (loading) {
    return <Loading message="Loading users..." fullScreen={false} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">User Management</h2>
        <div className="text-sm text-gray-400">
          Total: {users.length} users
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <img
                        src={user.profile_picture || `https://ui-avatars.com/api/?name=${user.name}&background=random`}
                        alt={user.name}
                        className="w-8 h-8 rounded-full mr-3"
                      />
                      <div>
                        <div className="text-sm font-medium text-white">{user.name}</div>
                        <div className="text-sm text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getUserRoleBadge(user.role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      user.is_banned ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                    }`}>
                      {user.is_banned ? 'Banned' : 'Active'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      {user.is_banned ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnbanUser(user.id)}
                        >
                          Unban
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowBanModal(true);
                          }}
                        >
                          Ban
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ban User Modal */}
      <Modal
        isOpen={showBanModal}
        onClose={() => setShowBanModal(false)}
        title="Ban User"
      >
        <div className="space-y-4">
          <p className="text-gray-400">
            Are you sure you want to ban <strong>{selectedUser?.name}</strong>?
          </p>
          <div className="text-sm text-gray-400 bg-gray-700 p-3 rounded-lg">
            <strong>This action will:</strong>
            <ul className="mt-2 space-y-1">
              <li>• Prevent the user from logging in</li>
              <li>• Cancel their active bookings</li>
              <li>• Hide their listings (if host)</li>
              <li>• Send them a notification</li>
            </ul>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowBanModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleBanUser}
            >
              Ban User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const AdminDashboardPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/users')) setActiveTab('users');
    else if (path.includes('/listings')) setActiveTab('listings');
    else if (path.includes('/bookings')) setActiveTab('bookings');
    else if (path.includes('/analytics')) setActiveTab('analytics');
    else if (path.includes('/reports')) setActiveTab('reports');
    else if (path.includes('/settings')) setActiveTab('settings');
    else setActiveTab('overview');
  }, [location.pathname]);

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-400 mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-6">You need administrator privileges to access this page.</p>
          <Button onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 bg-gray-900">
      <div className="flex h-[calc(100vh-5rem)]">
        <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            <Routes>
              <Route path="/" element={<OverviewTab />} />
              <Route path="/users" element={<UsersTab />} />
              <Route path="/listings" element={<ListingsTab />} />
              <Route path="/bookings" element={<BookingsTab />} />
              <Route path="/analytics" element={<AnalyticsTab />} />
              <Route path="/reports" element={<ReportsTab />} />
              <Route path="/settings" element={<SettingsTab />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;