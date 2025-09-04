// backend/routes/listingsRoutes.js - TEMPORARY VERSION (NO VALIDATION)
const express = require('express');
const router = express.Router();
const listingsController = require('../controllers/listingsController');
const { authenticateToken } = require('../middleware/auth'); 
const { uploadFields } = require('../middleware/multer');

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
router.get('/search', listingsController.searchListings);
router.get('/nearby', listingsController.getNearbyListings);
router.get('/my-listings', authenticateToken, listingsController.getListingsByHost);

// Create listing with file upload (temporarily no validation)
router.post('/', 
  authenticateToken, 
  uploadFields,
  (req, res, next) => {
    console.log('📁 Create - Files received:', req.files);
    console.log('📝 Create - Body received:', req.body);
    next();
  },
  listingsController.createListing
);

// FIXED: Update route with file upload support and debug middleware
router.put('/:id', 
  authenticateToken, 
  uploadFields, // Handle file uploads for updates
  (req, res, next) => {
    console.log('🔧 Update Debug:', {
      listingId: req.params.id,
      params: req.params,
      body: req.body,
      bodyKeys: Object.keys(req.body || {}),
      files: req.files,
      contentType: req.headers['content-type']
    });
    next();
  },
  listingsController.updateListing
);

// Delete route (temporarily no validation)
router.delete('/:id', authenticateToken, listingsController.deleteListing);

// Additional feature routes
router.post('/:listingId/view-request', authenticateToken, listingsController.requestViewUnit);
router.get('/view-requests', authenticateToken, listingsController.getViewRequests);  
router.put('/view-requests/:requestId', authenticateToken, listingsController.respondToViewRequest);

// IMPORTANT: Keep general routes LAST
router.get('/', listingsController.getAllListings);
router.get('/:id', listingsController.getListingById);

module.exports = router;