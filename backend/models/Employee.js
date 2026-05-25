const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeCode: { type: String, unique: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, trim: true },
  department: { type: String, required: true, enum: ['Engineering', 'HR', 'Finance', 'Marketing', 'Operations', 'Sales', 'IT'] },
  position: { type: String, required: true },
  dateOfJoining: { type: Date, required: true },
  dateOfBirth: { type: Date },
  salary: { type: Number },
  address: { type: String },
  status: { type: String, enum: ['active', 'inactive', 'on_leave'], default: 'active' },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  leaveBalance: {
    annual: { type: Number, default: 15 },
    sick: { type: Number, default: 10 },
    casual: { type: Number, default: 7 },
  },
}, { timestamps: true });

employeeSchema.pre('save', async function(next) {
  if (!this.employeeCode) {
    const count = await mongoose.model('Employee').countDocuments();
    this.employeeCode = `EMP${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

employeeSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('Employee', employeeSchema);
