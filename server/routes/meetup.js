const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/authGuard');
const {
  getMeetup,
  confirmMeetup,
  fileNoShow,
  startGraceTimer,
} = require('../controllers/meetupController');

router.get('/:transactionId', authGuard, getMeetup);
router.post('/confirm',       authGuard, confirmMeetup);
router.post('/noshow',        authGuard, fileNoShow);
router.post('/start-grace',   authGuard, startGraceTimer);

module.exports = router;
