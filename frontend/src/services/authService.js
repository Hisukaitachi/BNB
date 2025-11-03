// src/services/authService.js - COMPLETE FIXED VERSION
import api from './api';

class AuthService {
  // Register user
  async register(userData) {
    try {
      const response = await api.post('/users/register', userData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Resend verification code
  async resendVerificationCode(email) {
    try {
      const response = await api.post('/users/resend-verification', { email });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Verify email
  async verifyEmail(email, code) {
    try {
      const response = await api.post('/users/verify-email', { email, code });
      
      // After verification, store token and user if provided
      if (response.data.data?.token && response.data.data?.user) {
        const { token, user } = response.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      }
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Login user
  async login(credentials) {
    try {
      const response = await api.post('/users/login', credentials);
      const { token, user } = response.data.data;
      
      // Store in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Google OAuth login
  async googleLogin(token) {
    try {
      const response = await api.post('/auth/google', { token });
      const { token: authToken, user } = response.data.data;
      
      localStorage.setItem('token', authToken);
      localStorage.setItem('user', JSON.stringify(user));
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Forgot password
  async forgotPassword(email) {
    try {
      const response = await api.post('/users/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Reset password
  async resetPassword(data) {
    try {
      const response = await api.post('/users/reset-password', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get current user profile
  async getProfile() {
    try {
      const response = await api.get('/users/me');
      
      // Update localStorage with fresh user data
      if (response.data.data?.user) {
        const currentUser = this.getCurrentUser();
        const updatedUser = { ...currentUser, ...response.data.data.user };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Update profile
  async updateProfile(data) {
    try {
      const response = await api.put('/users/me', data);
      
      // Update localStorage with returned user data
      if (response.data.data?.user) {
        const currentUser = this.getCurrentUser();
        const updatedUser = { ...currentUser, ...response.data.data.user };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Upload profile picture
  async uploadProfilePicture(file) {
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);
      
      const response = await api.post('/users/me/profile-picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Update localStorage with new profile picture
      if (response.data.data?.profilePicture) {
        const currentUser = this.getCurrentUser();
        const updatedUser = { 
          ...currentUser, 
          profile_picture: response.data.data.profilePicture 
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Delete profile picture
  async deleteProfilePicture() {
    try {
      const response = await api.delete('/users/me/profile-picture');
      
      // Remove profile picture from localStorage
      const currentUser = this.getCurrentUser();
      const updatedUser = { ...currentUser, profile_picture: null };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Change password
  async changePassword(data) {
    try {
      const response = await api.put('/users/me/change-password', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Switch role
  async switchRole(newRole) {
    try {
      const response = await api.post('/role/switch', { newRole });
      const { token, user } = response.data.data;
      
      // Update stored data
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get role info
  async getRoleInfo() {
    try {
      const response = await api.get('/role/info');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Logout (Keep remember me data)
  logout() {
    // Get remember me values before clearing
    const rememberMe = localStorage.getItem('rememberMe');
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    
    // Clear auth data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Restore remember me data if it existed
    if (rememberMe) {
      localStorage.setItem('rememberMe', rememberMe);
    }
    if (rememberedEmail) {
      localStorage.setItem('rememberedEmail', rememberedEmail);
    }
    
    window.location.href = '/auth/login';
  }

  // Get stored user
  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  // Get stored token
  getToken() {
    return localStorage.getItem('token');
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!localStorage.getItem('token');
  }

  // Check if user has specific role
  hasRole(role) {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  // Check if user is verified
  isVerified() {
    const user = this.getCurrentUser();
    return user?.isVerified === true;
  }

  // Enhanced error handler
  handleError(error) {
    console.error('Auth Service Error:', error); // Debug log
    
    // Network error - no response from server
    if (!error.response) {
      return new Error('Network error. Please check your internet connection.');
    }

    // Get error message from backend
    const backendMessage = error.response?.data?.message;
    
    console.log('Backend message:', backendMessage); // Debug log
    
    // If backend provides a message, use it with improvements
    if (backendMessage) {
      const message = backendMessage.toLowerCase();
      
      // Invalid credentials
      if (message.includes('invalid email or password')) {
        return new Error('❌ Invalid email or password. Please check your credentials and try again.');
      }
      
      // Email not verified
      if (message.includes('verify your email') || message.includes('verification')) {
        return new Error('⚠️ Please verify your email before logging in. Check your inbox for the verification code.');
      }
      
      // Account banned
      if (message.includes('banned')) {
        return new Error('🚫 Your account has been banned. Please contact support for assistance.');
      }
      
      // Account locked
      if (message.includes('locked') || message.includes('failed login')) {
        return new Error('🔒 ' + backendMessage);
      }
      
      // Email already exists
      if (message.includes('email already exists') || message.includes('email address already exists')) {
        return new Error('⚠️ An account with this email already exists. Please login or use a different email.');
      }
      
      // Invalid verification code
      if (message.includes('invalid verification code') || message.includes('invalid reset code')) {
        return new Error('❌ Invalid or expired code. Please request a new one.');
      }
      
      // User not found
      if (message.includes('user not found') || message.includes('no user found')) {
        return new Error('❌ No account found with this email address.');
      }
      
      // Return original backend message with emoji
      return new Error('⚠️ ' + backendMessage);
    }

    // Fallback to HTTP status code errors
    const status = error.response?.status;
    console.log('HTTP Status:', status); // Debug log
    
    switch (status) {
      case 400:
        return new Error('❌ Invalid request. Please check your input and try again.');
      case 401:
        return new Error('❌ Invalid email or password. Please try again.');
      case 403:
        return new Error('🚫 Access denied. Please verify your email or contact support.');
      case 404:
        return new Error('❌ Account not found. Please check your email or register.');
      case 409:
        return new Error('⚠️ Email already exists. Please login or use a different email.');
      case 423:
        return new Error('🔒 Your account is temporarily locked. Please try again later.');
      case 500:
        return new Error('⚠️ Server error. Please try again in a few moments.');
      default:
        return new Error('⚠️ Something went wrong. Please try again.');
    }
  }
}

export default new AuthService();