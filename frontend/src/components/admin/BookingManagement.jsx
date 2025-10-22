// frontend/src/components/admin/BookingManagement.jsx
import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Search, 
  Filter, 
  Eye, 
  Check, 
  X,
  Clock,
  User,
  Home,
  DollarSign,
  RefreshCw,
  Download,
  AlertTriangle,
  MapPin,
  Star,
  MessageSquare,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import Button from '../ui/Button';
import Input from '../ui/Input';

const BookingManagement = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBookings, setTotalBookings] = useState(0);
  const [limit] = useState(10);
  
  // Filter state
  const [filters, setFilters] = useState({
    status: '',
    host_id: '',
    client_id: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Statistics state
  const [statistics, setStatistics] = useState({});
  
  // Modal state
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    fetchBookings(1);
  }, []);

  // Fetch bookings function
  const fetchBookings = async (page = 1, currentFilters = filters) => {
    try {
      setLoading(true);
      setError(null);
      
      // Build parameters object for your existing API
      const params = {
        page: page,
        limit: limit,
        ...Object.fromEntries(
          Object.entries(currentFilters).filter(([_, value]) => value !== '')
        )
      };
      
      const response = await adminAPI.getAllBookings(params);
      
      if (response.data.status === 'success') {
        setBookings(response.data.data.bookings);
        setStatistics(response.data.data.statistics || {});
        
        // Update pagination state
        const pagination = response.data.data.pagination;
        setCurrentPage(pagination.page);
        setTotalPages(pagination.totalPages);
        setTotalBookings(pagination.total);
      }
    } catch (err) {
      setError('Failed to fetch bookings: ' + (err.response?.data?.message || err.message));
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
      fetchBookings(newPage);
    }
  };

  // Handle filter change
  const handleFilterChange = (filterName, value) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filtering
    fetchBookings(1, newFilters);
  };

  // Handle search
  const handleSearch = (term) => {
    setSearchTerm(term);
    // For search, we'll use client_id filter if it's a number, otherwise reset filters
    if (term && !isNaN(term)) {
      handleFilterChange('client_id', term);
    } else {
      // Reset filters when search is cleared
      if (!term) {
        setFilters({ status: '', host_id: '', client_id: '' });
        fetchBookings(1, { status: '', host_id: '', client_id: '' });
      }
    }
  };

  // Handle booking actions
  const handleBookingAction = async (bookingId, action) => {
    try {
      setActionLoading(prev => ({ ...prev, [bookingId]: action }));
      
      let result;
      switch (action) {
        case 'cancel':
          if (!confirm('Are you sure you want to cancel this booking?')) return;
          result = await adminAPI.cancelBooking(bookingId);
          break;
        case 'approve':
          result = await adminAPI.updateBookingStatus(bookingId, 'approved');
          break;
        case 'reject':
          result = await adminAPI.updateBookingStatus(bookingId, 'rejected');
          break;
        default:
          throw new Error('Invalid action');
      }

      if (result.data.status === 'success') {
        await fetchBookings(currentPage);
        alert(`Booking ${action}ed successfully`);
      }
    } catch (error) {
      alert(`Failed to ${action} booking: ${error.response?.data?.message || error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Confirmed' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
      completed: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Completed' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' },
      rejected: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Rejected' }
    };
    
    const badge = badges[status] || badges.pending;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getPriorityIndicator = (booking) => {
    const checkInDate = new Date(booking.start_date);
    const today = new Date();
    const daysUntilCheckIn = Math.ceil((checkInDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilCheckIn <= 1 && booking.booking_status === 'pending') {
      return (
        <div className="flex items-center text-red-400 text-xs">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Urgent
        </div>
      );
    } else if (daysUntilCheckIn <= 3 && booking.booking_status === 'pending') {
      return (
        <div className="flex items-center text-yellow-400 text-xs">
          <Clock className="w-3 h-3 mr-1" />
          Due soon
        </div>
      );
    }
    return null;
  };

  // Pagination component
  const Pagination = () => {
    const getPageNumbers = () => {
      const delta = 2;
      const range = [];
      const rangeWithDots = [];

      for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
        range.push(i);
      }

      if (currentPage - delta > 2) {
        rangeWithDots.push(1, '...');
      } else {
        rangeWithDots.push(1);
      }

      rangeWithDots.push(...range);

      if (currentPage + delta < totalPages - 1) {
        rangeWithDots.push('...', totalPages);
      } else {
        rangeWithDots.push(totalPages);
      }

      return rangeWithDots;
    };

    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-t border-gray-700">
        <div className="flex justify-between flex-1 sm:hidden">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>

        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-400">
              Showing <span className="font-medium">{((currentPage - 1) * limit) + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(currentPage * limit, totalBookings)}
              </span>{' '}
              of <span className="font-medium">{totalBookings}</span> results
            </p>
          </div>

          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-400 bg-gray-700 border border-gray-600 rounded-l-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {getPageNumbers().map((pageNum, index) => (
                <button
                  key={index}
                  onClick={() => typeof pageNum === 'number' ? handlePageChange(pageNum) : null}
                  disabled={pageNum === '...'}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-medium border ${
                    pageNum === currentPage
                      ? 'z-10 bg-blue-600 border-blue-600 text-white'
                      : pageNum === '...'
                      ? 'bg-gray-700 border-gray-600 text-gray-400 cursor-default'
                      : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-400 bg-gray-700 border border-gray-600 rounded-r-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-400 mb-4">{error}</p>
        <Button onClick={() => fetchBookings(1)} variant="gradient">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Booking Management</h1>
          <p className="text-gray-400">
            {totalBookings} total bookings
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => {
              const csvData = 'Booking ID,Property,Client,Host,Check-in,Check-out,Amount,Status\n' +
                bookings.map(b => 
                  `${b.id},"${b.listing_title}","${b.client_name}","${b.host_name}",${b.start_date},${b.end_date},${b.total_price},${b.booking_status}`
                ).join('\n');
              const blob = new Blob([csvData], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'bookings-export.csv';
              a.click();
            }}
            variant="outline"
            className="border-gray-600 text-gray-300"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={() => fetchBookings(currentPage)}
            variant="outline"
            className="border-gray-600 text-gray-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-400">Total Bookings</p>
              <p className="text-2xl font-bold text-white truncate">{totalBookings}</p>
              <p className="text-xs text-gray-500">All time</p>
            </div>
            <div className="p-3 rounded-full bg-blue-600/20 flex-shrink-0">
              <Calendar className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-400">Pending Review</p>
              <p className="text-2xl font-bold text-yellow-400 truncate">
                {statistics.statusDistribution?.pending || 0}
              </p>
              <p className="text-xs text-gray-500">Need attention</p>
            </div>
            <div className="p-3 rounded-full bg-yellow-600/20 flex-shrink-0">
              <Clock className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-400">Approved</p>
              <p className="text-2xl font-bold text-green-400 truncate">
                {(statistics.statusDistribution?.confirmed || 0) + (statistics.statusDistribution?.approved || 0)}
              </p>
              <p className="text-xs text-gray-500">Active bookings</p>
            </div>
            <div className="p-3 rounded-full bg-green-600/20 flex-shrink-0">
              <Check className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-sm text-gray-400">Total Revenue</p>
              <p className="text-xl md:text-2xl font-bold text-purple-400 break-all">
{`₱${(
  bookings.reduce((sum, b) => sum + (parseFloat(b.total_price) || 0), 0)
).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}

              </p>
              <p className="text-xs text-gray-500">From bookings</p>
            </div>
            <div className="p-3 rounded-full bg-purple-600/20 flex-shrink-0 ml-2">
              <DollarSign className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search by client ID..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 bg-gray-700 border-gray-600 text-white"
            />
          </div>
          
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="approved">Approved</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="rejected">Rejected</option>
          </select>

          <input
            type="number"
            placeholder="Host ID"
            value={filters.host_id}
            onChange={(e) => handleFilterChange('host_id', e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          />

          <input
            type="number"
            placeholder="Client ID"
            value={filters.client_id}
            onChange={(e) => handleFilterChange('client_id', e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          />
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        {bookings.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No bookings found</h3>
            <p className="text-gray-400">Try adjusting your search criteria</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="text-left py-3 px-4 md:px-6 text-gray-300 font-medium">Booking Details</th>
                    <th className="text-left py-3 px-4 md:px-6 text-gray-300 font-medium">Participants</th>
                    <th className="text-left py-3 px-4 md:px-6 text-gray-300 font-medium">Dates</th>
                    <th className="text-left py-3 px-4 md:px-6 text-gray-300 font-medium">Status</th>
                    <th className="text-left py-3 px-4 md:px-6 text-gray-300 font-medium">Amount</th>
                    <th className="text-left py-3 px-4 md:px-6 text-gray-300 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-700/50">
                      <td className="py-4 px-4 md:px-6">
                        <div className="flex items-start space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Home className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-medium line-clamp-1">
                              {booking.listing_title || 'Property Title'}
                            </div>
                            <div className="text-gray-500 text-xs mt-1">
                              ID: #{booking.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 md:px-6">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            <span className="text-white text-sm truncate">{booking.client_name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Home className="w-4 h-4 text-green-400 flex-shrink-0" />
                            <span className="text-gray-300 text-sm truncate">{booking.host_name}</span>
                          </div>
                          <div className="text-gray-400 text-xs">
                            {booking.guests || 1} guest{(booking.guests || 1) > 1 ? 's' : ''}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 md:px-6">
                        <div className="text-white text-sm">
                          <div className="whitespace-nowrap">Check-in: {new Date(booking.start_date).toLocaleDateString()}</div>
                          <div className="whitespace-nowrap">Check-out: {new Date(booking.end_date).toLocaleDateString()}</div>
                        </div>
                        <div className="text-gray-400 text-xs mt-1">
                          {booking.duration_days} days
                        </div>
                      </td>
                      <td className="py-4 px-4 md:px-6">
                        <div className="space-y-1">
                          {getStatusBadge(booking.booking_status)}
                          {getPriorityIndicator(booking)}
                        </div>
                      </td>
                      <td className="py-4 px-4 md:px-6">
                        <div className="text-white font-semibold whitespace-nowrap">
                          ₱{booking.total_price?.toLocaleString() || '0'}
                        </div>
                        <div className="text-gray-400 text-xs whitespace-nowrap">
                          ₱{Math.round((booking.total_price || 0) * 0.1).toLocaleString()} commission
                        </div>
                      </td>
                      <td className="py-4 px-4 md:px-6">
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400"
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowBookingModal(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {booking.booking_status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-400 hover:text-green-300"
                                loading={actionLoading[booking.id] === 'approve'}
                                onClick={() => handleBookingAction(booking.id, 'approve')}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-400 hover:text-red-300"
                                loading={actionLoading[booking.id] === 'reject'}
                                onClick={() => handleBookingAction(booking.id, 'reject')}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300"
                            loading={actionLoading[booking.id] === 'cancel'}
                            onClick={() => handleBookingAction(booking.id, 'cancel')}
                          >
                            Cancel
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <Pagination />
          </>
        )}
      </div>

      {/* Booking Detail Modal */}
      {showBookingModal && selectedBooking && (
        <BookingDetailModal 
          booking={selectedBooking}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedBooking(null);
          }}
          onAction={handleBookingAction}
        />
      )}
    </div>
  );
};

// Booking Detail Modal Component
const BookingDetailModal = ({ booking, onClose, onAction }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Booking Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Booking Information */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Booking Information</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400">Booking ID:</span>
                    <span className="text-white ml-2">#{booking.id}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Property:</span>
                    <span className="text-white ml-2">{booking.listing_title}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Check-in:</span>
                    <span className="text-white ml-2">{new Date(booking.start_date).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Check-out:</span>
                    <span className="text-white ml-2">{new Date(booking.end_date).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Duration:</span>
                    <span className="text-white ml-2">{booking.duration_days} days</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Guests:</span>
                    <span className="text-white ml-2">{booking.guests || 1}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Status:</span>
                    <span className="ml-2">{getStatusBadge(booking.booking_status)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Participants Information */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Participants</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gray-700 rounded-lg">
                    <h4 className="text-white font-medium mb-2">Host</h4>
                    <div className="space-y-1">
                      <div className="text-gray-300">{booking.host_name}</div>
                      <div className="text-gray-400 text-sm break-words">{booking.host_email || 'Email not available'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="mt-6">
            <h3 className="text-lg font-medium text-white mb-4">Financial Details</h3>
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Total Amount:</span>
                  <span className="text-white ml-2 font-semibold">₱{booking.total_price?.toLocaleString() || '0'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Platform Commission:</span>
                  <span className="text-green-400 ml-2 font-semibold">
                    ₱{Math.round((booking.total_price || 0) * 0.1).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Host Earnings:</span>
                  <span className="text-blue-400 ml-2 font-semibold">
                    ₱{Math.round((booking.total_price || 0) * 0.9).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Created:</span>
                  <span className="text-white ml-2">{new Date(booking.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-700">
            <Button
              onClick={onClose}
              variant="outline"
              className="border-gray-600 text-gray-300 w-full sm:w-auto"
            >
              Close
            </Button>
            
            {booking.booking_status === 'pending' && (
              <>
                <Button
                  onClick={() => {
                    onAction(booking.id, 'approve');
                    onClose();
                  }}
                  variant="outline"
                  className="border-green-500 text-green-400 hover:bg-green-500 hover:text-white w-full sm:w-auto"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => {
                    onAction(booking.id, 'reject');
                    onClose();
                  }}
                  variant="outline"
                  className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white w-full sm:w-auto"
                >
                  <X className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </>
            )}
            
            <Button
              onClick={() => {
                onAction(booking.id, 'cancel');
                onClose();
              }}
              variant="outline"
              className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white w-full sm:w-auto"
            >
              Cancel Booking
            </Button>
            
            <Button
              onClick={() => {
                const mailto = `mailto:${booking.client_email}?subject=Booking ${booking.id}`;
                window.location.href = mailto;
              }}
              variant="gradient"
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Contact Client
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function for status badge (moved outside component to avoid re-creation)
const getStatusBadge = (status) => {
  const badges = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
    confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Confirmed' },
    approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
    completed: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Completed' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' },
    rejected: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Rejected' }
  };
  
  const badge = badges[status] || badges.pending;
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
      {badge.label}
    </span>
  );
};

export default BookingManagement;