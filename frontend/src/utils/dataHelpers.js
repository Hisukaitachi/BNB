// src/utils/dataHelpers.js - Helper functions to handle backend responses
import api from '../services/api';

/**
 * Safe data extraction from API responses
 * Your backend returns: { status: 'success', data: {...}, results: number }
 */
export const extractData = (response, dataKey = null) => {
  if (!response) return null;
  
  // Handle direct data responses
  if (response.data) {
    return dataKey ? response.data[dataKey] : response.data;
  }
  
  // Fallback for malformed responses
  return response;
};

/**
 * Safe array extraction with fallback
 */
export const extractArray = (response, key) => {
  const data = extractData(response);
  if (!data) return [];
  
  if (key && Array.isArray(data[key])) {
    return data[key];
  }
  
  if (Array.isArray(data)) {
    return data;
  }
  
  return [];
};

/**
 * API call wrappers with proper error handling
 */
export class ApiHelpers {
  
  // Listings
  static async getListings(params = {}) {
    try {
      const response = await api.getListings(params);
      return extractArray(response, 'listings');
    } catch (error) {
      console.error('Failed to fetch listings:', error);
      throw new Error(error.message || 'Failed to load listings');
    }
  }

  static async getListingById(id) {
    try {
      if (!id || id === 'undefined') {
        throw new Error('Valid listing ID required');
      }
      
      const response = await api.getListingById(id);
      return extractData(response, 'listing');
    } catch (error) {
      console.error('Failed to fetch listing:', error);
      throw new Error(error.message || 'Failed to load listing details');
    }
  }

  static async searchListings(searchParams) {
    try {
      const response = await api.searchListings(searchParams);
      return {
        listings: extractArray(response, 'listings'),
        pagination: extractData(response, 'pagination'),
        filters: extractData(response, 'filters')
      };
    } catch (error) {
      console.error('Search failed:', error);
      throw new Error(error.message || 'Search failed');
    }
  }

  // Bookings
  static async getMyBookings() {
    try {
      const response = await api.getMyBookings();
      return extractArray(response, 'bookings');
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      throw new Error(error.message || 'Failed to load bookings');
    }
  }

  static async getHostBookings() {
    try {
      const response = await api.getHostBookings();
      return extractArray(response, 'bookings');
    } catch (error) {
      console.error('Failed to fetch host bookings:', error);
      throw new Error(error.message || 'Failed to load host bookings');
    }
  }

  static async createBooking(bookingData) {
    try {
      // Validate required fields
      const required = ['listing_id', 'start_date', 'end_date', 'total_price'];
      for (const field of required) {
        if (!bookingData[field]) {
          throw new Error(`${field.replace('_', ' ')} is required`);
        }
      }

      const response = await api.createBooking(bookingData);
      return extractData(response);
    } catch (error) {
      console.error('Failed to create booking:', error);
      throw new Error(error.message || 'Failed to create booking');
    }
  }

  static async getBookedDates(listingId) {
    try {
      if (!listingId) {
        return { unavailableDates: [], bookingRanges: [] };
      }

      const response = await api.getBookedDatesByListing(listingId);
      const data = extractData(response);
      
      return {
        unavailableDates: data?.unavailableDates || [],
        bookingRanges: data?.bookingRanges || []
      };
    } catch (error) {
      console.error('Failed to fetch booked dates:', error);
      // Return empty data instead of throwing
      return { unavailableDates: [], bookingRanges: [] };
    }
  }

  // Reviews
  static async getListingReviews(listingId) {
    try {
      if (!listingId) {
        return { reviews: [], statistics: null };
      }

      const response = await api.getListingReviews(listingId);
      const data = extractData(response);
      
      return {
        reviews: data?.reviews || [],
        statistics: data?.statistics || null,
        pagination: data?.pagination || null
      };
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      // Return empty data instead of throwing
      return { reviews: [], statistics: null };
    }
  }

  static async createReview(reviewData) {
    try {
      // Validate required fields
      const required = ['booking_id', 'reviewee_id', 'rating', 'comment', 'type'];
      for (const field of required) {
        if (!reviewData[field]) {
          throw new Error(`${field.replace('_', ' ')} is required`);
        }
      }

      // Validate rating
      if (reviewData.rating < 1 || reviewData.rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      const response = await api.createReview(reviewData);
      return extractData(response);
    } catch (error) {
      console.error('Failed to create review:', error);
      throw new Error(error.message || 'Failed to submit review');
    }
  }

  // Messages
  static async getInbox() {
    try {
      const response = await api.getInbox();
      return extractArray(response, 'conversations');
    } catch (error) {
      console.error('Failed to fetch inbox:', error);
      throw new Error(error.message || 'Failed to load messages');
    }
  }

  static async getConversation(otherUserId, page = 1) {
    try {
      if (!otherUserId) {
        throw new Error('User ID required');
      }

      const response = await api.getConversation(otherUserId, page);
      const data = extractData(response);
      
      return {
        messages: data?.messages || [],
        otherUser: data?.otherUser || null,
        pagination: data?.pagination || null
      };
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
      throw new Error(error.message || 'Failed to load conversation');
    }
  }

  // Favorites
  static async getFavorites() {
    try {
      const response = await api.getFavorites();
      const data = extractData(response);
      
      return {
        favorites: data?.favorites || [],
        pagination: data?.pagination || null
      };
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
      throw new Error(error.message || 'Failed to load favorites');
    }
  }

  // Host methods
  static async getMyListings() {
    try {
      const response = await api.getMyListings();
      return extractArray(response, 'listings');
    } catch (error) {
      console.error('Failed to fetch my listings:', error);
      throw new Error(error.message || 'Failed to load your listings');
    }
  }

  static async createListing(listingData, files = {}) {
    try {
      // Validate required fields
      const required = ['title', 'description', 'price_per_night', 'location'];
      for (const field of required) {
        if (!listingData[field]) {
          throw new Error(`${field.replace('_', ' ')} is required`);
        }
      }

      // Validate price
      if (listingData.price_per_night < 1) {
        throw new Error('Price must be at least ₱1');
      }

      const response = await api.createListing(listingData, files);
      return extractData(response);
    } catch (error) {
      console.error('Failed to create listing:', error);
      throw new Error(error.message || 'Failed to create listing');
    }
  }

  // Notifications
  static async getNotifications(params = {}) {
    try {
      const response = await api.getNotifications(params);
      const data = extractData(response);
      
      return {
        notifications: data?.notifications || [],
        statistics: data?.statistics || null,
        pagination: data?.pagination || null
      };
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      throw new Error(error.message || 'Failed to load notifications');
    }
  }

  // Admin methods
  static async getDashboardStats() {
    try {
      const response = await api.getDashboardStats();
      return extractData(response);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      throw new Error(error.message || 'Failed to load dashboard data');
    }
  }

  static async getAllUsers(params = {}) {
    try {
      const response = await api.getAllUsers(params);
      const data = extractData(response);
      
      return {
        users: data?.users || [],
        pagination: data?.pagination || null
      };
    } catch (error) {
      console.error('Failed to fetch users:', error);
      throw new Error(error.message || 'Failed to load users');
    }
  }
}

/**
 * Hook for handling API calls with loading states
 */
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';

export const useApiCall = (apiFunction, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { showToast } = useApp();

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiFunction(...args);
      setData(result);
      return result;
    } catch (err) {
      console.error('API call failed:', err);
      setError(err.message);
      if (showToast) {
        showToast(err.message, 'error');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunction, showToast]);

  const refetch = useCallback(() => execute(), [execute]);

  useEffect(() => {
    execute();
  }, dependencies);

  return {
    data,
    loading,
    error,
    execute,
    refetch
  };
};