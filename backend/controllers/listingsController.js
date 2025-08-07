const path = require('path');
const pool = require('../db');


exports.createListing = async (req, res) => {
  const hostId = req.user.id;
  const role = req.user.role;
  let { title, description, price_per_night, location, latitude, longitude } = req.body;

  if (role !== 'host') {
    return res.status(403).json({ message: 'Only hosts can create listings' });
  }

  // If latitude or longitude are missing, try to geocode
  if (!latitude || !longitude) {
    const coords = await getCoordinatesFromLocation(location);
    latitude = coords.latitude;
    longitude = coords.longitude;
  }

  const imageUrl = req.files?.image ? `/uploads/${req.files.image[0].filename}` : null;
  const videoUrl = req.files?.video ? `/uploads/${req.files.video[0].filename}` : null;

  try {
    const [result] = await pool.query(
      'CALL sp_create_listing(?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [hostId, title, description, price_per_night, location, imageUrl, videoUrl, latitude, longitude]
    );

    res.status(201).json({ message: 'Listing created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create listing', error: error.message });
  }
};

exports.getAllListings = async (req, res) => {
  try {
    const [results] = await pool.query('CALL sp_get_all_listings()');
    const listings = results[0]; 

    res.json({ listings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch listings', error: err.message });
  }
};

exports.getListingById = async (req, res) => {
  const listingId = req.params.id;

  try {
    const [result] = await pool.query('CALL sp_get_listing_by_id(?)', [listingId]);

    const listing = result[0][0]; 

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }
    console.log('SP result:', result);
    res.json(listing);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch listing', error: error.message });
  }

};

exports.getListingsByHost = async (req, res) => {
  const hostId = req.user.id;
  const role = req.user.role;

  if (role !== 'host') {
    return res.status(403).json({ message: 'Only hosts can view their listings' });
  }

  try {
    const [rows] = await pool.query('CALL sp_get_listings_by_host(?)', [hostId]);
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch host listings', error: error.message });
  }

  console.log('req.user:', req.user);

};

exports.updateListing = async (req, res) => {
  const listingId = req.params.id;
  let { title, description, price_per_night, location, latitude, longitude } = req.body;

  try {
    // If lat/lng not provided, attempt to geocode
    if (!latitude || !longitude) {
      const coords = await getCoordinatesFromLocation(location);
      latitude = coords.latitude;
      longitude = coords.longitude;
    }

    // Call stored procedure
    const [result] = await pool.query(
      'CALL sp_update_listing(?, ?, ?, ?, ?, ?, ?)',
      [listingId, title, description, price_per_night, location, latitude, longitude]
    );

    res.json({ message: 'Listing updated successfully' });
  } catch (error) {
    console.error('Error updating listing:', error);
    res.status(500).json({ message: 'Failed to update listing', error: error.message });
  }
};

exports.deleteListing = async (req, res) => {
  const hostId = req.user.id;
  const role = req.user.role;
  const { id } = req.params;

  if (role !== 'host') {
    return res.status(403).json({ message: 'Only hosts can delete listings' });
  }

  try {
    const [result] = await pool.query('CALL sp_delete_listing(?, ?)', [id, hostId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Listing not found or not owned by you' });
    }

    res.json({ message: 'Listing deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete listing', error: error.message });
  }
};

exports.searchListings = async (req, res) => {
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
  if (price_min) {
    baseQuery += ' AND l.price_per_night >= ?';
    queryParams.push(price_min);
    countParams.push(price_min);
  }
  if (price_max) {
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
  if (min_rating) {
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

  try {
    const [listings] = await pool.query(listingsQuery, queryParams);
    const [countResult] = await pool.query(countQuery, countParams);

    res.json({
      listings,
      total: countResult[0].total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ message: 'Error fetching listings', error: err.message });
  }
};

exports.getNearbyListings = async (req, res) => {
  const { lat, lng } = req.query;
  const radius = 10; // 10 km radius

  try {
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

    res.json({ listings: results });
  } catch (error) {
    console.error("Nearby listings error:", error);
    res.status(500).json({ message: "Failed to fetch nearby listings", error: error.message });
  }
};
