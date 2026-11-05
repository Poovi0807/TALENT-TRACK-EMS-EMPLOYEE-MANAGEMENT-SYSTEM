const Attendance = require('../models/Attendance');
const { isStaff } = require('../middleware/auth');
const audit = require('../utils/audit');
const resolveEmployee = require('../utils/resolveEmployee');
const { isObjectId, isValidDate, handleError } = require('../utils/security');

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

exports.checkIn = async (req, res) => {
  try {
    // Security fix (F-04): employees can only check themselves in
    const { employeeId, error } = await resolveEmployee(req, req.body.employeeId);
    if (error) return res.status(error.status).json({ message: error.message });

    const today = startOfToday();
    const existing = await Attendance.findOne({ employee: employeeId, date: today });
    if (existing && existing.checkIn) return res.status(400).json({ message: 'Already checked in today' });
    const attendance = existing
      ? await Attendance.findByIdAndUpdate(existing._id, { checkIn: new Date() }, { new: true })
      : await Attendance.create({ employee: employeeId, date: today, checkIn: new Date() });

    await audit(req, 'attendance.checkIn', 'Attendance', attendance._id, { employee: employeeId });
    res.status(201).json(attendance);
  } catch (error) {
    handleError(res, error, 'checkIn');
  }
};

exports.checkOut = async (req, res) => {
  try {
    // Security fix (F-04): employees can only check themselves out
    const { employeeId, error } = await resolveEmployee(req, req.body.employeeId);
    if (error) return res.status(error.status).json({ message: error.message });

    const attendance = await Attendance.findOne({ employee: employeeId, date: startOfToday() });
    if (!attendance) return res.status(404).json({ message: 'No check-in found for today' });
    if (attendance.checkOut) return res.status(400).json({ message: 'Already checked out today' });
    attendance.checkOut = new Date();
    await attendance.save();

    await audit(req, 'attendance.checkOut', 'Attendance', attendance._id, { employee: employeeId });
    res.json(attendance);
  } catch (error) {
    handleError(res, error, 'checkOut');
  }
};

exports.getAttendance = async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.query;
    const query = {};

    if (isStaff(req.user)) {
      if (employeeId !== undefined) {
        if (!isObjectId(employeeId)) return res.status(400).json({ message: 'Invalid employee id' });
        query.employee = employeeId;
      }
    } else {
      // Security fix (F-04): employees only see their own attendance
      if (!req.user.employeeId) return res.json([]);
      query.employee = req.user.employeeId;
    }

    const month = Number(req.query.month);
    const year = Number(req.query.year);
    if (startDate !== undefined && endDate !== undefined) {
      if (!isValidDate(startDate) || !isValidDate(endDate)) return res.status(400).json({ message: 'Invalid dates' });
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (req.query.month !== undefined && req.query.year !== undefined) {
      if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000 || year > 2100) {
        return res.status(400).json({ message: 'Invalid month or year' });
      }
      query.date = { $gte: new Date(year, month - 1, 1), $lte: new Date(year, month, 0) };
    }

    const attendance = await Attendance.find(query)
      .populate('employee', 'firstName lastName employeeCode department')
      .sort({ date: -1 });
    res.json(attendance);
  } catch (error) {
    handleError(res, error, 'getAttendance');
  }
};

exports.getTodayAttendance = async (req, res) => {
  try {
    const today = startOfToday();
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const query = { date: { $gte: today, $lt: tomorrow } };

    // Employees see only their own record for today
    if (!isStaff(req.user)) {
      if (!req.user.employeeId) return res.json([]);
      query.employee = req.user.employeeId;
    }

    const attendance = await Attendance.find(query)
      .populate('employee', 'firstName lastName employeeCode department');
    res.json(attendance);
  } catch (error) {
    handleError(res, error, 'getTodayAttendance');
  }
};
