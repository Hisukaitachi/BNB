// frontend/src/utils/formatters.js

/**
 * Format a number as currency (Philippine Peso)
 * @param {number} value - The value to format
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value) => {
  const number = parseFloat(value) || 0;
  return `₱${number.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

/**
 * Format a number with thousand separators
 * @param {number} value - The value to format
 * @returns {string} Formatted number string
 */
export const formatNumber = (value) => {
  const number = parseInt(value) || 0;
  return number.toLocaleString('en-US');
};

/**
 * Format a number as percentage
 * @param {number} value - The value to format
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value) => {
  const number = parseFloat(value) || 0;
  return `${number.toFixed(1)}%`;
};

/**
 * Format a number in compact notation (1K, 1M, etc.)
 * @param {number} value - The value to format
 * @returns {string} Formatted compact number string
 */
export const formatCompactNumber = (value) => {
  const number = parseFloat(value) || 0;
  
  if (number >= 1000000000) {
    return `${(number / 1000000000).toFixed(1)}B`;
  } else if (number >= 1000000) {
    return `${(number / 1000000).toFixed(1)}M`;
  } else if (number >= 1000) {
    return `${(number / 1000).toFixed(1)}K`;
  }
  
  return number.toString();
};

/**
 * Format currency in compact notation (₱1.5K, ₱2.3M, etc.)
 * @param {number} value - The value to format
 * @returns {string} Formatted compact currency string
 */
export const formatCompactCurrency = (value) => {
  const number = parseFloat(value) || 0;
  
  if (number >= 1000000000) {
    return `₱${(number / 1000000000).toFixed(1)}B`;
  } else if (number >= 1000000) {
    return `₱${(number / 1000000).toFixed(1)}M`;
  } else if (number >= 1000) {
    return `₱${(number / 1000).toFixed(1)}K`;
  }
  
  return formatCurrency(number);
};

/**
 * Format a date string
 * @param {string|Date} date - The date to format
 * @param {string} format - The format type ('short', 'long', 'time', 'datetime')
 * @returns {string} Formatted date string
 */
export const formatDate = (date, format = 'short') => {
  if (!date) return 'N/A';
  
  const dateObj = new Date(date);
  
  if (isNaN(dateObj.getTime())) return 'Invalid Date';
  
  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    
    case 'long':
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    
    case 'time':
      return dateObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    
    case 'datetime':
      return dateObj.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    
    default:
      return dateObj.toLocaleDateString('en-US');
  }
};

/**
 * Format relative time (e.g., "2 hours ago", "3 days ago")
 * @param {string|Date} date - The date to format
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (date) => {
  if (!date) return 'N/A';
  
  const dateObj = new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((now - dateObj) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  } else if (diffInSeconds < 2592000) {
    const weeks = Math.floor(diffInSeconds / 604800);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  } else if (diffInSeconds < 31536000) {
    const months = Math.floor(diffInSeconds / 2592000);
    return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  } else {
    const years = Math.floor(diffInSeconds / 31536000);
    return `${years} ${years === 1 ? 'year' : 'years'} ago`;
  }
};

/**
 * Format duration (e.g., "2h 30m", "45m", "3d")
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration string
 */
export const formatDuration = (minutes) => {
  if (!minutes || minutes < 0) return '0m';
  
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${mins}m`;
  } else {
    return `${mins}m`;
  }
};

/**
 * Format file size
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size string
 */
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Format phone number (Philippine format)
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return 'N/A';
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it's a Philippine mobile number
  if (cleaned.startsWith('63') && cleaned.length === 12) {
    // Format: +63 9XX XXX XXXX
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  } else if (cleaned.startsWith('09') && cleaned.length === 11) {
    // Format: 09XX XXX XXXX
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  } else if (cleaned.startsWith('9') && cleaned.length === 10) {
    // Format: 9XX XXX XXXX
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  
  return phone;
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Format status with proper casing
 * @param {string} status - Status string
 * @returns {string} Formatted status
 */
export const formatStatus = (status) => {
  if (!status) return 'Unknown';
  
  // Handle snake_case and kebab-case
  const formatted = status.replace(/[_-]/g, ' ');
  
  // Capitalize first letter of each word
  return formatted.replace(/\b\w/g, (char) => char.toUpperCase());
};

/**
 * Format rating with stars
 * @param {number} rating - Rating value
 * @returns {string} Star representation
 */
export const formatRating = (rating) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;
  
  return '★'.repeat(fullStars) + (halfStar ? '☆' : '') + '☆'.repeat(emptyStars);
};

/**
 * Format boolean value
 * @param {boolean} value - Boolean value
 * @param {string} trueText - Text for true value
 * @param {string} falseText - Text for false value
 * @returns {string} Formatted boolean
 */
export const formatBoolean = (value, trueText = 'Yes', falseText = 'No') => {
  return value ? trueText : falseText;
};

/**
 * Format address
 * @param {object} address - Address object
 * @returns {string} Formatted address
 */
export const formatAddress = (address) => {
  if (!address) return 'N/A';
  
  const parts = [
    address.street,
    address.barangay,
    address.city,
    address.province,
    address.postal_code
  ].filter(Boolean);
  
  return parts.join(', ');
};

/**
 * Format name (First Last)
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @returns {string} Formatted full name
 */
export const formatFullName = (firstName, lastName) => {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.join(' ') || 'N/A';
};

/**
 * Format decimal places
 * @param {number} value - Number value
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number
 */
export const formatDecimal = (value, decimals = 2) => {
  const number = parseFloat(value) || 0;
  return number.toFixed(decimals);
};

// Export all formatters as default object as well
export default {
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatCompactNumber,
  formatCompactCurrency,
  formatDate,
  formatRelativeTime,
  formatDuration,
  formatFileSize,
  formatPhoneNumber,
  truncateText,
  formatStatus,
  formatRating,
  formatBoolean,
  formatAddress,
  formatFullName,
  formatDecimal
};
