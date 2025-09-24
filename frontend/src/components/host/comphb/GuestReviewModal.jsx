// frontend/src/components/host/components/GuestReviewModal.jsx
import React, { useState } from 'react';
import { X, User, Star, Send } from 'lucide-react';
import Button from '../../ui/Button';
import reviewService, { REVIEW_TYPES } from '../../../services/reviewService';

const GuestReviewModal = ({ booking, onClose, onReviewSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitReview = async () => {
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    if (comment.trim().length < 10) {
      alert('Please provide a comment with at least 10 characters');
      return;
    }

    if (comment.trim().length > 500) {
      alert('Comment cannot exceed 500 characters');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const reviewData = {
        booking_id: booking.booking_id,
        reviewee_id: booking.client_id,
        rating: rating,
        comment: comment.trim(),
        type: REVIEW_TYPES.CLIENT
      };

      await reviewService.createReview(reviewData);
      onReviewSubmitted();
      
    } catch (error) {
      alert(error.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStarRating = () => {
    return Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      return (
        <button
          key={index}
          type="button"
          className={`text-2xl transition-colors ${
            starValue <= (hoverRating || rating)
              ? 'text-yellow-400'
              : 'text-gray-400'
          }`}
          onClick={() => setRating(starValue)}
          onMouseEnter={() => setHoverRating(starValue)}
          onMouseLeave={() => setHoverRating(0)}
        >
          <Star 
            className={`w-6 h-6 sm:w-8 sm:h-8 ${
              starValue <= (hoverRating || rating) ? 'fill-current' : ''
            }`} 
          />
        </button>
      );
    });
  };

  const getRatingDescription = () => {
    const descriptions = {
      0: 'Select a rating',
      1: 'Poor - Had significant issues',
      2: 'Fair - Some issues but manageable',
      3: 'Good - Met expectations',
      4: 'Very Good - Exceeded expectations',
      5: 'Excellent - Outstanding guest'
    };
    return descriptions[rating] || '';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-white">Review Guest</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Guest Info */}
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-white font-medium truncate">{booking.client_name}</h3>
                <p className="text-gray-400 text-sm truncate">Stayed at {booking.title}</p>
                <p className="text-gray-400 text-xs">
                  {new Date(booking.check_in_date).toLocaleDateString()} - {new Date(booking.check_out_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-white font-medium mb-3">
              How would you rate this guest?
            </label>
            <div className="flex justify-center space-x-1 mb-2">
              {renderStarRating()}
            </div>
            <p className="text-gray-400 text-sm text-center">
              {getRatingDescription()}
            </p>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-white font-medium mb-2">
              Share your experience
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell other hosts about this guest. Were they respectful? Did they follow house rules? Any issues or positive notes?"
              className="w-full h-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 resize-none text-sm"
              maxLength={500}
            />
            <div className="flex justify-between mt-2">
              <p className="text-gray-400 text-xs sm:text-sm">
                Minimum 10 characters required
              </p>
              <p className="text-gray-400 text-xs sm:text-sm">
                {comment.length}/500
              </p>
            </div>
          </div>

          {/* Review Guidelines */}
          <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-3">
            <h4 className="text-blue-400 font-medium text-sm mb-2">Review Guidelines</h4>
            <ul className="text-blue-300 text-xs space-y-1">
              <li>• Be honest and constructive</li>
              <li>• Focus on the guest's behavior and respect for your property</li>
              <li>• Avoid personal attacks or inappropriate content</li>
              <li>• This review will help other hosts make informed decisions</li>
            </ul>
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <Button
              variant="outline"
              className="flex-1 border-gray-600 text-gray-300"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="gradient"
              className="flex-1"
              onClick={handleSubmitReview}
              loading={isSubmitting}
              disabled={rating === 0 || comment.trim().length < 10}
            >
              <Send className="w-4 h-4 mr-2" />
              Submit Review
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestReviewModal;