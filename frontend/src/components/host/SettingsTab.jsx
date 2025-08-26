// src/components/host/SettingsTab.jsx
import React, { useState, useEffect } from 'react';
import { 
  User, Bell, Shield, CreditCard, Globe, 
  Moon, Sun, Volume2, Lock, Eye, Save,
  Smartphone, Mail, MessageSquare, Calendar
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import Button from '../common/Button';
import Modal from '../common/Modal';

const SettingsTab = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const { showToast } = useApp();
  const [activeSection, setActiveSection] = useState('profile');
  const [loading, setLoading] = useState(false);
  
  // Profile settings
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
    location: user?.location || ''
  });
  
  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailBookings: true,
    emailMessages: true,
    emailReviews: true,
    emailPromotions: false,
    pushBookings: true,
    pushMessages: true,
    pushReviews: true,
    smsBookings: false,
    smsMessages: false
  });
  
  // Privacy settings
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'public',
    showPhoneNumber: false,
    showEmail: false,
    allowDirectBooking: true,
    requireProfilePicture: true
  });
  
  // Password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Modals
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  const sections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'preferences', label: 'Preferences', icon: Globe }
  ];

  const handleProfileUpdate = async () => {
    try {
      setLoading(true);
      const result = await updateProfile(profileData);
      if (result.success) {
        showToast('Profile updated successfully', 'success');
      } else {
        showToast(result.message || 'Failed to update profile', 'error');
      }
    } catch (error) {
      showToast('Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    try {
      setLoading(true);
      const result = await changePassword(passwordData.currentPassword, passwordData.newPassword);
      if (result.success) {
        showToast('Password changed successfully', 'success');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordModal(false);
      } else {
        showToast(result.message || 'Failed to change password', 'error');
      }
    } catch (error) {
      showToast('Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderProfileSection = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Profile Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
          <input
            type="text"
            value={profileData.name}
            onChange={(e) => setProfileData({...profileData, name: e.target.value})}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
          <input
            type="email"
            value={profileData.email}
            onChange={(e) => setProfileData({...profileData, email: e.target.value})}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Phone</label>
          <input
            type="tel"
            value={profileData.phone}
            onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">Location</label>
          <input
            type="text"
            value={profileData.location}
            onChange={(e) => setProfileData({...profileData, location: e.target.value})}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Bio</label>
        <textarea
          value={profileData.bio}
          onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
          rows="4"
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
          placeholder="Tell guests about yourself..."
        />
      </div>
      
      <div className="flex space-x-3">
        <Button onClick={handleProfileUpdate} loading={loading} icon={<Save className="w-4 h-4" />}>
          Save Changes
        </Button>
        <Button 
          variant="outline" 
          onClick={() => setShowPasswordModal(true)}
          icon={<Lock className="w-4 h-4" />}
        >
          Change Password
        </Button>
      </div>
    </div>
  );

  const renderNotificationsSection = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Notification Preferences</h3>
      
      <div className="space-y-6">
        <div>
          <h4 className="font-medium mb-3 flex items-center">
            <Mail className="w-4 h-4 mr-2" />
            Email Notifications
          </h4>
          <div className="space-y-3">
            {[
              { key: 'emailBookings', label: 'New bookings and booking updates' },
              { key: 'emailMessages', label: 'New messages from guests' },
              { key: 'emailReviews', label: 'New reviews and ratings' },
              { key: 'emailPromotions', label: 'Promotional offers and tips' }
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <span className="text-sm">{item.label}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings[item.key]}
                    onChange={(e) => setNotificationSettings({
                      ...notificationSettings,
                      [item.key]: e.target.checked
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h4 className="font-medium mb-3 flex items-center">
            <Smartphone className="w-4 h-4 mr-2" />
            Push Notifications
          </h4>
          <div className="space-y-3">
            {[
              { key: 'pushBookings', label: 'Booking notifications' },
              { key: 'pushMessages', label: 'New messages' },
              { key: 'pushReviews', label: 'Review notifications' }
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <span className="text-sm">{item.label}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings[item.key]}
                    onChange={(e) => setNotificationSettings({
                      ...notificationSettings,
                      [item.key]: e.target.checked
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h4 className="font-medium mb-3 flex items-center">
            <MessageSquare className="w-4 h-4 mr-2" />
            SMS Notifications
          </h4>
          <div className="space-y-3">
            {[
              { key: 'smsBookings', label: 'Urgent booking notifications' },
              { key: 'smsMessages', label: 'Important messages' }
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <span className="text-sm">{item.label}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings[item.key]}
                    onChange={(e) => setNotificationSettings({
                      ...notificationSettings,
                      [item.key]: e.target.checked
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <Button icon={<Save className="w-4 h-4" />}>
        Save Notification Settings
      </Button>
    </div>
  );

  const renderPrivacySection = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Privacy & Security</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Profile Visibility</h4>
            <p className="text-sm text-gray-400">Control who can see your profile</p>
          </div>
          <select 
            value={privacySettings.profileVisibility}
            onChange={(e) => setPrivacySettings({...privacySettings, profileVisibility: e.target.value})}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
          >
            <option value="public">Public</option>
            <option value="guests-only">Guests Only</option>
            <option value="private">Private</option>
          </select>
        </div>
        
        {[
          { key: 'showPhoneNumber', label: 'Show phone number to guests', desc: 'Allow guests to see your phone number' },
          { key: 'showEmail', label: 'Show email to guests', desc: 'Allow guests to see your email address' },
          { key: 'allowDirectBooking', label: 'Allow instant booking', desc: 'Let guests book without approval' },
          { key: 'requireProfilePicture', label: 'Require guest profile pictures', desc: 'Only accept bookings from guests with photos' }
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">{item.label}</h4>
              <p className="text-sm text-gray-400">{item.desc}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={privacySettings[item.key]}
                onChange={(e) => setPrivacySettings({
                  ...privacySettings,
                  [item.key]: e.target.checked
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
            </label>
          </div>
        ))}
      </div>
      
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <h4 className="font-medium text-red-400 mb-2">Danger Zone</h4>
        <p className="text-sm text-gray-300 mb-3">Once you deactivate your account, you will lose access to all your listings and data.</p>
        <Button 
          variant="danger" 
          size="sm"
          onClick={() => setShowDeactivateModal(true)}
        >
          Deactivate Account
        </Button>
      </div>
      
      <Button icon={<Save className="w-4 h-4" />}>
        Save Privacy Settings
      </Button>
    </div>
  );

  const renderPaymentsSection = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Payment Settings</h3>
      
      <div className="bg-gray-700 rounded-lg p-6">
        <h4 className="font-medium mb-4">Payout Methods</h4>
        <div className="space-y-4">
          <div className="border border-gray-600 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CreditCard className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="font-medium">Bank Account</p>
                  <p className="text-sm text-gray-400">•••• •••• •••• 1234</p>
                </div>
              </div>
              <Button size="sm" variant="outline">Edit</Button>
            </div>
          </div>
          
          <Button variant="outline" icon={<CreditCard className="w-4 h-4" />}>
            Add Payment Method
          </Button>
        </div>
      </div>
      
      <div className="bg-gray-700 rounded-lg p-6">
        <h4 className="font-medium mb-4">Payout Schedule</h4>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-400">Frequency:</span>
            <span>Weekly (Every Monday)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Processing Time:</span>
            <span>3-5 business days</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Next Payout:</span>
            <span>December 25, 2024</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPreferencesSection = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Preferences</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Language</h4>
            <p className="text-sm text-gray-400">Choose your preferred language</p>
          </div>
          <select className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500">
            <option>English</option>
            <option>Filipino</option>
            <option>Español</option>
          </select>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Currency</h4>
            <p className="text-sm text-gray-400">Display prices in your preferred currency</p>
          </div>
          <select className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500">
            <option>PHP - Philippine Peso</option>
            <option>USD - US Dollar</option>
            <option>EUR - Euro</option>
          </select>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">Timezone</h4>
            <p className="text-sm text-gray-400">Set your local timezone</p>
          </div>
          <select className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500">
            <option>Asia/Manila</option>
            <option>Asia/Tokyo</option>
            <option>UTC</option>
          </select>
        </div>
      </div>
      
      <Button icon={<Save className="w-4 h-4" />}>
        Save Preferences
      </Button>
    </div>
  );

  return (
    <div className="flex space-x-6">
      {/* Settings Navigation */}
      <div className="w-64 flex-shrink-0">
        <div className="bg-gray-800 rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-4">Settings</h2>
          <nav className="space-y-2">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition ${
                    activeSection === section.id
                      ? 'bg-purple-500 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{section.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1">
        <div className="bg-gray-800 rounded-xl p-6">
          {activeSection === 'profile' && renderProfileSection()}
          {activeSection === 'notifications' && renderNotificationsSection()}
          {activeSection === 'privacy' && renderPrivacySection()}
          {activeSection === 'payments' && renderPaymentsSection()}
          {activeSection === 'preferences' && renderPreferencesSection()}
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Change Password"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Current Password</label>
            <input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">New Password</label>
            <input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Confirm New Password</label>
            <input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          
          <div className="flex space-x-3 justify-end">
            <Button variant="outline" onClick={() => setShowPasswordModal(false)}>
              Cancel
            </Button>
            <Button onClick={handlePasswordChange} loading={loading}>
              Change Password
            </Button>
          </div>
        </div>
      </Modal>

      {/* Deactivate Account Modal */}
      <Modal
        isOpen={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        title="Deactivate Account"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            Are you sure you want to deactivate your account? This action will:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
            <li>Hide all your listings from search results</li>
            <li>Cancel all pending bookings</li>
            <li>Remove access to your host dashboard</li>
            <li>Disable your ability to receive new bookings</li>
          </ul>
          <p className="text-gray-300">You can reactivate your account at any time.</p>
          
          <div className="flex space-x-3 justify-end">
            <Button variant="outline" onClick={() => setShowDeactivateModal(false)}>
              Cancel
            </Button>
            <Button variant="danger">
              Deactivate Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SettingsTab;