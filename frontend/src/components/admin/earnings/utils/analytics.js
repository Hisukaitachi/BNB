// src/components/admin/earnings/utils/analytics.js

export const generateMonthlyTrend = (bookings, payouts, refunds) => {
  const monthMap = {};
  const currentDate = new Date();
  
  // Initialize last 6 months
  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    monthMap[monthKey] = {
      month: monthKey,
      bookingRevenue: 0,
      platformCommission: 0,
      payoutFees: 0,
      refunds: 0,
      netRevenue: 0,
      bookingCount: 0,
      payoutCount: 0
    };
  }
  
  // Process bookings
  bookings.forEach(booking => {
    const date = new Date(booking.created_at);
    const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    if (monthMap[monthKey]) {
      const amount = parseFloat(booking.total_price || 0);
      monthMap[monthKey].bookingRevenue += amount;
      monthMap[monthKey].platformCommission += amount * 0.10;
      monthMap[monthKey].bookingCount += 1;
    }
  });
  
  // Process payouts
  payouts.forEach(payout => {
    const date = new Date(payout.created_at);
    const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    if (monthMap[monthKey] && payout.status === 'completed') {
      monthMap[monthKey].payoutFees += parseFloat(payout.fee || 0);
      monthMap[monthKey].payoutCount += 1;
    }
  });
  
  // Process refunds
  refunds.forEach(refund => {
    const date = new Date(refund.created_at);
    const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    if (monthMap[monthKey] && refund.status === 'completed') {
      monthMap[monthKey].refunds += parseFloat(refund.refund_amount || 0);
    }
  });
  
  // Calculate net revenue
  Object.values(monthMap).forEach(month => {
    month.netRevenue = month.platformCommission + month.payoutFees - (month.refunds * 0.10);
  });
  
  return Object.values(monthMap);
};

export const analyzePaymentMethods = (payouts) => {
  const methodMap = {};
  
  payouts.forEach(payout => {
    const method = payout.payment_method || 'unknown';
    if (!methodMap[method]) {
      methodMap[method] = {
        method,
        count: 0,
        totalAmount: 0,
        totalFees: 0,
        averageFee: 0
      };
    }
    
    methodMap[method].count += 1;
    methodMap[method].totalAmount += parseFloat(payout.amount || 0);
    methodMap[method].totalFees += parseFloat(payout.fee || 0);
  });
  
  Object.values(methodMap).forEach(method => {
    method.averageFee = method.count > 0 ? method.totalFees / method.count : 0;
  });
  
  return Object.values(methodMap).sort((a, b) => b.totalAmount - a.totalAmount);
};

export const getTopPerformingHosts = (payouts, bookings) => {
  const hostMap = {};
  
  payouts.forEach(payout => {
    if (payout.status === 'completed') {
      const hostId = payout.host_id;
      const hostName = payout.host_name || `Host #${hostId}`;
      
      if (!hostMap[hostId]) {
        hostMap[hostId] = {
          id: hostId,
          name: hostName,
          email: payout.host_email,
          totalEarnings: 0,
          totalFees: 0,
          payoutCount: 0,
          bookingCount: 0,
          averageBookingValue: 0
        };
      }
      
      hostMap[hostId].totalEarnings += parseFloat(payout.amount || 0);
      hostMap[hostId].totalFees += parseFloat(payout.fee || 0);
      hostMap[hostId].payoutCount += 1;
    }
  });
  
  bookings.forEach(booking => {
    const hostId = booking.host_id;
    if (hostMap[hostId]) {
      hostMap[hostId].bookingCount += 1;
    }
  });
  
  Object.values(hostMap).forEach(host => {
    host.averageBookingValue = host.bookingCount > 0 
      ? host.totalEarnings / host.bookingCount 
      : 0;
  });
  
  return Object.values(hostMap)
    .sort((a, b) => b.totalEarnings - a.totalEarnings)
    .slice(0, 10);
};

export const analyzeBookings = (bookings) => {
  const statusCount = {};
  const typeCount = { book: 0, reserve: 0 };
  let totalRevenue = 0;
  let completedRevenue = 0;
  
  bookings.forEach(booking => {
    const status = booking.booking_status || booking.status;
    statusCount[status] = (statusCount[status] || 0) + 1;
    
    if (booking.booking_type) {
      typeCount[booking.booking_type] = (typeCount[booking.booking_type] || 0) + 1;
    }
    
    const amount = parseFloat(booking.total_price || 0);
    totalRevenue += amount;
    
    if (status === 'completed') {
      completedRevenue += amount;
    }
  });
  
  return {
    statusDistribution: statusCount,
    typeDistribution: typeCount,
    totalRevenue,
    completedRevenue,
    averageBookingValue: bookings.length > 0 ? totalRevenue / bookings.length : 0,
    completionRate: bookings.length > 0 
      ? (statusCount.completed || 0) / bookings.length * 100 
      : 0
  };
};

export const exportFinancialReport = (analytics, selectedPeriod) => {
  const csvRows = [];
  const timestamp = new Date().toISOString();
  
  csvRows.push(['PLATFORM FINANCIAL REPORT']);
  csvRows.push(['Generated:', timestamp]);
  csvRows.push(['Period:', selectedPeriod]);
  csvRows.push(['']);
  
  csvRows.push(['EXECUTIVE SUMMARY']);
  csvRows.push(['Metric', 'Amount', 'Growth %']);
  csvRows.push(['Total Booking Revenue', analytics.totalBookingRevenue, `+${analytics.revenueGrowth}%`]);
  csvRows.push(['Platform Commission (10%)', analytics.platformCommission, '']);
  csvRows.push(['Payout Fee Revenue', analytics.payoutFeeRevenue, '']);
  csvRows.push(['Total Platform Revenue', analytics.totalPlatformRevenue, '']);
  csvRows.push(['Net Platform Revenue', analytics.netPlatformRevenue, '']);
  
  const csvContent = csvRows.map(row => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `platform-financial-report-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};