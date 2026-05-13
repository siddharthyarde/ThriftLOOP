const express = require('express');
const router = express.Router();
const authGuard = require('../middleware/authGuard');
const supabase = require('../services/supabase');

router.get('/', authGuard, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) { next(err); }
});

router.put('/read-all', authGuard, async (req, res, next) => {
  try {
    await supabase.from('notifications')
      .update({ read: true })
      .eq('user_id', req.user.id)
      .eq('read', false);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.put('/:id/read', authGuard, async (req, res, next) => {
  try {
    await supabase.from('notifications')
      .update({ read: true })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
