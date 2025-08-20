const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/favoritesController');
const { authenticateToken } = require('../middleware/auth');

router.post('/:listingId', authenticateToken, favoritesController.addFavorite);
router.get('/', authenticateToken, favoritesController.getFavorites);
router.delete('/:listingId', authenticateToken, favoritesController.removeFavorite);

module.exports = router;
