// src/components/admin/earnings/components/BookingAnalytics.jsx
import React from 'react';
import { Package, TrendingUp, Users, DollarSign } from 'lucide-react';
import { formatCurrency, formatPercentage, formatNumber } from '../utils/formatters';

const BookingAnalytics = ({ analytics }) => {
  if (!analytics) return null;

  const metrics = [
    {
      label: 'Total Bookings',
      value: formatNumber(Object.values(analytics.statusDistribution).reduce((a, b) => a + b, 0)),
      icon: Package,
      color: 'text-blue-400',
      bgColor: 'bg-blue-600/20'
    },
    {
      label: 'Average Value',
      value: formatCurrency(analytics.averageBookingValue),
      icon: DollarSign,
      color: 'text-green-400',
      bgColor: 'bg-green-600/20'
    },
    {
      label: 'Completion Rate',
      value: formatPercentage(analytics.completionRate),
      icon: TrendingUp,
      color: 'text-purple-400',
      bgColor: 'bg-purple-600/20'
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(analytics.totalRevenue),
      icon: Users,
      color: 'text-orange-400',
      bgColor: 'bg-orange-600/20'
    }
  ];

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-6">Booking Analytics</h3>
      
      <div className="space-y-4">
        {metrics.map((metric, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                <metric.icon className={`w-5 h-5 ${metric.color}`} />
              </div>
              <span className="text-gray-300">{metric.label}</span>
            </div>
            <span className={`text-xl font-bold ${metric.color}`}>
              {metric.value}
            </span>
          </div>
        ))}
        
        <div className="pt-4 border-t border-gray-700">
          <h4 className="text-sm font-medium text-gray-400 mb-3">Booking Types</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-gradient-to-r from-blue-600/10 to-blue-600/5 rounded border border-blue-600/20">
              <div className="text-2xl font-bold text-blue-400">
                {analytics.typeDistribution?.book || 0}
              </div>
              <div className="text-xs text-gray-400">Full Payment</div>
            </div>
            <div className="p-3 bg-gradient-to-r from-purple-600/10 to-purple-600/5 rounded border border-purple-600/20">
              <div className="text-2xl font-bold text-purple-400">
                {analytics.typeDistribution?.reserve || 0}
              </div>
              <div className="text-xs text-gray-400">Reservations</div>
            </div>
          </div>
        </div>
        
                <div className="pt-4 border-t border-gray-700">
          <h4 className="text-sm font-medium text-gray-400 mb-3">Status Distribution</h4>
          <div className="space-y-2">
            {Object.entries(analytics.statusDistribution || {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusIndicator status={status} />
                  <span className="text-gray-300 capitalize">{status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{count}</span>
                  <span className="text-gray-500 text-xs">
                    ({((count / Object.values(analytics.statusDistribution).reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatusIndicator = ({ status }) => {
  const colors = {
    pending: 'bg-orange-400',
    approved: 'bg-blue-400',
    confirmed: 'bg-indigo-400',
    completed: 'bg-green-400',
    cancelled: 'bg-red-400',
    rejected: 'bg-gray-400'
  };

  return (
    <div className={`w-2 h-2 rounded-full ${colors[status] || 'bg-gray-400'}`} />
  );
};

export default BookingAnalytics;