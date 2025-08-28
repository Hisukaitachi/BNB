// src/services/authService.js
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

  // Verify email
  async verifyEmail(email, code) {
    try {
      const response = await api.post('/users/verify-email', { email, code });
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
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Update profile
  async updateProfile(data) {
    try {
      const response = await api.put('/users/me', data);
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

  // Logout
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/auth/login';
  }

  // Get stored user
  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
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

  // Error handler
  handleError(error) {
    if (error.response?.data?.message) {
      return new Error(error.response.data.message);
    }
    return new Error(error.message || 'Something went wrong');
  }
}

export default new AuthService();