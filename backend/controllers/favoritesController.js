const db = require('../db');

exports.addFavorite = async (req, res) => {
  const userId = req.user.id;
  const listingId = req.params.listingId;

  try {
    await db.query(
      'INSERT IGNORE INTO favorites (user_id, listing_id) VALUES (?, ?)',
      [userId, listingId]
    );
    res.status(201).json({ message: 'Added to favorites' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add favorite', error: err.message });
  }
};

exports.getFavorites = async (req, res) => {
  const userId = req.user.id;

  try {
    const [rows] = await db.query(
      `SELECT l.* FROM listings l
       JOIN favorites f ON l.id = f.listing_id
       WHERE f.user_id = ?`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch favorites', error: err.message });
  }
};

exports.removeFavorite = async (req, res) => {
  const userId = req.user.id;
  const listingId = req.params.listingId;

  try {
    await db.query(
      'DELETE FROM favorites WHERE user_id = ? AND listing_id = ?',
      [userId, listingId]
    );
    res.json({ message: 'Removed from favorites' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to remove favorite', error: err.message });
  }
};
