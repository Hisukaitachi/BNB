// src/hooks/useAuth.js (Alternative auth hook if needed)
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Hook to access authentication context
 * @returns {object} Auth context value
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Hook to check if user has required permissions
 * @param {string|Array} requiredRoles - Required role(s)
 * @returns {boolean} Whether user has permission
 */
export const usePermission = (requiredRoles) => {
  const { user } = useAuth();
  
  if (!user) return false;
  
  if (typeof requiredRoles === 'string') {
    return user.role === requiredRoles;
  }
  
  if (Array.isArray(requiredRoles)) {
    return requiredRoles.includes(user.role);
  }
  
  return false;
};

/**
 * Hook to check if user is authenticated and optionally has specific role
 * @param {string} requiredRole - Optional required role
 * @returns {object} Auth status and user info
 */
export const useAuthStatus = (requiredRole = null) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  const hasPermission = requiredRole ? user?.role === requiredRole : true;
  
  return {
    isAuthenticated,
    hasPermission,
    user,
    loading,
    canAccess: isAuthenticated && hasPermission
  };
};
