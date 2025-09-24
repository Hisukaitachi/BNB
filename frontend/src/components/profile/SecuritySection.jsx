// src/pages/profile/components/SecuritySection.jsx
import { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';

const SecuritySection = () => {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});

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

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    const formErrors = validatePassword();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      
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

  const handleCancelPasswordForm = () => {
    setShowPasswordForm(false);
    setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    setErrors({});
  };

  return (
    <div className="bg-gray-800 rounded-xl p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-4 sm:space-y-0">
        <h3 className="text-lg font-semibold text-white">Security</h3>
        <Button
          onClick={() => setShowPasswordForm(!showPasswordForm)}
          variant="outline"
          size="sm"
          className="border-gray-600 text-gray-300 w-full sm:w-auto"
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

          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <Button
              type="submit"
              loading={isLoading}
              variant="gradient"
              size="sm"
              className="w-full sm:w-auto"
            >
              Update Password
            </Button>
            <Button
              type="button"
              onClick={handleCancelPasswordForm}
              variant="ghost"
              size="sm"
              className="text-gray-300 w-full sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default SecuritySection;