// src/components/admin/earnings/components/charts/PaymentMethodChart.jsx
import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { CreditCard } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const PaymentMethodChart = ({ data }) => {
  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-gray-900 p-3 rounded-lg border border-gray-700">
          <p className="text-white font-semibold capitalize">
            {data.payload.method.replace('_', ' ')}
          </p>
          <p className="text-gray-400 text-sm">
            Amount: {formatCurrency(data.value)}
          </p>
          <p className="text-gray-400 text-sm">
            Transactions: {data.payload.count}
          </p>
          <p className="text-gray-400 text-sm">
            Avg Fee: {formatCurrency(data.payload.averageFee)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-6">Payment Methods</h3>
      
      {data && data.length > 0 ? (
        <>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="totalAmount"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 space-y-2">
            {data.map((method, index) => (
              <div key={method.method} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-gray-300 capitalize">
                    {method.method.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-white font-semibold">{formatCurrency(method.totalAmount)}</div>
                  <div className="text-xs text-gray-400">
                    {method.count} transactions • Fee: {formatCurrency(method.averageFee)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-400">No payment method data available</p>
        </div>
      )}
    </div>
  );
};

export default PaymentMethodChart;