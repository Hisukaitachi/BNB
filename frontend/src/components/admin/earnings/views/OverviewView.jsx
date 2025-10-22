// src/components/admin/earnings/views/OverviewView.jsx
import React from 'react';
import { DollarSign, TrendingUp, Wallet, Clock, Percent, Activity, Receipt } from 'lucide-react';
import MetricCard from '../components/MetricCard';
import RevenueTrendChart from '../components/charts/RevenueTrendChart';
import PaymentMethodChart from '../components/charts/PaymentMethodChart';
import TopHostsList from '../components/TopHostList';
import { formatCurrency, formatCompactNumber, formatPercentage, formatNumber } from '../utils/formatters';

const OverviewView = ({ analytics, selectedMetric, setSelectedMetric }) => {
  if (!analytics) return null;

  return (
    <>
      {/* Key Metrics Cards - Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          title="Platform Revenue"
          value={formatCompactNumber(analytics.totalPlatformRevenue)}
          change={analytics.revenueGrowth}
          icon={DollarSign}
          color="green"
          subtitle="Total earnings"
        />

        <MetricCard
          title="Net Revenue"
          value={formatCompactNumber(analytics.netPlatformRevenue)}
          change={12.5}
          icon={TrendingUp}
          color="blue"
          subtitle="After refunds"
        />

        <MetricCard
          title="Host Payouts"
          value={formatCompactNumber(analytics.totalPaidToHosts)}
          change={analytics.payoutGrowth}
          icon={Wallet}
          color="purple"
          subtitle={`${analytics.payoutStatusDistribution.completed} completed`}
        />

        <MetricCard
          title="Pending Payouts"
          value={formatCompactNumber(analytics.pendingHostPayouts)}
          icon={Clock}
          color="orange"
          subtitle={`${analytics.payoutStatusDistribution.pending} requests`}
          showChange={false}
        />
      </div>

      {/* Revenue Breakdown - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Commission Breakdown */}
        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-white">Commission Breakdown</h3>
            <Percent className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400 text-xs sm:text-sm">Booking Commission</span>
                <span className="text-white font-semibold text-sm sm:text-base">
                  {formatCurrency(analytics.platformCommission)}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                  style={{ width: '70%' }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400 text-xs sm:text-sm">Payout Fees</span>
                <span className="text-white font-semibold text-sm sm:text-base">
                  {formatCurrency(analytics.payoutFeeRevenue)}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                  style={{ width: '30%' }}
                />
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Total Revenue</span>
                <span className="text-xl sm:text-2xl font-bold text-green-400">
                  {formatCurrency(analytics.totalPlatformRevenue)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payout Statistics */}
        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-white">Payout Statistics</h3>
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-xs sm:text-sm">Success Rate</span>
              <span className="text-lg sm:text-xl font-bold text-blue-400">
                {formatPercentage(analytics.payoutSuccessRate)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-xs sm:text-sm">Average Amount</span>
              <span className="text-white font-semibold text-sm sm:text-base">
                {formatCurrency(analytics.averagePayoutAmount)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-xs sm:text-sm">Average Fee</span>
              <span className="text-white font-semibold text-sm sm:text-base">
                {formatCurrency(analytics.averagePayoutFee)}
              </span>
            </div>
            
            <div className="pt-4 border-t border-gray-700">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-2 bg-gray-700 rounded">
                  <div className="text-lg sm:text-2xl font-bold text-orange-400">
                    {formatNumber(analytics.payoutStatusDistribution.pending)}
                  </div>
                  <div className="text-xs text-gray-400">Pending</div>
                </div>
                <div className="text-center p-2 bg-gray-700 rounded">
                  <div className="text-lg sm:text-2xl font-bold text-green-400">
                    {formatNumber(analytics.payoutStatusDistribution.completed)}
                  </div>
                  <div className="text-xs text-gray-400">Completed</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Refund Impact */}
        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-white">Refund Impact</h3>
            <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-xs sm:text-sm">Total Refunded</span>
              <span className="text-red-400 font-semibold text-sm sm:text-base">
                -{formatCurrency(analytics.totalRefunded)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-xs sm:text-sm">Pending Refunds</span>
              <span className="text-orange-400 font-semibold text-sm sm:text-base">
                {formatCurrency(analytics.pendingRefunds)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-xs sm:text-sm">Refund Rate</span>
              <span className="text-white font-semibold text-sm sm:text-base">
                {formatPercentage(analytics.refundRate)}
              </span>
            </div>
            
            <div className="pt-4 border-t border-gray-700">
              <div className="text-center p-3 bg-gradient-to-r from-red-600/10 to-orange-600/10 rounded-lg border border-red-600/20">
                <div className="text-xs sm:text-sm text-gray-400 mb-1">Revenue Impact</div>
                <div className="text-lg sm:text-xl font-bold text-red-400">
                  -{formatCurrency(analytics.totalRefunded * 0.10)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <RevenueTrendChart 
        data={analytics.monthlyTrend}
        selectedMetric={selectedMetric}
        setSelectedMetric={setSelectedMetric}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <PaymentMethodChart data={analytics.paymentMethodStats} />
        <TopHostsList hosts={analytics.topHosts} />
      </div>
    </>
  );
};

export default OverviewView;