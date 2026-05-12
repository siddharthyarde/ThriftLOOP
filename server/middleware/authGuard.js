const supabase = require('../services/supabase');

const authGuard = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = user;

    // Fetch full profile (role, trust_score, etc.)
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    req.profile = profile;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

module.exports = authGuard;
