const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: Date, required: true },
  checkIn: { type: Date },
  checkOut: { type: Date },
  workingHours: { type: Number, default: 0 },
  status: { type: String, enum: ['present', 'absent', 'half_day', 'late'], default: 'present' },
  notes: { type: String },
}, { timestamps: true });

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

attendanceSchema.pre('save', function(next) {
  if (this.checkIn && this.checkOut) {
    const diffMs = this.checkOut - this.checkIn;
    this.workingHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
    this.status = this.workingHours < 4 ? 'half_day' : this.workingHours < 8 ? 'late' : 'present';
  }
  next();
});

module.exports = mongoose.model('Attendance', attendanceSchema);
