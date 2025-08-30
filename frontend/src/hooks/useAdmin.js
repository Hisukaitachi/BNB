// frontend/src/hooks/useAdmin.js - Custom hooks for admin functionality
import { useState, useEffect, useCallback } from 'react';
import adminService from '../services/adminService';
import { useAuth } from '../context/AuthContext';

/**
 * Main admin hook for dashboard data
 */
export const useAdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const fetchDashboardData = useCallback(async () => {
    if (!user || user.role !== 'admin') return;

    try {
      setLoading(true);
      setError(null);
      const dashboardData = await adminService.getDashboardStats();
      setData(dashboardData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return { data, loading, error, refetch: fetchDashboardData };
};

/**
 * Hook for user management
 */
export const useAdminUsers = (initialParams = {}) => {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [params, setParams] = useState({ page: 1, limit: 50, ...initialParams });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.getAllUsers(params);
      setUsers(response.users);
      setPagination(response.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const banUser = async (userId) => {
    try {
      await adminService.banUser(userId);
      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, is_banned: 1 } : user
      ));
      return { success: true };
    } catch (err) {
      throw new Error(err.message);
    }
  };

  const unbanUser = async (userId) => {
    try {
      await adminService.unbanUser(userId);
      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, is_banned: 0 } : user
      ));
      return { success: true };
    } catch (err) {
      throw new Error(err.message);
    }
  };

  const updateUserRole = async (userId, role) => {
    try {
      await adminService.updateUserRole(userId, role);
      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, role } : user
      ));
      return { success: true };
    } catch (err) {
      throw new Error(err.message);
    }
  };

  const updateParams = (newParams) => {
    setParams(prev => ({ ...prev, ...newParams }));
  };

  return {
    users,
    pagination,
    loading,
    error,
    params,
    fetchUsers,
    banUser,
    unbanUser,
    updateUserRole,
    updateParams
  };
};

/**
 * Hook for listing management
 */
export const useAdminListings = (initialParams = {}) => {
  const [listings, setListings] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [params, setParams] = useState({ page: 1, limit: 50, ...initialParams });

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.getAllListings(params);
      setListings(response.listings);
      setPagination(response.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const removeListing = async (listingId, reason = '') => {
    try {
      await adminService.removeListing(listingId, reason);
      // Remove from local state
      setListings(prev => prev.filter(listing => listing.id !== listingId));
      return { success: true };
    } catch (err) {
      throw new Error(err.message);
    }
  };

  const updateParams = (newParams) => {
    setParams(prev => ({ ...prev, ...newParams }));
  };

  return {
    listings,
    pagination,
    loading,
    error,
    params,
    fetchListings,
    removeListing,
    updateParams
  };
};

/**
 * Hook for booking management
 */
export const useAdminBookings = (initialParams = {}) => {
  const [bookings, setBookings] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [params, setParams] = useState({ page: 1, limit: 50, ...initialParams });

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.getAllBookings(params);
      setBookings(response.bookings);
      setStatistics(response.statistics);
      setPagination(response.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const updateBookingStatus = async (bookingId, status) => {
    try {
      await adminService.updateBookingStatus(bookingId, status);
      // Update local state
      setBookings(prev => prev.map(booking => 
        booking.booking_id === bookingId ? { ...booking, status } : booking
      ));
      return { success: true };
    } catch (err) {
      throw new Error(err.message);
    }
  };

  const cancelBooking = async (bookingId) => {
    try {
      await adminService.cancelBooking(bookingId);
      // Remove from local state
      setBookings(prev => prev.filter(booking => booking.booking_id !== bookingId));
      return { success: true };
    } catch (err) {
      throw new Error(err.message);
    }
  };

  const updateParams = (newParams) => {
    setParams(prev => ({ ...prev, ...newParams }));
  };

  return {
    bookings,
    statistics,
    pagination,
    loading,
    error,
    params,
    fetchBookings,
    updateBookingStatus,
    cancelBooking,
    updateParams
  };
};

/**
 * Hook for financial management
 */
export const useAdminFinancials = () => {
  const [pendingPayouts, setPendingPayouts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFinancialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [payoutsResponse, transactionsResponse] = await Promise.all([
        adminService.getHostsPendingPayouts(),
        adminService.getAllTransactions()
      ]);
      setPendingPayouts(payoutsResponse);
      setTransactions(transactionsResponse);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFinancialData();
  }, [fetchFinancialData]);

  const processHostPayout = async (hostId) => {
    try {
      const result = await adminService.processHostPayout(hostId);
      // Remove from pending payouts
      setPendingPayouts(prev => prev.filter(payout => payout.host_id !== hostId));
      return result;
    } catch (err) {
      throw new Error(err.message);
    }
  };

  const processRefund = async (transactionId) => {
    try {
      const result = await adminService.processRefund(transactionId);
      // Update transaction status
      setTransactions(prev => prev.map(transaction => 
        transaction.id === transactionId 
          ? { ...transaction, status: 'refunded' } 
          : transaction
      ));
      return result;
    } catch (err) {
      throw new Error(err.message);
    }
  };

  return {
    pendingPayouts,
    transactions,
    loading,
    error,
    fetchFinancialData,
    processHostPayout,
    processRefund
  };
};

/**
 * Hook for reports management
 */
export const useAdminReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.getAllReports();
      setReports(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const takeAction = async (actionData) => {
    try {
      await adminService.takeAction(actionData);
      // Update report status
      setReports(prev => prev.map(report => 
        report.id === actionData.report_id 
          ? { ...report, status: 'resolved', action_taken: actionData.action_type }
          : report
      ));
      return { success: true };
    } catch (err) {
      throw new Error(err.message);
    }
  };

  return {
    reports,
    loading,
    error,
    fetchReports,
    takeAction
  };
};

/**
 * Hook for admin reviews management
 */
export const useAdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.getAllReviews();
      setReviews(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const removeReview = async (reviewId) => {
    try {
      await adminService.removeReview(reviewId);
      // Remove from local state
      setReviews(prev => prev.filter(review => review.id !== reviewId));
      return { success: true };
    } catch (err) {
      throw new Error(err.message);
    }
  };

  return {
    reviews,
    loading,
    error,
    fetchReviews,
    removeReview
  };
};

/**
 * Utility hook for admin permissions
 */
export const useAdminAuth = () => {
  const { user, isAuthenticated } = useAuth();
  
  const isAdmin = user?.role === 'admin';
  const canAccess = isAuthenticated && isAdmin;
  
  return {
    isAdmin,
    canAccess,
    user
  };
};