const Leave = require('../models/Leave');
const Employee = require('../models/Employee');

exports.applyLeave = async (req, res) => {
  try {
    const leave = await Leave.create(req.body);
    await leave.populate('employee', 'firstName lastName employeeCode');
    res.status(201).json(leave);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getLeaves = async (req, res) => {
  try {
    const { employeeId, status, leaveType } = req.query;
    let query = {};
    if (employeeId) query.employee = employeeId;
    if (status) query.status = status;
    if (leaveType) query.leaveType = leaveType;
    const leaves = await Leave.find(query)
      .populate('employee', 'firstName lastName employeeCode department')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateLeaveStatus = async (req, res) => {
  try {
    const { status, rejectionReason, approvedBy } = req.body;
    const leave = await Leave.findById(req.params.id).populate('employee');
    if (!leave) return res.status(404).json({ message: 'Leave not found' });

    if (status === 'approved' && leave.status === 'pending') {
      const employee = await Employee.findById(leave.employee._id);
      const balanceKey = leave.leaveType;
      if (employee.leaveBalance[balanceKey] !== undefined) {
        if (employee.leaveBalance[balanceKey] < leave.totalDays) {
          return res.status(400).json({ message: 'Insufficient leave balance' });
        }
        employee.leaveBalance[balanceKey] -= leave.totalDays;
        await employee.save();
      }
    }

    leave.status = status;
    if (rejectionReason) leave.rejectionReason = rejectionReason;
    if (approvedBy) leave.approvedBy = approvedBy;
    if (status === 'approved' || status === 'rejected') leave.approvedAt = new Date();
    await leave.save();
    await leave.populate('employee', 'firstName lastName employeeCode');
    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.cancelLeave = async (req, res) => {
  try {
    const leave = await Leave.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true });
    if (!leave) return res.status(404).json({ message: 'Leave not found' });
    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
