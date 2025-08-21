// src/services/listingService.js
import axios from '../api/axios';

export const getAllListings = async (filters = {}) => {
  try {
    const {
      city,
      priceMin,
      priceMax,
      keyword,
      minRating,
      checkIn,
      checkOut,
      page = 1,
      limit = 10,
      sortBy = 'created_at',
      order = 'DESC',
    } = filters;

    const params = {
      ...(city && { city }),
      ...(priceMin && { price_min: priceMin }),
      ...(priceMax && { price_max: priceMax }),
      ...(keyword && { keyword }),
      ...(minRating && { min_rating: minRating }),
      ...(checkIn && { check_in: checkIn }),
      ...(checkOut && { check_out: checkOut }),
      page,
      limit,
      sortBy,
      order,
    };

    const res = await axios.get('/listings/search', { params });
    return res.data; // { listings: [...], total: x }
  } catch (err) {
    console.error('Error fetching listings:', err);
    throw err;
  }
};
