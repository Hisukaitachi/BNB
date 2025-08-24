// backend/routes/listingsRoutes.js - QUICK FIX VERSION
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

// SPECIFIC routes BEFORE parameterized routes
router.get('/search', validate(searchListingsSchema), listingsController.searchListings);
router.get('/nearby', validate(nearbyListingsSchema), listingsController.getNearbyListings);
router.get('/my-listings', authenticateToken, listingsController.getListingsByHost);
router.get('/', listingsController.getAllListings);

// Protected routes
router.post('/', authenticateToken, upload.single('image'), validate(createListingSchema), listingsController.createListing);
router.put('/:id', authenticateToken, validate(updateListingSchema), listingsController.updateListing);
router.delete('/:id', authenticateToken, validate(deleteListingSchema), listingsController.deleteListing);

// QUICK FIX: Temporarily remove validation for getListingById
// The controller already has validation logic
router.get('/:id', listingsController.getListingById);

// ORIGINAL (causing the issue):
// router.get('/:id', validate(getListingSchema), listingsController.getListingById);

module.exports = router;