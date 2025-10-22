// src/components/admin/earnings/components/FinancialHealthMetrics.jsx
import React from 'react';
import { Activity, TrendingUp, AlertTriangle, Shield } from 'lucide-react';
import HealthMetric from './HealthMetric';

const FinancialHealthMetrics = ({ analytics }) => {
  if (!analytics) return null;

  const healthScores = {
    revenue: calculateHealthScore(analytics.revenueGrowth, 10, false),
    efficiency: calculateHealthScore(analytics.payoutSuccessRate, 90, false),
    risk: calculateHealthScore(analytics.refundRate, 5, true),
    liquidity: calculateHealthScore(analytics.hostPayoutBalance, 100000, true)
  };

  const overallHealth = (healthScores.revenue + healthScores.efficiency + healthScores.risk + healthScores.liquidity) / 4;

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Financial Health</h3>
        <div className="flex items-center gap-2">
          <HealthIndicator score={overallHealth} />
          <span className="text-sm text-gray-400">
            Overall: {overallHealth.toFixed(0)}%
          </span>
        </div>
      </div>
      
      <div className="space-y-4">
        <HealthMetric
          label="Revenue Growth"
          value={analytics.revenueGrowth}
          type="percentage"
          threshold={10}
        />
        
        <HealthMetric
          label="Payout Efficiency"
          value={analytics.payoutSuccessRate}
          type="percentage"
          threshold={90}
        />
        
        <HealthMetric
          label="Refund Rate"
          value={analytics.refundRate}
          type="percentage"
          threshold={5}
          inverse
        />
        
        <HealthMetric
          label="Outstanding Balance"
          value={analytics.hostPayoutBalance}
          type="currency"
          threshold={100000}
          inverse
        />

        <div className="pt-4 border-t border-gray-700">
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              icon={TrendingUp}
              label="Growth Score"
              value={`${healthScores.revenue.toFixed(0)}%`}
              color={getScoreColor(healthScores.revenue)}
            />
            <MetricCard
              icon={Activity}
              label="Efficiency Score"
              value={`${healthScores.efficiency.toFixed(0)}%`}
              color={getScoreColor(healthScores.efficiency)}
            />
            <MetricCard
              icon={AlertTriangle}
              label="Risk Score"
              value={`${healthScores.risk.toFixed(0)}%`}
              color={getScoreColor(healthScores.risk)}
            />
            <MetricCard
              icon={Shield}
              label="Stability Score"
              value={`${healthScores.liquidity.toFixed(0)}%`}
              color={getScoreColor(healthScores.liquidity)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const calculateHealthScore = (value, threshold, inverse) => {
  if (inverse) {
    return value < threshold ? 100 : Math.max(0, 100 - ((value - threshold) / threshold) * 100);
  }
  return value > threshold ? 100 : (value / threshold) * 100;
};

const getScoreColor = (score) => {
  if (score >= 80) return 'green';
  if (score >= 60) return 'yellow';
  return 'red';
};

const HealthIndicator = ({ score }) => {
  let color = 'text-red-400';
  let bgColor = 'bg-red-600/20';
  
  if (score >= 80) {
    color = 'text-green-400';
    bgColor = 'bg-green-600/20';
  } else if (score >= 60) {
    color = 'text-yellow-400';
    bgColor = 'bg-yellow-600/20';
  }

  return (
    <div className={`px-3 py-1 rounded-full ${bgColor}`}>
      <span className={`text-sm font-semibold ${color}`}>
        {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs Attention'}
      </span>
    </div>
  );
};

const MetricCard = ({ icon: Icon, label, value, color }) => {
  const colorClasses = {
    green: 'text-green-400 bg-green-600/20',
    yellow: 'text-yellow-400 bg-yellow-600/20',
    red: 'text-red-400 bg-red-600/20'
  };

  return (
    <div className="p-3 bg-gray-700 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded ${colorClasses[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <div className={`text-xl font-bold ${colorClasses[color].split(' ')[0]}`}>
        {value}
      </div>
    </div>
  );
};

export default FinancialHealthMetrics;