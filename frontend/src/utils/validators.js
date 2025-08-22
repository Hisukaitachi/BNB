// src/utils/validators.js
import { VALIDATION } from './constants';

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {object} Validation result with isValid and error
 */
export const validateEmail = (email) => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  if (!VALIDATION.EMAIL_REGEX.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  return { isValid: true, error: null };
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} Validation result with isValid, error, and strength
 */
export const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, error: 'Password is required', strength: 0 };
  }

  if (password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
    return { 
      isValid: false, 
      error: `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters long`,
      strength: 1
    };
  }

  const checks = {
    hasLower: /[a-z]/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    hasLength: password.length >= VALIDATION.PASSWORD_MIN_LENGTH
  };

  const strengthScore = Object.values(checks).filter(Boolean).length;

  if (!checks.hasLower || !checks.hasUpper || !checks.hasNumber || !checks.hasSpecial) {
    return { 
      isValid: false, 
      error: 'Password must contain uppercase, lowercase, number and special character',
      strength: strengthScore
    };
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password', 'password123', '12345678', 'qwerty123', 
    'admin123', 'letmein', 'welcome123', 'password1'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    return { 
      isValid: false, 
      error: 'Please choose a stronger password',
      strength: 2
    };
  }

  return { isValid: true, error: null, strength: strengthScore };
};

/**
 * Validate name
 * @param {string} name - Name to validate
 * @returns {object} Validation result
 */
export const validateName = (name) => {
  if (!name || !name.trim()) {
    return { isValid: false, error: 'Name is required' };
  }

  const trimmedName = name.trim();

  if (trimmedName.length < VALIDATION.NAME_MIN_LENGTH) {
    return { 
      isValid: false, 
      error: `Name must be at least ${VALIDATION.NAME_MIN_LENGTH} characters long` 
    };
  }

  if (trimmedName.length > VALIDATION.NAME_MAX_LENGTH) {
    return { 
      isValid: false, 
      error: `Name cannot exceed ${VALIDATION.NAME_MAX_LENGTH} characters` 
    };
  }

  // Check for invalid characters
  if (!/^[a-zA-Z\s\-'\.]+$/.test(trimmedName)) {
    return { 
      isValid: false, 
      error: 'Name can only contain letters, spaces, hyphens, apostrophes, and periods' 
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {object} Validation result
 */
export const validatePhone = (phone) => {
  if (!phone) {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // Philippine mobile number validation
  if (cleaned.startsWith('63') && cleaned.length === 12) {
    return { isValid: true, error: null };
  }

  if (cleaned.startsWith('09') && cleaned.length === 11) {
    return { isValid: true, error: null };
  }

  if (cleaned.startsWith('9') && cleaned.length === 10) {
    return { isValid: true, error: null };
  }

  return { 
    isValid: false, 
    error: 'Please enter a valid Philippine mobile number' 
  };
};

/**
 * Validate listing title
 * @param {string} title - Title to validate
 * @returns {object} Validation result
 */
export const validateListingTitle = (title) => {
  if (!title || !title.trim()) {
    return { isValid: false, error: 'Title is required' };
  }

  const trimmedTitle = title.trim();

  if (trimmedTitle.length < VALIDATION.TITLE_MIN_LENGTH) {
    return { 
      isValid: false, 
      error: `Title must be at least ${VALIDATION.TITLE_MIN_LENGTH} characters long` 
    };
  }

  if (trimmedTitle.length > VALIDATION.TITLE_MAX_LENGTH) {
    return { 
      isValid: false, 
      error: `Title cannot exceed ${VALIDATION.TITLE_MAX_LENGTH} characters` 
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate description
 * @param {string} description - Description to validate
 * @returns {object} Validation result
 */
export const validateDescription = (description) => {
  if (!description || !description.trim()) {
    return { isValid: false, error: 'Description is required' };
  }

  const trimmedDescription = description.trim();

  if (trimmedDescription.length < VALIDATION.DESCRIPTION_MIN_LENGTH) {
    return { 
      isValid: false, 
      error: `Description must be at least ${VALIDATION.DESCRIPTION_MIN_LENGTH} characters long` 
    };
  }

  if (trimmedDescription.length > VALIDATION.DESCRIPTION_MAX_LENGTH) {
    return { 
      isValid: false, 
      error: `Description cannot exceed ${VALIDATION.DESCRIPTION_MAX_LENGTH} characters` 
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate price
 * @param {number|string} price - Price to validate
 * @returns {object} Validation result
 */
export const validatePrice = (price) => {
  const numPrice = parseFloat(price);

  if (isNaN(numPrice)) {
    return { isValid: false, error: 'Price must be a valid number' };
  }

  if (numPrice < VALIDATION.PRICE_MIN) {
    return { 
      isValid: false, 
      error: `Price must be at least ₱${VALIDATION.PRICE_MIN}` 
    };
  }

  if (numPrice > VALIDATION.PRICE_MAX) {
    return { 
      isValid: false, 
      error: `Price cannot exceed ₱${VALIDATION.PRICE_MAX.toLocaleString()}` 
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate rating
 * @param {number} rating - Rating to validate
 * @returns {object} Validation result
 */
export const validateRating = (rating) => {
  if (!rating && rating !== 0) {
    return { isValid: false, error: 'Rating is required' };
  }

  const numRating = parseInt(rating);

  if (isNaN(numRating) || !Number.isInteger(numRating)) {
    return { isValid: false, error: 'Rating must be a whole number' };
  }

  if (numRating < VALIDATION.RATING_MIN || numRating > VALIDATION.RATING_MAX) {
    return { 
      isValid: false, 
      error: `Rating must be between ${VALIDATION.RATING_MIN} and ${VALIDATION.RATING_MAX}` 
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate date
 * @param {string|Date} date - Date to validate
 * @param {boolean} allowPast - Whether to allow past dates
 * @returns {object} Validation result
 */
export const validateDate = (date, allowPast = false) => {
  if (!date) {
    return { isValid: false, error: 'Date is required' };
  }

  const dateObj = new Date(date);

  if (isNaN(dateObj.getTime())) {
    return { isValid: false, error: 'Please enter a valid date' };
  }

  if (!allowPast) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dateObj < today) {
      return { isValid: false, error: 'Date cannot be in the past' };
    }
  }

  return { isValid: true, error: null };
};

/**
 * Validate date range
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @returns {object} Validation result
 */
export const validateDateRange = (startDate, endDate) => {
  const startValidation = validateDate(startDate);
  if (!startValidation.isValid) {
    return { isValid: false, error: `Start date: ${startValidation.error}` };
  }

  const endValidation = validateDate(endDate);
  if (!endValidation.isValid) {
    return { isValid: false, error: `End date: ${endValidation.error}` };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end <= start) {
    return { isValid: false, error: 'End date must be after start date' };
  }

  // Check maximum stay duration (1 year)
  const maxStay = 365 * 24 * 60 * 60 * 1000; // 365 days in milliseconds
  if (end - start > maxStay) {
    return { isValid: false, error: 'Maximum stay duration is 365 days' };
  }

  return { isValid: true, error: null };
};

/**
 * Validate file upload
 * @param {File} file - File to validate
 * @param {string} type - Expected file type ('image' or 'video')
 * @returns {object} Validation result
 */
export const validateFile = (file, type = 'image') => {
  if (!file) {
    return { isValid: false, error: 'File is required' };
  }

  // Check file size
  if (file.size > VALIDATION.MAX_FILE_SIZE) {
    return { 
      isValid: false, 
      error: `File size must be less than ${VALIDATION.MAX_FILE_SIZE / 1024 / 1024}MB` 
    };
  }

  // Check file type
  const allowedTypes = type === 'image' 
    ? ['image/jpeg', 'image/png', 'image/webp']
    : ['video/mp4', 'video/quicktime'];

  if (!allowedTypes.includes(file.type)) {
    return { 
      isValid: false, 
      error: `Only ${allowedTypes.join(', ').replace(/\w+\//g, '').toUpperCase()} files are allowed` 
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate review comment
 * @param {string} comment - Comment to validate
 * @returns {object} Validation result
 */
export const validateReviewComment = (comment) => {
  if (!comment || !comment.trim()) {
    return { isValid: false, error: 'Comment is required' };
  }

  const trimmedComment = comment.trim();

  if (trimmedComment.length < VALIDATION.REVIEW_MIN_LENGTH) {
    return { 
      isValid: false, 
      error: `Comment must be at least ${VALIDATION.REVIEW_MIN_LENGTH} characters long` 
    };
  }

  if (trimmedComment.length > VALIDATION.REVIEW_MAX_LENGTH) {
    return { 
      isValid: false, 
      error: `Comment cannot exceed ${VALIDATION.REVIEW_MAX_LENGTH} characters` 
    };
  }

  // Basic profanity check (you can expand this list)
  const profanityWords = ['spam', 'fake', 'scam']; // Add more as needed
  const lowerComment = trimmedComment.toLowerCase();
  
  if (profanityWords.some(word => lowerComment.includes(word))) {
    return { 
      isValid: false, 
      error: 'Comment contains inappropriate content' 
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate message content
 * @param {string} message - Message to validate
 * @returns {object} Validation result
 */
export const validateMessage = (message) => {
  if (!message || !message.trim()) {
    return { isValid: false, error: 'Message cannot be empty' };
  }

  const trimmedMessage = message.trim();

  if (trimmedMessage.length > VALIDATION.MESSAGE_MAX_LENGTH) {
    return { 
      isValid: false, 
      error: `Message cannot exceed ${VALIDATION.MESSAGE_MAX_LENGTH} characters` 
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate location
 * @param {string} location - Location to validate
 * @returns {object} Validation result
 */
export const validateLocation = (location) => {
  if (!location || !location.trim()) {
    return { isValid: false, error: 'Location is required' };
  }

  const trimmedLocation = location.trim();

  if (trimmedLocation.length < VALIDATION.LOCATION_MIN_LENGTH) {
    return { 
      isValid: false, 
      error: `Location must be at least ${VALIDATION.LOCATION_MIN_LENGTH} characters long` 
    };
  }

  if (trimmedLocation.length > VALIDATION.LOCATION_MAX_LENGTH) {
    return { 
      isValid: false, 
      error: `Location cannot exceed ${VALIDATION.LOCATION_MAX_LENGTH} characters` 
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate coordinates
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {object} Validation result
 */
export const validateCoordinates = (latitude, longitude) => {
  if (latitude !== 0 && !latitude) {
    return { isValid: false, error: 'Latitude is required' };
  }

  if (longitude !== 0 && !longitude) {
    return { isValid: false, error: 'Longitude is required' };
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lng)) {
    return { isValid: false, error: 'Coordinates must be valid numbers' };
  }

  if (lat < -90 || lat > 90) {
    return { isValid: false, error: 'Latitude must be between -90 and 90' };
  }

  if (lng < -180 || lng > 180) {
    return { isValid: false, error: 'Longitude must be between -180 and 180' };
  }

  return { isValid: true, error: null };
};

/**
 * Validate guest count
 * @param {number} guests - Number of guests
 * @param {number} maxGuests - Maximum allowed guests
 * @returns {object} Validation result
 */
export const validateGuestCount = (guests, maxGuests = 10) => {
  const numGuests = parseInt(guests);

  if (isNaN(numGuests)) {
    return { isValid: false, error: 'Number of guests must be a valid number' };
  }

  if (numGuests < 1) {
    return { isValid: false, error: 'At least 1 guest is required' };
  }

  if (numGuests > maxGuests) {
    return { 
      isValid: false, 
      error: `Maximum ${maxGuests} guests allowed` 
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate form data object
 * @param {object} data - Form data to validate
 * @param {object} schema - Validation schema
 * @returns {object} Validation result with errors object
 */
export const validateForm = (data, schema) => {
  const errors = {};
  let isValid = true;

  Object.keys(schema).forEach(field => {
    const validator = schema[field];
    const value = data[field];
    
    if (typeof validator === 'function') {
      const result = validator(value);
      if (!result.isValid) {
        errors[field] = result.error;
        isValid = false;
      }
    }
  });

  return { isValid, errors };
};

/**
 * Common validation schemas
 */
export const validationSchemas = {
  // User registration form
  registration: {
    name: validateName,
    email: validateEmail,
    password: validatePassword
  },

  // User login form
  login: {
    email: validateEmail,
    password: (password) => {
      if (!password) return { isValid: false, error: 'Password is required' };
      return { isValid: true, error: null };
    }
  },

  // Listing creation form
  listing: {
    title: validateListingTitle,
    description: validateDescription,
    price_per_night: validatePrice,
    location: validateLocation
  },

  // Booking form
  booking: {
    start_date: (date) => validateDate(date, false),
    end_date: (date) => validateDate(date, false),
    guests: validateGuestCount
  },

  // Review form
  review: {
    rating: validateRating,
    comment: validateReviewComment
  },

  // Profile update form
  profile: {
    name: validateName,
    email: validateEmail
  },

  // Password change form
  passwordChange: {
    oldPassword: (password) => {
      if (!password) return { isValid: false, error: 'Current password is required' };
      return { isValid: true, error: null };
    },
    newPassword: validatePassword
  }
};

/**
 * Helper function to validate a specific form
 * @param {string} formType - Type of form to validate
 * @param {object} data - Form data
 * @returns {object} Validation result
 */
export const validateFormByType = (formType, data) => {
  const schema = validationSchemas[formType];
  if (!schema) {
    throw new Error(`Unknown form type: ${formType}`);
  }

  return validateForm(data, schema);
};

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  return input
    .replace(/[<>]/g, '') // Remove < and > characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Check if string contains only safe characters
 * @param {string} input - Input to check
 * @returns {boolean} Whether input is safe
 */
export const isSafeInput = (input) => {
  if (typeof input !== 'string') return false;
  
  // Check for potentially dangerous patterns
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i
  ];

  return !dangerousPatterns.some(pattern => pattern.test(input));
};

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {object} Validation result
 */
export const validateUrl = (url) => {
  if (!url) {
    return { isValid: false, error: 'URL is required' };
  }

  try {
    new URL(url);
    return { isValid: true, error: null };
  } catch (error) {
    return { isValid: false, error: 'Please enter a valid URL' };
  }
};

/**
 * Validate required fields
 * @param {object} data - Data object
 * @param {Array} requiredFields - Array of required field names
 * @returns {object} Validation result
 */
export const validateRequiredFields = (data, requiredFields) => {
  const missingFields = [];

  requiredFields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      missingFields.push(field);
    }
  });

  if (missingFields.length > 0) {
    return {
      isValid: false,
      error: `Missing required fields: ${missingFields.join(', ')}`
    };
  }

  return { isValid: true, error: null };
};