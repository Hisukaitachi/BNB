// src/components/admin/earnings/components/InsightCard.jsx
import React from 'react';
import { ChevronRight } from 'lucide-react';

const InsightCard = ({ title, icon: Icon, color, insights }) => {
  const colorClasses = {
    green: 'from-green-600/20 to-green-600/5 border-green-600/20',
    blue: 'from-blue-600/20 to-blue-600/5 border-blue-600/20',
    orange: 'from-orange-600/20 to-orange-600/5 border-orange-600/20'
  };

  const iconColors = {
    green: 'text-green-400',
    blue: 'text-blue-400',
    orange: 'text-orange-400'
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-6 border`}>
      <div className="flex items-center gap-3 mb-4">
        <Icon className={`w-6 h-6 ${iconColors[color]}`} />
        <h4 className="text-white font-semibold">{title}</h4>
      </div>
      <ul className="space-y-2">
        {insights.map((insight, index) => (
          <li key={index} className="flex items-start gap-2">
            <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-gray-300">{insight}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default InsightCard;