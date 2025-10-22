// src/context/AuthContext.jsx - FIXED VERSION
import React from 'react'
import { createContext, useContext, useReducer, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        loading: true,
        error: null
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        loading: false,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        error: null
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        loading: false,
        user: null,
        token: null,
        isAuthenticated: false,
        error: action.payload
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload
      };
    case 'UPDATE_TOKEN':
      return {
        ...state,
        token: action.payload
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    default:
      return state;
  }
};

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  error: null
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      
      if (token && user) {
        try {
          const parsedUser = JSON.parse(user);
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { user: parsedUser, token }
          });
        } catch (error) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          dispatch({ type: 'LOGIN_FAILURE', payload: 'Invalid session' });
        }
      } else {
        dispatch({ type: 'LOGIN_FAILURE', payload: null });
      }
    };

    checkAuth();
  }, []);

  // Regular login - FIXED to return complete response
  const login = async (credentials) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await authService.login(credentials);
      
      // Log for debugging
      console.log('Login response:', response);
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: response.data
      });
      
      // Return the complete response so LoginPage can access response.data.user.role
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage
      });
      throw error;
    }
  };

  // Google login - separate method
  const googleLogin = async (googleToken) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await fetch('http://localhost:5000/api/users/google-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: googleToken })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Google login failed');
      }

      // Store in localStorage
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: data.data.user, token: data.data.token }
      });

      return data;
    } catch (error) {
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: error.message
      });
      throw error;
    }
  };

  const register = async (userData) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await authService.register(userData);
      return response;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage
      });
      throw error;
    }
  };

  // Fixed switch role
  const switchRole = async (newRole) => {
    try {
      const response = await fetch('http://localhost:5000/api/role/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`
        },
        body: JSON.stringify({ newRole })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message);
      }

      if (data.data.token) {
        localStorage.setItem('token', data.data.token);
        
        const updatedUser = { ...state.user, role: newRole };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        dispatch({ type: 'UPDATE_TOKEN', payload: data.data.token });
        dispatch({ type: 'UPDATE_USER', payload: updatedUser });
      }
      
    } catch (error) {
      throw error;
    }
  };

  const updateProfile = async (data) => {
    try {
      const response = await authService.updateProfile(data);
      const profileResponse = await authService.getProfile();
      const updatedUser = profileResponse.data.user;
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      dispatch({
        type: 'UPDATE_USER',
        payload: updatedUser
      });
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  // Simple update user function for immediate updates (like profile pictures)
  const updateUser = (updates) => {
    const currentUser = state.user;
    const updatedUser = { ...currentUser, ...updates };
    
    // Update localStorage
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    // Update state
    dispatch({
      type: 'UPDATE_USER',
      payload: updatedUser
    });
  };

  const logout = () => {
    authService.logout();
    dispatch({ type: 'LOGOUT' });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value = {
    ...state,
    login,
    register,
    googleLogin,
    switchRole,
    updateProfile,
    updateUser,
    logout,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};