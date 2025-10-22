// src/components/admin/earnings/components/charts/RevenueTrendChart.jsx
import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '../../utils/formatters';
import { Menu, X } from 'lucide-react';

const RevenueTrendChart = ({ data, selectedMetric, setSelectedMetric }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const metrics = [
    { key: 'bookingRevenue', label: 'Bookings', shortLabel: 'Book' },
    { key: 'platformCommission', label: 'Commission', shortLabel: 'Comm' },
    { key: 'netRevenue', label: 'Net Revenue', shortLabel: 'Net' }
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 p-2 sm:p-3 rounded-lg border border-gray-700">
          <p className="text-white font-semibold text-xs sm:text-sm mb-1">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex justify-between items-center gap-2 sm:gap-4">
              <span className="text-gray-400 text-xs sm:text-sm">{entry.name}:</span>
              <span className="text-white font-medium text-xs sm:text-sm">
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-white">Revenue Trend</h3>
        
        {/* Desktop Metric Buttons */}
        <div className="hidden sm:flex gap-2">
          {metrics.map((metric) => (
            <button
              key={metric.key}
              onClick={() => setSelectedMetric(metric.key)}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                selectedMetric === metric.key
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {metric.label}
            </button>
          ))}
        </div>

        {/* Mobile Metric Selector */}
        <div className="sm:hidden w-full">
          {/* Mobile Dropdown Toggle */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="w-full flex items-center justify-between px-3 py-2 bg-gray-700 rounded-lg text-white text-sm"
          >
            <span>
              {metrics.find(m => m.key === selectedMetric)?.label || 'Select Metric'}
            </span>
            {showMobileMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          {/* Mobile Dropdown Menu */}
          {showMobileMenu && (
            <div className="absolute z-10 mt-2 w-full bg-gray-700 rounded-lg shadow-lg border border-gray-600">
              {metrics.map((metric) => (
                <button
                  key={metric.key}
                  onClick={() => {
                    setSelectedMetric(metric.key);
                    setShowMobileMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    selectedMetric === metric.key
                      ? 'bg-red-600 text-white'
                      : 'text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {metric.label}
                </button>
              ))}
            </div>
          )}

          {/* Mobile Horizontal Scroll Buttons (Alternative) */}
          <div className="flex gap-1 mt-2 overflow-x-auto pb-2">
            {metrics.map((metric) => (
              <button
                key={metric.key}
                onClick={() => setSelectedMetric(metric.key)}
                className={`flex-shrink-0 px-2 py-1 text-xs rounded transition-colors ${
                  selectedMetric === metric.key
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-700 text-gray-400'
                }`}
              >
                {metric.shortLabel}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Container - Responsive Height */}
      <div className="h-64 sm:h-72 md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={data}
            margin={isMobile ? { top: 5, right: 5, left: -20, bottom: 5 } : { top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorCommission" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            
            <XAxis 
              dataKey="month" 
              stroke="#9CA3AF"
              tick={{ fontSize: isMobile ? 10 : 12 }}
              angle={isMobile ? -45 : 0}
              textAnchor={isMobile ? "end" : "middle"}
              height={isMobile ? 60 : 30}
              interval={isMobile ? 1 : 0}
            />
            
            <YAxis 
              stroke="#9CA3AF"
              tick={{ fontSize: isMobile ? 10 : 12 }}
              tickFormatter={(value) => {
                if (isMobile) {
                  return value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value;
                }
                return `₱${(value / 1000).toFixed(0)}k`;
              }}
              width={isMobile ? 35 : 60}
            />
            
            <Tooltip
              content={<CustomTooltip />}
              wrapperStyle={{ outline: 'none' }}
            />
            
            {!isMobile && <Legend 
              wrapperStyle={{ 
                fontSize: '14px',
                paddingTop: '10px'
              }}
            />}
            
            {selectedMetric === 'bookingRevenue' && (
              <Area
                type="monotone"
                dataKey="bookingRevenue"
                name={isMobile ? "Revenue" : "Booking Revenue"}
                stroke="#EF4444"
                strokeWidth={isMobile ? 1.5 : 2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
                dot={false}
              />
            )}
            
            {selectedMetric === 'platformCommission' && (
              <Area
                type="monotone"
                dataKey="platformCommission"
                name={isMobile ? "Commission" : "Platform Commission"}
                stroke="#10B981"
                strokeWidth={isMobile ? 1.5 : 2}
                fillOpacity={1}
                fill="url(#colorCommission)"
                dot={false}
              />
            )}
            
            {selectedMetric === 'netRevenue' && (
              <Area
                type="monotone"
                dataKey="netRevenue"
                name={isMobile ? "Net" : "Net Revenue"}
                stroke="#3B82F6"
                strokeWidth={isMobile ? 1.5 : 2}
                fillOpacity={1}
                fill="url(#colorNet)"
                dot={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Mobile Legend */}
      {isMobile && (
        <div className="mt-3 flex items-center justify-center">
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded ${
                selectedMetric === 'bookingRevenue' ? 'bg-red-500' :
                selectedMetric === 'platformCommission' ? 'bg-green-500' :
                'bg-blue-500'
              }`} />
              <span className="text-gray-400">
                {metrics.find(m => m.key === selectedMetric)?.label}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats for Mobile */}
      {isMobile && data && data.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-3 gap-2">
          <div className="text-center">
            <p className="text-xs text-gray-400">Current</p>
            <p className="text-sm font-semibold text-white">
              ₱{((data[data.length - 1]?.[selectedMetric] || 0) / 1000).toFixed(0)}k
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Average</p>
            <p className="text-sm font-semibold text-white">
              ₱{(data.reduce((sum, item) => sum + (item[selectedMetric] || 0), 0) / data.length / 1000).toFixed(0)}k
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400">Total</p>
            <p className="text-sm font-semibold text-white">
              ₱{(data.reduce((sum, item) => sum + (item[selectedMetric] || 0), 0) / 1000).toFixed(0)}k
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueTrendChart;
