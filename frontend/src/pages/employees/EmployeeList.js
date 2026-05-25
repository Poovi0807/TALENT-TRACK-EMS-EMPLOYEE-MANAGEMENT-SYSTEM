import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getEmployees, deleteEmployee } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const EmployeeList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');

  const departments = ['Engineering', 'HR', 'Finance', 'Marketing', 'Operations', 'Sales', 'IT'];

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await getEmployees({ search, department, status });
      setEmployees(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, [search, department, status]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await deleteEmployee(id);
      setEmployees(employees.filter(e => e._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const getStatusColor = (s) => ({ active: 'green', inactive: 'red', on_leave: 'orange' }[s] || 'gray');

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">{employees.length} employees found</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <Link to="/employees/add" className="btn btn-primary">+ Add Employee</Link>
        )}
      </div>

      <div className="filters-bar">
        <input className="filter-input" type="text" placeholder="Search by name, email, code..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="filter-select" value={department} onChange={e => setDepartment(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="filter-select" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="on_leave">On Leave</option>
        </select>
        <button className="btn btn-secondary" onClick={fetchEmployees}>Refresh</button>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner"></div></div>
      ) : employees.length === 0 ? (
        <div className="empty-card">
          <p>👥 No employees found.</p>
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <Link to="/employees/add" className="btn btn-primary">Add First Employee</Link>
          )}
        </div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Code</th>
                <th>Department</th>
                <th>Position</th>
                <th>Joined</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp._id}>
                  <td>
                    <div className="emp-cell">
                      <div className="emp-avatar">{emp.firstName?.[0]}{emp.lastName?.[0]}</div>
                      <div>
                        <div className="emp-name">{emp.firstName} {emp.lastName}</div>
                        <div className="emp-email">{emp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="code-badge">{emp.employeeCode}</span></td>
                  <td>{emp.department}</td>
                  <td>{emp.position}</td>
                  <td>{new Date(emp.dateOfJoining).toLocaleDateString()}</td>
                  <td><span className={`status-badge status-${getStatusColor(emp.status)}`}>{emp.status?.replace('_', ' ')}</span></td>
                  <td>
                    <div className="action-btns">
                      <button className="btn-icon btn-icon--blue" onClick={() => navigate(`/employees/${emp._id}`)}>👁️</button>
                      {(user?.role === 'admin' || user?.role === 'manager') && (
                        <button className="btn-icon btn-icon--green" onClick={() => navigate(`/employees/edit/${emp._id}`)}>✏️</button>
                      )}
                      {user?.role === 'admin' && (
                        <button className="btn-icon btn-icon--red" onClick={() => handleDelete(emp._id, `${emp.firstName} ${emp.lastName}`)}>🗑️</button>
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

export default EmployeeList;
