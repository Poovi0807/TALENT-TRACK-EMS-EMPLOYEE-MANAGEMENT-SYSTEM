import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../../services/api';

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const validate = () => {
    if (!form.name.trim()) return 'Full name is required.';
    if (!form.email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid email address.';
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      return 'Password must be at least 8 characters and include a letter and a number.';
    }
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) return setError(validationError);

    setLoading(true);
    setError('');
    try {
      await register({ name: form.name, email: form.email, password: form.password });
      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    const p = form.password;
    if (!p) return null;
    if (p.length < 8) return { label: 'Too short', color: '#ef4444', width: '20%' };
    if (!/[A-Z]/.test(p) || !/[0-9]/.test(p)) return { label: 'Fair', color: '#f59e0b', width: '60%' };
    if (!/[^A-Za-z0-9]/.test(p)) return { label: 'Good', color: '#10b981', width: '80%' };
    return { label: 'Strong', color: '#10b981', width: '100%' };
  };

  const strength = getPasswordStrength();

  return (
    <div className="login-page">
      <div className="login-container register-container">
        <div className="login-header">
          <div className="login-logo">🏢</div>
          <h1>TalentTrack EMS</h1>
          <p>Create your account</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className="login-form">

          {/* Full Name */}
          <div className="form-group">
            <label>Full Name <span className="required">*</span></label>
            <div className="input-wrap">
              <span className="input-icon">👤</span>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. John Doe"
                required
                autoComplete="name"
              />
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label>Email Address <span className="required">*</span></label>
            <div className="input-wrap">
              <span className="input-icon">✉️</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@company.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label>Password <span className="required">*</span></label>
            <div className="input-wrap">
              <span className="input-icon">🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="At least 8 characters, a letter and a number"
                required
                autoComplete="new-password"
              />
              <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {strength && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div className="strength-fill" style={{ width: strength.width, background: strength.color }}></div>
                </div>
                <span className="strength-label" style={{ color: strength.color }}>{strength.label}</span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label>Confirm Password <span className="required">*</span></label>
            <div className="input-wrap">
              <span className="input-icon">🔒</span>
              <input
                type={showConfirm ? 'text' : 'password'}
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your password"
                required
                autoComplete="new-password"
              />
              <button type="button" className="toggle-password" onClick={() => setShowConfirm(!showConfirm)}>
                {showConfirm ? '🙈' : '👁️'}
              </button>
            </div>
            {form.confirmPassword && (
              <span className={`match-hint ${form.password === form.confirmPassword ? 'match-ok' : 'match-no'}`}>
                {form.password === form.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
              </span>
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading || !!success}>
            {loading ? (
              <span className="btn-loading"><span className="btn-spinner"></span> Creating account...</span>
            ) : 'Create Account'}
          </button>
        </form>

        <div className="auth-switch">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Sign in here</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
