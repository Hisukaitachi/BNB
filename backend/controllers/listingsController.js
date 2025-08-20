// backend/controllers/listingsController.js - Updated with new error handling
const path = require('path');
const pool = require('../db');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');

exports.createListing = catchAsync(async (req, res, next) => {
  const hostId = req.user.id;
  const role = req.user.role;
  let { title, description, price_per_night, location, latitude, longitude } = req.body;

  if (role !== 'host') {
    return next(new AppError('Only hosts can create listings', 403));
  }

  // Basic validation
  if (!title || !description || !price_per_night || !location) {
    return next(new AppError('Title, description, price per night, and location are required', 400));
  }

  // If latitude or longitude are missing, try to geocode
  if (!latitude || !longitude) {
    const coords = await getCoordinatesFromLocation(location);
    latitude = coords.latitude;
    longitude = coords.longitude;
  }

  const imageUrl = req.files?.image ? `/uploads/${req.files.image[0].filename}` : null;
  const videoUrl = req.files?.video ? `/uploads/${req.files.video[0].filename}` : null;

  const [result] = await pool.query(
    'CALL sp_create_listing(?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [hostId, title, description, price_per_night, location, imageUrl, videoUrl, latitude, longitude]
  );

  res.status(201).json({
    status: 'success',
    message: 'Listing created successfully',
    data: {
      listingId: result.insertId
    }
  });
});

exports.getAllListings = catchAsync(async (req, res, next) => {
  const [results] = await pool.query('CALL sp_get_all_listings()');
  const listings = results[0];

  res.status(200).json({
    status: 'success',
    results: listings.length,
    data: {
      listings
    }
  });
});

exports.getListingById = catchAsync(async (req, res, next) => {
  const listingId = req.params.id;

  if (!listingId || isNaN(listingId)) {
    return next(new AppError('Valid listing ID is required', 400));
  }

  const [result] = await pool.query('CALL sp_get_listing_by_id(?)', [listingId]);
  const listing = result[0][0];

  if (!listing) {
    return next(new AppError('Listing not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      listing
    }
  });
});

exports.getListingsByHost = catchAsync(async (req, res, next) => {
  const hostId = req.user.id;
  const role = req.user.role;

  if (role !== 'host') {
    return next(new AppError('Only hosts can view their listings', 403));
  }

  const [rows] = await pool.query('CALL sp_get_listings_by_host(?)', [hostId]);

  res.status(200).json({
    status: 'success',
    results: rows[0].length,
    data: {
      listings: rows[0]
    }
  });
});

exports.updateListing = catchAsync(async (req, res, next) => {
  const listingId = req.params.id;
  let { title, description, price_per_night, location, latitude, longitude } = req.body;

  if (!listingId || isNaN(listingId)) {
    return next(new AppError('Valid listing ID is required', 400));
  }

  // Check if at least one field is provided
  if (!title && !description && !price_per_night && !location && !latitude && !longitude) {
    return next(new AppError('At least one field must be provided for update', 400));
  }

  // If lat/lng not provided, attempt to geocode
  if (location && (!latitude || !longitude)) {
    const coords = await getCoordinatesFromLocation(location);
    latitude = coords.latitude;
    longitude = coords.longitude;
  }

  const [result] = await pool.query(
    'CALL sp_update_listing(?, ?, ?, ?, ?, ?, ?)',
    [listingId, title, description, price_per_night, location, latitude, longitude]
  );

  if (result.affectedRows === 0) {
    return next(new AppError('Listing not found or no changes made', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Listing updated successfully'
  });
});

exports.deleteListing = catchAsync(async (req, res, next) => {
  const hostId = req.user.id;
  const role = req.user.role;
  const { id } = req.params;

  if (role !== 'host') {
    return next(new AppError('Only hosts can delete listings', 403));
  }

  if (!id || isNaN(id)) {
    return next(new AppError('Valid listing ID is required', 400));
  }

  const [result] = await pool.query('CALL sp_delete_listing(?, ?)', [id, hostId]);

  if (result.affectedRows === 0) {
    return next(new AppError('Listing not found or you do not have permission to delete it', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Listing deleted successfully'
  });
});

exports.searchListings = catchAsync(async (req, res, next) => {
  const {
    city,
    price_min,
    price_max,
    keyword,
    min_rating,
    check_in,
    check_out,
    page = 1,
    limit = 10,
    sortBy = 'created_at',
    order = 'DESC',
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const queryParams = [];
  const countParams = [];

  let baseQuery = 'FROM listings l WHERE 1=1';

  // City / location filter
  if (city) {
    baseQuery += ' AND l.location LIKE ?';
    queryParams.push(`%${city}%`);
    countParams.push(`%${city}%`);
  }

  // Price filters
  if (price_min && !isNaN(price_min)) {
    baseQuery += ' AND l.price_per_night >= ?';
    queryParams.push(price_min);
    countParams.push(price_min);
  }
  if (price_max && !isNaN(price_max)) {
    baseQuery += ' AND l.price_per_night <= ?';
    queryParams.push(price_max);
    countParams.push(price_max);
  }

  // Keyword filter
  if (keyword) {
    baseQuery += ' AND (l.title LIKE ? OR l.description LIKE ?)';
    queryParams.push(`%${keyword}%`, `%${keyword}%`);
    countParams.push(`%${keyword}%`, `%${keyword}%`);
  }

  // Rating filter
  if (min_rating && !isNaN(min_rating)) {
    baseQuery += ' AND l.average_rating >= ?';
    queryParams.push(min_rating);
    countParams.push(min_rating);
  }

  // Availability filter
  if (check_in && check_out) {
    baseQuery += `
      AND l.id NOT IN (
        SELECT b.listing_id
        FROM bookings b
        WHERE 
          (b.status = 'approved' OR b.status = 'pending')
          AND (b.check_in < ? AND b.check_out > ?)
      )
    `;
    queryParams.push(check_out, check_in);
    countParams.push(check_out, check_in);
  }

  // Sorting
  const validSortFields = ['price_per_night', 'created_at', 'average_rating'];
  const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
  const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const sortClause = ` ORDER BY l.${safeSortBy} ${safeOrder}`;

  // Listings query
  const listingsQuery = `SELECT l.* ${baseQuery} ${sortClause} LIMIT ? OFFSET ?`;
  queryParams.push(parseInt(limit), offset);

  // Count query
  const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;

  const [listings] = await pool.query(listingsQuery, queryParams);
  const [countResult] = await pool.query(countQuery, countParams);

  res.status(200).json({
    status: 'success',
    results: listings.length,
    data: {
      listings,
      pagination: {
        total: countResult[0].total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult[0].total / parseInt(limit))
      }
    }
  });
});

exports.getNearbyListings = catchAsync(async (req, res, next) => {
  const { lat, lng } = req.query;
  const radius = 10; // 10 km radius

  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    return next(new AppError('Valid latitude and longitude are required', 400));
  }

  const [results] = await pool.query(`
    SELECT *, (
      6371 * acos(
        cos(radians(?)) *
        cos(radians(latitude)) *
        cos(radians(longitude) - radians(?)) +
        sin(radians(?)) *
        sin(radians(latitude))
      )
    ) AS distance
    FROM listings
    HAVING distance < ?
    ORDER BY distance ASC
  `, [lat, lng, lat, radius]);

  res.status(200).json({
    status: 'success',
    results: results.length,
    data: {
      listings: results
    }
  });
});