// backend/controllers/listingsController.js - Updated with new error handling
const path = require('path');
const pool = require('../db');
const catchAsync = require('../utils/catchAsync');
const { AppError } = require('../middleware/errorHandler');
const getCoordinatesFromLocation = require('../utils/geocode');

exports.createListing = catchAsync(async (req, res, next) => {
  const hostId = req.user.id;
  const role = req.user.role;
  
  let { 
    title, description, price_per_night, location, latitude, longitude,
    max_guests, bedrooms, bathrooms, amenities, house_rules
  } = req.body;

  console.log('📝 Creating listing with data:', {
    title, description, price_per_night, location,
    files: req.files,
    userId: hostId,
    userRole: role
  });

  if (role !== 'host') {
    return next(new AppError('Only hosts can create listings', 403));
  }

  // Basic validation
  if (!title || !description || !price_per_night || !location) {
    return next(new AppError('Title, description, price per night, and location are required', 400));
  }

  // UPDATED: Handle multiple image uploads
  let imageUrls = [];
  let videoUrl = null;

  if (req.files) {
    console.log('📁 Processing uploaded files:', req.files);
    
    // Handle multiple images
    if (req.files.images) {
      const imageFiles = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      imageUrls = imageFiles.map(file => `/uploads/${file.filename}`);
      console.log(`📁 ${imageUrls.length} image files processed:`, imageUrls);
    }
    
    if (req.files.video && req.files.video[0]) {
      videoUrl = `/uploads/${req.files.video[0].filename}`;
      console.log('🎥 Video file processed:', videoUrl);
    }
  }

  // If latitude or longitude are missing, try to geocode
  if (!latitude || !longitude) {
    try {
      const coords = await getCoordinatesFromLocation(location);
      latitude = coords.latitude;
      longitude = coords.longitude;
    } catch (error) {
      console.warn('Geocoding failed:', error.message);
    }
  }

  try {
    // UPDATED: Store multiple images as JSON
    const imagesJson = JSON.stringify(imageUrls);
    
    // Use direct query since your SP might not support multiple images yet
    const [directResult] = await pool.query(`
      INSERT INTO listings (
        host_id, title, description, price_per_night, location,
        image_url, images, video_url, latitude, longitude,
        max_guests, bedrooms, bathrooms, amenities, house_rules,
        status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      hostId, title, description, price_per_night, location,
      imageUrls[0] || null, // Keep first image in image_url for legacy
      imagesJson,           // Store all images as JSON
      videoUrl, latitude, longitude,
      max_guests || 2, bedrooms || 1, bathrooms || 1.0,
      amenities || '', house_rules || '', 'active'
    ]);

    const listingId = directResult.insertId;
    console.log('✅ Listing created successfully with ID:', listingId);

    res.status(201).json({
      status: 'success',
      message: 'Listing created successfully',
      data: {
        listingId,
        title,
        location,
        pricePerNight: price_per_night,
        images: imageUrls,
        videoUrl,
        hasCoordinates: !!(latitude && longitude)
      }
    });

  } catch (dbError) {
    console.error('❌ Database error creating listing:', dbError);
    throw dbError;
  }
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

// backend/controllers/listingController.js
exports.getListingById = catchAsync(async (req, res, next) => {
  const listingId = req.params.id;

  if (!listingId || isNaN(listingId)) {
    return next(new AppError('Valid listing ID is required', 400));
  }

  // ✅ Direct query instead of stored procedure
  const [rows] = await pool.query(`
    SELECT 
      l.*,
      u.name as host_name,
      u.email as host_email,
      u.bio as host_bio,
      u.profile_picture as host_profile_picture,  -- ✅ Includes profile picture
      u.created_at as host_created_at,
      COUNT(DISTINCT r.id) as total_reviews,
      AVG(r.rating) as average_rating
    FROM listings l
    LEFT JOIN users u ON l.host_id = u.id
    LEFT JOIN bookings b ON l.id = b.listing_id
    LEFT JOIN reviews r ON b.id = r.booking_id AND r.type = 'listing'
    WHERE l.id = ?
    GROUP BY l.id
  `, [listingId]);

  const listing = rows[0];

  if (!listing) {
    return next(new AppError('Listing not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { listing }
  });
});

exports.getListingsByHost = catchAsync(async (req, res, next) => {
  const hostId = req.user.id;
  const role = req.user.role;

  if (role !== 'host') {
    return next(new AppError('Only hosts can view their listings', 403));
  }

  try {
    const [rows] = await pool.query('CALL sp_get_listings_by_host(?)', [hostId]);

    res.status(200).json({
      status: 'success',
      results: rows[0].length,
      data: { listings: rows[0] }
    });

  } catch (dbError) {
    if (dbError.code === 'ER_SP_DOES_NOT_EXIST') {
      // Fallback to direct query
      const [rows] = await pool.query('SELECT * FROM listings WHERE host_id = ?', [hostId]);
      
      return res.status(200).json({
        status: 'success',
        results: rows.length,
        data: { listings: rows }
      });
    }
    throw dbError;
  }
});

// FIXED updateListing function for listingsController.js
exports.updateListing = catchAsync(async (req, res, next) => {
  const listingId = req.params.id;
  const hostId = req.user.id;
  
  console.log('🔧 Update request:', {
    listingId,
    body: req.body,
    files: req.files
  });

  // Verify ownership
  const [existingListing] = await pool.query(
    'SELECT host_id, images FROM listings WHERE id = ?', [listingId]
  );
  
  if (!existingListing.length) {
    return next(new AppError('Listing not found', 404));
  }
  
  if (existingListing[0].host_id !== hostId) {
    return next(new AppError('You can only update your own listings', 403));
  }

  // Build update data
  const updateFields = {};
  const allowedFields = [
    'title', 'description', 'price_per_night', 'location', 'latitude', 'longitude',
    'max_guests', 'bedrooms', 'bathrooms', 'amenities', 'house_rules', 'status'
  ];

  // Add text fields
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined && req.body[field] !== '') {
      updateFields[field] = req.body[field];
    }
  });

  // UPDATED: Handle multiple new images
  if (req.files && req.files.images) {
    const imageFiles = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
    const newImageUrls = imageFiles.map(file => `/uploads/${file.filename}`);
    
    // Get existing images
    const existingImages = existingListing[0].images ? JSON.parse(existingListing[0].images) : [];
    
    // Combine existing + new (limit to 4)
    const allImages = [...existingImages, ...newImageUrls].slice(0, 4);
    
    updateFields.images = JSON.stringify(allImages);
    updateFields.image_url = allImages[0]; // Keep first image for legacy
    
    console.log(`📁 Updated images: ${allImages.length} total`);
  }

  // Handle video
  if (req.files && req.files.video && req.files.video[0]) {
    updateFields.video_url = `/uploads/${req.files.video[0].filename}`;
    console.log('🎥 Video updated');
  }

  // Build dynamic SQL
  const setClause = Object.keys(updateFields).map(field => `${field} = ?`).join(', ');
  const values = [...Object.values(updateFields), listingId, hostId];

  const [result] = await pool.query(
    `UPDATE listings SET ${setClause}, updated_at = NOW() WHERE id = ? AND host_id = ?`,
    values
  );

  res.json({
    status: 'success',
    message: 'Listing updated successfully',
    data: {
      listingId: parseInt(listingId),
      affectedRows: result.affectedRows,
      updatedFields: updateFields
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

  const [result] = await pool.query(
    'DELETE FROM listings WHERE id = ? AND host_id = ?',
    [id, hostId]
  );

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

exports.requestViewUnit = catchAsync(async (req, res, next) => {
  const clientId = req.user.id;
  const { listingId } = req.params;
  const { message, preferred_date, preferred_time } = req.body;

  // Input validation
  if (!preferred_date || !preferred_time) {
    return next(new AppError('Preferred date and time are required', 400));
  }

  if (!listingId || isNaN(listingId)) {
    return next(new AppError('Valid listing ID is required', 400));
  }

  // Check if listing exists
  const [listings] = await pool.query('SELECT * FROM listings WHERE id = ?', [listingId]);
  if (!listings.length) {
    return next(new AppError('Listing not found', 404));
  }

  const listing = listings[0];

  // Can't request to view own listing
  if (listing.host_id === clientId) {
    return next(new AppError('Cannot request to view your own listing', 400));
  }

  // Check for existing pending request
  const [existingRequest] = await pool.query(
    'SELECT id FROM view_requests WHERE listing_id = ? AND client_id = ? AND status = "pending"',
    [listingId, clientId]
  );
  
  if (existingRequest.length > 0) {
    return next(new AppError('You already have a pending request for this listing', 400));
  }

  // Create view request
  const [result] = await pool.query(
    `INSERT INTO view_requests (listing_id, client_id, host_id, message, preferred_date, preferred_time, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
    [listingId, clientId, listing.host_id, message || '', preferred_date, preferred_time]
  );

  // Notify host
  await pool.query(
    `INSERT INTO notifications (user_id, message, type, created_at)
     VALUES (?, ?, 'view_request', NOW())`,
    [listing.host_id, `New viewing request for "${listing.title}"`]
  );

  console.log('✅ View request created:', {
    requestId: result.insertId,
    listingId,
    clientId,
    hostId: listing.host_id
  });

  res.status(201).json({
    status: 'success',
    message: 'View request sent successfully',
    data: {
      requestId: result.insertId,
      listingTitle: listing.title,
      preferredDate: preferred_date,
      preferredTime: preferred_time
    }
  });
});

exports.getViewRequests = catchAsync(async (req, res, next) => {
  const hostId = req.user.id;
  const role = req.user.role;

  // Verify user is a host
  if (role !== 'host') {
    return next(new AppError('Only hosts can view view requests', 403));
  }

  const { status } = req.query; // Optional filter by status

  let query = `
    SELECT 
      vr.id,
      vr.listing_id,
      vr.message,
      vr.preferred_date,
      vr.preferred_time,
      vr.status,
      vr.host_response,
      vr.created_at,
      vr.updated_at,
      u.name as client_name,
      u.email as client_email,
      u.phone as client_phone,
      u.id as client_id,
      l.title as listing_title,
      l.location as listing_location
    FROM view_requests vr
    JOIN users u ON vr.client_id = u.id
    JOIN listings l ON vr.listing_id = l.id
    WHERE vr.host_id = ?
  `;

  const queryParams = [hostId];

  // Add status filter if provided
  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    query += ' AND vr.status = ?';
    queryParams.push(status);
  }

  query += ' ORDER BY vr.created_at DESC';

  const [requests] = await pool.query(query, queryParams);

  res.status(200).json({
    status: 'success',
    results: requests.length,
    data: { 
      requests,
      filter: status || 'all'
    }
  });
});

exports.respondToViewRequest = catchAsync(async (req, res, next) => {
  const { requestId } = req.params;
  const { response, message } = req.body;
  const hostId = req.user.id;
  const role = req.user.role;

  // Verify user is a host
  if (role !== 'host') {
    return next(new AppError('Only hosts can respond to view requests', 403));
  }

  // Validate request ID
  if (!requestId || isNaN(requestId)) {
    return next(new AppError('Valid request ID is required', 400));
  }

  // Validate response
  if (!response || !['approved', 'rejected'].includes(response)) {
    return next(new AppError('Response must be either "approved" or "rejected"', 400));
  }

  // Verify request belongs to host and get request details
  const [requests] = await pool.query(`
    SELECT vr.*, l.title as listing_title
    FROM view_requests vr
    JOIN listings l ON vr.listing_id = l.id
    WHERE vr.id = ? AND vr.host_id = ?
  `, [requestId, hostId]);

  if (!requests.length) {
    return next(new AppError('View request not found or you do not have permission to respond', 404));
  }

  const request = requests[0];

  // Check if already responded
  if (request.status !== 'pending') {
    return next(new AppError(`Request has already been ${request.status}`, 400));
  }

  // Update request
  const [updateResult] = await pool.query(
    `UPDATE view_requests 
     SET status = ?, host_response = ?, updated_at = NOW()
     WHERE id = ?`,
    [response, message || '', requestId]
  );

  if (updateResult.affectedRows === 0) {
    return next(new AppError('Failed to update view request', 500));
  }

  // Create notification message
  const responseMessage = response === 'approved' 
    ? `Your viewing request for "${request.listing_title}" has been approved!${message ? ` Host says: ${message}` : ''}`
    : `Your viewing request for "${request.listing_title}" has been declined.${message ? ` Host says: ${message}` : ''}`;

  // Notify client
  await pool.query(
    `INSERT INTO notifications (user_id, message, type, created_at)
     VALUES (?, ?, 'view_response', NOW())`,
    [request.client_id, responseMessage]
  );

  console.log('✅ View request responded:', {
    requestId,
    response,
    listingTitle: request.listing_title,
    clientId: request.client_id
  });

  res.status(200).json({
    status: 'success',
    message: `View request ${response} successfully`,
    data: {
      requestId: parseInt(requestId),
      response,
      listingTitle: request.listing_title,
      clientNotified: true
    }
  });
});

// BONUS: Add a function to get client's own view requests
exports.getMyViewRequests = catchAsync(async (req, res, next) => {
  const clientId = req.user.id;
  const { status } = req.query; // Optional filter

  let query = `
    SELECT 
      vr.id,
      vr.listing_id,
      vr.message,
      vr.preferred_date,
      vr.preferred_time,
      vr.status,
      vr.host_response,
      vr.created_at,
      vr.updated_at,
      l.title as listing_title,
      l.location as listing_location,
      l.image_url,
      u.name as host_name,
      u.email as host_email
    FROM view_requests vr
    JOIN listings l ON vr.listing_id = l.id
    JOIN users u ON vr.host_id = u.id
    WHERE vr.client_id = ?
  `;

  const queryParams = [clientId];

  if (status && ['pending', 'approved', 'rejected'].includes(status)) {
    query += ' AND vr.status = ?';
    queryParams.push(status);
  }

  query += ' ORDER BY vr.created_at DESC';

  const [requests] = await pool.query(query, queryParams);

  res.status(200).json({
    status: 'success',
    results: requests.length,
    data: { 
      requests,
      filter: status || 'all'
    }
  });
});