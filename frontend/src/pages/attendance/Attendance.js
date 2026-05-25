import React, { useState, useEffect } from 'react';
import { getEmployees, checkIn, checkOut, getAttendance } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const Attendance = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    getEmployees().then(res => setEmployees(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      setLoading(true);
      getAttendance({ employeeId: selectedEmployee, month, year })
        .then(res => setAttendance(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [selectedEmployee, month, year]);

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleCheckIn = async () => {
    if (!selectedEmployee) return showMsg('error', 'Please select an employee first');
    try {
      await checkIn(selectedEmployee);
      showMsg('success', 'Check-in recorded successfully!');
      getAttendance({ employeeId: selectedEmployee, month, year }).then(res => setAttendance(res.data));
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Check-in failed');
    }
  };

  const handleCheckOut = async () => {
    if (!selectedEmployee) return showMsg('error', 'Please select an employee first');
    try {
      await checkOut(selectedEmployee);
      showMsg('success', 'Check-out recorded successfully!');
      getAttendance({ employeeId: selectedEmployee, month, year }).then(res => setAttendance(res.data));
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Check-out failed');
    }
  };

  const statusColor = { present: 'green', absent: 'red', half_day: 'orange', late: 'purple' };
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const totalHours = attendance.reduce((sum, r) => sum + (r.workingHours || 0), 0);
  const presentDays = attendance.filter(r => r.status === 'present').length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance Tracking</h1>
          <p className="page-subtitle">Track employee check-ins and working hours</p>
        </div>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      )}

      <div className="attendance-controls card">
        <div className="control-row">
          <div className="form-group">
            <label>Select Employee</label>
            <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)}>
              <option value="">-- Choose Employee --</option>
              {employees.map(emp => (
                <option key={emp._id} value={emp._id}>
                  {emp.firstName} {emp.lastName} ({emp.employeeCode})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Month</label>
            <select value={month} onChange={e => setMonth(Number(e.target.value))}>
              {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Year</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))}>
              {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div className="checkin-buttons">
          <button className="btn btn-success" onClick={handleCheckIn}>✅ Check In</button>
          <button className="btn btn-danger" onClick={handleCheckOut}>🔴 Check Out</button>
        </div>
      </div>

      {selectedEmployee && (
        <>
          <div className="stats-row">
            <div className="mini-stat">
              <span className="mini-stat-value">{attendance.length}</span>
              <span className="mini-stat-label">Total Records</span>
            </div>
            <div className="mini-stat">
              <span className="mini-stat-value">{presentDays}</span>
              <span className="mini-stat-label">Present Days</span>
            </div>
            <div className="mini-stat">
              <span className="mini-stat-value">{totalHours.toFixed(1)}h</span>
              <span className="mini-stat-label">Total Hours</span>
            </div>
            <div className="mini-stat">
              <span className="mini-stat-value">{presentDays > 0 ? (totalHours / presentDays).toFixed(1) : 0}h</span>
              <span className="mini-stat-label">Avg Hours/Day</span>
            </div>
          </div>

          {loading ? (
            <div className="loading-screen"><div className="spinner"></div></div>
          ) : attendance.length === 0 ? (
            <div className="empty-card"><p>No attendance records found for this period.</p></div>
          ) : (
            <div className="table-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Working Hours</th>
                    <th>Status</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map(record => (
                    <tr key={record._id}>
                      <td>{new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                      <td>{record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</td>
                      <td>{record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</td>
                      <td>{record.workingHours > 0 ? `${record.workingHours}h` : '--'}</td>
                      <td><span className={`status-badge status-${statusColor[record.status]}`}>{record.status?.replace('_', ' ')}</span></td>
                      <td>{record.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!selectedEmployee && (
        <div className="empty-card">
          <p>👆 Select an employee above to view their attendance records.</p>
        </div>
      )}
    </div>
  );
};

export default Attendance;
