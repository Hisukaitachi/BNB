import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useSocket } from './AppContext';

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
  const { socket, connectSocket, disconnectSocket } = useSocket();

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
  }, [user, token]);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/users/me');
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
      const response = await api.post('/users/login', { email, password });
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
      const response = await api.post('/users/register', { name, email, password });
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
      const response = await api.post('/auth/google', { token: googleToken });
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
      const response = await api.put('/users/me', profileData);
      if (response.status === 'success') {
        setUser(prev => ({ ...prev, ...response.data.updatedFields }));
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return { success: false, message: error.message || 'Profile update failed' };
    }
  };

  const changePassword = async (oldPassword, newPassword) => {
    try {
      const response = await api.put('/users/me/change-password', { oldPassword, newPassword });
      if (response.status === 'success') {
        return { success: true };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return { success: false, message: error.message || 'Password change failed' };
    }
  };

  const value = {
    user,
    token,
    login,
    register,
    loginWithGoogle,
    logout,
    updateProfile,
    changePassword,
    loading,
    isAuthenticated: !!user,
    isHost: user?.role === 'host' || user?.role === 'admin',
    isAdmin: user?.role === 'admin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};