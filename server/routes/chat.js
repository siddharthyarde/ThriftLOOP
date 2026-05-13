const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/authGuard');
const {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  markRead,
} = require('../controllers/chatController');

router.get('/conversations',               authGuard, getConversations);
router.post('/conversations',              authGuard, getOrCreateConversation);
router.get('/conversations/:id/messages',  authGuard, getMessages);
router.post('/conversations/:id/messages', authGuard, sendMessage);
router.put('/conversations/:id/read',      authGuard, markRead);

module.exports = router;
