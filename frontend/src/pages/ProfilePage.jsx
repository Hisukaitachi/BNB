// src/pages/ProfilePage.jsx
import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Edit3, Save, X, Camera, Shield, Award, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import Loading from '../components/common/Loading';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  const { showToast } = useApp();
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalReviews: 0,
    averageRating: 0,
    memberSince: user?.created_at || new Date().toISOString()
  });

  useEffect(() => {
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    try {
      // Get user bookings
      const bookingsResponse = await api.getMyBookings();
      const reviewsResponse = await api.getMyReviews();
      
      setStats(prev => ({
        ...prev,
        totalBookings: bookingsResponse.data?.bookings?.length || 0,
        totalReviews: reviewsResponse.data?.received?.length || 0,
        averageRating: calculateAverageRating(reviewsResponse.data?.received || [])
      }));
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  };

  const calculateAverageRating = (reviews) => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.updateProfile(profileData);
      if (response.status === 'success') {
        updateUser(profileData);
        setEditMode(false);
        showToast('Profile updated successfully!', 'success');
      }
    } catch (error) {
      showToast(error.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      showToast('Password must be at least 8 characters long', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.changePassword(passwordData.oldPassword, passwordData.newPassword);
      showToast('Password changed successfully!', 'success');
      setShowPasswordModal(false);
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      showToast(error.message || 'Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  };

  const getRoleBadge = (role) => {
    const badges = {
      client: { color: 'bg-blue-500', label: 'Traveler' },
      host: { color: 'bg-green-500', label: 'Host' },
      admin: { color: 'bg-purple-500', label: 'Admin' }
    };
    
    const badge = badges[role] || badges.client;
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen pt-20">
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Profile</h1>
          <p className="text-gray-400">Manage your account settings and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Basic Information</h2>
                {!editMode ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditMode(true)}
                    icon={<Edit3 className="w-4 h-4" />}
                  >
                    Edit
                  </Button>
                ) : (
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditMode(false);
                        setProfileData({ name: user.name, email: user.email });
                      }}
                      icon={<X className="w-4 h-4" />}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleProfileUpdate}
                      loading={loading}
                      icon={<Save className="w-4 h-4" />}
                    >
                      Save
                    </Button>
                  </div>
                )}
              </div>

              {/* Profile Picture */}
              <div className="flex items-center space-x-6 mb-6">
                <div className="relative">
                  <img
                    src={user?.profile_picture || `https://ui-avatars.com/api/?name=${user?.name}&background=6366f1&color=fff&size=120`}
                    alt={user?.name}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                  <button className="absolute bottom-0 right-0 p-2 bg-purple-500 rounded-full hover:bg-purple-600 transition">
                    <Camera className="w-4 h-4 text-white" />
                  </button>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{user?.name}</h3>
                  <p className="text-gray-400">{user?.email}</p>
                  <div className="mt-2">{getRoleBadge(user?.role)}</div>
                </div>
              </div>

              {editMode ? (
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <Input
                    label="Full Name"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    icon={<User className="w-4 h-4" />}
                    required
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    icon={<Mail className="w-4 h-4" />}
                    required
                  />
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
                    <p className="text-white">{user?.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
                    <p className="text-white">{user?.email}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Security */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-6">Security</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Lock className="w-5 h-5 text-purple-400" />
                    <div>
                      <h3 className="font-medium">Password</h3>
                      <p className="text-sm text-gray-400">Last changed 3 months ago</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPasswordModal(true)}
                  >
                    Change
                  </Button>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Shield className="w-5 h-5 text-green-400" />
                    <div>
                      <h3 className="font-medium">Two-Factor Authentication</h3>
                      <p className="text-sm text-gray-400">Not enabled</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Enable
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Stats */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Account Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    <span className="text-sm">Member since</span>
                  </div>
                  <span className="text-sm font-medium">{formatDate(stats.memberSince)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-blue-400" />
                    <span className="text-sm">Total bookings</span>
                  </div>
                  <span className="text-sm font-medium">{stats.totalBookings}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Award className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm">Reviews received</span>
                  </div>
                  <span className="text-sm font-medium">{stats.totalReviews}</span>
                </div>
                
                {stats.averageRating > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Award className="w-4 h-4 text-green-400" />
                      <span className="text-sm">Average rating</span>
                    </div>
                    <span className="text-sm font-medium">{stats.averageRating}★</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  View My Bookings
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  My Reviews
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Favorites
                </Button>
                {user?.role === 'host' && (
                  <Button variant="outline" className="w-full justify-start">
                    Host Dashboard
                  </Button>
                )}
              </div>
            </div>

            {/* Account Actions */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Account</h3>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  Download My Data
                </Button>
                <Button variant="danger" className="w-full justify-start">
                  Delete Account
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Password Change Modal */}
        <Modal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          title="Change Password"
        >
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={passwordData.oldPassword}
              onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
              required
            />
            <Input
              label="New Password"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              required
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              required
            />
            
            <div className="text-sm text-gray-400 bg-gray-700 p-3 rounded-lg">
              <strong>Password requirements:</strong>
              <ul className="mt-1 space-y-1">
                <li>• At least 8 characters long</li>
                <li>• Contains uppercase and lowercase letters</li>
                <li>• Contains at least one number</li>
                <li>• Contains at least one special character</li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowPasswordModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                loading={loading}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
};

export default ProfilePage;