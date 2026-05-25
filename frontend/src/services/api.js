import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const login = (data) => API.post('/auth/login', data);
export const register = (data) => API.post('/auth/register', data);
export const getMe = () => API.get('/auth/me');
export const getEmployees = (params) => API.get('/employees', { params });
export const getEmployee = (id) => API.get(`/employees/${id}`);
export const createEmployee = (data) => API.post('/employees', data);
export const updateEmployee = (id, data) => API.put(`/employees/${id}`, data);
export const deleteEmployee = (id) => API.delete(`/employees/${id}`);
export const checkIn = (employeeId) => API.post('/attendance/checkin', { employeeId });
export const checkOut = (employeeId) => API.post('/attendance/checkout', { employeeId });
export const getAttendance = (params) => API.get('/attendance', { params });
export const getTodayAttendance = () => API.get('/attendance/today');
export const applyLeave = (data) => API.post('/leaves', data);
export const getLeaves = (params) => API.get('/leaves', { params });
export const updateLeaveStatus = (id, data) => API.put(`/leaves/${id}/status`, data);
export const cancelLeave = (id) => API.put(`/leaves/${id}/cancel`);
export const getDashboardStats = () => API.get('/dashboard/stats');
