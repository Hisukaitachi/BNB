// backend/routes/reviewsRoutes.js - TEMPORARY VERSION (no validation)
const express = require('express');
const router = express.Router();
const reviewsController = require('../controllers/reviewsController');
const { authenticateToken } = require('../middleware/auth');

// Temporarily remove ALL validation to test if controllers work
router.post('/', authenticateToken, reviewsController.createReview);
router.get('/my-reviews', authenticateToken, reviewsController.getMyReviews);
router.delete('/:id', authenticateToken, reviewsController.deleteReview);
router.get('/', authenticateToken, reviewsController.getAllReviews);

// NO VALIDATION - Test if this works
router.get('/listing/:id', reviewsController.getReviewsForListing);

module.exports = router;