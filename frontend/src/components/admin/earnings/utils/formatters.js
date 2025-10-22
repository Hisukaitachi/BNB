// src/components/admin/earnings/utils/formatters.js

export const formatCurrency = (value) => {
  const number = parseFloat(value) || 0;
  return `₱${number.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

export const formatNumber = (value) => {
  const number = parseInt(value) || 0;
  return number.toLocaleString('en-US');
};

export const formatPercentage = (value) => {
  const number = parseFloat(value) || 0;
  return `${number.toFixed(1)}%`;
};

export const formatCompactNumber = (value) => {
  const number = parseFloat(value) || 0;
  if (number >= 1000000) {
    return `₱${(number / 1000000).toFixed(1)}M`;
  } else if (number >= 1000) {
    return `₱${(number / 1000).toFixed(1)}K`;
  }
  return formatCurrency(number);
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};