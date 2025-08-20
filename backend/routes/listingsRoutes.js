// backend/routes/listingsRoutes.js - Updated with validation
const express = require('express');
const router = express.Router();
const listingsController = require('../controllers/listingsController');
const { authenticateToken } = require('../middleware/auth'); 
const upload = require('../middleware/multer');
const { validate } = require('../middleware/validation');

// Import validation schemas
const {
  createListingSchema,
  updateListingSchema,
  searchListingsSchema,
  nearbyListingsSchema,
  getListingSchema,
  deleteListingSchema
} = require('../validation/listingValidation');

// Public routes with validation
router.get('/search', validate(searchListingsSchema), listingsController.searchListings);
router.get('/nearby', validate(nearbyListingsSchema), listingsController.getNearbyListings);
router.get('/', listingsController.getAllListings);
router.get('/:id', validate(getListingSchema), listingsController.getListingById);

// Protected routes with validation
router.post('/', authenticateToken, upload.single('image'), validate(createListingSchema), listingsController.createListing);
router.get('/my-listings', authenticateToken, listingsController.getListingsByHost);
router.put('/:id', authenticateToken, validate(updateListingSchema), listingsController.updateListing);
router.delete('/:id', authenticateToken, validate(deleteListingSchema), listingsController.deleteListing);

module.exports = router;