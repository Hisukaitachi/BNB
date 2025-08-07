const axios = require('axios');
require('dotenv').config();

const OPENCAGE_API_KEY = process.env.OPENCAGE_API_KEY;

const getCoordinatesFromLocation = async (location) => {
  try {
    const response = await axios.get('https://api.opencagedata.com/geocode/v1/json', {
      params: {
        q: location,
        key: OPENCAGE_API_KEY, // you already destructured above
      },
    });

    if (response.data.results.length === 0) {
      return { latitude: null, longitude: null };
    }

    const { lat, lng } = response.data.results[0].geometry;
    return { latitude: lat, longitude: lng };
  } catch (error) {
    console.error('Geocoding failed:', error.message);
    return { latitude: null, longitude: null };
  }
};

module.exports = getCoordinatesFromLocation;
