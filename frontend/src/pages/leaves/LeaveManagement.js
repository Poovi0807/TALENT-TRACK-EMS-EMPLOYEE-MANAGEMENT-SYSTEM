import React, { useState, useEffect } from 'react';
import { getLeaves, applyLeave, updateLeaveStatus, cancelLeave, getEmployees } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const LeaveManagement = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState({
    employee: '', leaveType: 'annual', startDate: '', endDate: '', reason: ''
  });

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      const res = await getLeaves(params);
      setLeaves(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchLeaves();
    getEmployees().then(res => setEmployees(res.data)).catch(console.error);
  }, [filterStatus]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await applyLeave(form);
      showMsg('success', 'Leave application submitted!');
      setShowForm(false);
      setForm({ employee: '', leaveType: 'annual', startDate: '', endDate: '', reason: '' });
      fetchLeaves();
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Failed to apply for leave');
    }
  };

  const handleStatus = async (id, status, reason = '') => {
    try {
      await updateLeaveStatus(id, { status, rejectionReason: reason });
      showMsg('success', `Leave ${status} successfully!`);
      fetchLeaves();
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Action failed');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this leave request?')) return;
    try {
      await cancelLeave(id);
      showMsg('success', 'Leave cancelled.');
      fetchLeaves();
    } catch (err) {
      showMsg('error', 'Failed to cancel leave');
    }
  };

  const statusColors = { pending: 'orange', approved: 'green', rejected: 'red', cancelled: 'gray' };
  const leaveTypeColors = { annual: 'blue', sick: 'red', casual: 'purple', unpaid: 'gray', maternity: 'pink', paternity: 'teal' };

  const calcDays = () => {
    if (form.startDate && form.endDate) {
      const diff = Math.abs(new Date(form.endDate) - new Date(form.startDate));
      return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
    }
    return 0;
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Leave Management</h1>
          <p className="page-subtitle">Manage employee leave requests</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ Apply Leave'}
        </button>
      </div>

      {message.text && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      {showForm && (
        <div className="form-card">
          <h3 className="form-section-title">New Leave Application</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Employee *</label>
                <select value={form.employee} onChange={e => setForm({ ...form, employee: e.target.value })} required>
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp._id} value={emp._id}>{emp.firstName} {emp.lastName} ({emp.employeeCode})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Leave Type *</label>
                <select value={form.leaveType} onChange={e => setForm({ ...form, leaveType: e.target.value })}>
                  <option value="annual">Annual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="casual">Casual Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
                  <option value="maternity">Maternity Leave</option>
                  <option value="paternity">Paternity Leave</option>
                </select>
              </div>
              <div className="form-group">
                <label>Start Date *</label>
                <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>End Date *</label>
                <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} required min={form.startDate} />
              </div>
              {calcDays() > 0 && (
                <div className="form-group">
                  <label>Duration</label>
                  <div className="days-badge">{calcDays()} day{calcDays() > 1 ? 's' : ''}</div>
                </div>
              )}
              <div className="form-group form-group--full">
                <label>Reason *</label>
                <textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} required rows={3} placeholder="Describe the reason for leave..." />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Submit Application</button>
            </div>
          </form>
        </div>
      )}

      <div className="filters-bar">
        <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button className="btn btn-secondary" onClick={fetchLeaves}>Refresh</button>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner"></div></div>
      ) : leaves.length === 0 ? (
        <div className="empty-card"><p>📋 No leave requests found.</p></div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map(leave => (
                <tr key={leave._id}>
                  <td>
                    <div className="emp-cell">
                      <div className="emp-avatar">{leave.employee?.firstName?.[0]}</div>
                      <div>
                        <div className="emp-name">{leave.employee?.firstName} {leave.employee?.lastName}</div>
                        <div className="emp-email">{leave.employee?.employeeCode}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={`type-badge type-${leaveTypeColors[leave.leaveType]}`}>{leave.leaveType}</span></td>
                  <td>{new Date(leave.startDate).toLocaleDateString()}</td>
                  <td>{new Date(leave.endDate).toLocaleDateString()}</td>
                  <td>{leave.totalDays}</td>
                  <td className="reason-cell">{leave.reason}</td>
                  <td><span className={`status-badge status-${statusColors[leave.status]}`}>{leave.status}</span></td>
                  <td>
                    <div className="action-btns">
                      {leave.status === 'pending' && (user?.role === 'admin' || user?.role === 'manager') && (
                        <>
                          <button className="btn-sm btn-sm--green" onClick={() => handleStatus(leave._id, 'approved')}>✓ Approve</button>
                          <button className="btn-sm btn-sm--red" onClick={() => {
                            const reason = prompt('Rejection reason:');
                            if (reason !== null) handleStatus(leave._id, 'rejected', reason);
                          }}>✗ Reject</button>
                        </>
                      )}
                      {leave.status === 'pending' && (
                        <button className="btn-sm btn-sm--gray" onClick={() => handleCancel(leave._id)}>Cancel</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default LeaveManagement;
