const supabase = require('../services/supabase');

const fileDispute = async (req, res, next) => {
  try {
    const { transaction_id, type, description, evidence_photos } = req.body;
    const userId = req.user.id;

    const { data: txn } = await supabase.from('transactions').select('*').eq('id', transaction_id).single();
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });

    const isParty = txn.buyer_id === userId || txn.seller_id === userId;
    if (!isParty) return res.status(403).json({ error: 'Not your transaction' });

    if (txn.return_window_end && new Date() > new Date(txn.return_window_end)) {
      return res.status(400).json({ error: 'Return window has expired (24hr limit)' });
    }

    const { data: existing } = await supabase
      .from('disputes').select('id')
      .eq('transaction_id', transaction_id)
      .neq('status', 'resolved')
      .single();

    if (existing) return res.status(409).json({ error: 'A dispute already exists for this transaction' });

    const against = txn.buyer_id === userId ? txn.seller_id : txn.buyer_id;

    const { data: listing } = await supabase
      .from('listings').select('images, created_at').eq('id', txn.listing_id).single();

    const { data: dispute, error } = await supabase
      .from('disputes')
      .insert({
        transaction_id,
        type,
        filed_by: userId,
        against,
        description,
        evidence_filer: evidence_photos || [],
        listing_photo: listing?.images?.[0] || null,
        listing_photo_timestamp: listing?.created_at || null,
        complaint_photo_timestamp: new Date().toISOString(),
        status: 'open',
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    await supabase.from('transactions').update({ status: 'disputed' }).eq('id', transaction_id);

    await supabase.from('notifications').insert([
      {
        user_id: against,
        type: 'dispute_update',
        title: 'A dispute was filed against you',
        content: `Dispute type: ${type}. Upload your evidence within 48 hours.`,
        metadata: { dispute_id: dispute.id, transaction_id },
      },
    ]);

    res.status(201).json(dispute);
  } catch (err) { next(err); }
};

const getMyDisputes = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { data, error } = await supabase
      .from('disputes')
      .select(`*, transactions(*, listings(id, title, images))`)
      .or(`filed_by.eq.${userId},against.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) { next(err); }
};

const getDisputeById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { data, error } = await supabase
      .from('disputes')
      .select(`*, transactions(*, listings(*))`)
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Not found' });

    const isAdmin = req.profile?.role === 'admin';
    const isParty = data.filed_by === userId || data.against === userId;
    if (!isAdmin && !isParty) return res.status(403).json({ error: 'Forbidden' });

    res.json(data);
  } catch (err) { next(err); }
};

const uploadEvidence = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { evidence_photos } = req.body;
    const userId = req.user.id;

    const { data: dispute } = await supabase.from('disputes').select('*').eq('id', id).single();
    if (!dispute) return res.status(404).json({ error: 'Not found' });

    const isFiler = dispute.filed_by === userId;
    const isDefense = dispute.against === userId;
    if (!isFiler && !isDefense) return res.status(403).json({ error: 'Forbidden' });

    const update = isFiler
      ? { evidence_filer: evidence_photos, status: 'under_review' }
      : { evidence_defense: evidence_photos, status: 'under_review' };

    const { data, error } = await supabase
      .from('disputes').update(update).eq('id', id).select().single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { next(err); }
};

const getAdminDisputes = async (req, res, next) => {
  try {
    if (req.profile?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const { status } = req.query;

    let query = supabase
      .from('disputes')
      .select(`
        *,
        transactions(*, listings(id, title, images, price, category)),
        filer:users!filed_by(id, name, avatar_url, trust_score),
        defendant:users!against(id, name, avatar_url, trust_score)
      `)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) { next(err); }
};

const resolveDispute = async (req, res, next) => {
  try {
    if (req.profile?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const { id } = req.params;
    const { admin_decision, admin_notes, refund_amount } = req.body;
    const validDecisions = ['buyer_wins', 'seller_wins', 'partial_refund', 'no_action'];

    if (!validDecisions.includes(admin_decision)) {
      return res.status(400).json({ error: `admin_decision must be one of: ${validDecisions.join(', ')}` });
    }

    const { data: dispute } = await supabase.from('disputes').select('*').eq('id', id).single();
    if (!dispute) return res.status(404).json({ error: 'Not found' });

    const { data: updated } = await supabase
      .from('disputes')
      .update({
        admin_decision,
        admin_notes,
        refund_amount: refund_amount ? parseFloat(refund_amount) : null,
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    const escrowMap = {
      buyer_wins: 'refunded',
      seller_wins: 'released',
      partial_refund: 'partial_release',
      no_action: 'released',
    };
    const escrowStatus = escrowMap[admin_decision];

    await supabase.from('transactions')
      .update({ status: 'completed', escrow_status: escrowStatus, completed_at: new Date().toISOString() })
      .eq('id', dispute.transaction_id);

    if (admin_decision === 'buyer_wins') {
      const { data: txn } = await supabase.from('transactions').select('listing_id').eq('id', dispute.transaction_id).single();
      if (txn) await supabase.from('listings').update({ status: 'active' }).eq('id', txn.listing_id);
    }

    const decisionMsg = {
      buyer_wins: "The dispute was resolved in the buyer's favor. Escrow refunded.",
      seller_wins: "The dispute was resolved in the seller's favor. Escrow released.",
      partial_refund: `Partial refund of ₹${refund_amount} issued.`,
      no_action: 'The dispute was reviewed. No action was taken.',
    };

    await supabase.from('notifications').insert([
      { user_id: dispute.filed_by, type: 'dispute_update', title: 'Dispute Resolved', content: decisionMsg[admin_decision], metadata: { dispute_id: id } },
      { user_id: dispute.against,  type: 'dispute_update', title: 'Dispute Resolved', content: decisionMsg[admin_decision], metadata: { dispute_id: id } },
    ]);

    res.json(updated);
  } catch (err) { next(err); }
};

module.exports = { fileDispute, getMyDisputes, getDisputeById, uploadEvidence, getAdminDisputes, resolveDispute };
