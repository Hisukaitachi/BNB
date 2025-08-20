// src/routes/reviewsRoutes.js
const express = require('express');
const router = express.Router();
const reviewsController = require('../controllers/reviewsController');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, reviewsController.createReview);
router.get('/my-reviews', authenticateToken, reviewsController.getMyReviews);
router.get('/listing/:id', reviewsController.getReviewsForListing);
router.get('/', authenticateToken, reviewsController.getAllReviews);
router.delete('/:id', authenticateToken, reviewsController.deleteReview);

module.exports = router;
