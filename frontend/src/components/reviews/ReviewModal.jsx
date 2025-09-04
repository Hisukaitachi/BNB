// frontend/src/components/reviews/ReviewModal.jsx
import React, { useState } from 'react';
import { Star, X } from 'lucide-react';
import Button from '../ui/Button';
import { Textarea } from '../ui/Input';
import reviewService from '../../services/reviewService';

const ReviewModal = ({ listing, userBookings = [], onClose, onSubmit }) => {
  const [reviewData, setReviewData] = useState({
    booking_id: '',
    rating: 5,
    comment: '',
    type: 'listing'
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Filter bookings that can be reviewed
  const eligibleBookings = userBookings.filter(booking => 
    booking.listing_id === listing.id && 
    booking.status === 'completed' &&
    !booking.has_reviewed
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reviewData.booking_id) {
      setErrors({ booking: 'Please select a booking to review' });
      return;
    }

    if (reviewData.comment.length < 10) {
      setErrors({ comment: 'Review must be at least 10 characters' });
      return;
    }

    if (reviewData.comment.length > 500) {
      setErrors({ comment: 'Review cannot exceed 500 characters' });
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        ...reviewData,
        reviewee_id: listing.host_id
      });
      onClose();
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Write a Review</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-900/20 border border-blue-600 rounded-lg">
          <p className="text-blue-400 text-sm">
            Reviewing: {listing.title}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Booking Selection */}
          {eligibleBookings.length > 0 ? (
            <div>
              <label className="block text-sm text-gray-300 mb-2">Select Booking</label>
              <select
                value={reviewData.booking_id}
                onChange={(e) => setReviewData(prev => ({ ...prev, booking_id: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="">Select a completed booking</option>
                {eligibleBookings.map(booking => (
                  <option key={booking.id} value={booking.id}>
                    {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                  </option>
                ))}
              </select>
              {errors.booking && <p className="text-red-400 text-sm mt-1">{errors.booking}</p>}
            </div>
          ) : (
            <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-3">
              <p className="text-yellow-400 text-sm">
                You need to complete a booking at this property before you can write a review.
              </p>
            </div>
          )}

          {/* Rating */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Rating</label>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewData(prev => ({ ...prev, rating: star }))}
                  className={`w-8 h-8 ${reviewData.rating >= star ? 'text-yellow-400' : 'text-gray-600'} hover:text-yellow-400 transition`}
                >
                  <Star className="w-full h-full fill-current" />
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">{reviewData.rating} star{reviewData.rating !== 1 ? 's' : ''}</p>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Your Review</label>
            <Textarea
              value={reviewData.comment}
              onChange={(e) => setReviewData(prev => ({ ...prev, comment: e.target.value }))}
              placeholder="Share your experience with this property and host..."
              rows={4}
              className="bg-gray-700 border-gray-600 text-white"
              maxLength={500}
            />
            <p className="text-xs text-gray-400 mt-1">{reviewData.comment.length}/500 characters</p>
            {errors.comment && <p className="text-red-400 text-sm mt-1">{errors.comment}</p>}
          </div>

          {/* Review Guidelines */}
          <div className="bg-gray-700 rounded-lg p-3">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Review Guidelines:</h4>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• Be honest and constructive in your feedback</li>
              <li>• Focus on your experience with the property and host</li>
              <li>• Reviews help other guests make informed decisions</li>
            </ul>
          </div>

          {errors.submit && (
            <div className="bg-red-900/20 border border-red-500 text-red-400 rounded-lg p-3">
              {errors.submit}
            </div>
          )}

          <div className="flex space-x-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              className="flex-1 border-gray-600 text-gray-300"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="gradient" 
              loading={submitting} 
              className="flex-1"
              disabled={eligibleBookings.length === 0 || !reviewData.booking_id}
            >
              Submit Review
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;