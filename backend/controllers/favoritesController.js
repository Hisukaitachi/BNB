const db = require('../db');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');

exports.addFavorite = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const listingId = req.params.listingId;

  if (!listingId || isNaN(listingId)) {
    return next(new AppError('Valid listing ID is required', 400));
  }

  await pool.query(
    'INSERT IGNORE INTO favorites (user_id, listing_id) VALUES (?, ?)',
    [userId, listingId]
  );
  
  res.status(201).json({
    status: 'success',
    message: 'Added to favorites'
  });
});

exports.getFavorites = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const [rows] = await pool.query(
    `SELECT l.* FROM listings l
     JOIN favorites f ON l.id = f.listing_id
     WHERE f.user_id = ?`,
    [userId]
  );
  
  res.status(200).json({
    status: 'success',
    results: rows.length,
    data: {
      favorites: rows
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
