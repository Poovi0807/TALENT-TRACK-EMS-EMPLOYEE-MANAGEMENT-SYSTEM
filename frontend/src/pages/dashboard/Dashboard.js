import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats, getTodayAttendance } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/StatCard';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, attendanceRes] = await Promise.all([
          getDashboardStats(),
          getTodayAttendance(),
        ]);
        setStats(statsRes.data);
        setTodayAttendance(attendanceRes.data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.name}! Here's what's happening today.</p>
        </div>
        <span className="date-badge">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>

      <div className="stats-grid">
        <StatCard title="Total Employees" value={stats?.totalEmployees || 0} icon="👥" color="blue" subtitle="All registered" />
        <StatCard title="Active Employees" value={stats?.activeEmployees || 0} icon="✅" color="green" subtitle="Currently active" />
        <StatCard title="Present Today" value={todayAttendance.length} icon="🕐" color="purple" subtitle="Checked in" />
        <StatCard title="Pending Leaves" value={stats?.pendingLeaves || 0} icon="📋" color="orange" subtitle="Awaiting approval" />
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Department Overview</h2>
            <Link to="/employees" className="card-link">View All →</Link>
          </div>
          <div className="dept-list">
            {stats?.departmentStats?.map(dept => (
              <div key={dept._id} className="dept-item">
                <span className="dept-name">{dept._id}</span>
                <div className="dept-bar-wrap">
                  <div className="dept-bar" style={{ width: `${(dept.count / (stats.totalEmployees || 1)) * 100}%` }}></div>
                </div>
                <span className="dept-count">{dept.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Today's Attendance</h2>
            <Link to="/attendance" className="card-link">View All →</Link>
          </div>
          {todayAttendance.length === 0 ? (
            <p className="empty-state">No attendance records for today yet.</p>
          ) : (
            <div className="attendance-list">
              {todayAttendance.slice(0, 8).map(record => (
                <div key={record._id} className="attendance-item">
                  <div className="att-avatar">{record.employee?.firstName?.[0]}</div>
                  <div className="att-info">
                    <span className="att-name">{record.employee?.firstName} {record.employee?.lastName}</span>
                    <span className="att-dept">{record.employee?.department}</span>
                  </div>
                  <div className="att-times">
                    <span className="att-in">In: {record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</span>
                    <span className="att-out">Out: {record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</span>
                  </div>
                  <span className={`status-badge status-${record.status}`}>{record.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="quick-actions">
        <h2 className="section-title">Quick Actions</h2>
        <div className="action-cards">
          <Link to="/employees/add" className="action-card action-card--blue">
            <span className="action-icon">➕</span>
            <span>Add Employee</span>
          </Link>
          <Link to="/attendance" className="action-card action-card--green">
            <span className="action-icon">🕐</span>
            <span>Mark Attendance</span>
          </Link>
          <Link to="/leaves" className="action-card action-card--orange">
            <span className="action-icon">📝</span>
            <span>Apply Leave</span>
          </Link>
          <Link to="/employees" className="action-card action-card--purple">
            <span className="action-icon">👁️</span>
            <span>View Employees</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
