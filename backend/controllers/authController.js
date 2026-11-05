const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Employee = require('../models/Employee');
const generateToken = require('../utils/generateToken');
const audit = require('../utils/audit');
const { asString, isObjectId, sameId, handleError } = require('../utils/security');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Security fix (F-10): at least 8 characters with a letter and a number
const isStrongPassword = (password) =>
  typeof password === 'string' && password.length >= 8 && password.length <= 128 &&
  /[A-Za-z]/.test(password) && /\d/.test(password);

// Used so a login for an unknown email takes as long as one for a real email
const DUMMY_HASH = bcrypt.hashSync('timing-protection-only', 12);

const userResponse = (user, token) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  employeeId: user.employeeId || null,
  ...(token ? { token } : {}),
});

exports.register = async (req, res) => {
  try {
    const name = asString(req.body.name, 100);
    const email = asString(req.body.email, 254);
    const { password } = req.body;

    if (!name || !email || !EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid name and email' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters and include a letter and a number' });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    // Security fix (F-01): never trust a role sent by the client.
    // Every self-registered account is an employee; only an admin can change roles.
    const user = await User.create({ name, email, password, role: 'employee' });
    res.status(201).json(userResponse(user, generateToken(user._id)));
  } catch (error) {
    handleError(res, error, 'register');
  }
};

exports.login = async (req, res) => {
  try {
    // Security fix (F-07): email and password must be plain strings, never objects like {"$ne": null}
    const email = asString(req.body.email, 254);
    const { password } = req.body;
    if (!email || typeof password !== 'string' || password.length > 128) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    const passwordOk = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

    if (!user || !passwordOk || !user.isActive) {
      // Same message in every case, so attackers cannot tell which accounts exist
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    res.json(userResponse(user, generateToken(user._id)));
  } catch (error) {
    handleError(res, error, 'login');
  }
};

exports.getMe = async (req, res) => {
  res.json(userResponse(req.user));
};

// Admin only: list user accounts
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().populate('employeeId', 'firstName lastName employeeCode').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    handleError(res, error, 'getUsers');
  }
};

// Admin only: change a user's role, linked employee record or active status
exports.updateUserAccess = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid user id' });
    if (sameId(req.params.id, req.user._id)) {
      return res.status(400).json({ message: 'You cannot change your own access' });
    }

    const update = {};
    const { role, employeeId, isActive } = req.body;

    if (role !== undefined) {
      if (!['admin', 'manager', 'employee'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
      update.role = role;
    }
    if (employeeId !== undefined) {
      if (employeeId === null) {
        update.employeeId = null;
      } else {
        if (!isObjectId(employeeId) || !(await Employee.exists({ _id: employeeId }))) {
          return res.status(400).json({ message: 'Employee not found' });
        }
        update.employeeId = employeeId;
      }
    }
    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') return res.status(400).json({ message: 'isActive must be true or false' });
      update.isActive = isActive;
    }
    if (Object.keys(update).length === 0) return res.status(400).json({ message: 'Nothing to update' });

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    await audit(req, 'user.updateAccess', 'User', user._id, update);
    res.json(userResponse(user));
  } catch (error) {
    handleError(res, error, 'updateUserAccess');
  }
};
