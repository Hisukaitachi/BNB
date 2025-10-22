const pool = require('../db');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');

/**
 * CREATE REVIEW
 * Allows users to review completed bookings
 * Replaced: sp_create_review_safe stored procedure
 * 
 * Extensive validation:
 * - Booking must be completed
 * - Only participants can review
 * - One review per booking per user
 * - Review must be within 30 days of completion
 * - Profanity filtering
 */
exports.createReview = catchAsync(async (req, res, next) => {
  const { booking_id, reviewee_id, rating, comment, type } = req.body;
  const reviewer_id = req.user.id;

  // Basic validation
  if (!booking_id || !reviewee_id || !rating || !comment || !type) {
    return next(new AppError('All fields are required', 400));
  }

  // Enhanced validation
  if (isNaN(booking_id) || booking_id <= 0) {
    return next(new AppError('Valid booking ID is required', 400));
  }

  if (isNaN(reviewee_id) || reviewee_id <= 0) {
    return next(new AppError('Valid reviewee ID is required', 400));
  }

  // Rating must be 1-5
  if (!rating || rating < 1 || rating > 5 || !Number.isInteger(Number(rating))) {
    return next(new AppError('Rating must be an integer between 1 and 5', 400));
  }

  // Comment length validation
  if (!comment || comment.trim().length < 10 || comment.trim().length > 500) {
    return next(new AppError('Comment must be between 10-500 characters long', 400));
  }

  // Type validation
  const validTypes = ['host', 'client', 'listing', 'user'];
  if (!validTypes.includes(type)) {
    return next(new AppError(`Type must be one of: ${validTypes.join(', ')}`, 400));
  }

  // Prevent self-review
  if (reviewer_id === parseInt(reviewee_id)) {
    return next(new AppError('You cannot review yourself', 400));
  }

  // ✅ DEBUG LOG
  console.log('📝 Review submission:', {
    reviewer_id,
    reviewee_id,
    booking_id,
    type,
    rating
  });

  // CHECK BOOKING EXISTS AND STATUS
  const [bookingCheck] = await pool.query(`
    SELECT b.*, l.host_id, l.title
    FROM bookings b
    JOIN listings l ON b.listing_id = l.id
    WHERE b.id = ?
  `, [booking_id]);

  if (!bookingCheck.length) {
    return next(new AppError('Booking not found', 404));
  }

  const booking = bookingCheck[0];

  // ✅ DEBUG LOG
  console.log('🏠 Booking details:', {
    client_id: booking.client_id,
    host_id: booking.host_id,
    status: booking.status
  });

  // Verify reviewer is part of this booking
  const isClient = booking.client_id === reviewer_id;
  const isHost = booking.host_id === reviewer_id;

  console.log('👤 Reviewer role:', { isClient, isHost });

  if (!isClient && !isHost) {
    return next(new AppError('You can only review bookings you participated in', 403));
  }

  // Check booking status - only completed bookings
  if (booking.status !== 'completed') {
    return next(new AppError('You can only review completed bookings', 400));
  }

  // ✅ UPDATED VALIDATION - More flexible for host/client reviews
  if (type === 'client') {
    // Reviewing a client - must be the host
    if (!isHost) {
      return next(new AppError('Only the host can review the client', 403));
    }
    if (parseInt(reviewee_id) !== booking.client_id) {
      return next(new AppError('Reviewee ID must match the booking client', 400));
    }
  } else if (type === 'host') {
    // Reviewing a host - must be the client
    if (!isClient) {
      return next(new AppError('Only the client can review the host', 403));
    }
    if (parseInt(reviewee_id) !== booking.host_id) {
      return next(new AppError('Reviewee ID must match the booking host', 400));
    }
  } else if (type === 'listing') {
    // Reviewing a listing - must be the client
    if (!isClient) {
      return next(new AppError('Only clients can review listings', 403));
    }
  }

  // CHECK IF REVIEW ALREADY EXISTS
  const [existingReview] = await pool.query(
    'SELECT id FROM reviews WHERE booking_id = ? AND reviewer_id = ? AND type = ?',
    [booking_id, reviewer_id, type]
  );

  if (existingReview.length > 0) {
    return next(new AppError(`You have already submitted a ${type} review for this booking`, 400));
  }

  // CHECK REVIEW TIME LIMIT (30 days after completion)
  const completionDate = new Date(booking.updated_at);
  const now = new Date();
  const daysSinceCompletion = Math.ceil((now - completionDate) / (1000 * 60 * 60 * 24));

  if (daysSinceCompletion > 30) {
    return next(new AppError('Reviews must be submitted within 30 days of booking completion', 400));
  }

  // PROFANITY CHECK (basic implementation)
  const profanityWords = ['badword1', 'badword2'];
  const containsProfanity = profanityWords.some(word => 
    comment.toLowerCase().includes(word.toLowerCase())
  );

  if (containsProfanity) {
    return next(new AppError('Review contains inappropriate content', 400));
  }

  try {
    // INSERT REVIEW
    const [result] = await pool.query(
      'INSERT INTO reviews (booking_id, reviewer_id, reviewee_id, rating, comment, type, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [booking_id, reviewer_id, reviewee_id, rating, comment.trim(), type]
    );

    console.log('✅ Review created successfully:', result.insertId);

    // UPDATE LISTING AVERAGE RATING if it's a listing review
    if (type === 'listing') {
      const [avgResult] = await pool.query(`
        SELECT AVG(r.rating) as avg_rating
        FROM reviews r
        JOIN bookings b ON r.booking_id = b.id
        WHERE b.listing_id = ? AND r.type = 'listing'
      `, [booking.listing_id]);

      const avgRating = avgResult[0].avg_rating || 0;

      await pool.query(
        'UPDATE listings SET average_rating = ? WHERE id = ?',
        [avgRating, booking.listing_id]
      );
    }

    res.status(201).json({
      status: 'success',
      message: 'Review created successfully',
      data: {
        review: {
          id: result.insertId,
          booking_id: booking_id,
          rating: parseInt(rating),
          type,
          reviewerRole: isClient ? 'client' : 'host',
          submittedAt: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('❌ Review creation error:', error);
    throw error;
  }
});

/**
 * GET ALL REVIEWS
 * Retrieves all reviews with filtering and pagination
 * 
 * Supports filtering by:
 * - rating (1-5)
 * - type (host/client/listing/user)
 */
exports.getAllReviews = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, rating, type } = req.query;
  
  if (parseInt(limit) > 100) {
    return next(new AppError('Limit cannot exceed 100 reviews per page', 400));
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);
  let whereClause = '1=1';
  const queryParams = [];

  // Filter by rating
  if (rating && !isNaN(rating) && rating >= 1 && rating <= 5) {
    whereClause += ' AND r.rating = ?';
    queryParams.push(parseInt(rating));
  }

  // Filter by type
  if (type && ['host', 'client', 'listing', 'user'].includes(type)) {
    whereClause += ' AND r.type = ?';
    queryParams.push(type);
  }

  queryParams.push(parseInt(limit), offset);

  // GET REVIEWS WITH USER INFO
  const [reviews] = await pool.query(`
    SELECT r.*, 
           u1.name AS reviewer_name,
           u1.profile_picture AS reviewer_profile_picture,
           u1.role AS reviewer_role,
           u2.name AS reviewee_name,
           u2.profile_picture AS reviewee_profile_picture,
           u2.role AS reviewee_role,
           b.start_date,
           b.end_date,
           l.title AS listing_title
    FROM reviews r
    JOIN users u1 ON r.reviewer_id = u1.id
    JOIN users u2 ON r.reviewee_id = u2.id
    LEFT JOIN bookings b ON r.booking_id = b.id
    LEFT JOIN listings l ON b.listing_id = l.id
    WHERE ${whereClause}
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `, queryParams);

  // Get total count for pagination
  const [countResult] = await pool.query(`
    SELECT COUNT(*) as total 
    FROM reviews r 
    WHERE ${whereClause}
  `, queryParams.slice(0, -2));
  
  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: {
      reviews,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    }
  });
});

/**
 * GET REVIEWS FOR LISTING
 * Retrieves all reviews for a specific listing with statistics
 * Replaced: sp_get_reviews_for_listing stored procedure
 * 
 * ✅ FIXED: Only shows reviews of type 'listing', not 'client' or 'host' reviews
 * 
 * Features:
 * - Rating distribution (5-star breakdown)
 * - Average rating calculation
 * - Pagination support
 */
exports.getReviewsForListing = catchAsync(async (req, res, next) => {
  const listingId = req.params.id;
  const { page = 1, limit = 10, rating } = req.query;
  
  if (!listingId || isNaN(listingId)) {
    return next(new AppError('Valid listing ID is required', 400));
  }

  if (parseInt(limit) > 50) {
    return next(new AppError('Limit cannot exceed 50 reviews per page', 400));
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Check if listing exists
  const [listingCheck] = await pool.query(
    'SELECT id, title FROM listings WHERE id = ?', 
    [listingId]
  );
  
  if (!listingCheck.length) {
    return next(new AppError('Listing not found', 404));
  }

  let ratingFilter = '';
  const queryParams = [listingId];

  if (rating && !isNaN(rating) && rating >= 1 && rating <= 5) {
    ratingFilter = 'AND r.rating = ?';
    queryParams.push(parseInt(rating));
  }

  queryParams.push(parseInt(limit), offset);

  // ✅ FIXED: Only get reviews where type = 'listing'
  // This prevents client/host reviews from showing on the listing page
  const [rows] = await pool.query(`
    SELECT r.*, 
           u.name AS reviewer_name,
           u.profile_picture AS reviewer_profile_picture,
           u.role AS reviewer_role,
           b.start_date,
           b.end_date
    FROM reviews r
    JOIN users u ON u.id = r.reviewer_id
    JOIN bookings b ON r.booking_id = b.id
    WHERE b.listing_id = ? 
      AND r.type = 'listing'
      ${ratingFilter}
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `, queryParams);

  // Get total count - also filter by type = 'listing'
  const [countResult] = await pool.query(`
    SELECT COUNT(*) as total 
    FROM reviews r
    JOIN bookings b ON r.booking_id = b.id
    WHERE b.listing_id = ? 
      AND r.type = 'listing'
      ${ratingFilter}
  `, queryParams.slice(0, -2));

  // ✅ FIXED: Rating statistics only for listing reviews
  const [ratingStats] = await pool.query(`
    SELECT 
      AVG(r.rating) as average_rating,
      COUNT(r.rating) as total_reviews,
      SUM(CASE WHEN r.rating = 5 THEN 1 ELSE 0 END) as five_star,
      SUM(CASE WHEN r.rating = 4 THEN 1 ELSE 0 END) as four_star,
      SUM(CASE WHEN r.rating = 3 THEN 1 ELSE 0 END) as three_star,
      SUM(CASE WHEN r.rating = 2 THEN 1 ELSE 0 END) as two_star,
      SUM(CASE WHEN r.rating = 1 THEN 1 ELSE 0 END) as one_star
    FROM reviews r
    JOIN bookings b ON r.booking_id = b.id
    WHERE b.listing_id = ? AND r.type = 'listing'
  `, [listingId]);
  
  res.status(200).json({
    status: 'success',
    results: rows.length,
    data: {
      listing: listingCheck[0],
      reviews: rows,
      statistics: {
        averageRating: parseFloat(ratingStats[0].average_rating || 0),
        totalReviews: ratingStats[0].total_reviews,
        distribution: {
          5: ratingStats[0].five_star,
          4: ratingStats[0].four_star,
          3: ratingStats[0].three_star,
          2: ratingStats[0].two_star,
          1: ratingStats[0].one_star
        }
      },
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    }
  });
});

/**
 * GET MY REVIEWS
 * Retrieves reviews written by and received by the user
 * Replaced: sp_get_my_reviews stored procedure
 * 
 * Returns two separate arrays:
 * - Reviews written by the user
 * - Reviews received by the user
 */
exports.getMyReviews = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { page = 1, limit = 20, type = 'all' } = req.query;

  if (parseInt(limit) > 100) {
    return next(new AppError('Limit cannot exceed 100 reviews per page', 400));
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  let writtenQuery, receivedQuery;

  // GET WRITTEN REVIEWS (reviews by this user)
  if (type === 'written' || type === 'all') {
    writtenQuery = pool.query(`
      SELECT r.*, 
             u.name AS reviewee_name,
             u.profile_picture AS reviewee_profile_picture,
             u.role AS reviewee_role,
             b.start_date,
             b.end_date,
             l.title AS listing_title
      FROM reviews r
      JOIN users u ON r.reviewee_id = u.id
      LEFT JOIN bookings b ON r.booking_id = b.id
      LEFT JOIN listings l ON b.listing_id = l.id
      WHERE r.reviewer_id = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, parseInt(limit), offset]);
  }

  // GET RECEIVED REVIEWS (reviews about this user)
  if (type === 'received' || type === 'all') {
    receivedQuery = pool.query(`
      SELECT r.*, 
             u.name AS reviewer_name,
             u.profile_picture AS reviewer_profile_picture,
             u.role AS reviewer_role,
             b.start_date,
             b.end_date,
             l.title AS listing_title
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      LEFT JOIN bookings b ON r.booking_id = b.id
      LEFT JOIN listings l ON b.listing_id = l.id
      WHERE r.reviewee_id = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, parseInt(limit), offset]);
  }

  const results = {};

  // Execute queries
  if (writtenQuery) {
    const [written] = await writtenQuery;
    results.written = written;
  }

  if (receivedQuery) {
    const [received] = await receivedQuery;
    results.received = received;
  }

  // GET COUNTS AND AVERAGE RATING
  const [writtenCount] = await pool.query(
    'SELECT COUNT(*) as total FROM reviews WHERE reviewer_id = ?',
    [userId]
  );

  const [receivedStats] = await pool.query(
    'SELECT COUNT(*) as total, AVG(rating) as averageRating FROM reviews WHERE reviewee_id = ?',
    [userId]
  );

  res.status(200).json({
    status: 'success',
    data: {
      ...results,
      statistics: {
        totalWritten: writtenCount[0].total,
        totalReceived: receivedStats[0].total,
        averageRating: parseFloat(receivedStats[0].averageRating || 0)
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    }
  });
});

/**
 * DELETE REVIEW
 * Deletes a review with authorization checks
 * Replaced: sp_remove_review stored procedure
 * 
 * Rules:
 * - Admins can delete any review
 * - Users can only delete their own reviews
 * - Reviews can only be deleted within 7 days (non-admin)
 */
exports.deleteReview = catchAsync(async (req, res, next) => {
  const reviewId = req.params.id;
  const userId = req.user.id;
  const userRole = req.user.role;

  if (!reviewId || isNaN(reviewId)) {
    return next(new AppError('Valid review ID is required', 400));
  }

  // GET REVIEW DETAILS
  const [rows] = await pool.query(`
    SELECT r.*, b.listing_id
    FROM reviews r
    LEFT JOIN bookings b ON r.booking_id = b.id
    WHERE r.id = ?
  `, [reviewId]);

  if (!rows.length) {
    return next(new AppError('Review not found', 404));
  }

  const review = rows[0];

  // AUTHORIZATION CHECK
  if (userRole !== 'admin' && review.reviewer_id !== userId) {
    return next(new AppError('You can only delete your own reviews', 403));
  }

  // TIME LIMIT CHECK (7 days for non-admins)
  if (userRole !== 'admin') {
    const reviewDate = new Date(review.created_at);
    const now = new Date();
    const daysSinceReview = Math.ceil((now - reviewDate) / (1000 * 60 * 60 * 24));

    if (daysSinceReview > 7) {
      return next(new AppError('Reviews can only be deleted within 7 days of submission', 400));
    }
  }

  // DELETE REVIEW - replaces sp_remove_review stored procedure
  await pool.query('DELETE FROM reviews WHERE id = ?', [reviewId]);

  // UPDATE LISTING RATING if it was a listing review
  if (review.type === 'listing' && review.listing_id) {
    // Recalculate average rating
    const [avgResult] = await pool.query(`
      SELECT AVG(r.rating) as avg_rating
      FROM reviews r
      JOIN bookings b ON r.booking_id = b.id
      WHERE b.listing_id = ? AND r.type = 'listing'
    `, [review.listing_id]);

    const avgRating = avgResult[0].avg_rating || 0;

    await pool.query(
      'UPDATE listings SET average_rating = ? WHERE id = ?',
      [avgRating, review.listing_id]
    );
  }
  
  res.status(200).json({
    status: 'success',
    message: 'Review deleted successfully',
    data: {
      deletedReview: {
        id: parseInt(reviewId),
        deletedBy: userRole,
        deletedAt: new Date().toISOString()
      }
    }
  });
});