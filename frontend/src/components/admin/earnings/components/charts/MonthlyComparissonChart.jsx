// src/components/admin/earnings/components/charts/MonthlyComparisonChart.jsx
import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { formatCurrency, formatNumber } from '../../utils/formatters';

const MonthlyComparisonChart = ({ data }) => {
  const [selectedView, setSelectedView] = useState('revenue');

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
          <p className="text-white font-semibold mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex justify-between items-center gap-4">
              <span className="text-gray-400 text-sm">{entry.name}:</span>
              <span className="text-white font-medium">
                {entry.name.includes('Count') 
                  ? formatNumber(entry.value)
                  : formatCurrency(entry.value)
                }
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-white">Monthly Comparison</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedView('revenue')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              selectedView === 'revenue'
                ? 'bg-red-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            Revenue
          </button>
          <button
            onClick={() => setSelectedView('activity')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              selectedView === 'activity'
                ? 'bg-red-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            Activity
          </button>
          <button
            onClick={() => setSelectedView('combined')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              selectedView === 'combined'
                ? 'bg-red-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            Combined
          </button>
        </div>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="month" 
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              yAxisId="left"
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
            />
            {selectedView === 'combined' && (
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
              />
            )}
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {selectedView === 'revenue' && (
              <>
                <Bar dataKey="bookingRevenue" name="Booking Revenue" fill="#EF4444" />
                <Bar dataKey="platformCommission" name="Commission" fill="#10B981" />
                <Bar dataKey="payoutFees" name="Payout Fees" fill="#3B82F6" />
                <Bar dataKey="refunds" name="Refunds" fill="#F59E0B" />
              </>
            )}
            
            {selectedView === 'activity' && (
              <>
                <Bar dataKey="bookingCount" name="Bookings" fill="#8B5CF6" />
                <Bar dataKey="payoutCount" name="Payouts" fill="#EC4899" />
                <Line 
                  type="monotone" 
                  dataKey="netRevenue" 
                  name="Net Revenue" 
                  stroke="#10B981" 
                  strokeWidth={2}
                />
              </>
            )}
            
            {selectedView === 'combined' && (
              <>
                <Bar yAxisId="left" dataKey="bookingRevenue" name="Revenue" fill="#EF4444" />
                <Bar yAxisId="left" dataKey="platformCommission" name="Commission" fill="#10B981" />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="bookingCount" 
                  name="Bookings" 
                  stroke="#F59E0B" 
                  strokeWidth={2}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MonthlyComparisonChart;