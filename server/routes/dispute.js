const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/authGuard');
const {
  fileDispute,
  getMyDisputes,
  getDisputeById,
  uploadEvidence,
  getAdminDisputes,
  resolveDispute,
} = require('../controllers/disputeController');

router.post('/',             authGuard, fileDispute);
router.get('/me',            authGuard, getMyDisputes);
router.get('/admin/all',     authGuard, getAdminDisputes);
router.get('/:id',           authGuard, getDisputeById);
router.post('/:id/evidence', authGuard, uploadEvidence);
router.put('/:id/resolve',   authGuard, resolveDispute);

module.exports = router;
