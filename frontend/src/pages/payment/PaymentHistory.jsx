// frontend/src/pages/payment/PaymentHistory.jsx - Role-Based Payment History
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Eye, Download, Filter, Search, CreditCard } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import paymentService from '../../services/paymentService';
import { paymentAPI, adminAPI } from '../../services/api';

const PaymentHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadPaymentData();
  }, [user?.role, filter]);

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      
      let paymentData = [];
      let statsData = null;

      switch (user?.role) {
        case 'client':
          paymentData = await paymentService.getPaymentHistory();
          break;
          
        case 'host':
          // Get host earnings and payment history
          const hostResponse = await paymentAPI.getMyPayments();
          paymentData = hostResponse.data.data?.payments || [];
          
          // Get earnings stats
          try {
            const earningsResponse = await paymentAPI.getMyEarnings();
            statsData = earningsResponse.data.data;
          } catch (err) {
            console.warn('Could not load earnings data:', err);
          }
          break;
          
        case 'admin':
          // Get all transactions for admin
          const adminResponse = await adminAPI.getAllTransactions();
          paymentData = adminResponse.data.data?.transactions || [];
          
          // Get admin dashboard stats
          try {
            const dashboardResponse = await adminAPI.getDashboardStats();
            statsData = dashboardResponse.data.data?.payments;
          } catch (err) {
            console.warn('Could not load admin stats:', err);
          }
          break;
          
        default:
          throw new Error('Unauthorized access');
      }

      setPayments(paymentData);
      setStats(statsData);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesFilter = filter === 'all' || payment.status === filter;
    const matchesSearch = !searchTerm || 
      payment.booking_id?.toString().includes(searchTerm) ||
      payment.amount?.toString().includes(searchTerm) ||
      payment.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.host_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const formatCurrency = (amount) => {
    return `₱${Number(amount).toLocaleString()}`;
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      succeeded: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800'
    };

    const statusLabels = {
      succeeded: 'Completed',
      pending: 'Processing',
      failed: 'Failed',
      refunded: 'Refunded'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status] || statusStyles.pending}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  const renderClientView = () => (
    <div className="space-y-6">
      {/* Client Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Total Spent</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(payments.filter(p => p.status === 'succeeded').reduce((sum, p) => sum + Number(p.amount), 0))}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center">
            <CreditCard className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Total Bookings</p>
              <p className="text-2xl font-bold text-white">{payments.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center">
            <Eye className="w-8 h-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Successful Payments</p>
              <p className="text-2xl font-bold text-white">
                {payments.filter(p => p.status === 'succeeded').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment List */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-medium text-white">Your Payments</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Booking
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {filteredPayments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    #{payment.booking_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(payment.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {new Date(payment.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Button
                      onClick={() => navigate(`/booking/${payment.booking_id}`)}
                      variant="outline"
                      size="sm"
                    >
                      View Booking
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderHostView = () => (
    <div className="space-y-6">
      {/* Host Earnings Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Total Earnings</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(payments.filter(p => p.status === 'succeeded').reduce((sum, p) => sum + (Number(p.host_earnings) || Number(p.amount) * 0.9), 0))}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center">
            <CreditCard className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Platform Fees</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(payments.filter(p => p.status === 'succeeded').reduce((sum, p) => sum + (Number(p.platform_fee) || Number(p.amount) * 0.1), 0))}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center">
            <Eye className="w-8 h-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Completed Bookings</p>
              <p className="text-2xl font-bold text-white">
                {payments.filter(p => p.status === 'succeeded').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center">
            <Download className="w-8 h-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">This Month</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(payments.filter(p => {
                  const paymentDate = new Date(p.created_at);
                  const currentDate = new Date();
                  return paymentDate.getMonth() === currentDate.getMonth() && 
                         paymentDate.getFullYear() === currentDate.getFullYear() &&
                         p.status === 'succeeded';
                }).reduce((sum, p) => sum + (Number(p.host_earnings) || Number(p.amount) * 0.9), 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Earnings Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-medium text-white">Your Earnings</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Booking
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Your Earnings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {filteredPayments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    #{payment.booking_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {payment.client_name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400 font-medium">
                    {formatCurrency(payment.host_earnings || Number(payment.amount) * 0.9)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(payment.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {new Date(payment.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAdminView = () => (
    <div className="space-y-6">
      {/* Admin Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(payments.filter(p => p.status === 'succeeded').reduce((sum, p) => sum + Number(p.amount), 0))}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center">
            <CreditCard className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Platform Earnings</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(payments.filter(p => p.status === 'succeeded').reduce((sum, p) => sum + (Number(p.platform_fee) || Number(p.amount) * 0.1), 0))}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center">
            <Eye className="w-8 h-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Total Transactions</p>
              <p className="text-2xl font-bold text-white">{payments.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center">
            <Download className="w-8 h-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Failed Payments</p>
              <p className="text-2xl font-bold text-white">
                {payments.filter(p => p.status === 'failed').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* All Transactions Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-medium text-white">All Transactions</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Host
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Platform Fee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {filteredPayments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    #{payment.booking_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {payment.client_name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {payment.host_name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400">
                    {formatCurrency(payment.platform_fee || Number(payment.amount) * 0.1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(payment.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <Button
                      onClick={() => navigate(`/admin/booking/${payment.booking_id}`)}
                      variant="outline"
                      size="sm"
                    >
                      View
                    </Button>
                    {payment.status === 'succeeded' && (
                      <Button
                        onClick={() => navigate(`/admin/payment/${payment.id}/refund`)}
                        variant="outline"
                        size="sm"
                        className="border-red-500 text-red-400"
                      >
                        Refund
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading payment history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-20">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {user?.role === 'client' && 'Payment History'}
                {user?.role === 'host' && 'Earnings Dashboard'}
                {user?.role === 'admin' && 'Transaction Management'}
              </h1>
              <p className="text-gray-400">
                {user?.role === 'client' && 'View your booking payments and transaction history'}
                {user?.role === 'host' && 'Track your earnings from bookings and payouts'}
                {user?.role === 'admin' && 'Monitor all platform transactions and payments'}
              </p>
            </div>
            
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
            >
              Back
            </Button>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex space-x-2">
              <Button
                onClick={() => setFilter('all')}
                variant={filter === 'all' ? 'gradient' : 'outline'}
                size="sm"
              >
                All
              </Button>
              <Button
                onClick={() => setFilter('succeeded')}
                variant={filter === 'succeeded' ? 'gradient' : 'outline'}
                size="sm"
              >
                Completed
              </Button>
              <Button
                onClick={() => setFilter('pending')}
                variant={filter === 'pending' ? 'gradient' : 'outline'}
                size="sm"
              >
                Pending
              </Button>
              <Button
                onClick={() => setFilter('failed')}
                variant={filter === 'failed' ? 'gradient' : 'outline'}
                size="sm"
              >
                Failed
              </Button>
            </div>
            
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500 text-red-400 rounded-lg p-4 mb-6">
              {error}
            </div>
          )}
        </div>

        {/* Role-based Content */}
        {user?.role === 'client' && renderClientView()}
        {user?.role === 'host' && renderHostView()}
        {user?.role === 'admin' && renderAdminView()}

        {filteredPayments.length === 0 && !loading && (
          <div className="text-center py-12">
            <CreditCard className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No payments found</h3>
            <p className="text-gray-400">
              {searchTerm || filter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'You haven\'t made any payments yet'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentHistory;