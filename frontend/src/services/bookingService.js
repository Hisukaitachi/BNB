import axios from '../api/axios';

export const createBooking = (data) => {
  return axios.post('/bookings', data, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}` // update based on your auth flow
    }
  });
};