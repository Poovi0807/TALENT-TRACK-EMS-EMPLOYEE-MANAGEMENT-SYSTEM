require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Employee = require('../models/Employee');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/talenttrack');
  console.log('Connected to MongoDB');
  await User.deleteMany({});
  await Employee.deleteMany({});

  const employees = await Employee.insertMany([
    { firstName: 'Alice', lastName: 'Johnson', email: 'alice@talenttrack.com', phone: '555-0101', department: 'Engineering', position: 'Senior Developer', dateOfJoining: new Date('2022-01-15'), salary: 85000, status: 'active' },
    { firstName: 'Bob', lastName: 'Smith', email: 'bob@talenttrack.com', phone: '555-0102', department: 'HR', position: 'HR Manager', dateOfJoining: new Date('2021-03-10'), salary: 72000, status: 'active' },
    { firstName: 'Carol', lastName: 'Williams', email: 'carol@talenttrack.com', phone: '555-0103', department: 'Finance', position: 'Financial Analyst', dateOfJoining: new Date('2023-06-01'), salary: 68000, status: 'active' },
    { firstName: 'David', lastName: 'Brown', email: 'david@talenttrack.com', phone: '555-0104', department: 'Marketing', position: 'Marketing Lead', dateOfJoining: new Date('2022-09-20'), salary: 70000, status: 'active' },
    { firstName: 'Emma', lastName: 'Davis', email: 'emma@talenttrack.com', phone: '555-0105', department: 'Engineering', position: 'Frontend Developer', dateOfJoining: new Date('2023-01-08'), salary: 75000, status: 'active' },
  ]);

  const hashedPassword = await bcrypt.hash('password123', 12);
  await User.insertMany([
    { name: 'Admin User', email: 'admin@talenttrack.com', password: hashedPassword, role: 'admin' },
    { name: 'Bob Smith', email: 'manager@talenttrack.com', password: hashedPassword, role: 'manager', employeeId: employees[1]._id },
    { name: 'Alice Johnson', email: 'employee@talenttrack.com', password: hashedPassword, role: 'employee', employeeId: employees[0]._id },
  ]);

  console.log('✅ Seed data created!');
  console.log('Admin:    admin@talenttrack.com    / password123');
  console.log('Manager:  manager@talenttrack.com  / password123');
  console.log('Employee: employee@talenttrack.com / password123');
  await mongoose.disconnect();
};

seed().catch(err => { console.error(err); process.exit(1); });
