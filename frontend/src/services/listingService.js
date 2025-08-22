/ src/services/listingService.js
class ListingService {
  /**
   * Get all listings with optional filters
   * @param {object} filters - Search filters
   * @returns {Promise<Array>} Listings
   */
  async getListings(filters = {}) {
    try {
      const response = Object.keys(filters).length > 0 
        ? await api.searchListings(filters)
        : await api.getAllListings();
      
      return response.data?.listings || [];
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch listings');
    }
  }

  /**
   * Get listing by ID
   * @param {number} id - Listing ID
   * @returns {Promise<object>} Listing details
   */
  async getListingById(id) {
    try {
      const response = await api.getListingById(id);
      return response.data?.listing;
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch listing');
    }
  }

  /**
   * Search listings
   * @param {object} searchParams - Search parameters
   * @returns {Promise<Array>} Search results
   */
  async searchListings(searchParams) {
    try {
      const response = await api.searchListings(searchParams);
      return response.data?.listings || [];
    } catch (error) {
      throw new Error(error.message || 'Failed to search listings');
    }
  }

  /**
   * Get nearby listings
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} radius - Search radius in km
   * @returns {Promise<Array>} Nearby listings
   */
  async getNearbyListings(lat, lng, radius = 10) {
    try {
      const response = await api.get(`/listings/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
      return response.data?.listings || [];
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch nearby listings');
    }
  }

  /**
   * Create new listing (Host only)
   * @param {object} listingData - Listing data
   * @param {object} files - Image and video files
   * @returns {Promise<object>} Created listing
   */
  async createListing(listingData, files = {}) {
    try {
      const response = await api.createListing(listingData, files);
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.message || 'Failed to create listing');
    }
  }

  /**
   * Update listing (Host only)
   * @param {number} id - Listing ID
   * @param {object} updateData - Data to update
   * @returns {Promise<object>} Update result
   */
  async updateListing(id, updateData) {
    try {
      const response = await api.updateListing(id, updateData);
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.message || 'Failed to update listing');
    }
  }

  /**
   * Delete listing (Host only)
   * @param {number} id - Listing ID
   * @returns {Promise<object>} Delete result
   */
  async deleteListing(id) {
    try {
      const response = await api.deleteListing(id);
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(error.message || 'Failed to delete listing');
    }
  }

  /**
   * Get host's listings
   * @returns {Promise<Array>} Host listings
   */
  async getMyListings() {
    try {
      const response = await api.getMyListings();
      return response.data?.listings || [];
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch your listings');
    }
  }
}

export const listingService = new ListingService();
