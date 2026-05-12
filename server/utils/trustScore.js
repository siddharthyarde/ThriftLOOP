const supabase = require('../services/supabase');

/**
 * Recalculate trust score for a user.
 * Called after every completed transaction, dispute resolution, or vouch.
 *
 * Formula:
 *   base        = completed_transactions * 0.5   (max 25)
 *   dispute_pen = disputes_against * -2          (penalty)
 *   vouch_bonus = vouches_received * 1           (max 5)
 *   verified    = +1 if verified
 *   Final score clamped 0–5
 */
const recalculateTrustScore = async (userId) => {
  try {
    const [{ data: user }, { data: completedTxns }, { data: disputes }, { data: vouches }] =
      await Promise.all([
        supabase.from('users').select('verified').eq('id', userId).single(),
        supabase.from('transactions')
          .select('id', { count: 'exact' })
          .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
          .eq('status', 'completed'),
        supabase.from('disputes')
          .select('id', { count: 'exact' })
          .eq('against', userId)
          .eq('status', 'resolved'),
        supabase.from('vouches')
          .select('id', { count: 'exact' })
          .eq('vouchee_id', userId),
      ]);

    const completedCount = completedTxns?.length || 0;
    const disputeCount   = disputes?.length     || 0;
    const vouchCount     = vouches?.length       || 0;
    const isVerified     = user?.verified        || false;

    const base        = Math.min(completedCount * 0.5, 25);
    const disputePen  = disputeCount * 2;
    const vouchBonus  = Math.min(vouchCount, 5);
    const verifyBonus = isVerified ? 1 : 0;

    const raw   = base - disputePen + vouchBonus + verifyBonus;
    const score = Math.max(0, Math.min(5, parseFloat(raw.toFixed(2))));

    await supabase.from('users').update({ trust_score: score }).eq('id', userId);

    return score;
  } catch (err) {
    console.error('Trust score recalc error:', err.message);
  }
};

module.exports = { recalculateTrustScore };
