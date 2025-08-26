// src/pages/admin/BookingsTab.jsx
import React, { useState, useEffect } from 'react';
import { Calendar, User, Building2, DollarSign, Clock, Search, Filter } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import Modal from '../../components/common/Modal';

const BookingsTab = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const { showToast } = useApp();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/bookings');
      if (response.status === 'success') {
        setBookings(response.data.bookings || []);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      showToast('Failed to load bookings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBookingStatus = async (bookingId, newStatus) => {
    try {
      await api.put(`/admin/bookings/${bookingId}/status`, { status: newStatus });
      
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: newStatus }
          : booking
      ));
      
      showToast(`Booking ${newStatus}`, 'success');
    } catch (error) {
      showToast('Failed to update booking status', 'error');
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-500/20 text-yellow-400',
      confirmed: 'bg-green-500/20 text-green-400',
      cancelled: 'bg-red-500/20 text-red-400',
      completed: 'bg-blue-500/20 text-blue-400'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${colors[status] || 'bg-gray-500/20 text-gray-400'}`}>
        {status}
      </span>
    );
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateNights = (checkIn, checkOut) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.listing?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.guest?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.host?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const today = new Date();
      const bookingDate = new Date(booking.created_at);
      
      switch (dateFilter) {
        case 'today':
          matchesDate = bookingDate.toDateString() === today.toDateString();
          break;
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = bookingDate >= weekAgo;
          break;
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchesDate = bookingDate >= monthAgo;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    totalRevenue: bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)
  };

  if (loading) {
    return <Loading message="Loading bookings..." fullScreen={false} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bookings Management</h2>
          <p className="text-gray-400">Monitor and manage all bookings</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-blue-400 mr-3" />
            <div>
              <p className="text-gray-400 text-sm">Total</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-yellow-400 mr-3" />
            <div>
              <p className="text-gray-400 text-sm">Pending</p>
              <p className="text-xl font-bold">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-green-400 mr-3" />
            <div>
              <p className="text-gray-400 text-sm">Confirmed</p>
              <p className="text-xl font-bold">{stats.confirmed}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-red-400 mr-3" />
            <div>
              <p className="text-gray-400 text-sm">Cancelled</p>
              <p className="text-xl font-bold">{stats.cancelled}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-blue-400 mr-3" />
            <div>
              <p className="text-gray-400 text-sm">Completed</p>
              <p className="text-xl font-bold">{stats.completed}</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-green-400 mr-3" />
            <div>
              <p className="text-gray-400 text-sm">Revenue</p>
              <p className="text-lg font-bold">{formatPrice(stats.totalRevenue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search bookings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Booking ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Guest
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Property
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Dates
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">#{booking.id}</div>
                    <div className="text-sm text-gray-400">
                      {formatDate(booking.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <img
                        src={booking.guest?.profile_picture || `https://ui-avatars.com/api/?name=${booking.guest?.name}&background=random`}
                        alt={booking.guest?.name}
                        className="w-8 h-8 rounded-full mr-3"
                      />
                      <div>
                        <div className="text-sm font-medium text-white">{booking.guest?.name}</div>
                        <div className="text-sm text-gray-400">{booking.guest?.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{booking.listing?.title}</div>
                    <div className="text-sm text-gray-400">{booking.listing?.location}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-white">
                      {formatDate(booking.check_in_date)} - {formatDate(booking.check_out_date)}
                    </div>
                    <div className="text-sm text-gray-400">
                      {calculateNights(booking.check_in_date, booking.check_out_date)} nights
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">
                      {formatPrice(booking.total_amount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(booking.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowDetailModal(true);
                        }}
                      >
                        View
                      </Button>
                      {booking.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => handleUpdateBookingStatus(booking.id, 'confirmed')}
                        >
                          Confirm
                        </Button>
                      )}
                      {(booking.status === 'pending' || booking.status === 'confirmed') && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Booking Details"
        size="lg"
      >
        {selectedBooking && (
          <div className="space-y-6">
            {/* Booking Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Booking ID</label>
                <p className="text-white">#{selectedBooking.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                {getStatusBadge(selectedBooking.status)}
              </div>
            </div>

            {/* Guest Info */}
            <div className="border-t border-gray-700 pt-4">
              <h4 className="text-lg font-semibold text-white mb-3">Guest Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                  <p className="text-white">{selectedBooking.guest?.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                  <p className="text-white">{selectedBooking.guest?.email}</p>
                </div>
              </div>
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                <p className="text-white">{selectedBooking.guest?.phone || 'Not provided'}</p>
              </div>
            </div>

            {/* Property Info */}
            <div className="border-t border-gray-700 pt-4">
              <h4 className="text-lg font-semibold text-white mb-3">Property Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Property</label>
                  <p className="text-white">{selectedBooking.listing?.title}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Location</label>
                  <p className="text-white">{selectedBooking.listing?.location}</p>
                </div>
              </div>
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">Host</label>
                <p className="text-white">{selectedBooking.host?.name}</p>
              </div>
            </div>

            {/* Booking Details */}
            <div className="border-t border-gray-700 pt-4">
              <h4 className="text-lg font-semibold text-white mb-3">Booking Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Check-in</label>
                  <p className="text-white">{formatDate(selectedBooking.check_in_date)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Check-out</label>
                  <p className="text-white">{formatDate(selectedBooking.check_out_date)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nights</label>
                  <p className="text-white">
                    {calculateNights(selectedBooking.check_in_date, selectedBooking.check_out_date)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Guests</label>
                  <p className="text-white">{selectedBooking.guest_count || 1}</p>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="border-t border-gray-700 pt-4">
              <h4 className="text-lg font-semibold text-white mb-3">Payment Information</h4>
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">Base Amount</span>
                  <span className="text-white">{formatPrice(selectedBooking.base_amount || 0)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">Service Fee</span>
                  <span className="text-white">{formatPrice(selectedBooking.service_fee || 0)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">Taxes</span>
                  <span className="text-white">{formatPrice(selectedBooking.taxes || 0)}</span>
                </div>
                <hr className="border-gray-600 my-2" />
                <div className="flex justify-between items-center font-semibold">
                  <span className="text-white">Total Amount</span>
                  <span className="text-white">{formatPrice(selectedBooking.total_amount)}</span>
                </div>
              </div>
            </div>

            {/* Special Requests */}
            {selectedBooking.special_requests && (
              <div className="border-t border-gray-700 pt-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">Special Requests</label>
                <p className="text-white bg-gray-700 p-3 rounded-lg">
                  {selectedBooking.special_requests}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            {selectedBooking.status === 'pending' && (
              <div className="flex space-x-3 pt-4 border-t border-gray-700">
                <Button
                  variant="success"
                  className="flex-1"
                  onClick={() => {
                    handleUpdateBookingStatus(selectedBooking.id, 'confirmed');
                    setShowDetailModal(false);
                  }}
                >
                  Confirm Booking
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={() => {
                    handleUpdateBookingStatus(selectedBooking.id, 'cancelled');
                    setShowDetailModal(false);
                  }}
                >
                  Cancel Booking
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BookingsTab;