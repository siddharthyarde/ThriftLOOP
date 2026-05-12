const authGuard = require('./authGuard');

const adminGuard = async (req, res, next) => {
  await authGuard(req, res, async () => {
    if (req.profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
};

module.exports = adminGuard;
