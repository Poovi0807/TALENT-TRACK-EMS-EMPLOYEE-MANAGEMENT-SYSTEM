import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEmployee } from '../../services/api';

const DEPARTMENTS = ['Engineering', 'HR', 'Finance', 'Marketing', 'Operations', 'Sales', 'IT'];

const AddEmployee = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    department: '', position: '', dateOfJoining: '', dateOfBirth: '',
    salary: '', address: '', status: 'active'
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createEmployee(form);
      navigate('/employees');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Add New Employee</h1>
          <p className="page-subtitle">Fill in the employee details below</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/employees')}>← Back</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3 className="form-section-title">Personal Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>First Name *</label>
                <input type="text" name="firstName" value={form.firstName} onChange={handleChange} required placeholder="e.g. John" />
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input type="text" name="lastName" value={form.lastName} onChange={handleChange} required placeholder="e.g. Doe" />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="john.doe@company.com" />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="text" name="phone" value={form.phone} onChange={handleChange} placeholder="555-0100" />
              </div>
              <div className="form-group">
                <label>Date of Birth</label>
                <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} />
              </div>
              <div className="form-group form-group--full">
                <label>Address</label>
                <input type="text" name="address" value={form.address} onChange={handleChange} placeholder="Street, City, Country" />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="form-section-title">Employment Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Department *</label>
                <select name="department" value={form.department} onChange={handleChange} required>
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Position *</label>
                <input type="text" name="position" value={form.position} onChange={handleChange} required placeholder="e.g. Software Engineer" />
              </div>
              <div className="form-group">
                <label>Date of Joining *</label>
                <input type="date" name="dateOfJoining" value={form.dateOfJoining} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Salary (USD)</label>
                <input type="number" name="salary" value={form.salary} onChange={handleChange} placeholder="50000" />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select name="status" value={form.status} onChange={handleChange}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on_leave">On Leave</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/employees')}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployee;
