// src/services/reviewService.js - Reviews and Feedback System
import { reviewAPI, userAPI } from './api';

export const REVIEW_TYPES = {
  HOST: 'host',
  CLIENT: 'client', 
  LISTING: 'listing',
  USER: 'user'
};

class ReviewService {
  /**
   * Create review for unit/host
   * @param {object} reviewData - Review data
   * @returns {Promise<object>} Review creation result
   */
  async createReview(reviewData) {
  try {
    const { booking_id, reviewee_id, rating, comment, type } = reviewData;

    // Validation
    if (!booking_id || !reviewee_id || !rating || !comment || !type) {
      throw new Error('All fields are required for review');
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    if (comment.length < 10 || comment.length > 500) {
      throw new Error('Comment must be between 10 and 500 characters');
    }

    const response = await reviewAPI.createReview(reviewData);
    
    return {
      success: true,
      data: response.data.data,
      reviewId: response.data.data?.review?.id
    };
  } catch (error) {
    throw new Error(error.response?.data?.message || error.message || 'Failed to create review');
  }
}

  /**
   * Get reviews for a specific listing/unit
   * @param {number} listingId - Listing ID
   * @param {object} options - Query options
   * @returns {Promise<object>} Reviews data
   */
  async getListingReviews(listingId, options = {}) {
  try {
    const { page = 1, rating, sortBy = 'newest' } = options;
    
    const params = { page };
    if (rating) params.rating = rating;
    if (sortBy) params.sortBy = sortBy;

    const response = await reviewAPI.getListingReviews(listingId, params);
    
    return {
      reviews: response.data.data?.reviews || [],
      listing: response.data.data?.listing,
      statistics: response.data.data?.statistics || {},
      pagination: response.data.data?.pagination || {}
    };
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch listing reviews');
  }
}

  async getUserReviews(userId) {
  try {
    const response = await userAPI.getUserReviews(userId);
    
    console.log('API response:', response); // Debug log
    
    // Fix the response structure
    return {
      received: response.data.data?.reviews || [],  // Add the missing 'data' level
      statistics: response.data.data?.statistics || {}
    };
  } catch (error) {
    throw new Error('Failed to fetch user reviews');
  }
}

  /**
   * Get user's reviews (written and received)
   * @param {string} type - 'written', 'received', or 'all'
   * @returns {Promise<object>} User reviews
   */
  async getMyReviews(type = 'all') {
    try {
      const response = await reviewAPI.getMyReviews(type);
      
      return {
        written: response.data.data?.written || [],
        received: response.data.data?.received || [],
        statistics: response.data.data?.statistics || {}
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch user reviews');
    }
  }

  /**
   * Delete/remove review
   * @param {number} reviewId - Review ID
   * @returns {Promise<object>} Deletion result
   */
  async deleteReview(reviewId) {
    try {
      const response = await reviewAPI.deleteReview(reviewId);
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete review');
    }
  }

  /**
   * Check if user can review a booking
   * @param {object} booking - Booking object
   * @param {number} currentUserId - Current user ID
   * @returns {object} Review eligibility
   */
  canReviewBooking(booking, currentUserId) {
    const now = new Date();
    const bookingEndDate = new Date(booking.end_date);
    const daysSinceEnd = Math.floor((now - bookingEndDate) / (1000 * 60 * 60 * 24));

    // Can only review completed bookings
    if (booking.status !== 'completed') {
      return {
        canReview: false,
        reason: 'Booking must be completed before reviewing'
      };
    }

    // Must be within 30 days of completion
    if (daysSinceEnd > 30) {
      return {
        canReview: false,
        reason: 'Review period has expired (30 days after completion)'
      };
    }

    // User must be part of the booking
    const isClient = booking.client_id === currentUserId;
    const isHost = booking.host_id === currentUserId;

    if (!isClient && !isHost) {
      return {
        canReview: false,
        reason: 'You can only review bookings you participated in'
      };
    }

    return {
      canReview: true,
      reviewType: isClient ? REVIEW_TYPES.HOST : REVIEW_TYPES.CLIENT,
      revieweeId: isClient ? booking.host_id : booking.client_id
    };
  }

  /**
   * Format review for display
   * @param {object} review - Review object
   * @param {object} options - Formatting options
   * @returns {object} Formatted review
   */
  formatReview(review, options = {}) {
    const { showFullComment = false, currentUserId } = options;

    return {
      ...review,
      isMyReview: review.reviewer_id === currentUserId,
      ratingStars: this.generateStarRating(review.rating),
      formattedDate: new Date(review.created_at).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'long', 
        day: 'numeric'
      }),
      shortComment: showFullComment ? review.comment : this.truncateComment(review.comment),
      timeAgo: this.formatTimeAgo(review.created_at),
      canDelete: review.reviewer_id === currentUserId && this.canDeleteReview(review.created_at)
    };
  }

  /**
   * Generate star rating display
   * @param {number} rating - Rating value (1-5)
   * @returns {Array} Star rating array
   */
  generateStarRating(rating) {
    return Array.from({ length: 5 }, (_, index) => ({
      filled: index < rating,
      halfFilled: index === Math.floor(rating) && rating % 1 !== 0,
      empty: index >= Math.ceil(rating)
    }));
  }

  /**
   * Calculate review statistics
   * @param {Array} reviews - Reviews array
   * @returns {object} Review statistics
   */
  calculateReviewStatistics(reviews) {
    if (!reviews || reviews.length === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      };
    }

    const totalReviews = reviews.length;
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / totalReviews;

    const distribution = reviews.reduce((dist, review) => {
      dist[review.rating] = (dist[review.rating] || 0) + 1;
      return dist;
    }, { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });

    // Calculate percentages
    const distributionPercentages = Object.keys(distribution).reduce((perc, rating) => {
      perc[rating] = Math.round((distribution[rating] / totalReviews) * 100);
      return perc;
    }, {});

    return {
      totalReviews,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      distribution,
      distributionPercentages
    };
  }

  /**
   * Filter reviews by criteria
   * @param {Array} reviews - Reviews array
   * @param {object} filters - Filter criteria
   * @returns {Array} Filtered reviews
   */
  filterReviews(reviews, filters = {}) {
    let filtered = [...reviews];

    if (filters.rating) {
      filtered = filtered.filter(review => review.rating === filters.rating);
    }

    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      filtered = filtered.filter(review => {
        const reviewDate = new Date(review.created_at);
        return reviewDate >= new Date(start) && reviewDate <= new Date(end);
      });
    }

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(review =>
        review.comment.toLowerCase().includes(term) ||
        review.reviewer_name.toLowerCase().includes(term)
      );
    }

    return filtered;
  }

  /**
   * Sort reviews by criteria
   * @param {Array} reviews - Reviews array
   * @param {string} sortBy - Sort criteria
   * @returns {Array} Sorted reviews
   */
  sortReviews(reviews, sortBy = 'newest') {
    const sorted = [...reviews];

    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      case 'highest':
        return sorted.sort((a, b) => b.rating - a.rating);
      case 'lowest':
        return sorted.sort((a, b) => a.rating - b.rating);
      default:
        return sorted;
    }
  }

  /**
   * Truncate comment for preview
   * @param {string} comment - Full comment
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated comment
   */
  truncateComment(comment, maxLength = 150) {
    if (!comment || comment.length <= maxLength) return comment;
    return comment.substring(0, maxLength) + '...';
  }

  /**
   * Format time ago
   * @param {string} timestamp - Timestamp
   * @returns {string} Formatted time ago
   */
  formatTimeAgo(timestamp) {
    const now = new Date();
    const reviewTime = new Date(timestamp);
    const diffInDays = Math.floor((now - reviewTime) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  }

  /**
   * Check if review can be deleted
   * @param {string} createdAt - Review creation date
   * @returns {boolean} Can delete
   */
  canDeleteReview(createdAt) {
    const reviewDate = new Date(createdAt);
    const now = new Date();
    const daysSinceCreation = Math.floor((now - reviewDate) / (1000 * 60 * 60 * 24));
    
    // Allow deletion within 7 days of creation
    return daysSinceCreation <= 7;
  }

  /**
   * Get review template/prompts
   * @param {string} type - Review type
   * @returns {object} Review templates
   */
  getReviewTemplates(type) {
    const templates = {
      [REVIEW_TYPES.HOST]: {
        prompts: [
          'How was your communication with the host?',
          'Was the check-in process smooth?',
          'How well did the host respond to questions?'
        ],
        suggestions: [
          'Great communication',
          'Very responsive',
          'Helpful and friendly',
          'Professional service'
        ]
      },
      [REVIEW_TYPES.LISTING]: {
        prompts: [
          'How accurate was the listing description?',
          'How was the cleanliness?',
          'Would you recommend this place?'
        ],
        suggestions: [
          'Exactly as described',
          'Very clean and tidy',
          'Great location',
          'Comfortable stay'
        ]
      }
    };

    return templates[type] || templates[REVIEW_TYPES.LISTING];
  }
}

export default new ReviewService();