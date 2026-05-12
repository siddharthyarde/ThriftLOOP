const crypto = require('crypto');

/**
 * Generate a one-time QR hash for meetup escrow.
 * Hash = SHA256 of listingId:transactionId:timestamp
 */
const generateMeetupQR = (listingId, transactionId) => {
  const payload = `${listingId}:${transactionId}:${Date.now()}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
};

/** Verify a QR hash matches the stored hash for a meetup. */
const verifyMeetupQR = (inputHash, storedHash) => inputHash === storedHash;

module.exports = { generateMeetupQR, verifyMeetupQR };
