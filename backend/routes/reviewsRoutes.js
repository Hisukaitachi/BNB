// src/routes/reviewsRoutes.js
const express = require('express');
const router = express.Router();
const reviewsController = require('../controllers/reviewsController');
const auth = require('../middleware/auth');

router.post('/', auth, reviewsController.createReview);
router.get('/my-reviews', auth, reviewsController.getMyReviews);
router.get('/listing/:id', reviewsController.getReviewsForListing);
router.get('/', auth, reviewsController.getAllReviews);
router.delete('/:id', auth, reviewsController.deleteReview);

module.exports = router;
