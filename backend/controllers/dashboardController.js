const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');

exports.getStats = async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalEmployees, activeEmployees, todayAttendance, pendingLeaves, departmentStats] = await Promise.all([
      Employee.countDocuments(),
      Employee.countDocuments({ status: 'active' }),
      Attendance.find({ date: { $gte: today, $lt: tomorrow } }).countDocuments(),
      Leave.countDocuments({ status: 'pending' }),
      Employee.aggregate([{ $group: { _id: '$department', count: { $sum: 1 } } }])
    ]);

    res.json({
      totalEmployees,
      activeEmployees,
      todayAttendance,
      pendingLeaves,
      departmentStats,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
