// backend/controllers/listingsController.js - Updated with new error handling
const path = require('path');
const pool = require('../db');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');
const getCoordinatesFromLocation = require('../utils/geocode');

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

  // Enhanced business validation
  if (price_per_night < 1 || price_per_night > 1000000) {
    return next(new AppError('Price must be between ₱1 and ₱1,000,000 per night', 400));
  }

  if (title.length < 5 || title.length > 200) {
    return next(new AppError('Title must be between 5 and 200 characters', 400));
  }

  if (description.length < 20 || description.length > 2000) {
    return next(new AppError('Description must be between 20 and 2000 characters', 400));
  }

  if (location.length < 3 || location.length > 255) {
    return next(new AppError('Location must be between 3 and 255 characters', 400));
  }

  // Check for duplicate listings by same host
  const [duplicateCheck] = await pool.query(
    'SELECT id FROM listings WHERE host_id = ? AND title = ? AND location = ?',
    [hostId, title, location]
  );
  if (duplicateCheck.length > 0) {
    return next(new AppError('You already have a listing with this title and location', 400));
  }

  // Check host listing limit (optional business rule)
  const [hostListings] = await pool.query(
    'SELECT COUNT(*) as count FROM listings WHERE host_id = ?',
    [hostId]
  );
  if (hostListings[0].count >= 50) { // Limit to 50 listings per host
    return next(new AppError('Maximum listings limit reached (50 listings per host)', 400));
  }

  // If latitude or longitude are missing, try to geocode
  if (!latitude || !longitude) {
    try {
      const coords = await getCoordinatesFromLocation(location);
      latitude = coords.latitude;
      longitude = coords.longitude;
    } catch (error) {
      console.warn('Geocoding failed:', error.message);
      // Continue without coordinates
    }
  }

  // Validate coordinates if provided
  if (latitude && (latitude < -90 || latitude > 90)) {
    return next(new AppError('Latitude must be between -90 and 90', 400));
  }
  if (longitude && (longitude < -180 || longitude > 180)) {
    return next(new AppError('Longitude must be between -180 and 180', 400));
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
      listingId: result.insertId,
      title,
      location,
      pricePerNight: price_per_night,
      hasCoordinates: !!(latitude && longitude)
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
  const hostId = req.user.id;
  let { title, description, price_per_night, location, latitude, longitude } = req.body;

  if (!listingId || isNaN(listingId)) {
    return next(new AppError('Valid listing ID is required', 400));
  }

  // Check if at least one field is provided
  if (!title && !description && !price_per_night && !location && !latitude && !longitude) {
    return next(new AppError('At least one field must be provided for update', 400));
  }

  // Verify ownership
  const [existingListing] = await pool.query(
    'SELECT host_id, title as currentTitle, location as currentLocation FROM listings WHERE id = ?',
    [listingId]
  );
  
  if (!existingListing.length) {
    return next(new AppError('Listing not found', 404));
  }
  
  if (existingListing[0].host_id !== hostId) {
    return next(new AppError('You can only update your own listings', 403));
  }

  // Enhanced validation for provided fields
  if (title && (title.length < 5 || title.length > 200)) {
    return next(new AppError('Title must be between 5 and 200 characters', 400));
  }

  if (description && (description.length < 20 || description.length > 2000)) {
    return next(new AppError('Description must be between 20 and 2000 characters', 400));
  }

  if (price_per_night && (price_per_night < 1 || price_per_night > 1000000)) {
    return next(new AppError('Price must be between ₱1 and ₱1,000,000 per night', 400));
  }

  if (location && (location.length < 3 || location.length > 255)) {
    return next(new AppError('Location must be between 3 and 255 characters', 400));
  }

  // Check for duplicate if title or location is being updated
  if (title || location) {
    const titleToCheck = title || existingListing[0].currentTitle;
    const locationToCheck = location || existingListing[0].currentLocation;
    
    const [duplicateCheck] = await pool.query(
      'SELECT id FROM listings WHERE host_id = ? AND title = ? AND location = ? AND id != ?',
      [hostId, titleToCheck, locationToCheck, listingId]
    );
    
    if (duplicateCheck.length > 0) {
      return next(new AppError('You already have another listing with this title and location', 400));
    }
  }

  // If lat/lng not provided but location is updated, attempt to geocode
  if (location && (!latitude || !longitude)) {
    try {
      const coords = await getCoordinatesFromLocation(location);
      latitude = coords.latitude;
      longitude = coords.longitude;
    } catch (error) {
      console.warn('Geocoding failed during update:', error.message);
    }
  }

  // Validate coordinates if provided
  if (latitude && (latitude < -90 || latitude > 90)) {
    return next(new AppError('Latitude must be between -90 and 90', 400));
  }
  if (longitude && (longitude < -180 || longitude > 180)) {
    return next(new AppError('Longitude must be between -180 and 180', 400));
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
    message: 'Listing updated successfully',
    data: {
      listingId: parseInt(listingId),
      updatedFields: {
        ...(title && { title }),
        ...(description && { description }),
        ...(price_per_night && { price_per_night }),
        ...(location && { location }),
        ...(latitude && longitude && { coordinates: { latitude, longitude } })
      }
    }
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

  let baseQuery = `
    FROM listings l 
    LEFT JOIN users u ON l.host_id = u.id 
    WHERE 1=1
  `;

  // City / location filter
  if (city) {
    baseQuery += ' AND l.location LIKE ?';
    queryParams.push(`%${city}%`);
    countParams.push(`%${city}%`);
  }

  // Price filters
  if (price_min && !isNaN(price_min)) {
    baseQuery += ' AND l.price_per_night >= ?';
    queryParams.push(parseFloat(price_min));
    countParams.push(parseFloat(price_min));
  }
  if (price_max && !isNaN(price_max)) {
    baseQuery += ' AND l.price_per_night <= ?';
    queryParams.push(parseFloat(price_max));
    countParams.push(parseFloat(price_max));
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
    queryParams.push(parseFloat(min_rating));
    countParams.push(parseFloat(min_rating));
  }

  // Availability filter - FIXED VERSION
  if (check_in && check_out) {
    baseQuery += `
      AND l.id NOT IN (
        SELECT DISTINCT b.listing_id
        FROM bookings b
        WHERE b.status IN ('pending', 'approved', 'confirmed')
        AND NOT (b.end_date <= ? OR b.start_date >= ?)
      )
    `;
    queryParams.push(check_in, check_out);
    countParams.push(check_in, check_out);
  }

  // Sorting
  const validSortFields = ['price_per_night', 'created_at', 'average_rating', 'title'];
  const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
  const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const sortClause = ` ORDER BY l.${safeSortBy} ${safeOrder}`;

  // Add pagination params
  queryParams.push(parseInt(limit), offset);

  // Main listings query
  const listingsQuery = `
    SELECT 
      l.id,
      l.title,
      l.description,
      l.price_per_night,
      l.location,
      l.image_url,
      l.video_url,
      l.average_rating,
      l.latitude,
      l.longitude,
      l.created_at,
      u.name as host_name
    ${baseQuery} 
    ${sortClause} 
    LIMIT ? OFFSET ?
  `;

  // Count query
  const countQuery = `SELECT COUNT(DISTINCT l.id) as total ${baseQuery}`;

  try {
    const [listings] = await pool.query(listingsQuery, queryParams);
    const [countResult] = await pool.query(countQuery, countParams);

    res.status(200).json({
      status: 'success',
      results: listings.length,
      data: {
        listings,
        filters: {
          city: city || null,
          priceRange: [price_min, price_max].filter(p => p !== undefined),
          keyword: keyword || null,
          minRating: min_rating || null,
          dates: check_in && check_out ? [check_in, check_out] : null
        },
        pagination: {
          total: countResult[0].total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(countResult[0].total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Search listings error:', error);
    return next(new AppError('Search failed', 500));
  }
});

exports.getSearchSuggestions = catchAsync(async (req, res, next) => {
  const { q } = req.query;
  
  if (!q || q.length < 2) {
    return res.status(200).json({
      status: 'success',
      data: { suggestions: [] }
    });
  }

  try {
    // Get location suggestions
    const [locations] = await pool.query(`
      SELECT DISTINCT location, COUNT(*) as count
      FROM listings 
      WHERE location LIKE ?
      GROUP BY location
      ORDER BY count DESC, location ASC
      LIMIT 5
    `, [`%${q}%`]);

    // Get title suggestions
    const [titles] = await pool.query(`
      SELECT title, location, price_per_night
      FROM listings 
      WHERE title LIKE ?
      ORDER BY average_rating DESC
      LIMIT 3
    `, [`%${q}%`]);

    res.status(200).json({
      status: 'success',
      data: {
        suggestions: {
          locations: locations.map(l => ({
            type: 'location',
            text: l.location,
            count: l.count
          })),
          listings: titles.map(t => ({
            type: 'listing', 
            text: t.title,
            location: t.location,
            price: t.price_per_night
          }))
        }
      }
    });
  } catch (error) {
    console.error('Search suggestions error:', error);
    return next(new AppError('Failed to get suggestions', 500));
  }
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