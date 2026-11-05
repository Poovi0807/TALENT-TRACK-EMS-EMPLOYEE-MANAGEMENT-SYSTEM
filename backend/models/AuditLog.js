const mongoose = require('mongoose');

// Records who changed what and when (supports ISO 27001 A.8.15 Logging)
const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorEmail: { type: String },
  actorRole: { type: String },
  action: { type: String, required: true },      // e.g. 'leave.approve', 'employee.delete'
  targetType: { type: String },                   // e.g. 'Leave', 'Employee', 'User'
  targetId: { type: mongoose.Schema.Types.ObjectId },
  details: { type: mongoose.Schema.Types.Mixed },
  ip: { type: String },
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('AuditLog', auditLogSchema);
