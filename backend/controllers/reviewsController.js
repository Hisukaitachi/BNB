const pool = require('../db');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');

exports.createReview = catchAsync(async (req, res, next) => {
  const { booking_id, reviewee_id, rating, comment, type } = req.body;
  const reviewer_id = req.user.id;

  if (!booking_id || !reviewee_id || !rating || !comment || !type) {
    return next(new AppError('All fields are required', 400));
  }

  if (!rating || rating < 1 || rating > 5) {
    return next(new AppError('Rating must be between 1 and 5', 400));
  }

  if (!comment || comment.length < 5 || comment.length > 300) {
    return next(new AppError('Comment must be 5-300 characters long', 400));
  }

  await pool.query(
    'CALL sp_create_review_safe(?, ?, ?, ?, ?, ?)',
    [booking_id, reviewer_id, reviewee_id, rating, comment, type]
  );

  res.status(201).json({
    status: 'success',
    message: 'Review created successfully'
  });
});

exports.getAllReviews = catchAsync(async (req, res, next) => {
  const [reviews] = await pool.query('CALL sp_get_all_reviews()');
  
  res.status(200).json({
    status: 'success',
    results: reviews[0].length,
    data: {
      reviews: reviews[0]
    }
  });
});

exports.getReviewsForListing = catchAsync(async (req, res, next) => {
  const { listingId } = req.params;
  
  if (!listingId || isNaN(listingId)) {
    return next(new AppError('Valid listing ID is required', 400));
  }

  const [rows] = await pool.query('CALL sp_get_reviews_for_listing(?)', [listingId]);
  
  res.status(200).json({
    status: 'success',
    results: rows[0].length,
    data: {
      reviews: rows[0]
    }
  });
});

exports.getMyReviews = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  
  const [written] = await pool.query('CALL sp_get_my_written_reviews(?)', [userId]);
  const [received] = await pool.query('CALL sp_get_my_received_reviews(?)', [userId]);
  
  res.status(200).json({
    status: 'success',
    data: {
      written: written[0],
      received: received[0]
    }
  });
});

exports.deleteReview = catchAsync(async (req, res, next) => {
  const reviewId = req.params.id;
  const userId = req.user.id;
  const userRole = req.user.role;

  if (!reviewId || isNaN(reviewId)) {
    return next(new AppError('Valid review ID is required', 400));
  }

  const [rows] = await pool.query('CALL sp_get_review_by_id(?)', [reviewId]);
  const review = rows[0][0];

  if (!review) {
    return next(new AppError('Review not found', 404));
  }

  if (userRole !== 'admin' && review.reviewer_id !== userId) {
    return next(new AppError('Not authorized to delete this review', 403));
  }

  await pool.query('CALL sp_delete_review(?)', [reviewId]);
  
  res.status(200).json({
    status: 'success',
    message: 'Review deleted successfully'
  });
});