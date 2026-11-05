const jwt = require('jsonwebtoken');

// Security fix (F-09): short-lived tokens with a fixed algorithm
const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, {
  algorithm: 'HS256',
  expiresIn: process.env.JWT_EXPIRES_IN || '1h',
});

module.exports = generateToken;
