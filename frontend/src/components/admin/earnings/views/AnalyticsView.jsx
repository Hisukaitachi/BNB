// src/components/admin/earnings/views/AnalyticsView.jsx
import React from 'react';
import { TrendingUp, Activity, AlertCircle } from 'lucide-react';
import MonthlyComparisonChart from '../components/charts/MonthlyComparissonChart';
import BookingAnalytics from '../components/BookingAnalytics';
import FinancialHealthMetrics from '../components/FinancialHealthMetrics';
import InsightCard from '../components/InsightCard';
import { formatCurrency, formatPercentage } from '../utils/formatters';

const AnalyticsView = ({ analytics, bookings }) => {
  if (!analytics) return null;

  const insights = {
    revenue: [
      `Platform revenue up ${analytics.revenueGrowth}% this period`,
      `Average booking value: ${formatCurrency(analytics.bookingAnalytics.averageBookingValue)}`,
      `Peak earning day: Thursday`
    ],
    operational: [
      `${formatPercentage(analytics.payoutSuccessRate)} payout success rate`,
      `Average processing time: 2.3 days`,
      `${analytics.payoutStatusDistribution.pending} payouts pending review`
    ],
    risk: [
      `${formatPercentage(analytics.refundRate)} refund rate`,
      `${formatCurrency(analytics.pendingRefunds)} in pending refunds`,
      `${analytics.payoutStatusDistribution.failed} failed transactions`
    ]
  };

  return (
    <>
      {/* Advanced Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BookingAnalytics analytics={analytics.bookingAnalytics} />
        <FinancialHealthMetrics analytics={analytics} />
      </div>

      {/* Monthly Comparison Chart */}
      <MonthlyComparisonChart data={analytics.monthlyTrend} />

      {/* Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InsightCard
          title="Revenue Optimization"
          icon={TrendingUp}
          color="green"
          insights={insights.revenue}
        />
        
        <InsightCard
          title="Operational Efficiency"
          icon={Activity}
          color="blue"
          insights={insights.operational}
        />
        
        <InsightCard
          title="Risk Management"
          icon={AlertCircle}
          color="orange"
          insights={insights.risk}
        />
      </div>
    </>
  );
};

export default AnalyticsView;