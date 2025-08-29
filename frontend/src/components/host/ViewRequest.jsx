// frontend/src/components/host/ViewRequests.jsx - Manage View Requests
import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  Calendar, 
  Clock, 
  User, 
  MessageSquare,
  Check,
  X,
  MapPin,
  Phone,
  RefreshCw,
  AlertTriangle,
  Filter
} from 'lucide-react';
import { viewRequestAPI } from '../../services/api';
import Button from '../ui/Button';

const ViewRequests = () => {
  const [viewRequests, setViewRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [responding, setResponding] = useState({});
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseAction, setResponseAction] = useState('');
  const [responseMessage, setResponseMessage] = useState('');

  useEffect(() => {
    loadViewRequests();
  }, []);

  const loadViewRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await viewRequestAPI.getViewRequests();
      setViewRequests(response.data.data?.viewRequests || []);
    } catch (err) {
      setError(err.message || 'Failed to load view requests');
    } finally {
      setLoading(false);
    }
  };

  const handleResponseAction = async (requestId, action, message = '') => {
    try {
      setResponding(prev => ({ ...prev, [requestId]: true }));
      
      await viewRequestAPI.respondToViewRequest(requestId, {
        status: action,
        response_message: message
      });
      
      await loadViewRequests(); // Refresh the list
      setShowResponseModal(false);
      setSelectedRequest(null);
      setResponseMessage('');
      
    } catch (error) {
      alert(`Failed to ${action} request: ${error.message}`);
    } finally {
      setResponding(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const openResponseModal = (request, action) => {
    setSelectedRequest(request);
    setResponseAction(action);
    setShowResponseModal(true);
    
    // Pre-fill response message based on action
    if (action === 'approved') {
      setResponseMessage('I\'d be happy to show you the property! I\'ll contact you to arrange the viewing.');
    } else if (action === 'rejected') {
      setResponseMessage('Unfortunately, I\'m not available for viewings at this time. Please feel free to book directly if you\'re interested.');
    }
  };

  const getStatusBadge = (status) => {
    const configs = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
      completed: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Completed' }
    };
    
    const config = configs[status] || configs.pending;
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const filteredRequests = viewRequests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  const pendingCount = viewRequests.filter(r => r.status === 'pending').length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Failed to load view requests</h3>
        <p className="text-gray-400 mb-6">{error}</p>
        <Button onClick={loadViewRequests} variant="gradient">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">View Requests</h1>
          <p className="text-gray-400">
            {pendingCount > 0 ? `${pendingCount} pending request${pendingCount > 1 ? 's' : ''} need response` : 'No pending requests'}
          </p>
        </div>
        <Button onClick={loadViewRequests} variant="outline" className="border-gray-600">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2">
        {['all', 'pending', 'approved', 'rejected', 'completed'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === status
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            {status === 'pending' && pendingCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-yellow-500 text-yellow-900 rounded-full text-xs">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* View Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-16">
          <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            {filter === 'all' ? 'No view requests yet' : `No ${filter} requests`}
          </h3>
          <p className="text-gray-400">
            View requests from potential guests will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <div key={request.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-semibold text-white">{request.listing_title}</h3>
                    {getStatusBadge(request.status)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center text-gray-400">
                      <User className="w-4 h-4 mr-2" />
                      <span>{request.requester_name}</span>
                    </div>
                    <div className="flex items-center text-gray-400">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>{new Date(request.preferred_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center text-gray-400">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>{request.preferred_time || 'Flexible'}</span>
                    </div>
                    <div className="flex items-center text-gray-400">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      <span>{new Date(request.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Request Message */}
              <div className="mb-4">
                <h4 className="text-white font-medium mb-2">Request Message:</h4>
                <div className="bg-gray-700 rounded-lg p-3">
                  <p className="text-gray-300 text-sm">{request.message}</p>
                </div>
              </div>

              {/* Host Response */}
              {request.response_message && (
                <div className="mb-4">
                  <h4 className="text-purple-400 font-medium mb-2">Your Response:</h4>
                  <div className="bg-purple-900/20 border border-purple-600 rounded-lg p-3">
                    <p className="text-purple-300 text-sm">{request.response_message}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                <div className="text-xs text-gray-500">
                  Request ID: {request.id} • Requested {new Date(request.created_at).toLocaleDateString()}
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-gray-400"
                    onClick={() => {
                      window.open(`/messages?client=${request.requester_id}`, '_blank');
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Message
                  </Button>

                  {request.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="gradient"
                        className="bg-green-600 hover:bg-green-700"
                        loading={responding[request.id]}
                        onClick={() => openResponseModal(request, 'approved')}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                        loading={responding[request.id]}
                        onClick={() => openResponseModal(request, 'rejected')}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Decline
                      </Button>
                    </>
                  )}

                  {request.status === 'approved' && (
                    <Button
                      size="sm"
                      variant="gradient"
                      className="bg-purple-600 hover:bg-purple-700"
                      onClick={() => handleResponseAction(request.id, 'completed')}
                    >
                      Mark Complete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Response Modal */}
      {showResponseModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                {responseAction === 'approved' ? 'Approve View Request' : 'Decline View Request'}
              </h3>
              <button
                onClick={() => {
                  setShowResponseModal(false);
                  setSelectedRequest(null);
                  setResponseMessage('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-700 rounded-lg">
              <p className="text-white font-medium">{selectedRequest.listing_title}</p>
              <p className="text-gray-400 text-sm">Requested by {selectedRequest.requester_name}</p>
              <p className="text-gray-400 text-sm">
                Preferred: {new Date(selectedRequest.preferred_date).toLocaleDateString()} 
                {selectedRequest.preferred_time && ` at ${selectedRequest.preferred_time}`}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-2">Response Message</label>
              <textarea
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                placeholder="Add a personal message to your response..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500"
                rows={4}
                maxLength={500}
              />
              <div className="text-right text-xs text-gray-400 mt-1">
                {responseMessage.length}/500
              </div>
            </div>

            {responseAction === 'approved' && (
              <div className="mb-4 bg-green-900/20 border border-green-600 rounded-lg p-3">
                <p className="text-green-400 text-sm">
                  ✅ Approving will share your contact information with the requester so they can coordinate the viewing.
                </p>
              </div>
            )}

            <div className="flex space-x-3">
              <Button
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300"
                onClick={() => {
                  setShowResponseModal(false);
                  setSelectedRequest(null);
                  setResponseMessage('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="gradient"
                className={`flex-1 ${
                  responseAction === 'rejected' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                }`}
                loading={responding[selectedRequest.id]}
                onClick={() => handleResponseAction(selectedRequest.id, responseAction, responseMessage)}
              >
                {responseAction === 'approved' ? 'Approve Request' : 'Decline Request'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewRequests;