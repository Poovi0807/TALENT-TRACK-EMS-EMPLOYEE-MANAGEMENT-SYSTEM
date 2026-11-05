const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const auditRoutes = require('./routes/auditRoutes');
const { sanitizeRequest } = require('./utils/security');

// Security fix (F-02): refuse to start without a strong secret from the environment
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET is missing or shorter than 32 characters. Set it in your .env file (see .env.example).');
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is missing. Set it in your .env file (see .env.example).');
  process.exit(1);
}

const isProduction = process.env.NODE_ENV === 'production';
const app = express();

// Security fix (F-07): "simple" parser turns ?status[$ne]=x into a plain string key, never an object
app.set('query parser', 'simple');
app.disable('x-powered-by');
if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);

// Security fix (F-13): security headers
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '100kb' }));
// Security fix (F-07): remove MongoDB operators from all input
app.use(sanitizeRequest);
// Security fix (F-10): general limit on API requests per IP
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 500, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use(morgan(isProduction ? 'combined' : 'dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit-logs', auditRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

// Unknown routes
app.use((req, res) => res.status(404).json({ message: 'Not found' }));

// Security fix (F-13): log details on the server, send only a generic message to the client
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON' });
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request too large' });
  console.error(err);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
