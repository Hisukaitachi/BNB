// reviewsController.js using Stored Procedures
const pool = require('../db');

// ========== CREATE REVIEW ==========
exports.createReview = async (req, res) => {
  const { booking_id, reviewee_id, rating, comment, type } = req.body;
  const reviewer_id = req.user.id;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5' });
  }

  if (!comment || comment.length < 5 || comment.length > 300) {
    return res.status(400).json({ message: 'Comment must be 5-300 characters long' });
  }

  try {
    const [result] = await pool.query(
      'CALL sp_create_review_safe(?, ?, ?, ?, ?, ?)',
      [booking_id, reviewer_id, reviewee_id, rating, comment, type]
    );

    res.status(201).json({ message: 'Review created successfully' });
  } catch (err) {
    if (err.errno === 1644) {
      return res.status(400).json({ message: err.sqlMessage }); // custom SIGNAL error
    }
    console.error(err);
    res.status(500).json({ message: 'Failed to create review', error: err.message });
  }
};

// ========== GET ALL REVIEWS (ADMIN) ==========
exports.getAllReviews = async (req, res) => {
  try {
    const [reviews] = await pool.query('CALL sp_get_all_reviews()');
    res.json(reviews[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch reviews', error: err.message });
  }
};

// ========== GET REVIEWS FOR A LISTING ==========
exports.getReviewsForListing = async (req, res) => {
  const listingId = req.params.id;
  try {
    const [reviews] = await pool.query('CALL sp_get_reviews_for_listing(?)', [listingId]);
    res.json(reviews[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch listing reviews', error: err.message });
  }
};

// ========== GET MY REVIEWS ==========
exports.getMyReviews = async (req, res) => {
  const userId = req.user.id;
  try {
    const [written] = await pool.query('CALL sp_get_my_written_reviews(?)', [userId]);
    const [received] = await pool.query('CALL sp_get_my_received_reviews(?)', [userId]);
    res.json({ written: written[0], received: received[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch user reviews', error: err.message });
  }
};

// ========== DELETE REVIEW ==========
exports.deleteReview = async (req, res) => {
  const reviewId = req.params.id;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    const [rows] = await pool.query('CALL sp_get_review_by_id(?)', [reviewId]);
    const review = rows[0][0];

    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (userRole !== 'admin' && review.reviewer_id !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }

    await pool.query('CALL sp_delete_review(?)', [reviewId]);
    res.json({ message: 'Review deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete review', error: err.message });
  }
};
