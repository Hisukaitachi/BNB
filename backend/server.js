require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const http = require('http');
const { initializeSocket } = require('./socket');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO + Global onlineUsers
initializeSocket(server);

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(morgan('dev'));
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/payouts', require('./routes/payoutRoutes'));
app.use('/api/refunds', require('./routes/refundRoutes'));
app.use('/api/notifications', require('./routes/notificationsRoutes'));
app.use('/api/transactions', require('./routes/transactionsRoutes'));
app.use('/api/messages', require('./routes/messagesRoutes'));
app.use('/api/favorites', require('./routes/favoritesRoutes'));
app.use('/api/reviews', require('./routes/reviewsRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/bookings', require('./routes/bookingsRoutes'));
app.use('/api/listings', require('./routes/listingsRoutes'));
app.use('/api/users', require('./routes/usersRoutes'));

app.use((req, res) => {
  res.status(404).send(`Cannot ${req.method} ${req.originalUrl}`);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
