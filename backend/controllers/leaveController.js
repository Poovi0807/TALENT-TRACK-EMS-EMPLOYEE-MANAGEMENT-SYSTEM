const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
const { isStaff } = require('../middleware/auth');
const audit = require('../utils/audit');
const resolveEmployee = require('../utils/resolveEmployee');
const { asString, isObjectId, isValidDate, sameId, handleError } = require('../utils/security');

const LEAVE_TYPES = ['annual', 'sick', 'casual', 'unpaid', 'maternity', 'paternity'];
const LEAVE_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];
const BALANCE_TYPES = ['annual', 'sick', 'casual'];

const populateLeave = (query) => query
  .populate('employee', 'firstName lastName employeeCode department')
  .populate('approvedBy', 'firstName lastName');

exports.applyLeave = async (req, res) => {
  try {
    // Security fix (F-04): who the leave is for comes from the login, not the request body
    const { employeeId, error } = await resolveEmployee(req, req.body.employee);
    if (error) return res.status(error.status).json({ message: error.message });

    // Security fix (F-03): only these fields are accepted. "status", "approvedBy" etc. are ignored,
    // so a new request is always "pending".
    const { leaveType, startDate, endDate } = req.body;
    const reason = asString(req.body.reason, 500);

    if (!LEAVE_TYPES.includes(leaveType)) return res.status(400).json({ message: 'Invalid leave type' });
    if (!isValidDate(startDate) || !isValidDate(endDate)) return res.status(400).json({ message: 'Invalid dates' });
    if (new Date(endDate) < new Date(startDate)) return res.status(400).json({ message: 'End date must be on or after the start date' });
    if (!reason) return res.status(400).json({ message: 'Please give a reason (max 500 characters)' });

    const leave = await Leave.create({ employee: employeeId, leaveType, startDate, endDate, reason, status: 'pending' });
    await leave.populate('employee', 'firstName lastName employeeCode');
    await audit(req, 'leave.apply', 'Leave', leave._id, { employee: employeeId, leaveType, totalDays: leave.totalDays });
    res.status(201).json(leave);
  } catch (error) {
    handleError(res, error, 'applyLeave');
  }
};

exports.getLeaves = async (req, res) => {
  try {
    const query = {};
    const status = asString(req.query.status, 20);
    const leaveType = asString(req.query.leaveType, 20);
    if (status && LEAVE_STATUSES.includes(status)) query.status = status;
    if (leaveType && LEAVE_TYPES.includes(leaveType)) query.leaveType = leaveType;

    if (isStaff(req.user)) {
      if (req.query.employeeId !== undefined) {
        if (!isObjectId(req.query.employeeId)) return res.status(400).json({ message: 'Invalid employee id' });
        query.employee = req.query.employeeId;
      }
    } else {
      // Security fix (F-04): employees only ever see their own leave requests
      if (!req.user.employeeId) return res.json([]);
      query.employee = req.user.employeeId;
    }

    const leaves = await populateLeave(Leave.find(query)).sort({ createdAt: -1 });
    res.json(leaves);
  } catch (error) {
    handleError(res, error, 'getLeaves');
  }
};

exports.updateLeaveStatus = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid leave id' });

    // Security fix (F-08): only "approved" or "rejected" are allowed here
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be "approved" or "rejected"' });
    }

    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave not found' });
    // Security fix (F-08): a decided leave can never be reopened and approved twice
    if (leave.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending leave requests can be approved or rejected' });
    }
    // Security fix (F-08): no one can approve or reject their own leave
    if (sameId(leave.employee, req.user.employeeId)) {
      return res.status(403).json({ message: 'You cannot approve or reject your own leave request' });
    }

    // Security fix (F-08): the reviewer is taken from the login, not from the request body
    const decision = {
      status,
      reviewedBy: req.user._id,
      approvedAt: new Date(),
    };
    if (req.user.employeeId) decision.approvedBy = req.user.employeeId;
    if (status === 'rejected') {
      const rejectionReason = asString(req.body.rejectionReason, 300);
      if (rejectionReason) decision.rejectionReason = rejectionReason;
    }

    // Change the status only if it is still pending (protects against two approvals at once)
    const updated = await Leave.findOneAndUpdate({ _id: leave._id, status: 'pending' }, decision, { new: true });
    if (!updated) return res.status(409).json({ message: 'This leave request was already processed' });

    if (status === 'approved' && BALANCE_TYPES.includes(leave.leaveType)) {
      const balanceField = `leaveBalance.${leave.leaveType}`;
      // Deduct only if enough balance is left, in a single database operation
      const result = await Employee.updateOne(
        { _id: leave.employee, [balanceField]: { $gte: leave.totalDays } },
        { $inc: { [balanceField]: -leave.totalDays } }
      );
      if (result.modifiedCount === 0) {
        await Leave.updateOne({ _id: leave._id }, { status: 'pending', $unset: { reviewedBy: 1, approvedBy: 1, approvedAt: 1 } });
        return res.status(400).json({ message: 'Insufficient leave balance' });
      }
    }

    await audit(req, `leave.${status === 'approved' ? 'approve' : 'reject'}`, 'Leave', leave._id, {
      employee: String(leave.employee), leaveType: leave.leaveType, totalDays: leave.totalDays,
    });
    res.json(await populateLeave(Leave.findById(leave._id)));
  } catch (error) {
    handleError(res, error, 'updateLeaveStatus');
  }
};

exports.cancelLeave = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid leave id' });
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave not found' });

    // Security fix (F-04): employees can cancel only their own requests
    if (!isStaff(req.user) && !sameId(leave.employee, req.user.employeeId)) {
      return res.status(403).json({ message: 'You can only cancel your own leave requests' });
    }
    // Only pending requests can be cancelled (an approved one has already used leave balance)
    const cancelled = await Leave.findOneAndUpdate({ _id: leave._id, status: 'pending' }, { status: 'cancelled' }, { new: true });
    if (!cancelled) return res.status(400).json({ message: 'Only pending leave requests can be cancelled' });

    await audit(req, 'leave.cancel', 'Leave', leave._id, { employee: String(leave.employee) });
    res.json(cancelled);
  } catch (error) {
    handleError(res, error, 'cancelLeave');
  }
};
