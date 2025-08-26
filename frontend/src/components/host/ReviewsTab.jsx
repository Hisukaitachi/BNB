// src/components/host/ReviewsTab.jsx
import React, { useState, useEffect } from 'react';
import { 
  Star, MessageSquare, ThumbsUp, Filter, Search,
  TrendingUp, Award, Users, Calendar
} from 'lucide-react';
import api from '../../services/api';
import Button from '../common/Button';
import Loading from '../common/Loading';
import { useApp } from '../../context/AppContext';

const ReviewsTab = () => {
  const [reviews, setReviews] = useState([]);
  const [filteredReviews, setFilteredReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    recentReviews: 0,
    responseRate: 0
  });
  const { showToast } = useApp();

  useEffect(() => {
    fetchReviews();
  }, []);

  useEffect(() => {
    filterReviews();
  }, [reviews, ratingFilter, searchTerm]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const [reviewsRes, listingsRes] = await Promise.all([
        api.getMyReviews(),
        api.getMyListings()
      ]);

      const reviewsData = reviewsRes.data?.reviews || [];
      const listings = listingsRes.data?.listings || [];

      // Combine reviews with listing information
      const enrichedReviews = reviewsData.map(review => {
        const listing = listings.find(l => l.id === review.listing_id);
        return {
          ...review,
          listingTitle: listing?.title || 'Unknown Listing',
          listingImage: listing?.image_url
        };
      });

      setReviews(enrichedReviews);
      calculateStats(enrichedReviews);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      showToast('Failed to load reviews', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (reviewsData) => {
    if (reviewsData.length === 0) {
      setStats({
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        recentReviews: 0,
        responseRate: 0
      });
      return;
    }

    const totalReviews = reviewsData.length;
    const averageRating = reviewsData.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
    
    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviewsData.forEach(review => {
      ratingDistribution[review.rating]++;
    });

    // Calculate recent reviews (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentReviews = reviewsData.filter(r => new Date(r.created_at) > thirtyDaysAgo).length;

    // Calculate response rate (reviews with host replies)
    const reviewsWithReplies = reviewsData.filter(r => r.host_reply).length;
    const responseRate = totalReviews > 0 ? (reviewsWithReplies / totalReviews) * 100 : 0;

    setStats({
      averageRating: averageRating.toFixed(1),
      totalReviews,
      ratingDistribution,
      recentReviews,
      responseRate: Math.round(responseRate)
    });
  };

  const filterReviews = () => {
    let filtered = [...reviews];
    
    // Filter by rating
    if (ratingFilter !== 'all') {
      filtered = filtered.filter(review => review.rating === parseInt(ratingFilter));
    }
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(review => 
        review.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.reviewer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.listingTitle?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Sort by creation date (newest first)
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    setFilteredReviews(filtered);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderStars = (rating, size = 'sm') => {
    const sizeClass = size === 'lg' ? 'w-6 h-6' : 'w-4 h-4';
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'text-green-400';
    if (rating >= 4) return 'text-yellow-400';
    if (rating >= 3) return 'text-orange-400';
    return 'text-red-400';
  };

  if (loading) {
    return <Loading message="Loading reviews..." fullScreen={false} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Guest Reviews</h2>
          <p className="text-gray-400">Manage and respond to guest feedback</p>
        </div>
      </div>

      {/* Review Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 text-center">
          <div className="flex items-center justify-center mb-3">
            <Star className="w-8 h-8 text-yellow-400 fill-current mr-2" />
            <span className={`text-3xl font-bold ${getRatingColor(stats.averageRating)}`}>
              {stats.averageRating}
            </span>
          </div>
          <p className="text-gray-400 text-sm">Average Rating</p>
          <p className="text-xs text-gray-500 mt-1">Based on {stats.totalReviews} reviews</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 text-center">
          <div className="flex items-center justify-center mb-3">
            <MessageSquare className="w-8 h-8 text-blue-400 mr-2" />
            <span className="text-3xl font-bold">{stats.totalReviews}</span>
          </div>
          <p className="text-gray-400 text-sm">Total Reviews</p>
          <p className="text-xs text-green-400 mt-1">+{stats.recentReviews} this month</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 text-center">
          <div className="flex items-center justify-center mb-3">
            <TrendingUp className="w-8 h-8 text-green-400 mr-2" />
            <span className="text-3xl font-bold">{stats.responseRate}%</span>
          </div>
          <p className="text-gray-400 text-sm">Response Rate</p>
          <p className="text-xs text-gray-500 mt-1">Reviews with replies</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 text-center">
          <div className="flex items-center justify-center mb-3">
            <Award className="w-8 h-8 text-purple-400 mr-2" />
            <span className="text-3xl font-bold">
              {Math.round((stats.ratingDistribution[5] / Math.max(stats.totalReviews, 1)) * 100)}%
            </span>
          </div>
          <p className="text-gray-400 text-sm">5-Star Reviews</p>
          <p className="text-xs text-gray-500 mt-1">Excellent ratings</p>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Rating Distribution</h3>
        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = stats.ratingDistribution[rating];
            const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
            
            return (
              <div key={rating} className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 w-20">
                  <span className="text-sm">{rating}</span>
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                </div>
                <div className="flex-1">
                  <div className="bg-gray-700 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-yellow-500 to-yellow-400 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
                <div className="w-16 text-right">
                  <span className="text-sm text-gray-400">{count} ({Math.round(percentage)}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search reviews..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No reviews found</h3>
          <p className="text-gray-500">
            {ratingFilter === 'all' ? 'No reviews yet' : `No ${ratingFilter}-star reviews`}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredReviews.map((review) => (
            <div key={review.id} className="bg-gray-800 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="w-12 h-12 bg-gray-600 rounded-full overflow-hidden flex items-center justify-center">
                    {review.reviewer_avatar ? (
                      <img 
                        src={review.reviewer_avatar} 
                        alt={review.reviewer_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-semibold">{review.reviewer_name || 'Anonymous'}</h4>
                      {renderStars(review.rating)}
                      <span className="text-sm text-gray-400">• {formatDate(review.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      {review.listingTitle}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-gray-300 leading-relaxed">
                  {review.comment || 'No comment provided.'}
                </p>
              </div>

              {/* Host Reply */}
              {review.host_reply ? (
                <div className="mt-4 ml-6 p-4 bg-gray-700 rounded-lg border-l-4 border-purple-500">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm font-medium text-purple-400">Your Reply:</span>
                    <span className="text-xs text-gray-500">{formatDate(review.reply_date)}</span>
                  </div>
                  <p className="text-sm text-gray-300">{review.host_reply}</p>
                </div>
              ) : (
                <div className="mt-4 ml-6">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // Implement reply functionality
                      showToast('Reply feature coming soon', 'info');
                    }}
                    icon={<MessageSquare className="w-4 h-4" />}
                  >
                    Reply to Review
                  </Button>
                </div>
              )}

              {/* Review Actions */}
              <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <div className="flex items-center space-x-1">
                    <ThumbsUp className="w-4 h-4" />
                    <span>Helpful</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MessageSquare className="w-4 h-4" />
                    <span>Public Review</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline">
                    View Booking
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Insights */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Review Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-start space-x-3">
                <Award className="w-5 h-5 text-green-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-400 mb-1">Great Performance!</h4>
                  <p className="text-sm text-gray-300">Your average rating is above 4.0. Keep up the excellent hosting!</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-start space-x-3">
                <MessageSquare className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-400 mb-1">Response Rate</h4>
                  <p className="text-sm text-gray-300">Consider replying to more reviews to improve guest satisfaction and search ranking.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <div className="flex items-start space-x-3">
                <TrendingUp className="w-5 h-5 text-purple-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-purple-400 mb-1">Recent Trend</h4>
                  <p className="text-sm text-gray-300">You've received {stats.recentReviews} reviews in the last 30 days. Great activity!</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-start space-x-3">
                <Star className="w-5 h-5 text-yellow-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-400 mb-1">Quality Tip</h4>
                  <p className="text-sm text-gray-300">Encourage satisfied guests to leave reviews to build credibility and attract more bookings.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewsTab;