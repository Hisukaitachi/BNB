// src/pages/profile/components/ReviewsTab.jsx - Updated with clickable names
import React, { useState } from 'react';
import { RefreshCw, Star, Award } from 'lucide-react';
import Button from '../ui/Button';
import UserProfileLink from '../ui/UserProfileLink';
import Avatar from '../ui/Avatar';

const ReviewsTab = ({ reviewsData, reviewsLoading, loadReviews, user }) => {
  const [reviewFilter, setReviewFilter] = useState('received');

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

  if (reviewsLoading) {
    return (
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  const currentReviews = reviewFilter === 'received' 
    ? reviewsData.received 
    : reviewsData.written;

  return (
    <div className="space-y-6">
      {/* Reviews Header */}
      <div className="bg-gray-800 rounded-xl p-4 sm:p-6">
        <ReviewsHeader loadReviews={loadReviews} />
        <ReviewFilters 
          reviewFilter={reviewFilter}
          setReviewFilter={setReviewFilter}
          reviewsData={reviewsData}
        />
        {reviewFilter === 'received' && reviewsData.statistics?.averageRating && (
          <ReviewStatistics 
            reviewsData={reviewsData}
            renderStars={renderStars}
          />
        )}
      </div>

      {/* Reviews List */}
      <ReviewsList 
        currentReviews={currentReviews}
        reviewFilter={reviewFilter}
        renderStars={renderStars}
      />
    </div>
  );
};

// Reviews Header Component
const ReviewsHeader = ({ loadReviews }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
    <h2 className="text-xl font-semibold text-white">Reviews</h2>
    <Button
      onClick={loadReviews}
      variant="outline"
      size="sm"
      className="border-gray-600 text-gray-300 w-full sm:w-auto"
    >
      <RefreshCw className="w-4 h-4 mr-2" />
      Refresh
    </Button>
  </div>
);

// Review Filters Component
const ReviewFilters = ({ reviewFilter, setReviewFilter, reviewsData }) => (
  <div className="flex space-x-1 bg-gray-700 rounded-lg p-1">
    <button
      onClick={() => setReviewFilter('received')}
      className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${
        reviewFilter === 'received'
          ? 'bg-purple-600 text-white'
          : 'text-gray-400 hover:text-white'
      }`}
    >
      Reviews About Me ({reviewsData.received?.length || 0})
    </button>
    <button
      onClick={() => setReviewFilter('written')}
      className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition ${
        reviewFilter === 'written'
          ? 'bg-purple-600 text-white'
          : 'text-gray-400 hover:text-white'
      }`}
    >
      Reviews I Wrote ({reviewsData.written?.length || 0})
    </button>
  </div>
);

// Review Statistics Component
const ReviewStatistics = ({ reviewsData, renderStars }) => (
  <div className="mt-6 p-4 bg-gray-700 rounded-lg">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
      <div>
        <div className="flex items-center space-x-2 mb-2">
          <div className="flex items-center">
            {renderStars(Math.round(reviewsData.statistics.averageRating))}
          </div>
          <span className="text-white font-semibold text-lg">
            {reviewsData.statistics.averageRating.toFixed(1)}
          </span>
        </div>
        <p className="text-gray-400 text-sm">
          Based on {reviewsData.statistics.totalReviews} review{reviewsData.statistics.totalReviews !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="flex items-center space-x-2">
        <Award className="w-5 h-5 text-purple-400" />
        <span className="text-purple-400 font-medium">
          {reviewsData.statistics.averageRating >= 4.5 ? 'Superhost' : 
           reviewsData.statistics.averageRating >= 4.0 ? 'Great Host' : 
           'Host'}
        </span>
      </div>
    </div>
  </div>
);

// Reviews List Component
const ReviewsList = ({ currentReviews, reviewFilter, renderStars }) => (
  <div className="space-y-4">
    {!currentReviews || currentReviews.length === 0 ? (
      <EmptyReviewsState reviewFilter={reviewFilter} />
    ) : (
      currentReviews.map((review) => (
        <ReviewCard 
          key={review.id}
          review={review}
          reviewFilter={reviewFilter}
          renderStars={renderStars}
        />
      ))
    )}
  </div>
);

// Empty Reviews State Component
const EmptyReviewsState = ({ reviewFilter }) => (
  <div className="bg-gray-800 rounded-xl p-8 text-center">
    <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-white mb-2">
      No {reviewFilter === 'received' ? 'reviews about you' : 'reviews written'} yet
    </h3>
    <p className="text-gray-400">
      {reviewFilter === 'received' 
        ? 'Complete bookings to start receiving reviews from hosts'
        : 'Complete bookings to start writing reviews'
      }
    </p>
  </div>
);

// Individual Review Card Component - Updated with clickable names
const ReviewCard = ({ review, reviewFilter, renderStars }) => {
  // Determine user data based on review type
  const userData = reviewFilter === 'received' 
    ? {
        id: review.reviewer_id,
        name: review.reviewer_name,
        role: review.reviewer_role || 'host',
        profile_picture: review.reviewer_profile_picture // ✅ ADD THIS
      }
    : {
        id: review.reviewee_id,
        name: review.reviewee_name,
        role: review.reviewee_role || 'client',
        profile_picture: review.reviewee_profile_picture // ✅ ADD THIS
      };

  return (
    <div className="bg-gray-800 rounded-xl p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 space-y-4 sm:space-y-0">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          {/* ✅ USE AVATAR */}
          <Avatar 
            user={{
              name: userData.name,
              profile_picture: userData.profile_picture
            }}
            size="md"
            className="flex-shrink-0"
          />
          
          <div className="min-w-0 flex-1">
            {/* Clickable name */}
            <button
              onClick={() => window.location.href = `/profile/${userData.id}`}
              className="text-white font-medium hover:text-purple-400 transition-colors text-left"
            >
              {userData.name}
            </button>
            <div className="flex items-center space-x-1 mt-1">
              {renderStars(review.rating)}
            </div>
          </div>
        </div>
        
        <div className="text-right flex-shrink-0">
          <p className="text-gray-400 text-sm">
            {new Date(review.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
          {review.booking_id && (
            <p className="text-gray-500 text-xs">
              Booking #{review.booking_id}
            </p>
          )}
        </div>
      </div>
      
      <p className="text-gray-300 leading-relaxed mb-3">
        {review.comment}
      </p>
      
      {review.property_title && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <p className="text-gray-400 text-sm">
            Property: {review.property_title}
          </p>
        </div>
      )}
    </div>
  );
};

export default ReviewsTab;