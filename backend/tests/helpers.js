const mongoose = require('mongoose');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');
const Employee = require('../models/Employee');

const PASSWORD = 'TestPassw0rd';

// Safety guard: tests delete all data, so they only ever run on a database whose name ends in "_test"
const connect = async (suffix) => {
  const base = process.env.MONGODB_URI_TEST;
  const dbName = new URL(base).pathname.replace('/', '');
  if (!dbName.endsWith('_test')) {
    throw new Error(`Refusing to run tests: database "${dbName}" does not end with "_test"`);
  }
  // Each test file gets its own database, e.g. talenttrack_test_access
  const url = new URL(base);
  url.pathname = `/${dbName}_${suffix}`;
  try {
    await mongoose.connect(url.toString(), { serverSelectionTimeoutMS: 5000 });
  } catch (error) {
    throw new Error(
      `Cannot reach MongoDB at ${url.host}. Is MongoDB running? `
      + 'On Windows: open PowerShell as administrator and run "Start-Service MongoDB".',
    );
  }
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
};

const disconnect = async () => {
  if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
};

// Creates the test company: 3 employees and admin / manager / employee accounts
const seed = async () => {
  const [alice, bob, carol] = await Employee.create([
    { firstName: 'Alice', lastName: 'Employee', email: 'alice@test.com', department: 'Engineering', position: 'Developer', dateOfJoining: '2022-01-15', dateOfBirth: '1995-05-05', address: 'Alice Street 1', salary: 60000 },
    { firstName: 'Bob', lastName: 'Manager', email: 'bob@test.com', department: 'HR', position: 'HR Manager', dateOfJoining: '2021-03-10', salary: 80000 },
    { firstName: 'Carol', lastName: 'Colleague', email: 'carol@test.com', department: 'Finance', position: 'Analyst', dateOfJoining: '2023-06-01', salary: 65000 },
  ], { ordered: true }); // one after another, so employee codes are EMP0001, EMP0002, EMP0003
  const [admin, manager, employee] = await User.create([
    { name: 'Admin', email: 'admin@test.com', password: PASSWORD, role: 'admin' },
    { name: 'Bob Manager', email: 'manager@test.com', password: PASSWORD, role: 'manager', employeeId: bob._id },
    { name: 'Alice Employee', email: 'employee@test.com', password: PASSWORD, role: 'employee', employeeId: alice._id },
  ]);
  return { alice, bob, carol, admin, manager, employee };
};

// Tokens are signed directly (not through /login) so the login rate limit is only tested on purpose
const tokenFor = (user) => jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });

const api = () => request(app);
const auth = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { connect, disconnect, seed, tokenFor, api, auth, PASSWORD, User, Employee };
