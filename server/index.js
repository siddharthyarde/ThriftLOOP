const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const app = express();

// ─── Middleware ───────────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' })); // 10mb for base64 images
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/listings',     require('./routes/listings'));
app.use('/api/uploads',      require('./routes/uploads'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/swap',         require('./routes/swap'));
app.use('/api/rental',       require('./routes/rental'));
app.use('/api/meetup',       require('./routes/meetup'));
app.use('/api/dispute',      require('./routes/dispute'));
app.use('/api/tryon',        require('./routes/tryon'));
app.use('/api/wishlist',     require('./routes/wishlist'));
app.use('/api/analytics',    require('./routes/analytics'));
app.use('/api/delivery',     require('./routes/delivery'));
app.use('/api/chat',         require('./routes/chat'));
app.use('/api/admin',        require('./routes/admin'));
app.use('/api/user-photos',  require('./routes/userPhotos'));
app.use('/api/storefront',   require('./routes/storefront'));
app.use('/api/vouches',      require('./routes/vouches'));

// ─── Health check ─────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ─── Error handler (always last) ──────────────────────────────
app.use(require('./middleware/errorHandler'));

// ─── Start ────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
