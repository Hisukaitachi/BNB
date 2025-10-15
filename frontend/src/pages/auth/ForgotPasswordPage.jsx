// src/pages/auth/ForgotPasswordPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import authService from '../../services/authService';

const ForgotPasswordPage = () => {
  const [step, setStep] = useState('email'); // 'email', 'code', 'reset'
  const [formData, setFormData] = useState({
    email: '',
    code: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email) {
      setErrors({ email: 'Email is required' });
      return;
    }
    
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setErrors({ email: 'Please enter a valid email' });
      return;
    }

    setIsLoading(true);
    try {
      await authService.forgotPassword(formData.email);
      setMessage('Reset code sent to your email');
      setStep('code');
    } catch (error) {
      setErrors({ email: error.message || 'Failed to send reset code' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.code || formData.code.length !== 6) {
      setErrors({ code: 'Please enter a valid 6-digit code' });
      return;
    }

    setStep('reset');
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    const newErrors = {};
    
    if (!formData.newPassword) {
      newErrors.newPassword = 'Password is required';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword({
        email: formData.email,
        code: formData.code,
        newPassword: formData.newPassword
      });
      
      navigate('/auth/login', {
        state: { message: 'Password reset successful! Please log in with your new password.' }
      });
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to reset password' });
    } finally {
      setIsLoading(false);
    }
  };

  const renderEmailStep = () => (
    <div className="bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-600">
      <form className="space-y-6" onSubmit={handleEmailSubmit}>
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-white">Reset your password</h3>
          <p className="text-sm text-gray-300 mt-2">
            Enter your email address and we'll send you a reset code
          </p>
        </div>

        <div className="relative">
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            placeholder="Enter your email"
            className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
          />
          <Mail className="absolute left-3 top-9 h-5 w-5 text-gray-400" />
        </div>

        <Button
          type="submit"
          variant="gradient"
          size="lg"
          loading={isLoading}
          className="w-full"
        >
          Send Reset Code
        </Button>
      </form>
    </div>
  );

  const renderCodeStep = () => (
    <div className="bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-600">
      <form className="space-y-6" onSubmit={handleCodeSubmit}>
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-white">Enter verification code</h3>
          <p className="text-sm text-gray-300 mt-2">
            We sent a 6-digit code to <strong className="text-white">{formData.email}</strong>
          </p>
          {message && (
            <div className="mt-3 bg-green-900 border border-green-600 text-green-300 px-4 py-2 rounded-lg text-sm">
              {message}
            </div>
          )}
        </div>

        <div>
          <Input
            label="Verification Code"
            name="code"
            type="text"
            value={formData.code}
            onChange={handleChange}
            error={errors.code}
            placeholder="Enter 6-digit code"
            maxLength={6}
            className="text-center text-2xl tracking-widest bg-gray-700 border-gray-600 text-white placeholder-gray-400"
          />
        </div>

        <Button
          type="submit"
          variant="gradient"
          size="lg"
          loading={isLoading}
          className="w-full"
        >
          Verify Code
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setStep('email')}
            className="text-sm text-purple-400 hover:text-purple-300"
          >
            Use a different email
          </button>
        </div>
      </form>
    </div>
  );

  const renderResetStep = () => (
    <div className="bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-600">
      <form className="space-y-6" onSubmit={handlePasswordReset}>
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-white">Create new password</h3>
          <p className="text-sm text-gray-300 mt-2">
            Enter your new password below
          </p>
        </div>

        {errors.submit && (
          <div className="bg-red-900 border border-red-600 text-red-300 px-4 py-3 rounded-lg text-sm">
            {errors.submit}
          </div>
        )}

        <div className="relative">
          <Input
            label="New Password"
            name="newPassword"
            type={showPassword ? 'text' : 'password'}
            value={formData.newPassword}
            onChange={handleChange}
            error={errors.newPassword}
            placeholder="Enter new password"
            className="pr-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 h-5 w-5 text-gray-400 hover:text-gray-300"
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </button>
        </div>

        <div className="relative">
          <Input
            label="Confirm New Password"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            placeholder="Confirm new password"
            className="pr-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-9 h-5 w-5 text-gray-400 hover:text-gray-300"
          >
            {showConfirmPassword ? <EyeOff /> : <Eye />}
          </button>
        </div>

        <Button
          type="submit"
          variant="gradient"
          size="lg"
          loading={isLoading}
          className="w-full"
        >
          Reset Password
        </Button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-block">
            <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              STAY
            </span>
          </Link>
          <div className="mt-6">
            <Link
              to="/auth/login"
              className="inline-flex items-center text-sm text-gray-300 hover:text-white mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to login
            </Link>
          </div>
        </div>

        {step === 'email' && renderEmailStep()}
        {step === 'code' && renderCodeStep()}
        {step === 'reset' && renderResetStep()}

        <div className="text-center">
          <p className="text-sm text-gray-300">
            Remember your password?{' '}
            <Link
              to="/auth/login"
              className="text-purple-400 hover:text-purple-300 font-medium"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;