const pool = require('../db'); // Fixed import
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');

exports.addFavorite = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const listingId = req.params.listingId;

  if (!listingId || isNaN(listingId)) {
    return next(new AppError('Valid listing ID is required', 400));
  }

  // Check if listing exists and user doesn't own it
  const [listing] = await pool.query('SELECT host_id FROM listings WHERE id = ?', [listingId]);
  if (!listing.length) {
    return next(new AppError('Listing not found', 404));
  }
  if (listing[0].host_id === userId) {
    return next(new AppError('Cannot favorite your own listing', 400));
  }

  // Check if already favorited
  const [existing] = await pool.query(
    'SELECT id FROM favorites WHERE user_id = ? AND listing_id = ?',
    [userId, listingId]
  );
  if (existing.length > 0) {
    return next(new AppError('Listing already in favorites', 400));
  }

  await pool.query(
    'INSERT INTO favorites (user_id, listing_id) VALUES (?, ?)',
    [userId, listingId]
  );
  
  res.status(201).json({
    status: 'success',
    message: 'Added to favorites'
  });
});

exports.getFavorites = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  const [rows] = await pool.query(
    `SELECT l.*, f.created_at as favorited_at 
     FROM listings l
     JOIN favorites f ON l.id = f.listing_id
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC
     LIMIT ? OFFSET ?`,
    [userId, parseInt(limit), parseInt(offset)]
  );

  // Get total count
  const [countResult] = await pool.query(
    'SELECT COUNT(*) as total FROM favorites WHERE user_id = ?',
    [userId]
  );
  
  res.status(200).json({
    status: 'success',
    results: rows.length,
    data: {
      favorites: rows,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    }
  });
});

exports.removeFavorite = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const listingId = req.params.listingId;

  if (!listingId || isNaN(listingId)) {
    return next(new AppError('Valid listing ID is required', 400));
  }

  const [result] = await pool.query(
    'DELETE FROM favorites WHERE user_id = ? AND listing_id = ?',
    [userId, listingId]
  );

  if (result.affectedRows === 0) {
    return next(new AppError('Favorite not found', 404));
  }
  
  res.status(200).json({
    status: 'success',
    message: 'Removed from favorites'
  });
});