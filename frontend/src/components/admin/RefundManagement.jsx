// frontend/src/components/admin/RefundManagement.jsx
import React, { useState, useEffect } from 'react';
import adminService from '../../services/adminService';

const RefundManagement = () => {
  const [refunds, setRefunds] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchRefunds();
  }, [filter]);

  const fetchRefunds = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const data = await adminService.getAllRefunds(params);
      setRefunds(data.refunds);
      setStatistics(data.statistics);
    } catch (error) {
      console.error('Error fetching refunds:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (refundId, newStatus) => {
    try {
      const notes = prompt('Add notes (optional):');
      await adminService.updateRefundStatus(refundId, newStatus, notes);
      await fetchRefunds();
      alert(`Refund ${newStatus} successfully`);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleManualRefund = async () => {
    const bookingId = prompt('Enter Booking ID:');
    const amount = prompt('Enter refund amount:');
    const reason = prompt('Enter refund reason:');
    
    if (bookingId && amount && reason) {
      try {
        await adminService.processManualRefund(
          parseInt(bookingId), 
          parseFloat(amount), 
          reason
        );
        await fetchRefunds();
        alert('Manual refund created successfully');
      } catch (error) {
        alert(`Error: ${error.message}`);
      }
    }
  };

  if (loading) return <div>Loading refunds...</div>;

  return (
    <div className="p-6">
      <div className="mb-4 grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-sm text-gray-600">Total Refunds</h3>
          <p className="text-2xl font-bold">{statistics.total_refunds || 0}</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded shadow">
          <h3 className="text-sm text-gray-600">Pending</h3>
          <p className="text-2xl font-bold text-yellow-600">
            {statistics.pending_count || 0}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded shadow">
          <h3 className="text-sm text-gray-600">Completed</h3>
          <p className="text-2xl font-bold text-green-600">
            {statistics.completed_count || 0}
          </p>
        </div>
        <div className="bg-blue-50 p-4 rounded shadow">
          <h3 className="text-sm text-gray-600">Total Refunded</h3>
          <p className="text-2xl font-bold text-blue-600">
            ₱{statistics.total_refunded?.toLocaleString() || 0}
          </p>
        </div>
      </div>

      <div className="mb-4 flex justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded ${filter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-gray-200'}`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded ${filter === 'completed' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
          >
            Completed
          </button>
        </div>
        <button
          onClick={handleManualRefund}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Create Manual Refund
        </button>
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Booking</th>
              <th className="px-4 py-2 text-left">Client</th>
              <th className="px-4 py-2 text-left">Amount</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Reason</th>
              <th className="px-4 py-2 text-left">Created</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {refunds.map(refund => (
              <tr key={refund.id} className="border-t">
                <td className="px-4 py-2">#{refund.id}</td>
                <td className="px-4 py-2">#{refund.booking_id}</td>
                <td className="px-4 py-2">{refund.client_name}</td>
                <td className="px-4 py-2">₱{refund.amount?.toLocaleString()}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded text-sm ${
                    refund.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    refund.status === 'completed' ? 'bg-green-100 text-green-800' :
                    refund.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {refund.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-sm">{refund.reason}</td>
                <td className="px-4 py-2 text-sm">
                  {new Date(refund.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-2">
                  {refund.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateStatus(refund.id, 'processing')}
                        className="text-blue-500 hover:underline"
                      >
                        Process
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(refund.id, 'failed')}
                        className="text-red-500 hover:underline"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  {refund.status === 'processing' && (
                    <button
                      onClick={() => handleUpdateStatus(refund.id, 'completed')}
                      className="text-green-500 hover:underline"
                    >
                      Complete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RefundManagement;