const mongoose = require('mongoose');

// Security fix (F-07): strip MongoDB operators ("$ne", "$gt", ...) and dotted keys
// from anything the client sends, so user input can never become a query operator.
const stripOperators = (value) => {
  if (Array.isArray(value)) return value.map(stripOperators);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const clean = {};
    for (const [key, val] of Object.entries(value)) {
      if (key.startsWith('$') || key.includes('.')) continue;
      clean[key] = stripOperators(val);
    }
    return clean;
  }
  return value;
};

const sanitizeRequest = (req, res, next) => {
  if (req.body) req.body = stripOperators(req.body);
  if (req.params) req.params = stripOperators(req.params);
  // req.query is a getter in newer Express versions, so clean it in place
  if (req.query) {
    const cleaned = stripOperators(req.query);
    for (const key of Object.keys(req.query)) delete req.query[key];
    Object.assign(req.query, cleaned);
  }
  next();
};

// Returns the value only if it is a non-empty string (never an object or array)
const asString = (value, maxLength = 200) =>
  typeof value === 'string' && value.trim() !== '' && value.length <= maxLength ? value.trim() : undefined;

const isObjectId = (value) => typeof value === 'string' && mongoose.Types.ObjectId.isValid(value) && /^[a-f\d]{24}$/i.test(value);

const isValidDate = (value) => (typeof value === 'string' || value instanceof Date) && !Number.isNaN(new Date(value).getTime());

// Security fix (F-12): escape regex special characters before building a search
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Security fix (F-03, F-06): copy only explicitly allowed fields (prevents mass assignment)
const pick = (source, allowed) => {
  const result = {};
  for (const key of allowed) {
    if (source[key] !== undefined) result[key] = source[key];
  }
  return result;
};

const sameId = (a, b) => a != null && b != null && String(a._id || a) === String(b._id || b);

// Security fix (F-13): never send internal error details to the client
const handleError = (res, error, context) => {
  if (error && error.name === 'ValidationError') {
    return res.status(400).json({ message: 'Invalid input', fields: Object.keys(error.errors) });
  }
  if (error && error.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid input' });
  }
  if (error && error.code === 11000) {
    return res.status(409).json({ message: 'A record with these details already exists' });
  }
  console.error(`[${context}]`, error);
  return res.status(500).json({ message: 'Something went wrong. Please try again.' });
};

module.exports = { sanitizeRequest, stripOperators, asString, isObjectId, isValidDate, escapeRegex, pick, sameId, handleError };
