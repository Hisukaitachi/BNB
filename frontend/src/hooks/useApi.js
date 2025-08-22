// src/hooks/useApi.js
import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useApp } from '../context/AppContext';

/**
 * Custom hook for API calls with loading states and error handling
 * @param {Function} apiFunction - API function to call
 * @param {Array} dependencies - Dependencies to trigger re-fetch
 * @param {boolean} immediate - Whether to call immediately on mount
 * @returns {object} API state and functions
 */
export const useApi = (apiFunction, dependencies = [], immediate = true) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
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
      setError(err.message);
      showToast(err.message, 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunction, showToast]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, dependencies);

  const refetch = useCallback(() => execute(), [execute]);

  return {
    data,
    loading,
    error,
    execute,
    refetch
  };
};

/**
 * Hook for fetching data with automatic retry
 * @param {Function} apiCall - API function
 * @param {object} options - Options including retries, delay, etc.
 * @returns {object} API state with retry functionality
 */
export const useApiWithRetry = (apiCall, options = {}) => {
  const { retries = 3, delay = 1000, ...apiOptions } = options;
  const [retryCount, setRetryCount] = useState(0);
  
  const apiWithRetry = useCallback(async (...args) => {
    let lastError;
    
    for (let i = 0; i <= retries; i++) {
      try {
        return await apiCall(...args);
      } catch (error) {
        lastError = error;
        
        if (i < retries) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
          setRetryCount(i + 1);
        }
      }
    }
    
    throw lastError;
  }, [apiCall, retries, delay]);

  const result = useApi(apiWithRetry, apiOptions.dependencies, apiOptions.immediate);

  return {
    ...result,
    retryCount
  };
};