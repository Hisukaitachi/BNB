// src/utils/formatters.js
import { CURRENCY } from './constants';

/**
 * Format price to Philippine Peso currency
 * @param {number} price - The price to format
 * @param {boolean} showDecimals - Whether to show decimal places
 * @returns {string} Formatted price string
 */
export const formatPrice = (price, showDecimals = false) => {
  if (price === null || price === undefined || isNaN(price)) {
    return `${CURRENCY.SYMBOL}0`;
  }

  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: CURRENCY.CODE,
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0
  }).format(price);
};

/**
 * Format number with thousands separator
 * @param {number} number - The number to format
 * @returns {string} Formatted number string
 */
export const formatNumber = (number) => {
  if (number === null || number === undefined || isNaN(number)) {
    return '0';
  }

  return new Intl.NumberFormat('en-PH').format(number);
};

/**
 * Format date to readable string
 * @param {string|Date} date - The date to format
 * @param {string} format - The format type ('short', 'long', 'time', 'datetime', 'relative')
 * @returns {string} Formatted date string
 */
export const formatDate = (date, format = 'short') => {
  if (!date) return '';

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';

  const now = new Date();
  const diffInMilliseconds = now - dateObj;
  const diffInDays = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24));

  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

    case 'long':
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

    case 'time':
      return dateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

    case 'datetime':
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

    case 'relative':
      if (diffInDays === 0) {
        const diffInHours = Math.floor(diffInMilliseconds / (1000 * 60 * 60));
        const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));
        
        if (diffInHours === 0) {
          if (diffInMinutes < 1) return 'Just now';
          return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
        }
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
      } else if (diffInDays === 1) {
        return 'Yesterday';
      } else if (diffInDays < 7) {
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
      } else if (diffInDays < 30) {
        const weeks = Math.floor(diffInDays / 7);
        return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
      } else if (diffInDays < 365) {
        const months = Math.floor(diffInDays / 30);
        return `${months} month${months > 1 ? 's' : ''} ago`;
      } else {
        const years = Math.floor(diffInDays / 365);
        return `${years} year${years > 1 ? 's' : ''} ago`;
      }

    case 'iso':
      return dateObj.toISOString().split('T')[0];

    default:
      return dateObj.toLocaleDateString();
  }
};

/**
 * Format duration between two dates
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @returns {string} Formatted duration string
 */
export const formatDuration = (startDate, endDate) => {
  if (!startDate || !endDate) return '';

  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';

  const diffInMilliseconds = end - start;
  const days = Math.ceil(diffInMilliseconds / (1000 * 60 * 60 * 24));
  
  if (days === 1) return '1 night';
  return `${days} nights`;
};

/**
 * Format file size to human readable string
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format rating with stars
 * @param {number} rating - Rating value (1-5)
 * @param {boolean} showNumber - Whether to show the number
 * @returns {string} Formatted rating string
 */
export const formatRating = (rating, showNumber = true) => {
  if (!rating || rating === 0) return 'No rating';

  const stars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
  return showNumber ? `${stars} ${rating.toFixed(1)}` : stars;
};

/**
 * Format percentage
 * @param {number} value - The value to format as percentage
 * @param {number} total - The total value
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, total) => {
  if (!total || total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${Math.round(percentage)}%`;
};

/**
 * Format distance
 * @param {number} distance - Distance in kilometers
 * @returns {string} Formatted distance string
 */
export const formatDistance = (distance) => {
  if (!distance || distance === 0) return '';
  
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m away`;
  }
  
  return `${distance.toFixed(1)}km away`;
};

/**
 * Format phone number
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Format Philippine mobile numbers
  if (cleaned.startsWith('63') && cleaned.length === 12) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }
  
  // Format local mobile numbers
  if (cleaned.startsWith('09') && cleaned.length === 11) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  
  return phoneNumber;
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

/**
 * Format array to readable list
 * @param {Array} items - Array of items
 * @param {string} conjunction - Conjunction word ('and', 'or')
 * @returns {string} Formatted list string
 */
export const formatList = (items, conjunction = 'and') => {
  if (!items || items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  
  const lastItem = items.pop();
  return `${items.join(', ')}, ${conjunction} ${lastItem}`;
};

/**
 * Format booking status to human readable
 * @param {string} status - Booking status
 * @returns {string} Formatted status
 */
export const formatBookingStatus = (status) => {
  const statusMap = {
    pending: 'Pending Approval',
    approved: 'Approved',
    confirmed: 'Confirmed',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
    completed: 'Completed',
    refunded: 'Refunded'
  };
  
  return statusMap[status] || status;
};

/**
 * Format user role to human readable
 * @param {string} role - User role
 * @returns {string} Formatted role
 */
export const formatUserRole = (role) => {
  const roleMap = {
    client: 'Guest',
    host: 'Host',
    admin: 'Administrator'
  };
  
  return roleMap[role] || role;
};

/**
 * Format address with proper capitalization
 * @param {string} address - Address to format
 * @returns {string} Formatted address
 */
export const formatAddress = (address) => {
  if (!address) return '';
  
  return address
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Format capacity (guests)
 * @param {number} capacity - Number of guests
 * @returns {string} Formatted capacity string
 */
export const formatCapacity = (capacity) => {
  if (!capacity || capacity === 0) return '';
  return `${capacity} guest${capacity > 1 ? 's' : ''}`;
};

/**
 * Format property type
 * @param {string} type - Property type
 * @returns {string} Formatted property type
 */
export const formatPropertyType = (type) => {
  if (!type) return '';
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
};

/**
 * Format initials from name
 * @param {string} name - Full name
 * @returns {string} Initials
 */
export const formatInitials = (name) => {
  if (!name) return '';
  
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
};