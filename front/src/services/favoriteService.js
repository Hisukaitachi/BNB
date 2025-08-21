import axios from '../api/axios';

export const addFavorite = (listingId) =>
  axios.post(`/favorites/${listingId}`, {}, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  });

export const removeFavorite = (listingId) =>
  axios.delete(`/favorites/${listingId}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  });

export const getFavorites = () =>
  axios.get('/favorites', {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    }
  }).then(res => res.data); // returns listing[] for now