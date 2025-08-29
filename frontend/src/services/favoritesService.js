// src/services/favoritesService.js - Favorites Management
import { favoritesAPI } from './api';

class FavoritesService {
  /**
   * Add listing to favorites
   * @param {number} listingId - Listing ID
   * @returns {Promise<object>} Add result
   */
  async addToFavorites(listingId) {
    try {
      if (!listingId) {
        throw new Error('Listing ID is required');
      }

      const response = await favoritesAPI.addFavorite(listingId);
      return {
        success: true,
        message: 'Added to favorites',
        data: response.data
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to add to favorites');
    }
  }

  /**
   * Remove listing from favorites
   * @param {number} listingId - Listing ID
   * @returns {Promise<object>} Remove result
   */
  async removeFromFavorites(listingId) {
    try {
      if (!listingId) {
        throw new Error('Listing ID is required');
      }

      const response = await favoritesAPI.removeFavorite(listingId);
      return {
        success: true,
        message: 'Removed from favorites',
        data: response.data
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to remove from favorites');
    }
  }

  /**
   * Get user's favorite listings
   * @param {number} page - Page number
   * @returns {Promise<object>} Favorites data
   */
  async getFavorites(page = 1) {
    try {
      const response = await favoritesAPI.getFavorites(page);
      return {
        favorites: response.data.data?.favorites || [],
        pagination: response.data.data?.pagination || {}
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to fetch favorites');
    }
  }

  /**
   * Check if listing is favorited
   * @param {number} listingId - Listing ID
   * @param {Array} favorites - User's favorites array
   * @returns {boolean} Is favorited
   */
  isFavorited(listingId, favorites = []) {
    return favorites.some(fav => fav.id === listingId || fav.listing_id === listingId);
  }

  /**
   * Toggle favorite status
   * @param {number} listingId - Listing ID
   * @param {Array} currentFavorites - Current favorites array
   * @returns {Promise<object>} Toggle result
   */
  async toggleFavorite(listingId, currentFavorites = []) {
    try {
      const isFavorited = this.isFavorited(listingId, currentFavorites);
      
      if (isFavorited) {
        return await this.removeFromFavorites(listingId);
      } else {
        return await this.addToFavorites(listingId);
      }
    } catch (error) {
      throw new Error(error.message || 'Failed to toggle favorite');
    }
  }

  /**
   * Get favorite statistics
   * @param {Array} favorites - Favorites array
   * @returns {object} Statistics
   */
  getFavoriteStats(favorites = []) {
    const stats = {
      total: favorites.length,
      byLocation: {},
      averagePrice: 0,
      priceRange: { min: 0, max: 0 }
    };

    if (favorites.length === 0) return stats;

    let totalPrice = 0;
    let minPrice = Infinity;
    let maxPrice = 0;

    favorites.forEach(fav => {
      // Count by location
      const location = fav.location || 'Unknown';
      stats.byLocation[location] = (stats.byLocation[location] || 0) + 1;

      // Price calculations
      const price = fav.price_per_night || 0;
      totalPrice += price;
      if (price > 0) {
        minPrice = Math.min(minPrice, price);
        maxPrice = Math.max(maxPrice, price);
      }
    });

    stats.averagePrice = Math.round(totalPrice / favorites.length);
    stats.priceRange.min = minPrice === Infinity ? 0 : minPrice;
    stats.priceRange.max = maxPrice;

    return stats;
  }
}

export const favoritesService = new FavoritesService();