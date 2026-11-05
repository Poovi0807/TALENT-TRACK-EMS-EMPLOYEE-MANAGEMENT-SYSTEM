const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');
const { asString, handleError } = require('../utils/security');

// Admin only: read the most recent audit log entries
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const query = {};
    const action = asString(req.query.action, 50);
    if (action) query.action = action;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
    const logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(limit);
    res.json(logs);
  } catch (error) {
    handleError(res, error, 'getAuditLogs');
  }
});

module.exports = router;
