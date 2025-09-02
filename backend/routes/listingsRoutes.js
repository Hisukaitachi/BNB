// backend/routes/listingsRoutes.js - FIXED VERSION
const express = require('express');
const router = express.Router();
const listingsController = require('../controllers/listingsController');
const { authenticateToken } = require('../middleware/auth'); 
const { uploadFields } = require('../middleware/multer'); // FIXED: Import the fields upload

// Import validation schemas and validation middleware
const {
  createListingSchema,
  updateListingSchema,
  searchListingsSchema,
  nearbyListingsSchema,
  getListingSchema,
  deleteListingSchema
} = require('../validation/listingValidation');
const { validate } = require('../middleware/validation');

// Debug middleware for listings routes
router.use((req, res, next) => {
  console.log('🔍 Listings Route Debug:', {
    method: req.method,
    url: req.originalUrl,
    contentType: req.headers['content-type'],
    bodyKeys: Object.keys(req.body || {}),
    filesCount: req.files ? Object.keys(req.files).length : 0
  });
  next();
});

// SPECIFIC routes BEFORE parameterized routes (order matters!)
router.get('/search', validate(searchListingsSchema), listingsController.searchListings);
router.get('/nearby', validate(nearbyListingsSchema), listingsController.getNearbyListings);
router.get('/my-listings', authenticateToken, listingsController.getListingsByHost);

// FIXED: Use uploadFields with your validation
router.post('/', 
  authenticateToken, 
  uploadFields, // This handles both 'image' and 'video' fields
  (req, res, next) => {
    console.log('📁 Files received:', req.files);
    console.log('📝 Body received:', req.body);
    next();
  },
  validate(createListingSchema),
  listingsController.createListing
);

// Update and delete routes with validation
router.put('/:id', authenticateToken, validate(updateListingSchema), listingsController.updateListing);
router.delete('/:id', authenticateToken, validate(deleteListingSchema), listingsController.deleteListing);

// Additional feature routes
router.post('/:listingId/view-request', authenticateToken, listingsController.requestViewUnit);
router.get('/view-requests', authenticateToken, listingsController.getViewRequests);  
router.put('/view-requests/:requestId', authenticateToken, listingsController.respondToViewRequest);

// IMPORTANT: Keep general routes LAST with validation
router.get('/', listingsController.getAllListings);
router.get('/:id', validate(getListingSchema), listingsController.getListingById);

module.exports = router;