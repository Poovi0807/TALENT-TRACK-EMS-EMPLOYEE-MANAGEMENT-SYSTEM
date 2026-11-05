const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeCode: { type: String, unique: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, trim: true },
  department: { type: String, required: true, enum: ['Engineering', 'HR', 'Finance', 'Marketing', 'Operations', 'Sales', 'IT'] },
  position: { type: String, required: true, trim: true, maxlength: 100 },
  dateOfJoining: { type: Date, required: true },
  dateOfBirth: { type: Date },
  salary: { type: Number, min: 0 },
  address: { type: String, trim: true, maxlength: 300 },
  status: { type: String, enum: ['active', 'inactive', 'on_leave'], default: 'active' },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  leaveBalance: {
    annual: { type: Number, default: 15 },
    sick: { type: Number, default: 10 },
    casual: { type: Number, default: 7 },
  },
}, { timestamps: true });

// Bug fix: the code used to be "number of employees + 1", which repeats an existing
// code after any employee is deleted and then blocks every new employee.
// Now it continues from the highest code in use.
employeeSchema.pre('save', async function(next) {
  if (!this.employeeCode) {
    const last = await mongoose.model('Employee')
      .findOne({ employeeCode: /^EMP\d+$/ })
      .sort({ employeeCode: -1 })
      .select('employeeCode');
    const lastNumber = last ? parseInt(last.employeeCode.slice(3), 10) : 0;
    this.employeeCode = `EMP${String(lastNumber + 1).padStart(4, '0')}`;
  }
  next();
});

employeeSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('Employee', employeeSchema);
