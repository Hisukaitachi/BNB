// src/components/admin/earnings/utils/calculations.js

export const calculateGrowth = (current, previous) => {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

export const calculatePayoutSuccessRate = (stats) => {
  if (!stats) return 0;
  const total = parseInt(stats.completed_count || 0) + 
                parseInt(stats.rejected_count || 0) + 
                parseInt(stats.failed_count || 0);
  return total > 0 ? (parseInt(stats.completed_count || 0) / total) * 100 : 0;
};

export const calculatePlatformMetrics = (dashboardStats, payoutStats, payouts, refunds) => {
  const platformCommissionRate = 0.10; // 10% platform fee
  const totalBookingRevenue = parseFloat(dashboardStats.totalRevenue || 0);
  const platformCommission = totalBookingRevenue * platformCommissionRate;
  
  const payoutFeeRevenue = parseFloat(payoutStats.total_fees_paid || 0);
  const pendingPayoutFees = payouts
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + parseFloat(p.fee || 0), 0);
  
  const totalPlatformRevenue = platformCommission + payoutFeeRevenue;
  
  const totalHostEarnings = totalBookingRevenue * (1 - platformCommissionRate);
  const totalPaidToHosts = parseFloat(payoutStats.total_paid_out || 0);
  const pendingHostPayouts = parseFloat(payoutStats.pending_amount || 0);
  
  const totalRefunded = refunds
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => sum + parseFloat(r.refund_amount || 0), 0);
  
  const pendingRefunds = refunds
    .filter(r => r.status === 'pending')
    .reduce((sum, r) => sum + parseFloat(r.refund_amount || 0), 0);
  
  const netPlatformRevenue = totalPlatformRevenue - (totalRefunded * platformCommissionRate);
  
  return {
    totalBookingRevenue,
    platformCommission,
    payoutFeeRevenue,
    totalPlatformRevenue,
    netPlatformRevenue,
    totalHostEarnings,
    totalPaidToHosts,
    pendingHostPayouts,
    hostPayoutBalance: totalHostEarnings - totalPaidToHosts,
    totalRefunded,
    pendingRefunds,
    refundRate: 0 // Calculate based on bookings
  };
};