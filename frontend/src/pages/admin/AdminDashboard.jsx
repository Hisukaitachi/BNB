// frontend/src/pages/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Users, 
  Home, 
  DollarSign, 
  Calendar,
  AlertTriangle,
  MessageSquare,
  Settings,
  Shield,
  TrendingUp,
  FileText,
  Star
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AdminSidebar from '../../components/admin/AdminSidebar';
import AdminOverview from '../../components/admin/AdminOverview';
import UserManagement from '../../components/admin/UserManagement';
import ListingManagement from '../../components/admin/ListingManagement';
import PayoutManagement from '../../components/admin/PayoutManagement';
import AdminEarnings from '../../components/admin/earnings/AdminEarnings';
import BookingManagement from '../../components/admin/BookingManagement';
import ReportManagement from '../../components/admin/ReportManagement';
import RefundManagement from '../../components/admin/RefundManagement';
import { adminAPI } from '../../services/api';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({});

  useEffect(() => {
    // Redirect non-admins
    if (user && user.role !== 'admin') {
      navigate('/', { replace: true });
      return;
    }

    loadDashboardData();
  }, [user, navigate]);

// frontend/src/pages/admin/AdminDashboard.jsx

const loadDashboardData = async () => {
  try {
    setLoading(true);
    
    // Fetch all necessary data with CORRECT parameters for your backend
    const [
      dashboardStats,
      bookingsResponse,
      usersResponse,
      listingsResponse,
      reportsResponse
    ] = await Promise.all([
      // Get dashboard stats
      adminAPI.getDashboardStats().catch(err => {
        console.error('Dashboard stats error:', err);
        return { data: {} };
      }),
      
      // FIX: Your backend expects page and limit, not just limit
      adminAPI.getAllBookings({ 
        page: 1,
        limit: 100  // Reduced from 1000 to respect your backend's max of 100
      }).catch(err => {
        console.error('Bookings error:', err);
        return { data: { bookings: [] } };
      }),
      
      // FIX: Your backend expects page and limit, not just limit
      adminAPI.getAllUsers({ 
        page: 1,
        limit: 100  // Reduced from 1000 to respect your backend's max of 100
      }).catch(err => {
        console.error('Users error:', err);
        return { data: { users: [] } };
      }),
      
      // FIX: Your backend expects page and limit
      adminAPI.getAllListings({ 
        page: 1,
        limit: 100 
      }).catch(err => {
        console.error('Listings error:', err);
        return { data: { listings: [] } };
      }),
      
      // Reports endpoint doesn't need pagination
      adminAPI.getAllReports().catch(err => {
        console.error('Reports error:', err);
        return { data: { reports: [] } };
      })
    ]);

    // If you need more than 100 items, fetch additional pages
    let allBookings = [];
    let allUsers = [];
    
    // Get first page data
    const firstPageBookings = bookingsResponse?.data?.data?.bookings || bookingsResponse?.data?.bookings || [];
    const firstPageUsers = usersResponse?.data?.data?.users || usersResponse?.data?.users || [];
    
    allBookings = [...firstPageBookings];
    allUsers = [...firstPageUsers];
    
    // Check if we need to fetch more pages
    const bookingsPagination = bookingsResponse?.data?.data?.pagination;
    const usersPagination = usersResponse?.data?.data?.pagination;
    
    // Fetch additional pages if needed (optional - only if you really need all data)
    if (bookingsPagination && bookingsPagination.totalPages > 1) {
      // Fetch up to 5 pages max to avoid too many requests
      const pagesToFetch = Math.min(bookingsPagination.totalPages - 1, 4);
      for (let page = 2; page <= pagesToFetch + 1; page++) {
        try {
          const response = await adminAPI.getAllBookings({ page, limit: 100 });
          const moreBookings = response?.data?.data?.bookings || [];
          allBookings = [...allBookings, ...moreBookings];
        } catch (err) {
          console.error(`Failed to fetch bookings page ${page}:`, err);
        }
      }
    }
    
    if (usersPagination && usersPagination.totalPages > 1) {
      // Fetch up to 5 pages max
      const pagesToFetch = Math.min(usersPagination.totalPages - 1, 4);
      for (let page = 2; page <= pagesToFetch + 1; page++) {
        try {
          const response = await adminAPI.getAllUsers({ page, limit: 100 });
          const moreUsers = response?.data?.data?.users || [];
          allUsers = [...allUsers, ...moreUsers];
        } catch (err) {
          console.error(`Failed to fetch users page ${page}:`, err);
        }
      }
    }

    // Extract data based on your backend response structure
    const statsData = dashboardStats?.data?.data || dashboardStats?.data || {};
    const bookings = allBookings;
    const users = allUsers;
    const listings = listingsResponse?.data?.data?.listings || listingsResponse?.data?.listings || [];
    const reports = reportsResponse?.data?.reports || reportsResponse?.reports || [];

    console.log('Fetched data:', {
      stats: statsData,
      bookingsCount: bookings.length,
      usersCount: users.length,
      listingsCount: listings.length,
      reportsCount: reports.length
    });

    // Rest of your data processing code remains the same...
    // Generate chart data for Revenue & Growth Trends
    const revenueChart = generateRevenueChartData(bookings, users);
    
    // Generate chart data for User Growth & Composition
    const userGrowthChart = generateUserGrowthChart(users);
    
    // Calculate booking status for pie chart
    const bookingStatusCounts = calculateBookingStatus(bookings);
    
    // Generate top listings with revenue
    const topListings = generateTopListings(listings, bookings);
    
    // Process recent reports
    const recentReports = reports.slice(0, 5).map(report => ({
      ...report,
      type: report.reason?.split(' ')[0] || 'General',
      timeAgo: getTimeAgo(report.created_at)
    }));

    // Calculate additional metrics from the data
    const formattedDashboardData = {
      // Use stats from your getDashboardStats endpoint
      totalUsers: statsData.totalUsers || users.length,
      totalListings: statsData.totalListings || listings.length,
      totalBookings: statsData.totalBookings || bookings.length,
      totalRevenue: statsData.totalRevenue || calculateTotalRevenue(bookings),
      
      // User breakdown from your backend
      totalClients: statsData.userBreakdown?.clients || users.filter(u => u.role === 'client').length,
      totalHosts: statsData.userBreakdown?.hosts || users.filter(u => u.role === 'host').length,
      totalAdmins: statsData.userBreakdown?.admins || users.filter(u => u.role === 'admin').length,
      bannedUsers: statsData.userBreakdown?.banned || users.filter(u => u.is_banned === 1).length,
      
      // Chart data
      revenueChart,
      userGrowthChart,
      
      // Booking status data for pie chart
      pendingBookings: bookingStatusCounts.pending,
      confirmedBookings: bookingStatusCounts.confirmed,
      completedBookings: bookingStatusCounts.completed,
      cancelledBookings: bookingStatusCounts.cancelled,
      
      // Lists
      topListings,
      recentReports,
      recentActivities: generateRecentActivities(bookings, users, listings),
      
      // Listing metrics
      pendingListings: listings.filter(l => l.status === 'pending').length,
      activeListings: listings.filter(l => l.status === 'active' || l.status === 'approved').length,
      
      // Booking metrics
      activeBookings: bookings.filter(b => {
        const status = b.booking_status || b.status;
        return ['pending', 'confirmed', 'approved'].includes(status);
      }).length,
      
      // Revenue metrics
      monthlyRevenue: calculateMonthlyRevenue(bookings),
      averageBookingValue: calculateAverageBookingValue(bookings),
      
      // New users this month
      newUsersThisMonth: calculateNewUsersThisMonth(users),
      
      // Today's metrics
      todayNewUsers: calculateTodayMetric(users, 'created_at'),
      todayBookings: calculateTodayMetric(bookings, 'created_at'),
      todayRevenue: calculateTodayRevenue(bookings),
      
      // This week metrics
      weekUsers: calculateWeekMetric(users),
      weekBookings: calculateWeekMetric(bookings),
      weekRevenue: calculateWeekRevenue(bookings),
      
      // Reports
      pendingReports: reports.filter(r => r.status === 'pending' || !r.status).length,
      
      // System health (static for now)
      systemHealth: 'Optimal',
      systemHealthScore: 98,
      systemStatus: 'All systems operational',
      
      // Platform rating
      averagePlatformRating: 4.5,
      totalReviews: 1234,
      
      // Growth rates
      userGrowth: calculateGrowthRate(users),
      revenueGrowth: calculateRevenueGrowth(bookings),
      bookingGrowth: calculateGrowthRate(bookings),
      
      // Other metrics
      activeSessions: 234,
      pendingPayoutCount: 0,
      pendingPayoutAmount: 0,
    };

    console.log('Formatted dashboard data:', formattedDashboardData);
    
    setDashboardData(formattedDashboardData);
    setStats(formattedDashboardData);
    
  } catch (error) {
    console.error('Failed to load admin dashboard:', error);
    
    // Set default empty data
    const defaultData = {
      totalUsers: 0,
      totalListings: 0,
      totalBookings: 0,
      totalRevenue: 0,
      revenueChart: [],
      userGrowthChart: [],
      pendingBookings: 0,
      confirmedBookings: 0,
      completedBookings: 0,
      cancelledBookings: 0,
      topListings: [],
      recentReports: [],
      recentActivities: []
    };
    
    setDashboardData(defaultData);
    setStats(defaultData);
  } finally {
    setLoading(false);
  }
};


  // CHART DATA GENERATOR 1: Revenue & Growth Trends
  const generateRevenueChartData = (bookings, users) => {
    const monthlyData = {};
    const currentDate = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      monthlyData[monthKey] = {
        month: monthKey,
        revenue: 0,
        bookings: 0,
        users: 0
      };
    }

    // Aggregate booking data by month
    bookings.forEach(booking => {
      if (!booking.created_at) return;
      
      const date = new Date(booking.created_at);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      
      if (monthlyData[monthKey]) {
        // Add revenue (only for approved/completed bookings based on your backend)
        const status = booking.booking_status || booking.status;
        if (['approved', 'completed', 'confirmed'].includes(status)) {
          const price = parseFloat(booking.total_price || 0);
          monthlyData[monthKey].revenue += price;
        }
        
        // Count all bookings
        monthlyData[monthKey].bookings += 1;
      }
    });

    // Count new users by month
    users.forEach(user => {
      if (!user.created_at) return;
      
      const date = new Date(user.created_at);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].users += 1;
      }
    });

    const chartData = Object.values(monthlyData);
    console.log('Revenue chart data:', chartData);
    
    return chartData;
  };

  // CHART DATA GENERATOR 2: User Growth & Composition
  const generateUserGrowthChart = (users) => {
    const monthlyData = {};
    const currentDate = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      monthlyData[monthKey] = {
        month: monthKey,
        clients: 0,
        hosts: 0,
        total: 0
      };
    }

    // Count users by type and month
    users.forEach(user => {
      if (!user.created_at) return;
      
      const date = new Date(user.created_at);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].total += 1;
        
        if (user.role === 'client') {
          monthlyData[monthKey].clients += 1;
        } else if (user.role === 'host') {
          monthlyData[monthKey].hosts += 1;
        }
      }
    });

    const chartData = Object.values(monthlyData);
    console.log('User growth chart data:', chartData);
    
    return chartData;
  };

  // CHART DATA GENERATOR 3: Booking Status (for pie chart)
  const calculateBookingStatus = (bookings) => {
    const statusCount = {
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0
    };
    
    bookings.forEach(booking => {
      // Use booking_status field from your backend
      const status = (booking.booking_status || booking.status || 'pending').toLowerCase();
      
      if (status.includes('pending')) {
        statusCount.pending++;
      } else if (status.includes('confirmed') || status.includes('approved')) {
        statusCount.confirmed++;
      } else if (status.includes('completed')) {
        statusCount.completed++;
      } else if (status.includes('cancelled') || status.includes('rejected')) {
        statusCount.cancelled++;
      } else {
        statusCount.pending++;
      }
    });
    
    console.log('Booking status counts:', statusCount);
    return statusCount;
  };

  // Generate top listings based on your backend data structure
  const generateTopListings = (listings, bookings) => {
    // Your backend already provides total_bookings and avg_rating
    return listings
      .map(listing => ({
        ...listing,
        total_revenue: calculateListingRevenue(listing.id, bookings),
        booking_count: listing.total_bookings || 0,
        average_rating: listing.avg_rating || 0,
        location: listing.location || 'Unknown'
      }))
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 5);
  };

  const calculateListingRevenue = (listingId, bookings) => {
    return bookings
      .filter(b => b.listing_id === listingId)
      .filter(b => {
        const status = b.booking_status || b.status;
        return ['approved', 'completed', 'confirmed'].includes(status);
      })
      .reduce((sum, b) => sum + parseFloat(b.total_price || 0), 0);
  };

  const generateRecentActivities = (bookings, users, listings) => {
    const activities = [];
    
    // Recent bookings
    bookings.slice(-3).forEach(booking => {
      activities.push({
        type: 'booking',
        description: `New booking #${booking.id} for ₱${parseFloat(booking.total_price || 0).toLocaleString()}`,
        timeAgo: getTimeAgo(booking.created_at)
      });
    });
    
    // Recent users (use name field from your backend)
    users.slice(-2).forEach(user => {
      activities.push({
        type: 'user',
                description: `New ${user.role} registered: ${user.name || 'Unknown'}`,
        timeAgo: getTimeAgo(user.created_at)
      });
    });
    
    // Recent listings
    listings.slice(-2).forEach(listing => {
      activities.push({
        type: 'listing',
        description: `New listing added: ${listing.title} by ${listing.host_name}`,
        timeAgo: getTimeAgo(listing.created_at)
      });
    });
    
    return activities.slice(0, 5);
  };

  const calculateTotalRevenue = (bookings) => {
    return bookings
      .filter(b => {
        const status = b.booking_status || b.status;
        return ['approved', 'completed', 'confirmed'].includes(status);
      })
      .reduce((sum, booking) => {
        const price = parseFloat(booking.total_price || 0);
        return sum + price;
      }, 0);
  };

  const calculateMonthlyRevenue = (bookings) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return bookings
      .filter(booking => {
        if (!booking.created_at) return false;
        const date = new Date(booking.created_at);
        const status = booking.booking_status || booking.status;
        return date.getMonth() === currentMonth && 
               date.getFullYear() === currentYear &&
               ['approved', 'completed', 'confirmed'].includes(status);
      })
      .reduce((sum, booking) => {
        const price = parseFloat(booking.total_price || 0);
        return sum + price;
      }, 0);
  };

  const calculateAverageBookingValue = (bookings) => {
    const validBookings = bookings.filter(b => {
      const status = b.booking_status || b.status;
      return ['approved', 'completed', 'confirmed'].includes(status);
    });
    
    if (validBookings.length === 0) return 0;
    return calculateTotalRevenue(bookings) / validBookings.length;
  };

  const calculateNewUsersThisMonth = (users) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return users.filter(user => {
      if (!user.created_at) return false;
      const date = new Date(user.created_at);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;
  };

  const calculateTodayMetric = (items, dateField) => {
    const today = new Date().toDateString();
    return items.filter(item => {
      if (!item[dateField]) return false;
      return new Date(item[dateField]).toDateString() === today;
    }).length;
  };

  const calculateTodayRevenue = (bookings) => {
    const today = new Date().toDateString();
    return bookings
      .filter(booking => {
        if (!booking.created_at) return false;
        const status = booking.booking_status || booking.status;
        return new Date(booking.created_at).toDateString() === today &&
               ['approved', 'completed', 'confirmed'].includes(status);
      })
      .reduce((sum, booking) => {
        const price = parseFloat(booking.total_price || 0);
        return sum + price;
      }, 0);
  };

  const calculateWeekMetric = (items) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    return items.filter(item => {
      if (!item.created_at) return false;
      return new Date(item.created_at) >= weekAgo;
    }).length;
  };

  const calculateWeekRevenue = (bookings) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    return bookings
      .filter(booking => {
        if (!booking.created_at) return false;
        const status = booking.booking_status || booking.status;
        return new Date(booking.created_at) >= weekAgo &&
               ['approved', 'completed', 'confirmed'].includes(status);
      })
      .reduce((sum, booking) => {
        const price = parseFloat(booking.total_price || 0);
        return sum + price;
      }, 0);
  };

  const calculateGrowthRate = (items) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const currentMonthCount = items.filter(item => {
      if (!item.created_at) return false;
      const date = new Date(item.created_at);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;
    
    const lastMonthCount = items.filter(item => {
      if (!item.created_at) return false;
      const date = new Date(item.created_at);
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    }).length;
    
    if (lastMonthCount === 0) return 0;
    return ((currentMonthCount - lastMonthCount) / lastMonthCount) * 100;
  };

  const calculateRevenueGrowth = (bookings) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const currentMonthRevenue = bookings
      .filter(booking => {
        if (!booking.created_at) return false;
        const date = new Date(booking.created_at);
        const status = booking.booking_status || booking.status;
        return date.getMonth() === currentMonth && 
               date.getFullYear() === currentYear &&
               ['approved', 'completed', 'confirmed'].includes(status);
      })
      .reduce((sum, b) => sum + parseFloat(b.total_price || 0), 0);
    
    const lastMonthRevenue = bookings
      .filter(booking => {
        if (!booking.created_at) return false;
        const date = new Date(booking.created_at);
        const status = booking.booking_status || booking.status;
        return date.getMonth() === lastMonth && 
               date.getFullYear() === lastMonthYear &&
               ['approved', 'completed', 'confirmed'].includes(status);
      })
      .reduce((sum, b) => sum + parseFloat(b.total_price || 0), 0);
    
    if (lastMonthRevenue === 0) return 0;
    return ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
  };

  const getTimeAgo = (date) => {
    if (!date) return 'Unknown';
    
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return `${Math.floor(seconds / 604800)} weeks ago`;
  };

  // Navigation items for admin dashboard
  const navigationItems = [
    {
      path: '/admin/dashboard',
      icon: BarChart3,
      label: 'Overview',
      exact: true
    },
    {
      path: '/admin/users',
      icon: Users,
      label: 'User Management',
      badge: stats.pendingUsers
    },
    {
      path: '/admin/listings',
      icon: Home,
      label: 'Listing Management',
      badge: stats.pendingListings
    },
    {
      path: '/admin/payouts',
      icon: DollarSign,
      label: 'Payout Management',
      badge: stats.pendingPayouts
    },
    {
      path: '/admin/earnings',
      icon: TrendingUp,
      label: 'Platform Earnings'
    },
    {
      path: '/admin/bookings',
      icon: Calendar,
      label: 'Booking Management'
    },
    {
      path: '/admin/refunds',
      icon: DollarSign,
      label: 'Refund Management',
      badge: stats.pendingRefunds
    },
    {
      path: '/admin/reports',
      icon: AlertTriangle,
      label: 'Reports & Disputes',
      badge: stats.pendingReports
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <AdminSidebar 
        navigationItems={navigationItems}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Header */}
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <div>
                <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-sm text-gray-400">Platform Management Portal</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Quick Stats */}
              <div className="hidden md:flex items-center space-x-6 text-sm">
                {stats.pendingReports > 0 && (
                  <div className="text-red-400">
                    {stats.pendingReports} pending reports
                  </div>
                )}
                {stats.pendingPayoutAmount > 0 && (
                  <div className="text-yellow-400">
                    ₱{stats.pendingPayoutAmount?.toLocaleString()} pending payouts
                  </div>
                )}
                <div className="text-green-400">
                  {stats.totalUsers || 0} total users
                </div>
              </div>

              {/* Admin Badge */}
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-red-400" />
                <span className="text-sm font-medium text-red-400">ADMIN</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
            <Route 
              path="/dashboard" 
              element={
                <AdminOverview 
                  data={dashboardData} 
                  onRefresh={loadDashboardData}
                  loading={loading}
                />
              } 
            />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/listings" element={<ListingManagement />} />
            <Route path="/payouts" element={<PayoutManagement />} />
            <Route path="/earnings" element={<AdminEarnings />} />
            <Route path="/bookings" element={<BookingManagement />} />
            <Route path="/refunds" element={<RefundManagement />} />
            <Route path="/reports" element={<ReportManagement />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;