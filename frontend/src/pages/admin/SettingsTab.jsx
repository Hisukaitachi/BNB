// src/pages/admin/SettingsTab.jsx
import React, { useState, useEffect } from 'react';
import { 
  Settings, Shield, Mail, CreditCard, Globe, Bell, Database, Key, Save, RefreshCw,
  AlertTriangle, CheckCircle, Eye, EyeOff, Info, Lock, Unlock
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import Modal from '../../components/common/Modal';

const SettingsTab = () => {
  const [settings, setSettings] = useState({
    general: {
      siteName: 'Airbnb Clone',
      siteDescription: 'Your home away from home',
      contactEmail: 'admin@example.com',
      supportPhone: '+63-XXX-XXX-XXXX',
      timezone: 'Asia/Manila',
      currency: 'PHP',
      language: 'en',
      maintenanceMode: false,
      enableRegistration: true,
      enableGuestBooking: true
    },
    booking: {
      bookingConfirmationRequired: true,
      autoApproveBookings: false,
      maxAdvanceBookingDays: 365,
      minAdvanceBookingHours: 24,
      cancellationWindow: 24,
      serviceFeePercentage: 10,
      taxPercentage: 12,
      allowInstantBooking: true,
      requireGuestVerification: false
    },
    payment: {
      stripePublicKey: '',
      stripeSecretKey: '',
      paypalClientId: '',
      paypalSecretKey: '',
      paymentProcessingFee: 2.5,
      hostPayoutSchedule: 'weekly',
      minimumPayout: 1000,
      enableStripe: true,
      enablePaypal: true,
      hostCommissionRate: 15
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      marketingEmails: true,
      bookingReminders: true,
      reviewReminders: true,
      welcomeEmails: true,
      payoutNotifications: true
    },
    security: {
      requireEmailVerification: true,
      requirePhoneVerification: false,
      twoFactorAuth: false,
      passwordMinLength: 8,
      maxLoginAttempts: 5,
      sessionTimeout: 1440,
      enableCaptcha: true,
      allowPasswordReset: true
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('general');
  const [showPasswords, setShowPasswords] = useState({
    stripeSecret: false,
    paypalSecret: false
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetSection, setResetSection] = useState('');
  const { showToast } = useApp();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/settings');
      if (response.status === 'success') {
        setSettings(response.data.settings || settings);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      showToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const response = await api.put('/admin/settings', settings);
      if (response.status === 'success') {
        showToast('Settings saved successfully', 'success');
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Save settings error:', error);
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const resetSectionToDefaults = () => {
    const section = resetSection;
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...defaultSettings[section]
      }
    }));
    setHasUnsavedChanges(true);
    setShowResetModal(false);
    showToast(`${section} settings reset to defaults`, 'info');
  };

  const defaultSettings = {
    general: {
      siteName: 'Airbnb Clone',
      siteDescription: 'Your home away from home',
      contactEmail: 'admin@example.com',
      supportPhone: '+63-XXX-XXX-XXXX',
      timezone: 'Asia/Manila',
      currency: 'PHP',
      language: 'en',
      maintenanceMode: false,
      enableRegistration: true,
      enableGuestBooking: true
    },
    booking: {
      bookingConfirmationRequired: true,
      autoApproveBookings: false,
      maxAdvanceBookingDays: 365,
      minAdvanceBookingHours: 24,
      cancellationWindow: 24,
      serviceFeePercentage: 10,
      taxPercentage: 12,
      allowInstantBooking: true,
      requireGuestVerification: false
    },
    payment: {
      stripePublicKey: '',
      stripeSecretKey: '',
      paypalClientId: '',
      paypalSecretKey: '',
      paymentProcessingFee: 2.5,
      hostPayoutSchedule: 'weekly',
      minimumPayout: 1000,
      enableStripe: true,
      enablePaypal: true,
      hostCommissionRate: 15
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      marketingEmails: true,
      bookingReminders: true,
      reviewReminders: true,
      welcomeEmails: true,
      payoutNotifications: true
    },
    security: {
      requireEmailVerification: true,
      requirePhoneVerification: false,
      twoFactorAuth: false,
      passwordMinLength: 8,
      maxLoginAttempts: 5,
      sessionTimeout: 1440,
      enableCaptcha: true,
      allowPasswordReset: true
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const sections = [
    { id: 'general', name: 'General', icon: Settings, color: 'text-blue-400' },
    { id: 'booking', name: 'Booking', icon: Globe, color: 'text-green-400' },
    { id: 'payment', name: 'Payment', icon: CreditCard, color: 'text-yellow-400' },
    { id: 'notifications', name: 'Notifications', icon: Bell, color: 'text-purple-400' },
    { id: 'security', name: 'Security', icon: Shield, color: 'text-red-400' }
  ];

  if (loading) {
    return <Loading message="Loading settings..." fullScreen={false} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Settings</h2>
          <p className="text-gray-400">Configure platform settings and preferences</p>
        </div>
        <div className="flex space-x-3">
          {hasUnsavedChanges && (
            <div className="flex items-center text-yellow-400 text-sm">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Unsaved changes
            </div>
          )}
          <Button variant="outline" onClick={fetchSettings} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-2">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                    activeSection === section.id
                      ? 'bg-red-500 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${activeSection === section.id ? 'text-white' : section.color}`} />
                  <span>{section.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <div className="bg-gray-800 rounded-xl p-6">
            {/* General Settings */}
            {activeSection === 'general' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold flex items-center">
                    <Settings className="w-6 h-6 mr-2 text-blue-400" />
                    General Settings
                  </h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setResetSection('general');
                      setShowResetModal(true);
                    }}
                  >
                    Reset to Defaults
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Site Name</label>
                    <input
                      type="text"
                      value={settings.general.siteName}
                      onChange={(e) => updateSetting('general', 'siteName', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Contact Email</label>
                    <input
                      type="email"
                      value={settings.general.contactEmail}
                      onChange={(e) => updateSetting('general', 'contactEmail', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Support Phone</label>
                    <input
                      type="tel"
                      value={settings.general.supportPhone}
                      onChange={(e) => updateSetting('general', 'supportPhone', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Timezone</label>
                    <select
                      value={settings.general.timezone}
                      onChange={(e) => updateSetting('general', 'timezone', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="Asia/Manila">Asia/Manila</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">America/New_York</option>
                      <option value="Europe/London">Europe/London</option>
                      <option value="Asia/Tokyo">Asia/Tokyo</option>
                      <option value="Australia/Sydney">Australia/Sydney</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Currency</label>
                    <select
                      value={settings.general.currency}
                      onChange={(e) => updateSetting('general', 'currency', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="PHP">PHP - Philippine Peso</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                      <option value="JPY">JPY - Japanese Yen</option>
                      <option value="AUD">AUD - Australian Dollar</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Language</label>
                    <select
                      value={settings.general.language}
                      onChange={(e) => updateSetting('general', 'language', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="en">English</option>
                      <option value="fil">Filipino</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="ja">Japanese</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Site Description</label>
                  <textarea
                    value={settings.general.siteDescription}
                    onChange={(e) => updateSetting('general', 'siteDescription', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="A brief description of your platform..."
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-300">Maintenance Mode</label>
                      <p className="text-xs text-gray-400">Temporarily disable the platform for maintenance</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.general.maintenanceMode}
                      onChange={(e) => updateSetting('general', 'maintenanceMode', e.target.checked)}
                      className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-300">Enable Registration</label>
                      <p className="text-xs text-gray-400">Allow new users to register accounts</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.general.enableRegistration}
                      onChange={(e) => updateSetting('general', 'enableRegistration', e.target.checked)}
                      className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-300">Enable Guest Booking</label>
                      <p className="text-xs text-gray-400">Allow users to book without creating an account</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.general.enableGuestBooking}
                      onChange={(e) => updateSetting('general', 'enableGuestBooking', e.target.checked)}
                      className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Booking Settings */}
            {activeSection === 'booking' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold flex items-center">
                    <Globe className="w-6 h-6 mr-2 text-green-400" />
                    Booking Settings
                  </h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setResetSection('booking');
                      setShowResetModal(true);
                    }}
                  >
                    Reset to Defaults
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Max Advance Booking (Days)</label>
                    <input
                      type="number"
                      min="1"
                      max="730"
                      value={settings.booking.maxAdvanceBookingDays}
                      onChange={(e) => updateSetting('booking', 'maxAdvanceBookingDays', parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Min Advance Booking (Hours)</label>
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={settings.booking.minAdvanceBookingHours}
                      onChange={(e) => updateSetting('booking', 'minAdvanceBookingHours', parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Cancellation Window (Hours)</label>
                    <input
                      type="number"
                      min="0"
                      max="168"
                      value={settings.booking.cancellationWindow}
                      onChange={(e) => updateSetting('booking', 'cancellationWindow', parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Service Fee (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="30"
                      value={settings.booking.serviceFeePercentage}
                      onChange={(e) => updateSetting('booking', 'serviceFeePercentage', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tax Percentage (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="50"
                      value={settings.booking.taxPercentage}
                      onChange={(e) => updateSetting('booking', 'taxPercentage', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-300">Require Host Confirmation</label>
                      <p className="text-xs text-gray-400">Bookings need host approval before confirmation</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.booking.bookingConfirmationRequired}
                      onChange={(e) => updateSetting('booking', 'bookingConfirmationRequired', e.target.checked)}
                      className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-300">Auto-approve Bookings</label>
                      <p className="text-xs text-gray-400">Automatically approve all booking requests</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.booking.autoApproveBookings}
                      onChange={(e) => updateSetting('booking', 'autoApproveBookings', e.target.checked)}
                      className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-300">Allow Instant Booking</label>
                      <p className="text-xs text-gray-400">Enable instant booking for qualified guests</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.booking.allowInstantBooking}
                      onChange={(e) => updateSetting('booking', 'allowInstantBooking', e.target.checked)}
                      className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-300">Require Guest Verification</label>
                      <p className="text-xs text-gray-400">Guests must verify identity before booking</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.booking.requireGuestVerification}
                      onChange={(e) => updateSetting('booking', 'requireGuestVerification', e.target.checked)}
                      className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Payment Settings */}
            {activeSection === 'payment' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold flex items-center">
                    <CreditCard className="w-6 h-6 mr-2 text-yellow-400" />
                    Payment Settings
                  </h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setResetSection('payment');
                      setShowResetModal(true);
                    }}
                  >
                    Reset to Defaults
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Stripe Configuration */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-lg font-medium mb-4 flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      Stripe Configuration
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Stripe Public Key</label>
                        <input
                          type="text"
                          value={settings.payment.stripePublicKey}
                          onChange={(e) => updateSetting('payment', 'stripePublicKey', e.target.value)}
                          placeholder="pk_test_..."
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Stripe Secret Key</label>
                        <div className="relative">
                          <input
                            type={showPasswords.stripeSecret ? "text" : "password"}
                            value={settings.payment.stripeSecretKey}
                            onChange={(e) => updateSetting('payment', 'paypalSecretKey', e.target.value)}
                            placeholder="ELvnDRhf..."
                            className="w-full px-3 py-2 pr-10 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility('paypalSecret')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
                          >
                            {showPasswords.paypalSecret ? 
                              <EyeOff className="w-4 h-4" /> : 
                              <Eye className="w-4 h-4" />
                            }
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-300">Enable PayPal</label>
                          <p className="text-xs text-gray-400">Accept payments via PayPal</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.payment.enablePaypal}
                          onChange={(e) => updateSetting('payment', 'enablePaypal', e.target.checked)}
                          className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payout Settings */}
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-lg font-medium mb-4 flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      Payout Settings
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Processing Fee (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="10"
                          value={settings.payment.paymentProcessingFee}
                          onChange={(e) => updateSetting('payment', 'paymentProcessingFee', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Payout Schedule</label>
                        <select
                          value={settings.payment.hostPayoutSchedule}
                          onChange={(e) => updateSetting('payment', 'hostPayoutSchedule', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="manual">Manual</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Payout (PHP)</label>
                        <input
                          type="number"
                          min="100"
                          value={settings.payment.minimumPayout}
                          onChange={(e) => updateSetting('payment', 'minimumPayout', parseInt(e.target.value))}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Host Commission Rate (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="50"
                          value={settings.payment.hostCommissionRate}
                          onChange={(e) => updateSetting('payment', 'hostCommissionRate', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notification Settings */}
            {activeSection === 'notifications' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold flex items-center">
                    <Bell className="w-6 h-6 mr-2 text-purple-400" />
                    Notification Settings
                  </h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setResetSection('notifications');
                      setShowResetModal(true);
                    }}
                  >
                    Reset to Defaults
                  </Button>
                </div>

                <div className="space-y-6">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-lg font-medium mb-4">Communication Channels</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-300">Email Notifications</label>
                          <p className="text-xs text-gray-400">Send notifications via email</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.notifications.emailNotifications}
                          onChange={(e) => updateSetting('notifications', 'emailNotifications', e.target.checked)}
                          className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-300">SMS Notifications</label>
                          <p className="text-xs text-gray-400">Send notifications via SMS</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.notifications.smsNotifications}
                          onChange={(e) => updateSetting('notifications', 'smsNotifications', e.target.checked)}
                          className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-300">Push Notifications</label>
                          <p className="text-xs text-gray-400">Send browser push notifications</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.notifications.pushNotifications}
                          onChange={(e) => updateSetting('notifications', 'pushNotifications', e.target.checked)}
                          className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-lg font-medium mb-4">Notification Types</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-300">Welcome Emails</label>
                          <p className="text-xs text-gray-400">Send welcome emails to new users</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.notifications.welcomeEmails}
                          onChange={(e) => updateSetting('notifications', 'welcomeEmails', e.target.checked)}
                          className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-300">Booking Reminders</label>
                          <p className="text-xs text-gray-400">Remind users about upcoming bookings</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.notifications.bookingReminders}
                          onChange={(e) => updateSetting('notifications', 'bookingReminders', e.target.checked)}
                          className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-300">Review Reminders</label>
                          <p className="text-xs text-gray-400">Remind users to leave reviews</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.notifications.reviewReminders}
                          onChange={(e) => updateSetting('notifications', 'reviewReminders', e.target.checked)}
                          className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-300">Marketing Emails</label>
                          <p className="text-xs text-gray-400">Send promotional and marketing content</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.notifications.marketingEmails}
                          onChange={(e) => updateSetting('notifications', 'marketingEmails', e.target.checked)}
                          className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-300">Payout Notifications</label>
                          <p className="text-xs text-gray-400">Notify hosts about payouts</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.notifications.payoutNotifications}
                          onChange={(e) => updateSetting('notifications', 'payoutNotifications', e.target.checked)}
                          className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeSection === 'security' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold flex items-center">
                    <Shield className="w-6 h-6 mr-2 text-red-400" />
                    Security Settings
                  </h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setResetSection('security');
                      setShowResetModal(true);
                    }}
                  >
                    Reset to Defaults
                  </Button>
                </div>

                <div className="space-y-6">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-lg font-medium mb-4">Authentication</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-300">Require Email Verification</label>
                          <p className="text-xs text-gray-400">Users must verify email before account activation</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.security.requireEmailVerification}
                          onChange={(e) => updateSetting('security', 'requireEmailVerification', e.target.checked)}
                          className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-300">Require Phone Verification</label>
                          <p className="text-xs text-gray-400">Users must verify phone number</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.security.requirePhoneVerification}
                          onChange={(e) => updateSetting('security', 'requirePhoneVerification', e.target.checked)}
                          className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-300">Two-Factor Authentication</label>
                          <p className="text-xs text-gray-400">Require 2FA for admin accounts</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.security.twoFactorAuth}
                          onChange={(e) => updateSetting('security', 'twoFactorAuth', e.target.checked)}
                          className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-300">Enable CAPTCHA</label>
                          <p className="text-xs text-gray-400">Use CAPTCHA for login and registration</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.security.enableCaptcha}
                          onChange={(e) => updateSetting('security', 'enableCaptcha', e.target.checked)}
                          className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-300">Allow Password Reset</label>
                          <p className="text-xs text-gray-400">Enable password reset functionality</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.security.allowPasswordReset}
                          onChange={(e) => updateSetting('security', 'allowPasswordReset', e.target.checked)}
                          className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-lg font-medium mb-4">Password Policy</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Minimum Length</label>
                        <input
                          type="number"
                          min="6"
                          max="32"
                          value={settings.security.passwordMinLength}
                          onChange={(e) => updateSetting('security', 'passwordMinLength', parseInt(e.target.value))}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Max Login Attempts</label>
                        <input
                          type="number"
                          min="3"
                          max="10"
                          value={settings.security.maxLoginAttempts}
                          onChange={(e) => updateSetting('security', 'maxLoginAttempts', parseInt(e.target.value))}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Session Timeout (Minutes)</label>
                        <input
                          type="number"
                          min="30"
                          max="2880"
                          value={settings.security.sessionTimeout}
                          onChange={(e) => updateSetting('security', 'sessionTimeout', parseInt(e.target.value))}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Confirmation */}
      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-400">
            <Info className="w-4 h-4 mr-2" />
            Changes will be applied immediately after saving. Some settings may require system restart.
          </div>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save All Settings
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset Settings"
      >
        <div className="space-y-4">
          <p className="text-gray-400">
            Are you sure you want to reset <strong>{resetSection}</strong> settings to their default values?
          </p>
          <div className="text-sm text-gray-400 bg-gray-700 p-3 rounded-lg">
            <strong>This action will:</strong>
            <ul className="mt-2 space-y-1">
              <li>• Restore all {resetSection} settings to default values</li>
              <li>• Override any custom configurations you've made</li>
              <li>• You'll need to save the settings to apply changes</li>
            </ul>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowResetModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={resetSectionToDefaults}
            >
              Reset to Defaults
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SettingsTab;