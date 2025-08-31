// frontend/src/components/admin/PlatformFeedback.jsx
import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Search, 
  Filter, 
  Eye, 
  Check, 
  X,
  MessageSquare,
  User,
  Calendar,
  TrendingUp,
  RefreshCw,
  Download,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Heart,
  BarChart3
} from 'lucide-react';
import adminService from '../../services/adminService';
import Button from '../ui/Button';
import Input from '../ui/Input';

const PlatformFeedback = () => {
  const [feedback, setFeedback] = useState([]);
  const [filteredFeedback, setFilteredFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    loadFeedback();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [feedback, searchTerm, categoryFilter, ratingFilter, statusFilter]);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getPlatformFeedback();
      setFeedback(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...feedback];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.user_name?.toLowerCase().includes(term) ||
        item.comment?.toLowerCase().includes(term) ||
        item.category?.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    // Rating filter
    if (ratingFilter !== 'all') {
      filtered = filtered.filter(item => item.rating === parseInt(ratingFilter));
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    setFilteredFeedback(filtered);
  };

  const handleFeedbackAction = async (feedbackId, action, response = '') => {
    try {
      setActionLoading(prev => ({ ...prev, [feedbackId]: action }));
      
      let result;
      switch (action) {
        case 'acknowledge':
          result = await adminService.updateFeedbackStatus(feedbackId, 'acknowledged', response);
          break;
        case 'resolve':
          if (!response) {
            response = prompt('Resolution notes:');
            if (!response) return;
          }
          result = await adminService.updateFeedbackStatus(feedbackId, 'resolved', response);
          break;
        case 'dismiss':
          if (!response) {
            response = prompt('Reason for dismissal:');
            if (!response) return;
          }
          result = await adminService.updateFeedbackStatus(feedbackId, 'dismissed', response);
          break;
        default:
          throw new Error('Invalid action');
      }

      if (result.success) {
        await loadFeedback();
        alert(`Feedback ${action}d successfully`);
      }
    } catch (error) {
      alert(`Failed to ${action} feedback: ${error.message}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [feedbackId]: false }));
    }
  };

  const getRatingStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-400'}`}
      />
    ));
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending', icon: Clock },
      acknowledged: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Acknowledged', icon: Eye },
      resolved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Resolved', icon: Check },
      dismissed: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Dismissed', icon: X }
    };
    
    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="w-3 h-3 mr-1" />
        {badge.label}
      </span>
    );
  };

  const getCategoryBadge = (category) => {
    const badges = {
      'user_experience': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'User Experience' },
      'features': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Features' },
      'performance': { bg: 'bg-green-100', text: 'text-green-800', label: 'Performance' },
      'support': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Support' },
      'bug_report': { bg: 'bg-red-100', text: 'text-red-800', label: 'Bug Report' },
      'general': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'General' }
    };
    
    const badge = badges[category] || badges.general;
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getSentimentIcon = (rating) => {
    if (rating >= 4) {
      return <ThumbsUp className="w-5 h-5 text-green-400" />;
    } else if (rating <= 2) {
      return <ThumbsDown className="w-5 h-5 text-red-400" />;
    } else {
      return <MessageSquare className="w-5 h-5 text-yellow-400" />;
    }
  };

  // Mock data if no feedback is loaded
  const mockFeedback = feedback.length === 0 ? [
    {
      id: 1,
      user_name: 'Juan dela Cruz',
      user_email: 'juan@email.com',
      category: 'user_experience',
      rating: 5,
      comment: 'Love the platform! Very easy to use and find great accommodations.',
      status: 'pending',
      created_at: '2024-12-10T10:00:00Z',
      admin_response: null
    },
    {
      id: 2,
      user_name: 'Maria Santos',
      user_email: 'maria@email.com',
      category: 'features',
      rating: 4,
      comment: 'Great app overall. Would love to see more filtering options for search.',
      status: 'acknowledged',
      created_at: '2024-12-09T14:30:00Z',
      admin_response: 'Thank you for the feedback! We are working on enhanced search filters.'
    },
    {
      id: 3,
      user_name: 'Jose Rodriguez',
      user_email: 'jose@email.com',
      category: 'bug_report',
      rating: 2,
      comment: 'Having issues with payment processing. Takes too long to confirm.',
      status: 'resolved',
      created_at: '2024-12-08T09:15:00Z',
      admin_response: 'Payment processing has been optimized. Issue should be resolved now.'
    }
  ] : feedback;

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
        <Button onClick={loadFeedback} variant="gradient">Try Again</Button>
      </div>
    );
  }

  const displayFeedback = filteredFeedback.length > 0 ? filteredFeedback : mockFeedback.filter(item => {
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    if (ratingFilter !== 'all' && item.rating !== parseInt(ratingFilter)) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return item.user_name?.toLowerCase().includes(term) ||
             item.comment?.toLowerCase().includes(term);
    }
    return true;
  });

  const calculateStats = () => {
    const total = displayFeedback.length;
    const averageRating = total > 0 
      ? (displayFeedback.reduce((sum, item) => sum + item.rating, 0) / total).toFixed(1)
      : 0;
    const positive = displayFeedback.filter(item => item.rating >= 4).length;
    const negative = displayFeedback.filter(item => item.rating <= 2).length;
    const pending = displayFeedback.filter(item => item.status === 'pending').length;

    return { total, averageRating, positive, negative, pending };
  };

  const stats = calculateStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Feedback</h1>
          <p className="text-gray-400">User reviews and suggestions for platform improvement</p>
        </div>
        
        <div className="flex space-x-3">
          <Button
            onClick={() => {
              // Export feedback functionality
              const csvData = 'ID,User,Category,Rating,Comment,Status,Date\n' +
                displayFeedback.map(f => 
                  `${f.id},"${f.user_name}","${f.category}",${f.rating},"${f.comment}","${f.status}","${f.created_at}"`
                ).join('\n');
              const blob = new Blob([csvData], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'platform-feedback.csv';
              a.click();
            }}
            variant="outline"
            className="border-gray-600 text-gray-300"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={loadFeedback}
            variant="outline"
            className="border-gray-600 text-gray-300"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Feedback</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-gray-500">All time</p>
            </div>
            <div className="p-3 rounded-full bg-blue-600/20">
              <MessageSquare className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Average Rating</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.averageRating}</p>
              <div className="flex space-x-1 mt-1">
                {getRatingStars(Math.round(stats.averageRating))}
              </div>
            </div>
            <div className="p-3 rounded-full bg-yellow-600/20">
              <Star className="w-6 h-6 text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Positive</p>
              <p className="text-2xl font-bold text-green-400">{stats.positive}</p>
              <p className="text-xs text-gray-500">4-5 stars</p>
            </div>
            <div className="p-3 rounded-full bg-green-600/20">
              <ThumbsUp className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Negative</p>
              <p className="text-2xl font-bold text-red-400">{stats.negative}</p>
              <p className="text-xs text-gray-500">1-2 stars</p>
            </div>
            <div className="p-3 rounded-full bg-red-600/20">
              <ThumbsDown className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Pending Review</p>
              <p className="text-2xl font-bold text-orange-400">{stats.pending}</p>
              <p className="text-xs text-gray-500">Need attention</p>
            </div>
            <div className="p-3 rounded-full bg-orange-600/20">
              <AlertCircle className="w-6 h-6 text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search feedback..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-700 border-gray-600 text-white"
            />
          </div>
          
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="all">All Categories</option>
            <option value="user_experience">User Experience</option>
            <option value="features">Features</option>
            <option value="performance">Performance</option>
            <option value="support">Support</option>
            <option value="bug_report">Bug Report</option>
            <option value="general">General</option>
          </select>

          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>

          <div className="flex items-center space-x-2 text-sm text-gray-300">
            <Filter className="w-4 h-4" />
            <span>{stats.pending} pending</span>
          </div>
        </div>
      </div>

      {/* Feedback List */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        {displayFeedback.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No feedback found</h3>
            <p className="text-gray-400">Try adjusting your search criteria</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {displayFeedback.map((item) => (
              <div key={item.id} className="p-6 hover:bg-gray-700/50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      {getSentimentIcon(item.rating)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <span className="text-white font-medium">{item.user_name}</span>
                          <div className="flex space-x-1">
                            {getRatingStars(item.rating)}
                          </div>
                          <span className="text-gray-400 text-sm">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getCategoryBadge(item.category)}
                          {getStatusBadge(item.status)}
                        </div>
                      </div>
                      
                      <p className="text-gray-300 mb-3 line-clamp-3">
                        {item.comment}
                      </p>
                      
                      {item.admin_response && (
                        <div className="bg-blue-900/20 border-l-4 border-blue-400 p-3 rounded-r-lg">
                          <div className="flex items-center space-x-2 mb-1">
                            <User className="w-4 h-4 text-blue-400" />
                            <span className="text-blue-400 font-medium text-sm">Admin Response</span>
                          </div>
                          <p className="text-gray-300 text-sm">{item.admin_response}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-400"
                      onClick={() => {
                        setSelectedFeedback(item);
                        setShowFeedbackModal(true);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>

                    {item.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-blue-400 hover:text-blue-300"
                          loading={actionLoading[item.id] === 'acknowledge'}
                          onClick={() => handleFeedbackAction(item.id, 'acknowledge')}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-green-400 hover:text-green-300"
                          loading={actionLoading[item.id] === 'resolve'}
                          onClick={() => handleFeedbackAction(item.id, 'resolve')}
                        >
                          <Heart className="w-4 h-4" />
                        </Button>
                      </>
                    )}

                    {(item.status === 'pending' || item.status === 'acknowledged') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300"
                        loading={actionLoading[item.id] === 'dismiss'}
                        onClick={() => handleFeedbackAction(item.id, 'dismiss')}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            onClick={() => {
              const pendingCount = displayFeedback.filter(f => f.status === 'pending').length;
              alert(`${pendingCount} feedback items need attention`);
            }}
            variant="outline"
            className="border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-white"
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Review Pending
          </Button>
          
          <Button
            onClick={() => {
              const negativeCount = displayFeedback.filter(f => f.rating <= 2).length;
              alert(`${negativeCount} negative feedback items to address`);
            }}
            variant="outline"
            className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
          >
            <ThumbsDown className="w-4 h-4 mr-2" />
            Address Negative
          </Button>
          
          <Button
            onClick={() => alert('Feedback analytics to be implemented')}
            variant="outline"
            className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            View Analytics
          </Button>
          
          <Button
            onClick={() => alert('Feedback summary to be implemented')}
            variant="outline"
            className="border-gray-500 text-gray-400 hover:bg-gray-500 hover:text-white"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Generate Summary
          </Button>
        </div>
      </div>

      {/* Feedback Detail Modal */}
      {showFeedbackModal && selectedFeedback && (
        <FeedbackDetailModal 
          feedback={selectedFeedback}
          onClose={() => {
            setShowFeedbackModal(false);
            setSelectedFeedback(null);
          }}
          onAction={handleFeedbackAction}
        />
      )}
    </div>
  );
};

// Feedback Detail Modal Component
const FeedbackDetailModal = ({ feedback, onClose, onAction }) => {
  const [adminResponse, setAdminResponse] = useState('');
  const [sendingResponse, setSendingResponse] = useState(false);

  const handleSendResponse = async () => {
    if (!adminResponse.trim()) return;
    
    try {
      setSendingResponse(true);
      await onAction(feedback.id, 'resolve', adminResponse);
      setAdminResponse('');
      onClose();
    } catch (error) {
      console.error('Failed to send response:', error);
    } finally {
      setSendingResponse(false);
    }
  };

  const getRatingStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-5 h-5 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-400'}`}
      />
    ));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white">Feedback Details</h2>
            <div className="flex items-center space-x-2 mt-1">
              <div className="flex space-x-1">
                {getRatingStars(feedback.rating)}
              </div>
              <span className="text-gray-400 text-sm">
                by {feedback.user_name}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            {/* Feedback Information */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Feedback Information</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-400">User:</span>
                  <span className="text-white ml-2">{feedback.user_name}</span>
                </div>
                <div>
                  <span className="text-gray-400">Email:</span>
                  <span className="text-white ml-2">{feedback.user_email || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Category:</span>
                  <span className="text-white ml-2">{feedback.category?.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-gray-400">Rating:</span>
                  <div className="flex items-center space-x-2 ml-2">
                    <div className="flex space-x-1">
                      {getRatingStars(feedback.rating)}
                    </div>
                    <span className="text-white">({feedback.rating}/5)</span>
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>
                  <span className="text-white ml-2">{feedback.status}</span>
                </div>
                <div>
                  <span className="text-gray-400">Submitted:</span>
                  <span className="text-white ml-2">
                    {new Date(feedback.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Feedback Comment */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4">User Comment</h3>
              <div className="bg-gray-700 p-4 rounded-lg">
                <p className="text-gray-300">{feedback.comment}</p>
              </div>
            </div>

            {/* Previous Admin Response */}
            {feedback.admin_response && (
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Previous Admin Response</h3>
                <div className="bg-blue-900/20 border border-blue-600/30 p-4 rounded-lg">
                  <p className="text-gray-300">{feedback.admin_response}</p>
                </div>
              </div>
            )}

            {/* New Response Section */}
            {feedback.status !== 'resolved' && feedback.status !== 'dismissed' && (
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Admin Response</h3>
                <div className="space-y-3">
                  <textarea
                    placeholder="Type your response to the user..."
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                  />
                  
                  <Button
                    onClick={handleSendResponse}
                    loading={sendingResponse}
                    disabled={!adminResponse.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send Response & Mark Resolved
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-700">
            <Button
              onClick={onClose}
              variant="outline"
              className="border-gray-600 text-gray-300"
            >
              Close
            </Button>
            
            {feedback.status === 'pending' && (
              <>
                <Button
                  onClick={() => {
                    onAction(feedback.id, 'acknowledge');
                    onClose();
                  }}
                  variant="outline"
                  className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Acknowledge
                </Button>
                <Button
                  onClick={() => {
                    onAction(feedback.id, 'dismiss');
                    onClose();
                  }}
                  variant="outline"
                  className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                >
                  <X className="w-4 h-4 mr-1" />
                  Dismiss
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformFeedback;