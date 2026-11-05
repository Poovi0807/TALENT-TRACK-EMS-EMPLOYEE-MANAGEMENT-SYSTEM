const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return res.status(401).json({ message: 'Not authorized' });

    // Security fix (F-09): only accept tokens signed with HS256
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = await User.findById(decoded.id);
    if (!req.user) return res.status(401).json({ message: 'Not authorized' });

    // Security fix (F-09): a deactivated account loses access immediately
    if (!req.user.isActive) return res.status(401).json({ message: 'Account is deactivated' });
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to do this' });
    }
    next();
  };
};

// Admins and managers act as HR and may work on behalf of any employee
const isStaff = (user) => user && (user.role === 'admin' || user.role === 'manager');

module.exports = { protect, authorize, isStaff };
