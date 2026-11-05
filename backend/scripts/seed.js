require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Employee = require('../models/Employee');

// Security fix (F-11): no shared, published demo password.
// Uses SEED_PASSWORD from .env if set, otherwise generates a random one and prints it once.
const seedPassword = process.env.SEED_PASSWORD || `${crypto.randomBytes(9).toString('base64url')}7a`;

const seed = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to seed demo data when NODE_ENV=production.');
    process.exit(1);
  }
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is missing. Set it in backend/.env (see .env.example).');
    process.exit(1);
  }
  if (seedPassword.length < 8 || !/[A-Za-z]/.test(seedPassword) || !/\d/.test(seedPassword)) {
    console.error('SEED_PASSWORD must be at least 8 characters and include a letter and a number.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');
  await User.deleteMany({});
  await Employee.deleteMany({});

  // employeeCode is set here because insertMany does not run the model's save hook
  const employees = await Employee.insertMany([
    { employeeCode: 'EMP0001', firstName: 'Alice', lastName: 'Johnson', email: 'alice@talenttrack.com', phone: '555-0101', department: 'Engineering', position: 'Senior Developer', dateOfJoining: new Date('2022-01-15'), salary: 85000, status: 'active' },
    { employeeCode: 'EMP0002', firstName: 'Bob', lastName: 'Smith', email: 'bob@talenttrack.com', phone: '555-0102', department: 'HR', position: 'HR Manager', dateOfJoining: new Date('2021-03-10'), salary: 72000, status: 'active' },
    { employeeCode: 'EMP0003', firstName: 'Carol', lastName: 'Williams', email: 'carol@talenttrack.com', phone: '555-0103', department: 'Finance', position: 'Financial Analyst', dateOfJoining: new Date('2023-06-01'), salary: 68000, status: 'active' },
    { employeeCode: 'EMP0004', firstName: 'David', lastName: 'Brown', email: 'david@talenttrack.com', phone: '555-0104', department: 'Marketing', position: 'Marketing Lead', dateOfJoining: new Date('2022-09-20'), salary: 70000, status: 'active' },
    { employeeCode: 'EMP0005', firstName: 'Emma', lastName: 'Davis', email: 'emma@talenttrack.com', phone: '555-0105', department: 'Engineering', position: 'Frontend Developer', dateOfJoining: new Date('2023-01-08'), salary: 75000, status: 'active' },
  ]);

  const hashedPassword = await bcrypt.hash(seedPassword, 12);
  await User.insertMany([
    { name: 'Admin User', email: 'admin@talenttrack.com', password: hashedPassword, role: 'admin' },
    { name: 'Bob Smith', email: 'manager@talenttrack.com', password: hashedPassword, role: 'manager', employeeId: employees[1]._id },
    { name: 'Alice Johnson', email: 'employee@talenttrack.com', password: hashedPassword, role: 'employee', employeeId: employees[0]._id },
  ]);

  console.log('Seed data created. Local demo accounts:');
  console.log('  admin@talenttrack.com  |  manager@talenttrack.com  |  employee@talenttrack.com');
  console.log(process.env.SEED_PASSWORD
    ? '  Password: the SEED_PASSWORD from your .env file'
    : `  Password (generated, shown only now): ${seedPassword}`);
  await mongoose.disconnect();
};

seed().catch(err => { console.error(err); process.exit(1); });
