import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/dashboard/Dashboard';
import EmployeeList from './pages/employees/EmployeeList';
import AddEmployee from './pages/employees/AddEmployee';
import EditEmployee from './pages/employees/EditEmployee';
import Attendance from './pages/attendance/Attendance';
import LeaveManagement from './pages/leaves/LeaveManagement';
import './App.css';

const Layout = ({ children }) => (
  <>
    <Navbar />
    <main className="main-content">{children}</main>
  </>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/"         element={<Navigate to="/dashboard" />} />

          {/* Protected routes */}
          <Route path="/dashboard" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
          <Route path="/employees" element={<PrivateRoute><Layout><EmployeeList /></Layout></PrivateRoute>} />
          <Route path="/employees/add" element={<PrivateRoute><Layout><AddEmployee /></Layout></PrivateRoute>} />
          <Route path="/employees/edit/:id" element={<PrivateRoute><Layout><EditEmployee /></Layout></PrivateRoute>} />
          <Route path="/attendance" element={<PrivateRoute><Layout><Attendance /></Layout></PrivateRoute>} />
          <Route path="/leaves" element={<PrivateRoute><Layout><LeaveManagement /></Layout></PrivateRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
