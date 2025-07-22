const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/favoritesController');
const authenticate = require('../middleware/auth');

router.post('/:listingId', authenticate, favoritesController.addFavorite);
router.get('/', authenticate, favoritesController.getFavorites);
router.delete('/:listingId', authenticate, favoritesController.removeFavorite);

module.exports = router;
