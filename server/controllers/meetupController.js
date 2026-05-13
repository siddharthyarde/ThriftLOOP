const supabase = require('../services/supabase');
const { verifyMeetupQR } = require('../utils/qrGenerator');
const { recalculateTrustScore } = require('../utils/trustScore');
const { logSustainability } = require('../utils/sustainability');

const getMeetup = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const { data, error } = await supabase
      .from('meetups').select('*').eq('transaction_id', transactionId).single();

    if (error || !data) return res.status(404).json({ error: 'Meetup not found' });
    res.json(data);
  } catch (err) { next(err); }
};

const startGraceTimer = async (req, res, next) => {
  try {
    const { transaction_id } = req.body;

    const { data: meetup } = await supabase
      .from('meetups').select('*').eq('transaction_id', transaction_id).single();

    if (!meetup) return res.status(404).json({ error: 'Meetup not found' });
    if (meetup.grace_timer_start) return res.json({ message: 'Already started', meetup });

    const { data: updated } = await supabase
      .from('meetups')
      .update({ status: 'active', grace_timer_start: new Date().toISOString() })
      .eq('id', meetup.id)
      .select()
      .single();

    const { data: txn } = await supabase.from('transactions')
      .select('buyer_id,seller_id').eq('id', transaction_id).single();

    await supabase.from('notifications').insert([
      { user_id: txn.buyer_id,  type: 'meetup_grace_start', title: '⏱ 15-minute window started', content: 'Scan the QR code when you meet the seller.', metadata: { transaction_id } },
      { user_id: txn.seller_id, type: 'meetup_grace_start', title: '⏱ 15-minute window started', content: 'Waiting for buyer to scan QR code.', metadata: { transaction_id } },
    ]);

    res.json(updated);
  } catch (err) { next(err); }
};

const confirmMeetup = async (req, res, next) => {
  try {
    const { qr_hash, transaction_id } = req.body;

    const { data: meetup } = await supabase
      .from('meetups').select('*').eq('transaction_id', transaction_id).single();

    if (!meetup) return res.status(404).json({ error: 'Meetup not found' });
    if (meetup.qr_used) return res.status(400).json({ error: 'QR already used' });
    if (!verifyMeetupQR(qr_hash, meetup.qr_code)) {
      return res.status(400).json({ error: 'Invalid QR code' });
    }

    if (meetup.grace_timer_start) {
      const elapsed = Date.now() - new Date(meetup.grace_timer_start).getTime();
      if (elapsed > 15 * 60 * 1000) {
        return res.status(400).json({ error: 'Grace period has expired. File a no-show instead.' });
      }
    }

    await supabase.from('meetups')
      .update({ status: 'completed', qr_used: true })
      .eq('id', meetup.id);

    const returnWindowEnd = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data: txn } = await supabase
      .from('transactions')
      .update({
        status: 'completed',
        escrow_status: 'released',
        completed_at: new Date().toISOString(),
        return_window_end: returnWindowEnd,
      })
      .eq('id', transaction_id)
      .select()
      .single();

    await supabase.from('listings').update({ status: 'sold' }).eq('id', txn.listing_id);

    const { data: listing } = await supabase.from('listings').select('category').eq('id', txn.listing_id).single();
    if (listing) await logSustainability(txn.id, listing.category);

    await recalculateTrustScore(txn.buyer_id);
    await recalculateTrustScore(txn.seller_id);

    res.json({ success: true, message: 'Meetup confirmed! Escrow released.' });
  } catch (err) { next(err); }
};

const fileNoShow = async (req, res, next) => {
  try {
    const { transaction_id, filed_by_role } = req.body;

    const { data: txn } = await supabase.from('transactions').select('*').eq('id', transaction_id).single();
    const { data: meetup } = await supabase.from('meetups').select('*').eq('transaction_id', transaction_id).single();

    if (!txn || !meetup) return res.status(404).json({ error: 'Not found' });

    const isParty = txn.buyer_id === req.user.id || txn.seller_id === req.user.id;
    if (!isParty) return res.status(403).json({ error: 'Forbidden' });

    if (meetup.grace_timer_start) {
      const elapsed = Date.now() - new Date(meetup.grace_timer_start).getTime();
      if (elapsed < 15 * 60 * 1000) {
        return res.status(400).json({ error: 'Grace period not yet expired (15 min)' });
      }
    }

    const isBuyer = filed_by_role === 'buyer';
    const meetupStatus    = isBuyer ? 'seller_noshow' : 'buyer_noshow';
    const penalizedUserId = isBuyer ? txn.seller_id   : txn.buyer_id;

    await supabase.from('meetups').update({
      status: meetupStatus,
      noshow_filed_by: req.user.id,
    }).eq('id', meetup.id);

    await supabase.from('transactions').update({
      status: 'cancelled',
      escrow_status: 'refunded',
    }).eq('id', transaction_id);

    await supabase.from('listings').update({ status: 'active', reserved_for: null }).eq('id', txn.listing_id);

    const { data: flaggedUser } = await supabase.from('users').select('trust_score').eq('id', penalizedUserId).single();
    const newScore = Math.max(0, (flaggedUser?.trust_score || 0) - 0.5);
    await supabase.from('users').update({ trust_score: newScore }).eq('id', penalizedUserId);

    res.json({ success: true, meetupStatus, message: 'No-show filed. Escrow refunded, listing reactivated.' });
  } catch (err) { next(err); }
};

module.exports = { getMeetup, confirmMeetup, fileNoShow, startGraceTimer };
