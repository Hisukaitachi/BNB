// src/services/authService.js
import api from './api';
import { STORAGE_KEYS } from '../utils/constants';

class AuthService {
  constructor() {
    this.token = null;
    this.user = null;
    this.refreshTokenTimeout = null;
  }

  /**
   * Initialize authentication service
   */
  async initialize() {
    try {
      const token = this.getStoredToken();
      if (token) {
        this.token = token;
        await this.validateToken();
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      this.clearAuthData();
    }
  }

  /**
   * Login user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<object>} Login result
   */
  async login(email, password) {
    try {
      const response = await api.login(email, password);
      
      if (response.status === 'success') {
        const { token, user } = response.data;
        this.setAuthData(token, user);
        return { success: true, user };
      }
      
      return { success: false, message: response.message };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Register new user
   * @param {string} name - User name
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<object>} Registration result
   */
  async register(name, email, password) {
    try {
      const response = await api.register(name, email, password);
      return response;
    } catch (error) {
      console.error('Registration failed:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Login with Google
   * @param {string} credential - Google credential token
   * @returns {Promise<object>} Google login result
   */
  async loginWithGoogle(credential) {
    try {
      const response = await api.googleAuth(credential);
      
      if (response.status === 'success') {
        const { token, user } = response.data;
        this.setAuthData(token, user);
        return { success: true, user };
      }
      
      return { success: false, message: response.message };
    } catch (error) {
      console.error('Google login failed:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Logout user
   * @returns {Promise<void>}
   */
  async logout() {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuthData();
    }
  }

  /**
   * Get current user profile
   * @returns {Promise<object>} User profile
   */
  async getCurrentUser() {
    try {
      if (!this.token) {
        throw new Error('No authentication token');
      }

      const response = await api.getUserProfile();
      
      if (response.status === 'success') {
        this.user = response.data.user;
        this.updateStoredUser(this.user);
        return { success: true, data: this.user };
      }
      
      return { success: false, message: response.message };
    } catch (error) {
      console.error('Failed to get current user:', error);
      this.clearAuthData();
      return { success: false, message: error.message };
    }
  }

  /**
   * Update user profile
   * @param {object} userData - User data to update
   * @returns {Promise<object>} Update result
   */
  async updateProfile(userData) {
    try {
      const response = await api.updateProfile(userData);
      
      if (response.status === 'success') {
        // Update local user data
        this.user = { ...this.user, ...userData };
        this.updateStoredUser(this.user);
        return { success: true, data: this.user };
      }
      
      return { success: false, message: response.message };
    } catch (error) {
      console.error('Profile update failed:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Change user password
   * @param {string} oldPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<object>} Change password result
   */
  async changePassword(oldPassword, newPassword) {
    try {
      const response = await api.changePassword(oldPassword, newPassword);
      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      console.error('Password change failed:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise<object>} Reset request result
   */
  async requestPasswordReset(email) {
    try {
      const response = await api.post('/users/forgot-password', { email });
      return { success: true, message: response.message };
    } catch (error) {
      console.error('Password reset request failed:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Reset password with token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<object>} Reset result
   */
  async resetPassword(token, newPassword) {
    try {
      const response = await api.post('/users/reset-password', { 
        token, 
        newPassword 
      });
      return { success: true, message: response.message };
    } catch (error) {
      console.error('Password reset failed:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Verify email with code
   * @param {string} email - User email
   * @param {string} code - Verification code
   * @returns {Promise<object>} Verification result
   */
  async verifyEmail(email, code) {
    try {
      const response = await api.post('/users/verify-email', { email, code });
      return { success: true, message: response.message };
    } catch (error) {
      console.error('Email verification failed:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Validate current token
   * @returns {Promise<boolean>} Whether token is valid
   */
  async validateToken() {
    try {
      const response = await this.getCurrentUser();
      return response.success;
    } catch (error) {
      console.error('Token validation failed:', error);
      this.clearAuthData();
      return false;
    }
  }

  /**
   * Set authentication data
   * @param {string} token - JWT token
   * @param {object} user - User object
   */
  setAuthData(token, user) {
    this.token = token;
    this.user = user;
    
    // Store in localStorage
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

    // Set up token refresh
    this.scheduleTokenRefresh();
  }

  /**
   * Clear authentication data
   */
  clearAuthData() {
    this.token = null;
    this.user = null;
    
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);

    // Clear refresh timeout
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
      this.refreshTokenTimeout = null;
    }
  }

  /**
   * Get stored token from localStorage
   * @returns {string|null} Stored token
   */
  getStoredToken() {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  }

  /**
   * Get stored user from localStorage
   * @returns {object|null} Stored user
   */
  getStoredUser() {
    try {
      const userJson = localStorage.getItem(STORAGE_KEYS.USER);
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Failed to parse stored user:', error);
      return null;
    }
  }

  /**
   * Update stored user data
   * @param {object} user - User object
   */
  updateStoredUser(user) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} Whether user is authenticated
   */
  isAuthenticated() {
    return !!(this.token && this.user);
  }

  /**
   * Get current user
   * @returns {object|null} Current user object
   */
  getUser() {
    return this.user || this.getStoredUser();
  }

  /**
   * Get current token
   * @returns {string|null} Current token
   */
  getToken() {
    return this.token || this.getStoredToken();
  }

  /**
   * Check if user has specific role
   * @param {string} role - Role to check
   * @returns {boolean} Whether user has role
   */
  hasRole(role) {
    const user = this.getUser();
    return user?.role === role;
  }

  /**
   * Check if user has any of the specified roles
   * @param {Array<string>} roles - Roles to check
   * @returns {boolean} Whether user has any of the roles
   */
  hasAnyRole(roles) {
    const user = this.getUser();
    return roles.includes(user?.role);
  }

  /**
   * Schedule token refresh
   */
  scheduleTokenRefresh() {
    // Refresh token 5 minutes before expiry
    const refreshTime = 55 * 60 * 1000; // 55 minutes
    
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
    }

    this.refreshTokenTimeout = setTimeout(async () => {
      try {
        await this.validateToken();
      } catch (error) {
        console.error('Token refresh failed:', error);
        this.clearAuthData();
      }
    }, refreshTime);
  }

  /**
   * Get user display name
   * @returns {string} User display name
   */
  getUserDisplayName() {
    const user = this.getUser();
    return user?.name || user?.email || 'User';
  }

  /**
   * Get user avatar URL
   * @returns {string} Avatar URL
   */
  getUserAvatar() {
    const user = this.getUser();
    return user?.avatar || user?.profile_picture || 
           `https://ui-avatars.com/api/?name=${encodeURIComponent(this.getUserDisplayName())}&background=6366f1&color=fff`;
  }

  /**
   * Check if user account is verified
   * @returns {boolean} Whether account is verified
   */
  isAccountVerified() {
    const user = this.getUser();
    return user?.is_verified === true || user?.is_verified === 1;
  }

  /**
   * Get user permissions (for future use)
   * @returns {Array} User permissions
   */
  getUserPermissions() {
    const user = this.getUser();
    return user?.permissions || [];
  }
}

// Create and export singleton instance
const authService = new AuthService();
export default authService;