// src/components/admin/earnings/components/TopHostsList.jsx
import React from 'react';
import { Users, ChevronRight } from 'lucide-react';
import Button from '../../../ui/Button';
import { formatCurrency } from '../utils/formatters';

const TopHostsList = ({ hosts }) => {
  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-white">Top Hosts</h3>
        <Button variant="ghost" size="sm" className="text-blue-400">
          View All
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
      
      {hosts && hosts.length > 0 ? (
        <div className="space-y-3">
          {hosts.slice(0, 5).map((host, index) => (
            <div key={host.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                  index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                  index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                  index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                  'bg-gray-600'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <div className="text-white font-medium">{host.name}</div>
                  <div className="text-xs text-gray-400">{host.bookingCount} bookings</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-green-400 font-semibold">{formatCurrency(host.totalEarnings)}</div>
                <div className="text-xs text-gray-400">Fees: {formatCurrency(host.totalFees)}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-400">No host data available</p>
        </div>
      )}
    </div>
  );
};

export default TopHostsList;