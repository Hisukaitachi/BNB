// src/pages/AdminDashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { 
  Users, Building2, Calendar, BarChart3, Shield, Settings,
  DollarSign, AlertTriangle, TrendingUp, Activity, Eye, Ban
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import Button from '../components/common/Button';
import Loading from '../components/common/Loading';
import Modal from '../components/common/Modal';

const AdminSidebar = ({ activeTab, setActiveTab }) => {
  const navigate = useNavigate();
  
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3, path: '/admin' },
    { id: 'users', label: 'Users', icon: Users, path: '/admin/users' },
    { id: 'listings', label: 'Listings', icon: Building2, path: '/admin/listings' },
    { id: 'bookings', label: 'Bookings', icon: Calendar, path: '/admin/bookings' },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp, path: '/admin/analytics' },
    { id: 'reports', label: 'Reports', icon: Activity, path: '/admin/reports' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/admin/settings' },
  ];

  return (
    <div className="w-64 bg-gray-800 h-full border-r border-gray-700">
      <div className="p-6 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-red-400">Admin Panel</h2>
        <p className="text-sm text-gray-400">System Management</p>
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
                      ? 'bg-red-500 text-white'
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
      </nav>
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
    bannedUsers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await api.getDashboardStats();
      if (response.status === 'success') {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
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
    return <Loading message="Loading dashboard..." fullScreen={false} />;
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Users</p>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
            </div>
            <Users className="w-8 h-8 text-blue-400" />
          </div>
        </div>

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
            <Calendar className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Revenue</p>
              <p className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Users</p>
              <p className="text-2xl font-bold">{stats.activeUsers}</p>
            </div>
            <Activity className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Banned Users</p>
              <p className="text-2xl font-bold text-red-400">{stats.bannedUsers}</p>
            </div>
            <Ban className="w-8 h-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" className="justify-start">
            <Users className="w-4 h-4 mr-2" />
            Manage Users
          </Button>
          <Button variant="outline" className="justify-start">
            <Building2 className="w-4 h-4 mr-2" />
            Review Listings
          </Button>
          <Button variant="outline" className="justify-start">
            <Shield className="w-4 h-4 mr-2" />
            Security Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

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
    // Set active tab based on current route
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
    <div className="min-h-screen pt-20">
      <div className="flex h-[calc(100vh-5rem)]">
        <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            <Routes>
              <Route path="/" element={<OverviewTab />} />
              <Route path="/users" element={<UsersTab />} />
              <Route path="/listings" element={<div>Listings Management - Coming Soon</div>} />
              <Route path="/bookings" element={<div>Bookings Management - Coming Soon</div>} />
              <Route path="/analytics" element={<div>Analytics - Coming Soon</div>} />
              <Route path="/reports" element={<div>Reports - Coming Soon</div>} />
              <Route path="/settings" element={<div>Settings - Coming Soon</div>} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;