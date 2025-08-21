import axios from './axios';

export const fetchEarningsSummary = async () => {
  const res = await axios.get('/earnings/summary');
  return res.data;
};

export const fetchEarningsDetailed = async () => {
  const res = await axios.get('/earnings/detailed');
  return res.data;
};
