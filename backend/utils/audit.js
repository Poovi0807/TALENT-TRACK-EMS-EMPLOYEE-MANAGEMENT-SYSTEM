const AuditLog = require('../models/AuditLog');

// Writes an audit entry. A logging failure must never break the user's request.
const audit = async (req, action, targetType, targetId, details) => {
  try {
    await AuditLog.create({
      actor: req.user?._id,
      actorEmail: req.user?.email,
      actorRole: req.user?.role,
      action,
      targetType,
      targetId,
      details,
      ip: req.ip,
    });
  } catch (error) {
    console.error('[audit] could not write audit log:', error.message);
  }
};

module.exports = audit;
