const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const app = express();

app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth',          require('./routes/auth'));
app.use('/api/user-photos',   require('./routes/userPhotos'));
app.use('/api/storefront',    require('./routes/storefront'));
app.use('/api/vouches',       require('./routes/vouches'));
app.use('/api/listings',      require('./routes/listings'));
app.use('/api/uploads',       require('./routes/uploads'));
app.use('/api/wishlist',      require('./routes/wishlist'));
app.use('/api/analytics',     require('./routes/analytics'));
app.use('/api/transactions',  require('./routes/transactions'));
app.use('/api/meetup',        require('./routes/meetup'));
app.use('/api/delivery',      require('./routes/delivery'));
app.use('/api/chat',          require('./routes/chat'));
app.use('/api/swap',          require('./routes/swap'));
app.use('/api/tryon',         require('./routes/tryon'));
app.use('/api/rental',        require('./routes/rental'));
app.use('/api/dispute',       require('./routes/dispute'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/offers',        require('./routes/offers'));
app.use('/api/admin',         require('./routes/admin'));

app.get('/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date(), env: process.env.NODE_ENV })
);
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date() })
);

app.use((req, res) =>
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` })
);

app.use(require('./middleware/errorHandler'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Thrift Marketplace server running`);
  console.log(`   Port:    ${PORT}`);
  console.log(`   Env:     ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health:  http://localhost:${PORT}/health\n`);
});

module.exports = app;
