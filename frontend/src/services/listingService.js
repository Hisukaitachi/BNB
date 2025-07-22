// src/services/listingService.js
import axios from '../api/axios';

export const getAllListings = async () => {
  const res = await axios.get('/listings');
  return res.data.listings; // Matches your controller’s response structure
};