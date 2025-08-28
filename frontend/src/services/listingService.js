// src/services/listingService.js
import api from './api';

class ListingService {
  // Get all listings
  async getAllListings() {
    try {
      const response = await api.get('/listings');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get listing by ID
  async getListingById(id) {
    try {
      const response = await api.get(`/listings/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Search listings
  async searchListings(params) {
    try {
      const response = await api.get('/listings/search', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get nearby listings
  async getNearbyListings(lat, lng, radius = 10) {
    try {
      const response = await api.get('/listings/nearby', {
        params: { lat, lng, radius }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get search suggestions
  async getSearchSuggestions(query) {
    try {
      const response = await api.get('/listings/suggestions', {
        params: { q: query }
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Create listing (for hosts)
  async createListing(listingData) {
    try {
      const formData = new FormData();
      
      // Add text fields
      Object.keys(listingData).forEach(key => {
        if (key !== 'image' && key !== 'video') {
          formData.append(key, listingData[key]);
        }
      });
      
      // Add files if present
      if (listingData.image) {
        formData.append('image', listingData.image);
      }
      if (listingData.video) {
        formData.append('video', listingData.video);
      }

      const response = await api.post('/listings', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Update listing
  async updateListing(id, data) {
    try {
      const response = await api.put(`/listings/${id}`, data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Delete listing
  async deleteListing(id) {
    try {
      const response = await api.delete(`/listings/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get host's listings
  async getMyListings() {
    try {
      const response = await api.get('/listings/my-listings');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get listing reviews
  async getListingReviews(listingId, params = {}) {
    try {
      const response = await api.get(`/reviews/listing/${listingId}`, { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Error handler
  handleError(error) {
    if (error.response?.data?.message) {
      return new Error(error.response.data.message);
    }
    return new Error(error.message || 'Something went wrong');
  }
}

export default new ListingService();