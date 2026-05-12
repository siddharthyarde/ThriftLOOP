const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/authGuard');
const {
  getListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  incrementView,
  getTrending,
  getPriceSuggestion,
  getMyListings,
  delistListing,
} = require('../controllers/listingController');

// Public
router.get('/',          getListings);
router.get('/trending',  getTrending);

// Protected (must come before '/:id' so 'me' isn't treated as an id)
router.get('/me/all',                authGuard, getMyListings);

router.get('/:id',                   getListingById);
router.post('/:id/view',             incrementView);
router.post('/',                     authGuard, createListing);
router.put('/:id',                   authGuard, updateListing);
router.delete('/:id',                authGuard, deleteListing);
router.put('/:id/delist',            authGuard, delistListing);
router.get('/:id/price-suggestion',  authGuard, getPriceSuggestion);

module.exports = router;
