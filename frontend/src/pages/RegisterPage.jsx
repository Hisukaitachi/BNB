// src/pages/RegisterPage.jsx - Updated to work with your backend
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import Logo from '../components/common/Logo';
import Button from '../components/common/Button';

const RegisterPage = () => {
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    password: '' 
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // ✅ Get error from AuthContext (matches your backend responses)
  const { register, error, clearError, isAuthenticated } = useAuth();
  const { showToast } = useApp();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Load Google Sign-In API for register page too
  useEffect(() => {
    const loadGoogleAPI = () => {
      if (window.google) return;

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleSignIn;
      document.head.appendChild(script);
    };

    const initializeGoogleSignIn = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          auto_select: false,
        });

        window.google.accounts.id.renderButton(
          document.getElementById('google-signup-button'),
          {
            theme: 'filled_black',
            size: 'large',
            text: 'signup_with',
            width: 350
          }
        );
      }
    };

    loadGoogleAPI();
  }, []);

  const handleGoogleResponse = async (response) => {
    setLoading(true);
    const { loginWithGoogle } = useAuth();
    
    try {
      // ✅ Uses your backend Google OAuth endpoint
      const result = await loginWithGoogle(response.credential);
      if (result.success) {
        showToast('Successfully signed up with Google!', 'success');
        navigate('/');
      } else {
        showToast(result.message, 'error');
      }
    } catch (error) {
      showToast('Google signup failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearError(); // Clear previous errors

    // Basic validation
    if (!formData.name || !formData.email || !formData.password) {
      showToast('Please fill in all fields', 'error');
      setLoading(false);
      return;
    }

    // Validate password strength (matches your backend validation)
    if (formData.password.length < 8) {
      showToast('Password must be at least 8 characters long', 'error');
      setLoading(false);
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(formData.password)) {
      showToast('Password must contain uppercase, lowercase, number and special character', 'error');
      setLoading(false);
      return;
    }

    // ✅ Uses your backend endpoint: POST /api/users/register
    const result = await register(formData.name, formData.email, formData.password);
    
    if (result.success) {
      showToast('Account created! Please check your email for verification.', 'success');
      // Navigate to email verification page with email
      navigate('/verify-email', { state: { email: formData.email } });
    } else {
      showToast(result.message || 'Registration failed', 'error');
    }
    
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) clearError(); // Clear error on input change
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Logo size="large" className="mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white">Join STAY</h2>
          <p className="mt-2 text-gray-400">Create your account to get started</p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* ✅ Display error from AuthContext */}
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your full name"
                  minLength="2"
                  maxLength="100"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-12 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Create a password"
                  minLength="8"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Must be at least 8 characters with uppercase, lowercase, number and special character
              </p>
            </div>
          </div>

          <Button
            type="submit"
            loading={loading}
            className="w-full"
            size="lg"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </Button>

          {/* Google Sign Up */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-900 text-gray-400">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <div id="google-signup-button" className="w-full"></div>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-gray-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-purple-400 hover:text-purple-300 font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;