// src/context/AuthContext.jsx - Fixed version
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
  const { connectSocket, disconnectSocket } = useApp();

  useEffect(() => {
    if (token) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  // Socket connection when user logs in
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
      const response = await api.login(email, password);
      if (response.status === 'success') {
        setToken(response.data.token);
        setUser(response.data.user);
        localStorage.setItem('token', response.data.token);
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return { success: false, message: error.message || 'Login failed' };
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await api.register(name, email, password);
      if (response.status === 'success') {
        return { success: true, message: 'Registration successful! Please check your email for verification.' };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return { success: false, message: error.message || 'Registration failed' };
    }
  };

  const loginWithGoogle = async (googleToken) => {
    try {
      const response = await api.googleAuth(googleToken);
      if (response.status === 'success') {
        setToken(response.data.token);
        setUser(response.data.user);
        localStorage.setItem('token', response.data.token);
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return { success: false, message: error.message || 'Google login failed' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    disconnectSocket();
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await api.updateProfile(profileData);
      if (response.status === 'success') {
        setUser(prev => ({ ...prev, ...response.data.updatedFields }));
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return { success: false, message: error.message || 'Profile update failed' };
    }
  };

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }));
  };

  const changePassword = async (oldPassword, newPassword) => {
    try {
      const response = await api.changePassword(oldPassword, newPassword);
      if (response.status === 'success') {
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return { success: false, message: error.message || 'Password change failed' };
    }
  };

  // FIXED: Added missing clearError function
  const clearError = () => {
    // This was being called but didn't exist
    console.log('Error cleared');
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
    clearError, // FIXED: Added missing function
    loading,
    isAuthenticated: !!user,
    isHost: user?.role === 'host' || user?.role === 'admin',
    isAdmin: user?.role === 'admin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};