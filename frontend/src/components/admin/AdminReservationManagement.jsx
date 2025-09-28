// frontend/src/components/admin/AdminReservationManagement.jsx - Complete Component
import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, MapPin, DollarSign, MessageSquare, Eye, Filter, 
  AlertTriangle, User, Phone, Mail, CreditCard, CheckCircle, X,
  Download, RefreshCw, Search, Calendar as CalendarIcon, 
  TrendingUp, Users, Home, Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import reservationService, { RESERVATION_STATUS } from '../../services/reservationService';
import { adminAPI } from '../../services/api';
import Button from '../ui/Button';

const AdminReservationManagement = () => {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [showActionModal, setShowActionModal] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

  useEffect(() => {
    loadReservations();
    loadStats();
  }, [filter, pagination.page]);

  const loadReservations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters = {
        status: filter === 'all' ? undefined : filter,
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        date_from: dateFilter.from,
        date_to: dateFilter.to
      };

      const response = await adminAPI.getAllReservations(filters);
      
      if (response.data.status === 'success') {
        const formattedReservations = response.data.data.reservations.map(reservation => 
          reservationService.formatReservationSummary(reservation)
        );
        setReservations(formattedReservations);
        setPagination(prev => ({
          ...prev,
          total: response.data.data.pagination?.total || 0
        }));
      } else {
        setError('Failed to load reservations');
      }
    } catch (err) {
      console.error('Admin load reservations error:', err);
      setError(err.response?.data?.message || 'Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await adminAPI.getReservationStats();
      if (response.data.status === 'success') {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load reservation stats:', error);
    }
  };

  const handleAdminAction = async (reservationId, action, data = '') => {
    try {
      setProcessing(true);
      
      let response;
      switch (action) {
        case 'cancel':
          response = await adminAPI.cancelReservationAdmin(reservationId, data);
          break;
        case 'approve':
          // Force approve reservation
          response = await adminAPI.updateReservationStatus(reservationId, 'confirmed');
          break;
        case 'decline':
          response = await adminAPI.updateReservationStatus(reservationId, 'declined');
          break;
        case 'refund':
          response = await adminAPI.processRefund(reservationId, data);
          break;
        default:
          response = await adminAPI.updateReservationStatus(reservationId, action);
      }

      if (response.data.status === 'success') {
        await loadReservations();
        await loadStats();
        setShowActionModal(null);
        
        const actionMessages = {
          cancel: 'Reservation cancelled successfully',
          approve: 'Reservation force-approved successfully',
          decline: 'Reservation declined successfully',
          refund: 'Refund processed successfully'
        };
        
        alert(actionMessages[action] || 'Action completed successfully');
      } else {
        throw new Error(response.data.message || 'Action failed');
      }
    } catch (error) {
      console.error('Admin action error:', error);
      alert('Failed to perform action: ' + (error.response?.data?.message || error.message));
    } finally {
      setProcessing(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    loadReservations();
  };

  const handleExportReservations = () => {
    const csvData = reservations.map(r => ({
      'Reservation ID': r.id,
      'Guest Name': r.guest_name,
      'Guest Email': r.guest_email,
      'Guest Phone': r.guest_phone || 'N/A',
      'Property': r.listing_title,
      'Location': r.listing_location || 'N/A',
      'Check In': r.check_in_date,
      'Check Out': r.check_out_date,
      'Nights': r.nights,
      'Guests': r.guest_count,
      'Total Amount': r.total_amount,
      'Deposit Amount': r.deposit_amount || 'N/A',
      'Remaining Amount': r.remaining_amount || 'N/A',
      'Deposit Paid': r.deposit_paid ? 'Yes' : 'No',
      'Full Amount Paid': r.full_amount_paid ? 'Yes' : 'No',
      'Status': r.status,
      'Created Date': new Date(r.created_at).toLocaleDateString(),
      'Payment Due Date': r.payment_due_date ? new Date(r.payment_due_date).toLocaleDateString() : 'N/A',
      'Special Requests': r.special_requests || 'N/A'
    }));

    const csvContent = "data:text/csv;charset=utf-8," 
      + Object.keys(csvData[0]).join(",") + "\n"
      + csvData.map(row => Object.values(row).map(field => 
          typeof field === 'string' && field.includes(',') ? `"${field}"` : field
        ).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reservations_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filterOptions = [
    { key: 'all', label: 'All Reservations', count: stats.total || 0, icon: Calendar, color: 'text-gray-400' },
    { key: 'urgent', label: 'Urgent Action', count: stats.urgent || 0, icon: AlertTriangle, color: 'text-red-400' },
    { key: 'pending', label: 'Pending Approval', count: stats.pending || 0, icon: Clock, color: 'text-yellow-400' },
    { key: 'awaiting_payment', label: 'Awaiting Payment', count: stats.awaitingPayment || 0, icon: CreditCard, color: 'text-blue-400' },
    { key: 'confirmed', label: 'Confirmed', count: stats.confirmed || 0, icon: CheckCircle, color: 'text-green-400' },
    { key: 'completed', label: 'Completed', count: stats.completed || 0, icon: Shield, color: 'text-purple-400' },
    { key: 'cancelled', label: 'Cancelled', count: stats.cancelled || 0, icon: X, color: 'text-red-400' }
  ];

  if (loading && reservations.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading reservation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Total Reservations</p>
              <p className="text-3xl font-bold text-white">{stats.total || 0}</p>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </div>
            <div className="bg-purple-500/20 p-3 rounded-lg">
              <Calendar className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Needs Action</p>
              <p className="text-3xl font-bold text-yellow-400">{(stats.pending || 0) + (stats.awaitingPayment || 0)}</p>
              <p className="text-xs text-gray-500 mt-1">Pending + Payment</p>
            </div>
            <div className="bg-yellow-500/20 p-3 rounded-lg">
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Revenue (Month)</p>
              <p className="text-3xl font-bold text-green-400">₱{(stats.monthlyRevenue || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Current month</p>
            </div>
            <div className="bg-green-500/20 p-3 rounded-lg">
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Avg. Stay</p>
              <p className="text-3xl font-bold text-blue-400">{(stats.averageStayLength || 0).toFixed(1)}</p>
              <p className="text-xs text-gray-500 mt-1">nights</p>
            </div>
            <div className="bg-blue-500/20 p-3 rounded-lg">
              <Home className="w-8 h-8 text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Reservation Management</h1>
          <p className="text-gray-400">Monitor and manage all platform reservations</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            size="sm"
            className="border-gray-600"
          >
            <Filter className="w-4 h-4 mr-2" />
            {showFilters ? 'Hide' : 'Show'} Filters
          </Button>
          
          <Button
            onClick={handleExportReservations}
            variant="outline"
            size="sm"
            className="border-gray-600"
            disabled={reservations.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          
          <Button
            onClick={loadReservations}
            variant="gradient"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Advanced Search and Filters */}
      {showFilters && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Advanced Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Guest name, email, property..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm text-gray-300 mb-2">Check-in From</label>
              <input
                type="date"
                value={dateFilter.from}
                onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-300 mb-2">Check-in To</label>
              <input
                type="date"
                value={dateFilter.to}
                onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <div className="flex items-end">
              <Button onClick={handleSearch} variant="gradient" size="sm" className="w-full">
                Apply Filters
              </Button>
            </div>
          </div>
          
          {(searchTerm || dateFilter.from || dateFilter.to) && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-gray-400">Active filters:</span>
              {searchTerm && (
                <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded">
                  Search: {searchTerm}
                </span>
              )}
              {dateFilter.from && (
                <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                  From: {dateFilter.from}
                </span>
              )}
              {dateFilter.to && (
                <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                  To: {dateFilter.to}
                </span>
              )}
              <button
                onClick={() => {
                  setSearchTerm('');
                  setDateFilter({ from: '', to: '' });
                  loadReservations();
                }}
                className="text-red-400 hover:text-red-300 text-xs"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map(({ key, label, count, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-lg text-sm transition relative flex items-center gap-2 ${
              filter === key
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Icon className={`w-4 h-4 ${filter === key ? 'text-white' : color}`} />
            {label}
            {count > 0 && (
              <span className="px-2 py-0.5 text-xs bg-white/20 rounded-full">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500 text-red-400 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            {error}
          </div>
        </div>
      )}

      {/* Reservations List */}
      {reservations.length === 0 && !loading ? (
        <div className="text-center py-16">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No reservations found</h3>
          <p className="text-gray-400">
            {filter === 'all' ? 'No reservations in the system yet.' : `No ${filterOptions.find(o => o.key === filter)?.label.toLowerCase()} reservations.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reservations.map((reservation) => (
            <AdminReservationCard
              key={reservation.id}
              reservation={reservation}
              onAction={(action, data) => setShowActionModal({ type: action, reservation, data })}
              onViewDetails={() => navigate(`/admin/reservations/${reservation.id}`)}
            />
          ))}
        </div>
      )}

      {/* Enhanced Pagination */}
      {pagination.total > pagination.limit && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 p-4 bg-gray-800 rounded-lg">
          <div className="text-sm text-gray-400">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} reservations
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
              disabled={pagination.page === 1}
              variant="outline"
              size="sm"
            >
              Previous
            </Button>
            
            <span className="px-3 py-1 bg-gray-700 rounded text-sm text-white">
              {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
            </span>
            
            <Button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
              variant="outline"
              size="sm"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Action Modals */}
      {showActionModal && (
        <AdminActionModal
          type={showActionModal.type}
          reservation={showActionModal.reservation}
          onClose={() => setShowActionModal(null)}
          onConfirm={(action, data) => handleAdminAction(showActionModal.reservation.id, action, data)}
          processing={processing}
        />
      )}
    </div>
  );
};

// Enhanced Admin Reservation Card Component
const AdminReservationCard = ({ reservation, onAction, onViewDetails }) => {
  const getUrgencyBadge = (reservation) => {
    if (reservation.status === 'pending') {
      const hoursOld = (new Date() - new Date(reservation.created_at)) / (1000 * 60 * 60);
      if (hoursOld > 24) return { color: 'bg-red-500', label: 'URGENT', pulse: true };
      if (hoursOld > 12) return { color: 'bg-yellow-500', label: 'PRIORITY', pulse: false };
    }
    if (reservation.isOverdue) return { color: 'bg-red-500', label: 'OVERDUE', pulse: true };
    return null;
  };

  const urgency = getUrgencyBadge(reservation);

  return (
    <div className={`bg-gray-800 rounded-xl p-6 border transition-all hover:shadow-lg ${
      urgency ? 'border-red-500/50 shadow-red-500/10' : 'border-gray-700 hover:border-gray-600'
    }`}>
      {/* Enhanced Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-white">#{reservation.id}</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${reservation.statusColor}`}>
              {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
            </span>
            {urgency && (
              <span className={`px-2 py-1 rounded-full text-xs font-bold text-white ${urgency.color} ${urgency.pulse ? 'animate-pulse' : ''}`}>
                {urgency.label}
              </span>
            )}
          </div>
          <p className="text-gray-300 font-medium">{reservation.listing_title}</p>
          <p className="text-gray-400 text-sm">{reservation.listing_location}</p>
        </div>
        
        <div className="text-right">
          <p className="text-xl font-bold text-white">{reservation.formattedPrice}</p>
          <p className="text-xs text-gray-400">
            Created: {new Date(reservation.created_at).toLocaleDateString()}
          </p>
          <p className="text-xs text-gray-500">
            {Math.ceil((new Date() - new Date(reservation.created_at)) / (1000 * 60 * 60 * 24))} days ago
          </p>
        </div>
      </div>

      {/* Enhanced Guest and Property Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
            <User className="w-4 h-4 mr-2" />
            Guest Information
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Name:</span>
              <span className="text-white font-medium">{reservation.guest_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Email:</span>
              <span className="text-gray-300 truncate ml-2">{reservation.guest_email}</span>
            </div>
            {reservation.guest_phone && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Phone:</span>
                <span className="text-gray-300">{reservation.guest_phone}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Guests:</span>
              <span className="text-white">{reservation.guest_count}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Reservation Details
          </h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Check-in:</span>
              <span className="text-white">{new Date(reservation.check_in_date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Check-out:</span>
              <span className="text-white">{new Date(reservation.check_out_date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Duration:</span>
              <span className="text-white">{reservation.nights} night{reservation.nights > 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Days until:</span>
              <span className={`${reservation.daysUntilCheckIn < 0 ? 'text-red-400' : reservation.daysUntilCheckIn < 7 ? 'text-yellow-400' : 'text-white'}`}>
                {reservation.daysUntilCheckIn < 0 ? `${Math.abs(reservation.daysUntilCheckIn)} days ago` : `${reservation.daysUntilCheckIn} days`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Payment Information */}
      {(reservation.deposit_amount || reservation.remaining_amount) && (
        <div className="bg-gray-700 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
            <CreditCard className="w-4 h-4 mr-2" />
            Payment Status
          </h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            {reservation.deposit_amount && (
              <div className="bg-gray-600 rounded p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-gray-400">Deposit (50%):</span>
                  <span className={reservation.deposit_paid ? 'text-green-400 font-medium' : 'text-gray-300'}>
                    ₱{reservation.deposit_amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center">
                  {reservation.deposit_paid ? (
                    <span className="text-green-400 text-xs flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Paid
                    </span>
                  ) : (
                    <span className="text-red-400 text-xs">Pending</span>
                  )}
                </div>
              </div>
            )}
            
            {reservation.remaining_amount && (
              <div className="bg-gray-600 rounded p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-gray-400">Remaining (50%):</span>
                  <span className={reservation.full_amount_paid ? 'text-green-400 font-medium' : 'text-gray-300'}>
                    ₱{reservation.remaining_amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center">
                  {reservation.full_amount_paid ? (
                    <span className="text-green-400 text-xs flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Paid
                    </span>
                  ) : reservation.payment_due_date ? (
                    <span className={`text-xs ${reservation.isOverdue ? 'text-red-400' : 'text-yellow-400'}`}>
                      Due: {new Date(reservation.payment_due_date).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">Not due yet</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Special Requests */}
      {reservation.special_requests && (
        <div className="bg-gray-700 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Special Requests</h4>
          <p className="text-xs text-gray-300 italic">"{reservation.special_requests}"</p>
        </div>
      )}

      {/* Enhanced Admin Actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="border-purple-500 text-purple-400" onClick={onViewDetails}>
          <Eye className="w-4 h-4 mr-2" />
          View Details
        </Button>
        
        {reservation.status === 'pending' && (
          <>
            <Button
              size="sm"
              variant="gradient"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => onAction('approve')}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Force Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-500 text-red-400"
              onClick={() => onAction('decline')}
            >
              <X className="w-4 h-4 mr-2" />
              Decline
            </Button>
          </>
        )}
        
        {['confirmed', 'awaiting_payment'].includes(reservation.status) && (
          <Button
            size="sm"
            variant="outline"
            className="border-red-500 text-red-400"
            onClick={() => onAction('cancel')}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        )}
        
        {reservation.status === 'cancelled' && reservation.deposit_paid && (
          <Button
            size="sm"
            variant="outline"
            className="border-blue-500 text-blue-400"
            onClick={() => onAction('refund')}
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Manage Refund
          </Button>
        )}
        
        {/* Additional Admin Tools */}
        <Button
          size="sm"
          variant="outline"
          className="border-gray-500 text-gray-400"
          onClick={() => window.open(`mailto:${reservation.guest_email}`, '_blank')}
        >
          <Mail className="w-4 h-4 mr-2" />
          Email Guest
        </Button>
      </div>
    </div>
  );
};

// Enhanced Admin Action Modal Component
const AdminActionModal = ({ type, reservation, onClose, onConfirm, processing }) => {
  const [reason, setReason] = useState('');
  const [refundAmount, setRefundAmount] = useState(0);
  const [customRefund, setCustomRefund] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    if (type === 'refund' && reservation) {
      const refundDetails = reservationService.calculateCancellationRefund(reservation);
      setRefundAmount(refundDetails.refundAmount);
    }
  }, [type, reservation]);

  const getModalTitle = () => {
    switch (type) {
      case 'cancel': return 'Cancel Reservation';
      case 'approve': return 'Force Approve Reservation';
      case 'decline': return 'Decline Reservation';
      case 'refund': return 'Process Refund';
      default: return 'Admin Action';
    }
  };

  const getModalDescription = () => {
    switch (type) {
      case 'cancel': return `Cancel reservation #${reservation.id} for ${reservation.guest_name}? This action cannot be undone.`;
      case 'approve': return `Force approve reservation #${reservation.id} bypassing normal approval process? Guest will be notified to proceed with payment.`;
      case 'decline': return `Decline reservation #${reservation.id} from ${reservation.guest_name}? Guest will be notified of the decline.`;
      case 'refund': return `Process refund for cancelled reservation #${reservation.id}? Refund will be processed through PayMongo.`;
      default: return 'Confirm this admin action?';
    }
  };

  const getActionButtonText = () => {
    if (processing) return 'Processing...';
    switch (type) {
      case 'cancel': return 'Cancel Reservation';
      case 'approve': return 'Force Approve';
      case 'decline': return 'Decline Reservation';
      case 'refund': return 'Process Refund';
      default: return 'Confirm Action';
    }
  };

  const getActionButtonColor = () => {
    switch (type) {
      case 'approve': return 'bg-green-600 hover:bg-green-700';
      case 'decline':
      case 'cancel': return 'bg-red-600 hover:bg-red-700';
      case 'refund': return 'bg-blue-600 hover:bg-blue-700';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">{getModalTitle()}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-gray-300 mb-4 text-sm">{getModalDescription()}</p>

        {/* Reservation Summary */}
        <div className="bg-gray-700 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-400">Guest:</span>
              <span className="text-white ml-2">{reservation.guest_name}</span>
            </div>
            <div>
              <span className="text-gray-400">Property:</span>
              <span className="text-white ml-2">{reservation.listing_title}</span>
            </div>
            <div>
              <span className="text-gray-400">Dates:</span>
              <span className="text-white ml-2">{reservation.formattedDates}</span>
            </div>
            <div>
              <span className="text-gray-400">Total:</span>
              <span className="text-white ml-2">{reservation.formattedPrice}</span>
            </div>
          </div>
        </div>

        {/* Refund-specific controls */}
        {type === 'refund' && (
          <div className="space-y-4 mb-4">
            <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3">
              <h4 className="text-blue-400 font-medium text-sm mb-2">Refund Calculation</h4>
              <div className="text-blue-300 text-xs space-y-1">
                <p>• Original amount: ₱{reservation.total_amount.toLocaleString()}</p>
                <p>• Amount paid: ₱{((reservation.deposit_paid ? reservation.deposit_amount : 0) + (reservation.full_amount_paid ? reservation.remaining_amount : 0)).toLocaleString()}</p>
                <p>• Calculated refund: ₱{refundAmount.toLocaleString()}</p>
              </div>
            </div>
            
            <div>
              <label className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  checked={customRefund}
                  onChange={(e) => setCustomRefund(e.target.checked)}
                  className="rounded"
                />
                <span className="text-gray-300 text-sm">Override with custom refund amount</span>
              </label>
            </div>
            
            <div>
              <label className="block text-sm text-gray-300 mb-2">Refund Amount (₱)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={reservation.total_amount}
                value={refundAmount}
                onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
                disabled={!customRefund}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              />
            </div>
          </div>
        )}

        {/* Reason/Notes Input */}
        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-2">
            {type === 'refund' ? 'Admin Notes' : 'Reason'} 
            {type === 'decline' || type === 'cancel' ? ' *' : ' (optional)'}
          </label>
          <textarea
            value={type === 'refund' ? adminNotes : reason}
            onChange={(e) => type === 'refund' ? setAdminNotes(e.target.value) : setReason(e.target.value)}
            placeholder={
              type === 'refund' ? "Internal notes about this refund (visible to other admins)..." :
              type === 'approve' ? "Optional reason for force approval..." :
              type === 'decline' ? "Please provide a reason for declining this reservation..." :
              "Please provide a reason for this action..."
            }
            rows={3}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 resize-none"
            maxLength={500}
          />
          <div className="text-xs text-gray-400 mt-1 text-right">
            {(type === 'refund' ? adminNotes : reason).length}/500
          </div>
        </div>

        {/* Warning for irreversible actions */}
        {(['cancel', 'decline', 'refund'].includes(type)) && (
          <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-3 mb-4">
            <div className="flex items-start">
              <AlertTriangle className="w-4 h-4 text-yellow-400 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-yellow-300 text-xs">
                <strong>Warning:</strong> This action cannot be undone. {type === 'refund' && 'The refund will be processed immediately through PayMongo.'}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 border-gray-600 text-gray-300" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="gradient" 
            className={`flex-1 ${getActionButtonColor()}`}
            loading={processing} 
            onClick={() => {
              if (type === 'refund') {
                onConfirm(type, { 
                  amount: refundAmount, 
                  notes: adminNotes, 
                  customRefund,
                  adjustedRefundAmount: customRefund ? refundAmount : undefined
                });
              } else {
                onConfirm(type, reason);
              }
            }}
            disabled={(['decline', 'cancel'].includes(type) && !reason.trim()) || processing}
          >
            {getActionButtonText()}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminReservationManagement;