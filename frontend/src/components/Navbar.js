import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/employees', label: 'Employees' },
    { path: '/attendance', label: 'Attendance' },
    { path: '/leaves', label: 'Leave Management' },
  ];

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="brand-icon">🏢</span>
        <span className="brand-text">TalentTrack EMS</span>
      </div>
      <div className="navbar-links">
        {navLinks.map(link => (
          <Link key={link.path} to={link.path} className={`nav-link ${isActive(link.path) ? 'active' : ''}`}>
            {link.label}
          </Link>
        ))}
      </div>
      <div className="navbar-user">
        <span className="user-info">
          <span className="user-avatar">{user?.name?.[0]?.toUpperCase()}</span>
          <span className="user-name">{user?.name}</span>
          <span className="user-role">{user?.role}</span>
        </span>
        <button className="btn-logout" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
};

export default Navbar;
