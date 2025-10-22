// src/components/admin/earnings/components/HealthMetric.jsx
import React from 'react';
import { CheckCircle, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, formatPercentage } from '../utils/formatters';

const HealthMetric = ({ label, value, type, threshold, inverse = false }) => {
  const isGood = inverse ? value < threshold : value > threshold;
  
  const displayValue = () => {
    switch(type) {
      case 'percentage':
        return formatPercentage(value);
      case 'currency':
        return formatCurrency(value);
      case 'number':
        return value.toLocaleString();
      default:
        return value;
    }
  };

  const getTrendIcon = () => {
    if (isGood) {
      return inverse ? <TrendingDown className="w-4 h-4 text-green-400" /> : <TrendingUp className="w-4 h-4 text-green-400" />;
    }
    return inverse ? <TrendingUp className="w-4 h-4 text-red-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />;
  };

  return (
    <div className={`flex justify-between items-center p-4 rounded-lg transition-all ${
      isGood ? 'bg-green-900/20 border border-green-600/20' : 'bg-red-900/20 border border-red-600/20'
    }`}>
      <div className="flex-1">
        <span className="text-gray-400 text-sm">{label}</span>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-2xl font-bold ${isGood ? 'text-green-400' : 'text-red-400'}`}>
            {displayValue()}
          </span>
          {getTrendIcon()}
        </div>
      </div>
      <div className="ml-4">
        {isGood ? (
          <CheckCircle className="w-6 h-6 text-green-400" />
        ) : (
          <AlertCircle className="w-6 h-6 text-red-400" />
        )}
      </div>
    </div>
  );
};

export default HealthMetric;