const Employee = require('../models/Employee');
const { isStaff } = require('../middleware/auth');
const audit = require('../utils/audit');
const { asString, isObjectId, escapeRegex, pick, sameId, handleError } = require('../utils/security');

const DEPARTMENTS = ['Engineering', 'HR', 'Finance', 'Marketing', 'Operations', 'Sales', 'IT'];
const STATUSES = ['active', 'inactive', 'on_leave'];

// Security fix (F-05): employees only see a colleague's directory details,
// never salary, date of birth, home address or leave balance.
const DIRECTORY_FIELDS = 'employeeCode firstName lastName email phone department position dateOfJoining status manager';

// Security fix (F-06): only these fields can be written. Salary and leave balance are admin-only.
const STAFF_EDITABLE = ['firstName', 'lastName', 'email', 'phone', 'department', 'position',
  'dateOfJoining', 'dateOfBirth', 'address', 'status', 'manager'];
const ADMIN_ONLY_EDITABLE = ['salary', 'leaveBalance'];

const editableFields = (user) => (user.role === 'admin' ? [...STAFF_EDITABLE, ...ADMIN_ONLY_EDITABLE] : STAFF_EDITABLE);

const cleanLeaveBalance = (balance) => {
  if (!balance || typeof balance !== 'object') return undefined;
  const clean = {};
  for (const key of ['annual', 'sick', 'casual']) {
    if (balance[key] !== undefined) {
      const n = Number(balance[key]);
      if (!Number.isFinite(n) || n < 0 || n > 365) throw Object.assign(new Error('Invalid leave balance'), { name: 'ValidationError', errors: { leaveBalance: true } });
      clean[key] = n;
    }
  }
  return clean;
};

const buildEmployeeData = (body, user) => {
  const data = pick(body, editableFields(user));
  if (data.manager === '') data.manager = null;
  if (data.manager && !isObjectId(data.manager)) delete data.manager;
  if (data.leaveBalance !== undefined) data.leaveBalance = cleanLeaveBalance(data.leaveBalance);
  return data;
};

exports.getEmployees = async (req, res) => {
  try {
    const query = {};
    const department = asString(req.query.department, 50);
    const status = asString(req.query.status, 20);
    // Security fix (F-12): limit length and escape regex characters to prevent ReDoS
    const search = asString(req.query.search, 100);

    if (department && DEPARTMENTS.includes(department)) query.department = department;
    if (status && STATUSES.includes(status)) query.status = status;
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      query.$or = [{ firstName: pattern }, { lastName: pattern }, { email: pattern }, { employeeCode: pattern }];
    }

    let request = Employee.find(query).populate('manager', 'firstName lastName').sort({ createdAt: -1 });
    if (!isStaff(req.user)) request = request.select(DIRECTORY_FIELDS);
    res.json(await request);
  } catch (error) {
    handleError(res, error, 'getEmployees');
  }
};

exports.getEmployee = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid employee id' });
    let request = Employee.findById(req.params.id).populate('manager', 'firstName lastName');
    // Staff see everything; an employee sees full details only for their own record
    if (!isStaff(req.user) && !sameId(req.params.id, req.user.employeeId)) request = request.select(DIRECTORY_FIELDS);
    const employee = await request;
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json(employee);
  } catch (error) {
    handleError(res, error, 'getEmployee');
  }
};

exports.createEmployee = async (req, res) => {
  try {
    const employee = await Employee.create(buildEmployeeData(req.body, req.user));
    await audit(req, 'employee.create', 'Employee', employee._id, { employeeCode: employee.employeeCode });
    res.status(201).json(employee);
  } catch (error) {
    handleError(res, error, 'createEmployee');
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid employee id' });
    // A manager cannot edit their own record (e.g. their own status or details)
    if (req.user.role !== 'admin' && sameId(req.params.id, req.user.employeeId)) {
      return res.status(403).json({ message: 'You cannot edit your own employee record' });
    }

    const data = buildEmployeeData(req.body, req.user);
    const employee = await Employee.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    await audit(req, 'employee.update', 'Employee', employee._id, { fields: Object.keys(data) });
    res.json(employee);
  } catch (error) {
    handleError(res, error, 'updateEmployee');
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid employee id' });
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    await audit(req, 'employee.delete', 'Employee', employee._id, {
      employeeCode: employee.employeeCode, name: `${employee.firstName} ${employee.lastName}`,
    });
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    handleError(res, error, 'deleteEmployee');
  }
};
