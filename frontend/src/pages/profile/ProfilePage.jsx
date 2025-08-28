// src/pages/profile/ProfilePage.jsx - FIXED VERSION
import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Edit, Save, X, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Input';

const ProfilePage = () => {
  const { user, updateProfile, switchRole } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    bio: '',
    location: ''
  });
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [errors, setErrors] = useState({});

  // FIX 1: Update profileData whenever user changes (including after role switch)
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        phone: user.phone || '',
        bio: user.bio || '',
        location: user.location || ''
      });
    }
  }, [user]); // This will trigger when user object updates

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateProfile = () => {
    const newErrors = {};
    
    if (!profileData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (profileData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    
    if (profileData.bio && profileData.bio.length > 500) {
      newErrors.bio = 'Bio cannot exceed 500 characters';
    }
    
    return newErrors;
  };

  const validatePassword = () => {
    const newErrors = {};
    
    if (!passwordData.oldPassword) {
      newErrors.oldPassword = 'Current password is required';
    }
    
    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }
    
    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    return newErrors;
  };

  const handleSaveProfile = async () => {
    const formErrors = validateProfile();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setIsLoading(true);
    try {
      await updateProfile(profileData);
      setIsEditing(false);
      setErrors({});
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to update profile' });
    } finally {
      setIsLoading(false);
    }
  };

  // FIX 2: Implement actual password change API call
  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    const formErrors = validatePassword();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token'); // Get auth token
      
      const response = await fetch('http://localhost:5000/api/users/me/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          oldPassword: passwordData.oldPassword,
          newPassword: passwordData.newPassword
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to change password');
      }

      // Success
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
      setErrors({});
      alert('Password changed successfully!');
      
    } catch (error) {
      setErrors({ password: error.message || 'Failed to change password' });
    } finally {
      setIsLoading(false);
    }
  };

  // FIX 3: Refresh profile data after role switch
  const handleRoleSwitch = async () => {
    setIsSwitchingRole(true);
    try {
      const newRole = user.role === 'client' ? 'host' : 'client';
      await switchRole(newRole);
      
      // Force refresh profile data after role switch
      setTimeout(() => {
        window.location.reload(); // Simple way to refresh everything
      }, 1000);
      
    } catch (error) {
      setErrors({ role: error.message || 'Failed to switch role' });
    } finally {
      setIsSwitchingRole(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    // Reset to current user data
    setProfileData({
      name: user.name || '',
      phone: user.phone || '',
      bio: user.bio || '',
      location: user.location || ''
    });
    setErrors({});
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20">
        <div className="container mx-auto px-6 py-8 text-center">
          <h1 className="text-2xl font-bold text-white">Please log in to view your profile</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-20">
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">My Profile</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Info */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">Profile Information</h2>
                  {!isEditing ? (
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                      size="sm"
                      className="border-purple-500 text-purple-400"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex space-x-2">
                      <Button
                        onClick={handleSaveProfile}
                        loading={isLoading}
                        variant="gradient"
                        size="sm"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button
                        onClick={cancelEdit}
                        variant="ghost"
                        size="sm"
                        className="text-gray-300"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>

                {errors.submit && (
                  <div className="mb-4 bg-red-900/20 border border-red-500 text-red-400 rounded-lg p-3 text-sm">
                    {errors.submit}
                  </div>
                )}

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">Full Name</label>
                      {isEditing ? (
                        <Input
                          name="name"
                          value={profileData.name}
                          onChange={handleProfileChange}
                          error={errors.name}
                          className="bg-white/10 border-gray-600 text-white"
                        />
                      ) : (
                        <p className="text-white bg-gray-700 px-4 py-3 rounded-lg">{user.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-2">Email</label>
                      <div className="flex items-center space-x-2">
                        <p className="flex-1 text-white bg-gray-700 px-4 py-3 rounded-lg">{user.email}</p>
                        {user.isVerified ? (
                          <span className="text-green-400 text-sm">✓ Verified</span>
                        ) : (
                          <span className="text-yellow-400 text-sm">⚠ Unverified</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm text-gray-300 mb-2">Phone</label>
                      {isEditing ? (
                        <Input
                          name="phone"
                          type="tel"
                          value={profileData.phone}
                          onChange={handleProfileChange}
                          placeholder="Enter phone number"
                          className="bg-white/10 border-gray-600 text-white"
                        />
                      ) : (
                        <p className="text-white bg-gray-700 px-4 py-3 rounded-lg">
                          {user.phone || 'Not provided'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-2">Location</label>
                      {isEditing ? (
                        <Input
                          name="location"
                          value={profileData.location}
                          onChange={handleProfileChange}
                          placeholder="Enter your location"
                          className="bg-white/10 border-gray-600 text-white"
                        />
                      ) : (
                        <p className="text-white bg-gray-700 px-4 py-3 rounded-lg">
                          {user.location || 'Not provided'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Bio</label>
                    {isEditing ? (
                      <Textarea
                        name="bio"
                        value={profileData.bio}
                        onChange={handleProfileChange}
                        error={errors.bio}
                        placeholder="Tell us about yourself..."
                        rows={4}
                        className="bg-white/10 border-gray-600 text-white"
                      />
                    ) : (
                      <p className="text-white bg-gray-700 px-4 py-3 rounded-lg min-h-24">
                        {user.bio || 'No bio provided'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Password Change Section */}
              <div className="mt-6 bg-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Security</h3>
                  <Button
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-gray-300"
                  >
                    Change Password
                  </Button>
                </div>

                {showPasswordForm && (
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    {errors.password && (
                      <div className="bg-red-900/20 border border-red-500 text-red-400 rounded-lg p-3 text-sm">
                        {errors.password}
                      </div>
                    )}

                    <Input
                      label="Current Password"
                      name="oldPassword"
                      type="password"
                      value={passwordData.oldPassword}
                      onChange={handlePasswordChange}
                      error={errors.oldPassword}
                      className="bg-white/10 border-gray-600 text-white"
                    />

                    <Input
                      label="New Password"
                      name="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      error={errors.newPassword}
                      className="bg-white/10 border-gray-600 text-white"
                    />

                    <Input
                      label="Confirm New Password"
                      name="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      error={errors.confirmPassword}
                      className="bg-white/10 border-gray-600 text-white"
                    />

                    <div className="flex space-x-3">
                      <Button
                        type="submit"
                        loading={isLoading}
                        variant="gradient"
                        size="sm"
                      >
                        Update Password
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          setShowPasswordForm(false);
                          setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                          setErrors({});
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-gray-300"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Profile Stats */}
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Account Info</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="w-20 h-20 bg-gradient-to-r from-purple-400 to-pink-600 rounded-full flex items-center justify-center">
                      <User className="w-10 h-10 text-white" />
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-white font-semibold">{user.name}</p>
                    <p className="text-gray-400 text-sm">{user.email}</p>
                  </div>

                  <div className="bg-gray-700 rounded-lg p-4 text-center">
                    <span className="text-purple-400 font-semibold text-lg capitalize">
                      {user.role}
                    </span>
                    <p className="text-gray-400 text-sm mt-1">Current Role</p>
                  </div>
                </div>
              </div>

              {/* Role Switching */}
              {user.role !== 'admin' && (
                <div className="bg-gray-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Switch Role</h3>
                  
                  {errors.role && (
                    <div className="mb-4 bg-red-900/20 border border-red-500 text-red-400 rounded-lg p-3 text-sm">
                      {errors.role}
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">
                            {user.role === 'client' ? 'Become a Host' : 'Switch to Client'}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {user.role === 'client' 
                              ? 'Start hosting and earning' 
                              : 'Return to booking stays'
                            }
                          </p>
                        </div>
                        <RefreshCw className={`w-5 h-5 text-purple-400 ${isSwitchingRole ? 'animate-spin' : ''}`} />
                      </div>
                    </div>

                    <Button
                      onClick={handleRoleSwitch}
                      loading={isSwitchingRole}
                      variant="gradient"
                      size="lg"
                      className="w-full"
                    >
                      Switch to {user.role === 'client' ? 'Host' : 'Client'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Account Stats */}
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Account Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Member since</span>
                    <span className="text-white">
                      {new Date(user.created_at || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Account Status</span>
                    <span className={`text-sm px-2 py-1 rounded ${
                      user.isVerified ? 'bg-green-900/20 text-green-400' : 'bg-yellow-900/20 text-yellow-400'
                    }`}>
                      {user.isVerified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;