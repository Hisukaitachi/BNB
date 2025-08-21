const pool = require('../db');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');

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

  if (!rating || rating < 1 || rating > 5 || !Number.isInteger(Number(rating))) {
    return next(new AppError('Rating must be an integer between 1 and 5', 400));
  }

  if (!comment || comment.length < 10 || comment.length > 500) {
    return next(new AppError('Comment must be between 10-500 characters long', 400));
  }

  const validTypes = ['host', 'client', 'listing', 'user'];
  if (!validTypes.includes(type)) {
    return next(new AppError(`Type must be one of: ${validTypes.join(', ')}`, 400));
  }

  // Prevent self-review
  if (reviewer_id === parseInt(reviewee_id)) {
    return next(new AppError('You cannot review yourself', 400));
  }

  // Check if booking exists and involves the reviewer
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

  // Verify reviewer is part of this booking
  const isClient = booking.client_id === reviewer_id;
  const isHost = booking.host_id === reviewer_id;

  if (!isClient && !isHost) {
    return next(new AppError('You can only review bookings you participated in', 403));
  }

  // Check booking status - only completed bookings can be reviewed
  if (booking.status !== 'completed') {
    return next(new AppError('You can only review completed bookings', 400));
  }

  // Validate reviewee based on reviewer role
  if (isClient && parseInt(reviewee_id) !== booking.host_id) {
    return next(new AppError('Clients can only review the host of their booking', 400));
  }

  if (isHost && parseInt(reviewee_id) !== booking.client_id) {
    return next(new AppError('Hosts can only review the client of their booking', 400));
  }

  // Check if review already exists
  const [existingReview] = await pool.query(
    'SELECT id FROM reviews WHERE booking_id = ? AND reviewer_id = ?',
    [booking_id, reviewer_id]
  );

  if (existingReview.length > 0) {
    return next(new AppError('You have already reviewed this booking', 400));
  }

  // Check review time limit (e.g., 30 days after booking completion)
  const completionDate = new Date(booking.updated_at);
  const now = new Date();
  const daysSinceCompletion = Math.ceil((now - completionDate) / (1000 * 60 * 60 * 24));

  if (daysSinceCompletion > 30) {
    return next(new AppError('Reviews must be submitted within 30 days of booking completion', 400));
  }

  // Profanity check (basic implementation)
  const profanityWords = ['badword1', 'badword2']; // Add actual words
  const containsProfanity = profanityWords.some(word => 
    comment.toLowerCase().includes(word.toLowerCase())
  );

  if (containsProfanity) {
    return next(new AppError('Review contains inappropriate content', 400));
  }

  try {
    await pool.query(
      'CALL sp_create_review_safe(?, ?, ?, ?, ?, ?)',
      [booking_id, reviewer_id, reviewee_id, rating, comment, type]
    );

    // Update listing average rating if it's a listing review
    if (type === 'listing') {
      await pool.query('CALL sp_update_listing_rating(?)', [booking.listing_id]);
    }

    res.status(201).json({
      status: 'success',
      message: 'Review created successfully',
      data: {
        booking: {
          id: booking_id,
          title: booking.title
        },
        review: {
          rating: parseInt(rating),
          type,
          reviewerRole: isClient ? 'client' : 'host',
          submittedAt: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    if (error.message && error.message.includes('already reviewed')) {
      return next(new AppError('You have already reviewed this booking', 409));
    }
    throw error;
  }
});

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

  const [reviews] = await pool.query(`
    SELECT r.*, 
           u1.name AS reviewer_name, 
           u2.name AS reviewee_name,
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

  // Get total count
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

exports.getReviewsForListing = catchAsync(async (req, res, next) => {
  const { listingId } = req.params;
  const { page = 1, limit = 10, rating } = req.query;
  
  if (!listingId || isNaN(listingId)) {
    return next(new AppError('Valid listing ID is required', 400));
  }

  if (parseInt(limit) > 50) {
    return next(new AppError('Limit cannot exceed 50 reviews per page', 400));
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Check if listing exists
  const [listingCheck] = await pool.query('SELECT id, title FROM listings WHERE id = ?', [listingId]);
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

  const [rows] = await pool.query(`
    SELECT r.*, 
           u.name AS reviewer_name,
           b.start_date,
           b.end_date
    FROM reviews r
    JOIN users u ON u.id = r.reviewer_id
    JOIN bookings b ON r.booking_id = b.id
    WHERE b.listing_id = ? ${ratingFilter}
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `, queryParams);

  // Get total count and rating distribution
  const [countResult] = await pool.query(`
    SELECT COUNT(*) as total 
    FROM reviews r
    JOIN bookings b ON r.booking_id = b.id
    WHERE b.listing_id = ? ${ratingFilter}
  `, queryParams.slice(0, -2));

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
    WHERE b.listing_id = ?
  `, [listingId]);
  
  res.status(200).json({
    status: 'success',
    results: rows.length,
    data: {
      listing: listingCheck[0],
      reviews: rows,
      statistics: {
        averageRating: parseFloat(ratingStats[0].average_rating || 0).toFixed(2),
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

exports.getMyReviews = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { page = 1, limit = 20, type = 'all' } = req.query;

  if (parseInt(limit) > 100) {
    return next(new AppError('Limit cannot exceed 100 reviews per page', 400));
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  let writtenQuery, receivedQuery;

  if (type === 'written' || type === 'all') {
    writtenQuery = pool.query(`
      SELECT r.*, 
             u.name AS reviewee_name,
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

  if (type === 'received' || type === 'all') {
    receivedQuery = pool.query(`
      SELECT r.*, 
             u.name AS reviewer_name,
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

  if (writtenQuery) {
    const [written] = await writtenQuery;
    results.written = written;
  }

  if (receivedQuery) {
    const [received] = await receivedQuery;
    results.received = received;
  }

  // Get counts
  const [writtenCount] = await pool.query(
    'SELECT COUNT(*) as total FROM reviews WHERE reviewer_id = ?',
    [userId]
  );

  const [receivedCount] = await pool.query(
    'SELECT COUNT(*) as total FROM reviews WHERE reviewee_id = ?',
    [userId]
  );

  res.status(200).json({
    status: 'success',
    data: {
      ...results,
      statistics: {
        totalWritten: writtenCount[0].total,
        totalReceived: receivedCount[0].total
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
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

  // Authorization check
  if (userRole !== 'admin' && review.reviewer_id !== userId) {
    return next(new AppError('You can only delete your own reviews', 403));
  }

  // Check if review is too old to delete (e.g., 7 days)
  if (userRole !== 'admin') {
    const reviewDate = new Date(review.created_at);
    const now = new Date();
    const daysSinceReview = Math.ceil((now - reviewDate) / (1000 * 60 * 60 * 24));

    if (daysSinceReview > 7) {
      return next(new AppError('Reviews can only be deleted within 7 days of submission', 400));
    }
  }

  await pool.query('DELETE FROM reviews WHERE id = ?', [reviewId]);

  // Update listing rating if it was a listing review
  if (review.type === 'listing' && review.listing_id) {
    await pool.query('CALL sp_update_listing_rating(?)', [review.listing_id]);
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