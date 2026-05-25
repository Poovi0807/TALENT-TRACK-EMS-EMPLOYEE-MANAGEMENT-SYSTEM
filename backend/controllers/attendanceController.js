const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');

exports.checkIn = async (req, res) => {
  try {
    const { employeeId } = req.body;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const existing = await Attendance.findOne({ employee: employeeId, date: today });
    if (existing && existing.checkIn) return res.status(400).json({ message: 'Already checked in today' });
    const attendance = existing
      ? await Attendance.findByIdAndUpdate(existing._id, { checkIn: new Date() }, { new: true })
      : await Attendance.create({ employee: employeeId, date: today, checkIn: new Date() });
    res.status(201).json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const { employeeId } = req.body;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const attendance = await Attendance.findOne({ employee: employeeId, date: today });
    if (!attendance) return res.status(404).json({ message: 'No check-in found for today' });
    if (attendance.checkOut) return res.status(400).json({ message: 'Already checked out today' });
    attendance.checkOut = new Date();
    await attendance.save();
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAttendance = async (req, res) => {
  try {
    const { employeeId, startDate, endDate, month, year } = req.query;
    let query = {};
    if (employeeId) query.employee = employeeId;
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (month && year) {
      query.date = {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 0)
      };
    }
    const attendance = await Attendance.find(query).populate('employee', 'firstName lastName employeeCode department').sort({ date: -1 });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTodayAttendance = async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const attendance = await Attendance.find({ date: { $gte: today, $lt: tomorrow } })
      .populate('employee', 'firstName lastName employeeCode department');
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
