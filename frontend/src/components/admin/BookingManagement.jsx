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
  MoreHorizontal
} from 'lucide-react';
import adminService from '../../services/adminService';
import Button from '../ui/Button';
import Input from '../ui/Input';

const BookingManagement = () => {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [bookings, searchTerm, statusFilter, dateFilter]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getAllBookings();
      setBookings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...bookings];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.listing_title?.toLowerCase().includes(term) ||
        booking.client_name?.toLowerCase().includes(term) ||
        booking.host_name?.toLowerCase().includes(term) ||
        booking.booking_id?.toString().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.created_at);
        switch (dateFilter) {
          case 'today':
            return bookingDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return bookingDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return bookingDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    setFilteredBookings(filtered);
  };

  const handleBookingAction = async (bookingId, action) => {
    try {
      setActionLoading(prev => ({ ...prev, [bookingId]: action }));
      
      let result;
      switch (action) {
        case 'cancel':
          if (!confirm('Are you sure you want to cancel this booking?')) return;
          result = await adminService.cancelBooking(bookingId, 'Cancelled by admin');
          break;
        default:
          throw new Error('Invalid action');
      }

      if (result.success) {
        await loadBookings();
        alert(`Booking ${action}ed successfully`);
      }
    } catch (error) {
      alert(`Failed to ${action} booking: ${error.message}`);
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
    const checkInDate = new Date(booking.check_in_date);
    const today = new Date();
    const daysUntilCheckIn = Math.ceil((checkInDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilCheckIn <= 1 && booking.status === 'pending') {
      return (
        <div className="flex items-center text-red-400 text-xs">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Urgent
        </div>
      );
    } else if (daysUntilCheckIn <= 3 && booking.status === 'pending') {
      return (
        <div className="flex items-center text-yellow-400 text-xs">
          <Clock className="w-3 h-3 mr-1" />
          Due soon
        </div>
      );
    }
    return null;
  };

  // Mock data if no bookings are loaded
  const mockBookings = bookings.length === 0 ? [
    {
      booking_id: 1,
      listing_title: 'Modern Studio in Cebu City',
      client_name: 'Juan dela Cruz',
      host_name: 'Maria Santos',
      check_in_date: '2024-12-15',
      check_out_date: '2024-12-18',
      total_price: 4500,
      status: 'pending',
      created_at: '2024-12-10T10:00:00Z',
      location: 'Cebu City',
      guests: 2
    },
    {
      booking_id: 2,
      listing_title: 'Beachfront Condo with View',
      client_name: 'Anna Rodriguez',
      host_name: 'Jose Garcia',
      check_in_date: '2024-12-20',
      check_out_date: '2024-12-23',
      total_price: 8000,
      status: 'confirmed',
      created_at: '2024-12-08T14:30:00Z',
      location: 'Mactan, Cebu',
      guests: 4
    }
  ] : bookings;

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
        <Button onClick={loadBookings} variant="gradient">Try Again</Button>
      </div>
    );
  }

  const displayBookings = filteredBookings.length > 0 ? filteredBookings : mockBookings.filter(booking => {
    if (statusFilter !== 'all' && booking.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return booking.listing_title?.toLowerCase().includes(term) ||
             booking.client_name?.toLowerCase().includes(term) ||
             booking.host_name?.toLowerCase().includes(term);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Booking Management</h1>
          <p className="text-gray-400">
            {displayBookings.length} total bookings
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button
            onClick={() => {
              // Export bookings functionality
              const csvData = 'Booking ID,Property,Client,Host,Check-in,Check-out,Amount,Status\n' +
                displayBookings.map(b => 
                  `${b.booking_id},"${b.listing_title}","${b.client_name}","${b.host_name}",${b.check_in_date},${b.check_out_date},${b.total_price},${b.status}`
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
            onClick={loadBookings}
            variant="outline"
            className="border-gray-600 text-gray-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Bookings</p>
              <p className="text-2xl font-bold text-white">{displayBookings.length}</p>
              <p className="text-xs text-gray-500">All time</p>
            </div>
            <div className="p-3 rounded-full bg-blue-600/20">
              <Calendar className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Pending Review</p>
              <p className="text-2xl font-bold text-yellow-400">
                {displayBookings.filter(b => b.status === 'pending').length}
              </p>
              <p className="text-xs text-gray-500">Need attention</p>
            </div>
            <div className="p-3 rounded-full bg-yellow-600/20">
              <Clock className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Confirmed</p>
              <p className="text-2xl font-bold text-green-400">
                {displayBookings.filter(b => ['confirmed', 'approved'].includes(b.status)).length}
              </p>
              <p className="text-xs text-gray-500">Active bookings</p>
            </div>
            <div className="p-3 rounded-full bg-green-600/20">
              <Check className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-purple-400">
                ₱{displayBookings.reduce((sum, b) => sum + (b.total_price || 0), 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">From bookings</p>
            </div>
            <div className="p-3 rounded-full bg-purple-600/20">
              <DollarSign className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search bookings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-700 border-gray-600 text-white"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="approved">Approved</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>

          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <Filter className="w-4 h-4" />
            <span>
              {displayBookings.filter(b => b.status === 'pending').length} pending
            </span>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        {displayBookings.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No bookings found</h3>
            <p className="text-gray-400">Try adjusting your search criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Booking Details</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Participants</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Dates</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Status</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Amount</th>
                  <th className="text-left py-3 px-6 text-gray-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {displayBookings.map((booking) => (
                  <tr key={booking.booking_id} className="hover:bg-gray-700/50">
                    <td className="py-4 px-6">
                      <div className="flex items-start space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-600 rounded-lg flex items-center justify-center">
                          <Home className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium line-clamp-1">
                            {booking.listing_title || 'Property Title'}
                          </div>
                          <div className="flex items-center text-gray-400 text-sm mt-1">
                            <MapPin className="w-3 h-3 mr-1" />
                            <span className="line-clamp-1">{booking.location || 'Location'}</span>
                          </div>
                          <div className="text-gray-500 text-xs mt-1">
                            ID: #{booking.booking_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-blue-400" />
                          <span className="text-white text-sm">{booking.client_name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Home className="w-4 h-4 text-green-400" />
                          <span className="text-gray-300 text-sm">{booking.host_name}</span>
                        </div>
                        <div className="text-gray-400 text-xs">
                          {booking.guests || 1} guest{(booking.guests || 1) > 1 ? 's' : ''}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-white text-sm">
                        <div>Check-in: {new Date(booking.check_in_date).toLocaleDateString()}</div>
                        <div>Check-out: {new Date(booking.check_out_date).toLocaleDateString()}</div>
                      </div>
                      <div className="text-gray-400 text-xs mt-1">
                        {Math.ceil((new Date(booking.check_out_date) - new Date(booking.check_in_date)) / (1000 * 60 * 60 * 24))} nights
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        {getStatusBadge(booking.status)}
                        {getPriorityIndicator(booking)}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-white font-semibold">
                        ₱{booking.total_price?.toLocaleString() || '0'}
                      </div>
                      <div className="text-gray-400 text-xs">
                        ₱{Math.round((booking.total_price || 0) * 0.1).toLocaleString()} commission
                      </div>
                    </td>
                    <td className="py-4 px-6">
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

                        {booking.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300"
                            loading={actionLoading[booking.booking_id] === 'cancel'}
                            onClick={() => handleBookingAction(booking.booking_id, 'cancel')}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}

                        <div className="relative group">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                          
                          <div className="absolute right-0 mt-2 w-48 bg-gray-600 rounded-lg shadow-lg border border-gray-500 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                            <button
                              onClick={() => {
                                const mailto = `mailto:${booking.client_name?.toLowerCase().replace(' ', '.')}@email.com?subject=Booking ${booking.booking_id}`;
                                window.location.href = mailto;
                              }}
                              className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:bg-gray-500 w-full text-left"
                            >
                              <MessageSquare className="w-4 h-4" />
                              <span>Contact Client</span>
                            </button>
                            
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`Booking #${booking.booking_id} - ${booking.listing_title}`);
                                alert('Booking details copied to clipboard');
                              }}
                              className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:bg-gray-500 w-full text-left"
                            >
                              <Calendar className="w-4 h-4" />
                              <span>Copy Details</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            onClick={() => {
              const pendingBookings = displayBookings.filter(b => b.status === 'pending');
              alert(`${pendingBookings.length} bookings need review`);
            }}
            variant="outline"
            className="border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-white"
          >
            <Clock className="w-4 h-4 mr-2" />
            Review Pending
          </Button>
          
          <Button
            onClick={() => {
              const todayBookings = displayBookings.filter(b => {
                const checkIn = new Date(b.check_in_date);
                const today = new Date();
                return checkIn.toDateString() === today.toDateString();
              });
              alert(`${todayBookings.length} check-ins today`);
            }}
            variant="outline"
            className="border-green-500 text-green-400 hover:bg-green-500 hover:text-white"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Today's Check-ins
          </Button>
          
          <Button
            onClick={() => alert('Booking analytics to be implemented')}
            variant="outline"
            className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white"
          >
            <Star className="w-4 h-4 mr-2" />
            View Analytics
          </Button>
          
          <Button
            onClick={() => alert('Bulk actions to be implemented')}
            variant="outline"
            className="border-gray-500 text-gray-400 hover:bg-gray-500 hover:text-white"
          >
            <MoreHorizontal className="w-4 h-4 mr-2" />
            Bulk Actions
          </Button>
        </div>
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
                    <span className="text-white ml-2">#{booking.booking_id}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Property:</span>
                    <span className="text-white ml-2">{booking.listing_title}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Location:</span>
                    <span className="text-white ml-2">{booking.location || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Check-in:</span>
                    <span className="text-white ml-2">{new Date(booking.check_in_date).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Check-out:</span>
                    <span className="text-white ml-2">{new Date(booking.check_out_date).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Duration:</span>
                    <span className="text-white ml-2">
                      {Math.ceil((new Date(booking.check_out_date) - new Date(booking.check_in_date)) / (1000 * 60 * 60 * 24))} nights
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Guests:</span>
                    <span className="text-white ml-2">{booking.guests || 1}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Status:</span>
                    <span className="ml-2">{booking.status}</span>
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
                    <h4 className="text-white font-medium mb-2">Client</h4>
                    <div className="space-y-1">
                      <div className="text-gray-300">{booking.client_name}</div>
                      <div className="text-gray-400 text-sm">{booking.client_email || 'Email not available'}</div>
                      <div className="text-gray-400 text-sm">{booking.client_phone || 'Phone not available'}</div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gray-700 rounded-lg">
                    <h4 className="text-white font-medium mb-2">Host</h4>
                    <div className="space-y-1">
                      <div className="text-gray-300">{booking.host_name}</div>
                      <div className="text-gray-400 text-sm">{booking.host_email || 'Email not available'}</div>
                      <div className="text-gray-400 text-sm">{booking.host_phone || 'Phone not available'}</div>
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
              <div className="grid grid-cols-2 gap-4 text-sm">
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
                  <span className="text-gray-400">Payment Status:</span>
                  <span className="text-white ml-2">{booking.payment_status || 'Pending'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-700">
            <Button
              onClick={onClose}
              variant="outline"
              className="border-gray-600 text-gray-300"
            >
              Close
            </Button>
            
            {booking.status === 'pending' && (
              <Button
                onClick={() => {
                  onAction(booking.booking_id, 'cancel');
                  onClose();
                }}
                variant="outline"
                className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
              >
                Cancel Booking
              </Button>
            )}
            
            <Button
              onClick={() => {
                const mailto = `mailto:${booking.client_name?.toLowerCase().replace(' ', '.')}@email.com?subject=Booking ${booking.booking_id}`;
                window.location.href = mailto;
              }}
              variant="gradient"
              className="bg-blue-600 hover:bg-blue-700"
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

export default BookingManagement;