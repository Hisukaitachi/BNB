// src/pages/profile/PublicProfilePage.jsx - Enhanced with listing context in reviews
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Star, Calendar, MapPin, ArrowLeft, MessageSquare, Award, Home, Clock, ThumbsUp, ThumbsDown } from 'lucide-react';
import Button from '../../components/ui/Button';
import { userAPI } from '../../services/api';
import reviewService from '../../services/reviewService';
import { useAuth } from '../../context/AuthContext';

const PublicProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [reviewsData, setReviewsData] = useState({ received: [], statistics: {} });
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userId) {
      loadPublicProfile();
      loadPublicReviews();
    }
  }, [userId]);

  const loadPublicProfile = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getPublicProfile(userId);
      setProfileData(response.data.data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadPublicReviews = async () => {
    try {
      setReviewsLoading(true);
      const reviews = await reviewService.getUserReviews(userId);
      console.log('Loaded reviews:', reviews);
      setReviewsData(reviews);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        key={index}
        className={`w-4 h-4 ${
          index < rating 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-400'
        }`}
      />
    ));
  };

  const getBadgeText = (rating) => {
    if (rating >= 4.8) return 'Superhost';
    if (rating >= 4.5) return 'Excellent Host';
    if (rating >= 4.0) return 'Great Host';
    if (rating >= 3.5) return 'Good Host';
    return 'Host';
  };

  const getBadgeColor = (rating) => {
    if (rating >= 4.5) return 'text-purple-400';
    if (rating >= 4.0) return 'text-blue-400';
    if (rating >= 3.5) return 'text-green-400';
    return 'text-gray-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20">
        <div className="container mx-auto px-4 sm:px-6 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20">
        <div className="container mx-auto px-4 sm:px-6 py-8">
          <div className="max-w-4xl mx-auto text-center py-16">
            <h1 className="text-2xl font-bold text-white mb-4">Profile Not Found</h1>
            <p className="text-gray-400 mb-6">{error}</p>
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-20">
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Button 
            onClick={() => navigate(-1)} 
            variant="ghost" 
            className="mb-6 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Profile */}
            <div className="lg:col-span-2">
              <ProfileHeader profileData={profileData} reviewsData={reviewsData} />
              <ProfileDetails profileData={profileData} />
              <ReviewsSection 
                reviewsData={reviewsData}
                reviewsLoading={reviewsLoading}
                renderStars={renderStars}
                profileData={profileData}
                currentUser={currentUser}
              />
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <ProfileSidebar 
                profileData={profileData}
                reviewsData={reviewsData}
                getBadgeText={getBadgeText}
                getBadgeColor={getBadgeColor}
                renderStars={renderStars}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Profile Header Component
const ProfileHeader = ({ profileData, reviewsData }) => (
  <div className="bg-gray-800 rounded-xl p-6 mb-6">
    <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
      <div className="w-24 h-24 bg-gradient-to-r from-purple-400 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
        <User className="w-12 h-12 text-white" />
      </div>
      
      <div className="flex-1 text-center sm:text-left">
        <h1 className="text-3xl font-bold text-white mb-2">{profileData.name}</h1>
        <p className="text-purple-400 font-medium capitalize mb-3">{profileData.role}</p>
        
        {reviewsData.statistics?.averageRating && (
          <div className="flex items-center justify-center sm:justify-start space-x-2 mb-3">
            <div className="flex items-center space-x-1">
              {Array.from({ length: 5 }, (_, index) => (
                <Star
                  key={index}
                  className={`w-5 h-5 ${
                    index < Math.round(reviewsData.statistics.averageRating)
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-400'
                  }`}
                />
              ))}
            </div>
            <span className="text-white font-semibold">
              {reviewsData.statistics.averageRating.toFixed(1)}
            </span>
            <span className="text-gray-400 text-sm">
              ({reviewsData.statistics.totalReviews} reviews)
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-2 sm:space-y-0 sm:space-x-4 text-sm text-gray-400">
          {profileData.location && (
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-1" />
              <span>{profileData.location}</span>
            </div>
          )}
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            <span>Member since {new Date(profileData.created_at).getFullYear()}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Profile Details Component
const ProfileDetails = ({ profileData }) => (
  <div className="bg-gray-800 rounded-xl p-6 mb-6">
    <h2 className="text-xl font-semibold text-white mb-4">About</h2>
    {profileData.bio ? (
      <p className="text-gray-300 leading-relaxed">{profileData.bio}</p>
    ) : (
      <p className="text-gray-400 italic">This user hasn't added a bio yet.</p>
    )}
  </div>
);

// Enhanced Reviews Section Component
const ReviewsSection = ({ reviewsData, reviewsLoading, renderStars, profileData, currentUser }) => (
  <div className="bg-gray-800 rounded-xl p-6">
    <h2 className="text-xl font-semibold text-white mb-6">Reviews</h2>
    
    {reviewsLoading ? (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    ) : reviewsData.received?.length > 0 ? (
      <div className="space-y-6">
        {reviewsData.received.slice(0, 3).map((review) => (
          <EnhancedReviewCard 
            key={review.id} 
            review={review} 
            renderStars={renderStars}
            profileData={profileData}
            currentUser={currentUser}
          />
        ))}
        
        {reviewsData.received.length > 3 && (
          <div className="text-center pt-4 border-t border-gray-700">
            <p className="text-gray-400 text-sm">
              Showing 3 of {reviewsData.received.length} reviews
            </p>
          </div>
        )}
      </div>
    ) : (
      <div className="text-center py-8">
        <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-400">No reviews yet</p>
      </div>
    )}
  </div>
);

// Enhanced Individual Review Card with Listing Context
const EnhancedReviewCard = ({ review, renderStars, profileData, currentUser }) => {
  const isViewingAsClient = currentUser?.role === 'client';
  const isViewingAsHost = currentUser?.role === 'host';
  const profileIsHost = profileData?.role === 'host';

  return (
    <div className="border border-gray-700 rounded-lg p-4 bg-gray-750">
      {/* Review Header with Context */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-indigo-600 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <p className="text-white font-medium">{review.reviewer_name}</p>
              <div className="flex items-center space-x-1">
                {renderStars(review.rating)}
              </div>
            </div>
            
            {/* Listing Context - Show if viewing as client or if profile is host */}
            {(isViewingAsClient || profileIsHost) && review.listing_title && (
              <div className="flex items-center space-x-2 text-sm text-gray-400 mb-2">
                <Home className="w-4 h-4" />
                <span>Stayed at: </span>
                <span className="text-purple-400 font-medium">{review.listing_title}</span>
              </div>
            )}

            {/* Booking Context */}
            {review.booking_dates && (
              <div className="flex items-center space-x-2 text-sm text-gray-400 mb-2">
                <Calendar className="w-4 h-4" />
                <span>{new Date(review.booking_dates.start).toLocaleDateString()} - {new Date(review.booking_dates.end).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-gray-400 text-sm">
            {new Date(review.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </p>
          
          {/* Review Type Badge */}
          <div className="mt-1">
            {review.review_type === 'host_to_guest' && (
              <span className="text-xs px-2 py-1 bg-blue-900/20 text-blue-400 rounded">
                Host Review
              </span>
            )}
            {review.review_type === 'guest_to_host' && (
              <span className="text-xs px-2 py-1 bg-green-900/20 text-green-400 rounded">
                Guest Review
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Review Content */}
      <p className="text-gray-300 text-sm leading-relaxed mb-3">{review.comment}</p>

      {/* Performance Indicators for Host Reviews (visible to other hosts) */}
      {isViewingAsHost && profileIsHost && review.performance_metrics && (
        <div className="bg-gray-800 rounded-lg p-3 mt-3">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Performance Details:</h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {review.performance_metrics.cleanliness && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Cleanliness:</span>
                <div className="flex items-center space-x-1">
                  {renderStars(review.performance_metrics.cleanliness)}
                </div>
              </div>
            )}
            {review.performance_metrics.communication && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Communication:</span>
                <div className="flex items-center space-x-1">
                  {renderStars(review.performance_metrics.communication)}
                </div>
              </div>
            )}
            {review.performance_metrics.check_in && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Check-in:</span>
                <div className="flex items-center space-x-1">
                  {renderStars(review.performance_metrics.check_in)}
                </div>
              </div>
            )}
            {review.performance_metrics.accuracy && (
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Accuracy:</span>
                <div className="flex items-center space-x-1">
                  {renderStars(review.performance_metrics.accuracy)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Guest Behavior Indicators (for host viewing guest profiles) */}
      {isViewingAsHost && !profileIsHost && review.guest_behavior && (
        <div className="bg-gray-800 rounded-lg p-3 mt-3">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Guest Behavior:</h4>
          <div className="flex flex-wrap gap-2">
            {review.guest_behavior.respectful && (
              <div className="flex items-center space-x-1 text-xs">
                <ThumbsUp className="w-3 h-3 text-green-400" />
                <span className="text-green-400">Respectful</span>
              </div>
            )}
            {review.guest_behavior.clean && (
              <div className="flex items-center space-x-1 text-xs">
                <ThumbsUp className="w-3 h-3 text-green-400" />
                <span className="text-green-400">Clean</span>
              </div>
            )}
            {review.guest_behavior.followed_rules && (
              <div className="flex items-center space-x-1 text-xs">
                <ThumbsUp className="w-3 h-3 text-green-400" />
                <span className="text-green-400">Followed Rules</span>
              </div>
            )}
            {review.guest_behavior.issues && (
              <div className="flex items-center space-x-1 text-xs">
                <ThumbsDown className="w-3 h-3 text-red-400" />
                <span className="text-red-400">Had Issues</span>
              </div>
            )}
          </div>
          
          {review.guest_behavior.notes && (
            <p className="text-gray-400 text-xs mt-2 italic">
              Host notes: {review.guest_behavior.notes}
            </p>
          )}
        </div>
      )}

      {/* Response Time Indicator */}
      {review.response_time && (
        <div className="flex items-center space-x-2 mt-3 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          <span>Response time: {review.response_time}</span>
        </div>
      )}
    </div>
  );
};

// Profile Sidebar Component (unchanged)
const ProfileSidebar = ({ profileData, reviewsData, getBadgeText, getBadgeColor, renderStars }) => (
  <div className="space-y-6">
    {/* Verification & Badge */}
    <div className="bg-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Status</h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Verification</span>
          <span className={`text-sm px-2 py-1 rounded ${
            profileData.isVerified 
              ? 'bg-green-900/20 text-green-400' 
              : 'bg-yellow-900/20 text-yellow-400'
          }`}>
            {profileData.isVerified ? 'Verified' : 'Unverified'}
          </span>
        </div>
        
        {reviewsData.statistics?.averageRating && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Badge</span>
            <div className="flex items-center space-x-2">
              <Award className={`w-4 h-4 ${getBadgeColor(reviewsData.statistics.averageRating)}`} />
              <span className={`font-medium ${getBadgeColor(reviewsData.statistics.averageRating)}`}>
                {getBadgeText(reviewsData.statistics.averageRating)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Stats */}
    <div className="bg-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Stats</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-400">Reviews</span>
          <span className="text-white">{reviewsData.received?.length || 0}</span>
        </div>
        
        {reviewsData.statistics?.averageRating && (
          <div className="flex justify-between">
            <span className="text-gray-400">Rating</span>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                {renderStars(Math.round(reviewsData.statistics.averageRating))}
              </div>
              <span className="text-white font-medium">
                {reviewsData.statistics.averageRating.toFixed(1)}
              </span>
            </div>
          </div>
        )}
        
        <div className="flex justify-between">
          <span className="text-gray-400">Response Rate</span>
          <span className="text-white">95%</span>
        </div>
      </div>
    </div>

    {/* Contact */}
    <div className="bg-gray-800 rounded-xl p-6">
      <Button 
        variant="gradient" 
        size="lg" 
        className="w-full"
        onClick={() => {
            const param = profileData.role === 'host' ? 'host' : 'client';
            window.open(`/messages?${param}=${profileData.id}`, '_blank');
        }}
        >
        <MessageSquare className="w-4 h-4 mr-2" />
        Send Message
        </Button>
    </div>
  </div>
);

export default PublicProfilePage;