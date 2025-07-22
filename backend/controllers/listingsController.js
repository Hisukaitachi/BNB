const path = require('path');
const pool = require('../db');



exports.createListing = async (req, res) => {
  const hostId = req.user.id;
  const role = req.user.role;
  const { title, description, price_per_night, location } = req.body;

  if (role !== 'host') {
    return res.status(403).json({ message: 'Only hosts can create listings' });
  }

  const imageUrl = req.files?.image ? `/uploads/${req.files.image[0].filename}` : null;
  const videoUrl = req.files?.video ? `/uploads/${req.files.video[0].filename}` : null;

  try {
    const [result] = await pool.query(
      'CALL sp_create_listing(?, ?, ?, ?, ?, ?, ?)',
      [hostId, title, description, price_per_night, location, imageUrl, videoUrl]
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
  const { title, description, price_per_night, location } = req.body;

  try {
    const [result] = await pool.query(
      'CALL sp_update_listing(?, ?, ?, ?, ?)',
      [listingId, title, description, price_per_night, location]
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
  const { city, price_min, price_max, keyword, page = 1, limit = 10, sortBy = 'created_at', order = 'DESC' } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = 'SELECT * FROM listings WHERE 1=1';
  const queryParams = [];

  if (city) {
    query += ' AND location LIKE ?';
    queryParams.push(`%${city}%`);
  }
  if (price_min) {
    query += ' AND price_per_night >= ?';
    queryParams.push(price_min);
  }
  if (price_max) {
    query += ' AND price_per_night <= ?';
    queryParams.push(price_max);
  }
  if (keyword) {
    query += ' AND (title LIKE ? OR description LIKE ?)';
    queryParams.push(`%${keyword}%`, `%${keyword}%`);
  }

  const validSortFields = ['price_per_night', 'created_at'];
  if (validSortFields.includes(sortBy)) {
    query += ` ORDER BY ${sortBy} ${order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}`;
  }

  query += ' LIMIT ? OFFSET ?';
  queryParams.push(parseInt(limit), offset);

  try {
    const [listings] = await pool.query(query, queryParams);
    res.json(listings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching filtered listings', error: err.message });
  }
};
