// src/context/AuthContext.jsx - Fixed version with clearError
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useApp } from './AppContext';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); // ✅ Add error state
  const { connectSocket, disconnectSocket } = useApp();

  useEffect(() => {
    if (token) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user && token) {
      connectSocket(user.id);
    } else {
      disconnectSocket();
    }
  }, [user, token, connectSocket, disconnectSocket]);

  const fetchUserProfile = async () => {
    try {
      const response = await api.getUserProfile();
      if (response.status === 'success') {
        setUser(response.data.user);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setError(''); // Clear previous errors
      const response = await api.login(email, password);
      if (response.status === 'success') {
        setToken(response.data.token);
        setUser(response.data.user);
        localStorage.setItem('token', response.data.token);
        return { success: true };
      }
      setError(response.message);
      return { success: false, message: response.message };
    } catch (error) {
      const errorMessage = error.message || 'Login failed';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const register = async (name, email, password) => {
    try {
      setError(''); // Clear previous errors
      const response = await api.register(name, email, password);
      if (response.status === 'success') {
        return { success: true, message: 'Registration successful! Please check your email for verification.' };
      }
      setError(response.message);
      return { success: false, message: response.message };
    } catch (error) {
      const errorMessage = error.message || 'Registration failed';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const loginWithGoogle = async (googleToken) => {
    try {
      setError(''); // Clear previous errors
      const response = await api.googleAuth(googleToken);
      if (response.status === 'success') {
        setToken(response.data.token);
        setUser(response.data.user);
        localStorage.setItem('token', response.data.token);
        return { success: true };
      }
      setError(response.message);
      return { success: false, message: response.message };
    } catch (error) {
      const errorMessage = error.message || 'Google login failed';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setError(''); // Clear errors on logout
    localStorage.removeItem('token');
    disconnectSocket();
  };

  const updateProfile = async (profileData) => {
    try {
      setError('');
      const response = await api.updateProfile(profileData);
      if (response.status === 'success') {
        setUser(prev => ({ ...prev, ...response.data.updatedFields }));
        return { success: true };
      }
      setError(response.message);
      return { success: false, message: response.message };
    } catch (error) {
      const errorMessage = error.message || 'Profile update failed';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  const changePassword = async (oldPassword, newPassword) => {
    try {
      setError('');
      const response = await api.changePassword(oldPassword, newPassword);
      if (response.status === 'success') {
        return { success: true };
      }
      setError(response.message);
      return { success: false, message: response.message };
    } catch (error) {
      const errorMessage = error.message || 'Password change failed';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  // ✅ Add missing clearError function
  const clearError = () => {
    setError('');
  };

  const value = {
    user,
    token,
    login,
    register,
    loginWithGoogle,
    logout,
    updateProfile,
    updateUser,
    changePassword,
    clearError, // ✅ Export clearError function
    loading,
    error, // ✅ Export error state
    isAuthenticated: !!user,
    isHost: user?.role === 'host' || user?.role === 'admin',
    isAdmin: user?.role === 'admin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};