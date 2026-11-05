const Employee = require('../models/Employee');
const { isStaff } = require('../middleware/auth');
const { isObjectId } = require('./security');

// Security fix (F-04): decide WHO an action is for from the login token, not from the request.
// - An employee can only ever act for their own linked employee record.
// - Admins and managers (HR) may act for any employee they choose.
// Returns { employeeId } or { error: { status, message } }.
const resolveEmployee = async (req, requestedId) => {
  if (isStaff(req.user) && requestedId !== undefined && requestedId !== '') {
    if (!isObjectId(requestedId) || !(await Employee.exists({ _id: requestedId }))) {
      return { error: { status: 400, message: 'Employee not found' } };
    }
    return { employeeId: String(requestedId) };
  }
  if (!req.user.employeeId) {
    return { error: { status: 403, message: 'Your account is not linked to an employee record. Please contact an administrator.' } };
  }
  return { employeeId: String(req.user.employeeId) };
};

module.exports = resolveEmployee;
