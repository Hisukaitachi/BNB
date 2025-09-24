// src/components/listings/ReviewsSection.jsx
import React from 'react';
import { Star } from 'lucide-react';
import Button from '../ui/Button';

const ReviewsSection = ({ reviews = [] }) => {
  if (reviews.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-white mb-6">
        Reviews ({reviews.length})
      </h2>
      <div className="space-y-4">
        {reviews.slice(0, 3).map((review) => (
          <div key={review.id} className="p-4 bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {review.reviewer_name.charAt(0)}
                  </span>
                </div>
                <span className="font-medium text-white">{review.reviewer_name}</span>
              </div>
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-gray-300 text-sm">{review.comment}</p>
            <p className="text-gray-500 text-xs mt-2">
              {new Date(review.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
        
        {reviews.length > 3 && (
          <Button 
            variant="outline" 
            className="w-full border-gray-600 text-gray-300"
          >
            Show all {reviews.length} reviews
          </Button>
        )}
      </div>
    </div>
  );
};

export default ReviewsSection;