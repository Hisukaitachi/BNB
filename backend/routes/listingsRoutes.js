const express = require('express');
const router = express.Router();
const listingsController = require('../controllers/listingsController');
const auth = require('../middleware/auth');
const upload = require('../middleware/multer');

router.get('/search', listingsController.searchListings);
router.post('/', auth, upload.single('image'), listingsController.createListing); // Updated
router.get('/', listingsController.getAllListings);
router.get('/my-listings', auth, listingsController.getListingsByHost);
router.get('/:id', listingsController.getListingById);
router.put('/:id', auth, listingsController.updateListing);
router.delete('/:id', auth, listingsController.deleteListing);
router.get('/nearby', listingsController.getNearbyListings);

module.exports = router;
