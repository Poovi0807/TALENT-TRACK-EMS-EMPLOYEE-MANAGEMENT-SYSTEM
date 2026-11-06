// Retests for F-04 (acting as other employees), F-05 (sensitive data) and F-06 (manager over-permission)
const { connect, disconnect, seed, tokenFor, api, auth, PASSWORD, User, Employee } = require('./helpers');

const SENSITIVE = ['salary', 'dateOfBirth', 'address', 'leaveBalance'];
let data;
let emp; let mgr; let admin;

beforeAll(async () => {
  await connect('access');
  data = await seed();
  emp = tokenFor(data.employee);
  mgr = tokenFor(data.manager);
  admin = tokenFor(data.admin);
});
afterAll(disconnect);

describe('F-05 Sensitive personal data', () => {
  test("employees do not receive colleagues' salary, date of birth, address or leave balance", async () => {
    const res = await api().get('/api/employees').set(auth(emp));
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(3);
    res.body.forEach((e) => SENSITIVE.forEach((field) => expect(e).not.toHaveProperty(field)));
  });

  test("an employee cannot open a colleague's full record", async () => {
    const res = await api().get(`/api/employees/${data.carol._id}`).set(auth(emp));
    expect(res.status).toBe(200);
    SENSITIVE.forEach((field) => expect(res.body).not.toHaveProperty(field));
  });

  test('an employee can see their own full record', async () => {
    const res = await api().get(`/api/employees/${data.alice._id}`).set(auth(emp));
    expect(res.body.salary).toBe(60000);
  });

  test('managers still see full employee details', async () => {
    const res = await api().get('/api/employees').set(auth(mgr));
    expect(res.body.every((e) => typeof e.salary === 'number')).toBe(true);
  });
});

describe('F-04 Acting as other employees (IDOR)', () => {
  test('an employee who tries to check in a colleague is checked in themselves', async () => {
    const res = await api().post('/api/attendance/checkin').set(auth(emp)).send({ employeeId: data.carol._id.toString() });
    expect(res.status).toBe(201);
    expect(res.body.employee).toBe(data.alice._id.toString());
  });

  test("an employee only sees their own attendance, even when asking for a colleague's", async () => {
    await api().post('/api/attendance/checkin').set(auth(mgr)).send({ employeeId: data.carol._id.toString() });
    const res = await api().get(`/api/attendance?employeeId=${data.carol._id}`).set(auth(emp));
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach((r) => expect(r.employee._id).toBe(data.alice._id.toString()));
  });

  test('an employee who files leave for a colleague files it for themselves', async () => {
    const res = await api().post('/api/leaves').set(auth(emp)).send({
      employee: data.carol._id.toString(), leaveType: 'casual', startDate: '2026-12-01', endDate: '2026-12-01', reason: 'Appointment',
    });
    expect(res.status).toBe(201);
    expect(res.body.employee._id).toBe(data.alice._id.toString());
  });

  test("an employee cannot cancel a colleague's leave", async () => {
    const carolLeave = await api().post('/api/leaves').set(auth(mgr)).send({
      employee: data.carol._id.toString(), leaveType: 'sick', startDate: '2026-12-02', endDate: '2026-12-02', reason: 'Doctor visit',
    });
    expect(carolLeave.status).toBe(201);
    const res = await api().put(`/api/leaves/${carolLeave.body._id}/cancel`).set(auth(emp));
    expect(res.status).toBe(403);
  });

  test("an employee only sees their own leave requests, even when asking for a colleague's", async () => {
    const res = await api().get(`/api/leaves?employeeId=${data.carol._id}`).set(auth(emp));
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    res.body.forEach((l) => expect(l.employee._id).toBe(data.alice._id.toString()));
  });

  test('an account not linked to an employee record cannot check in', async () => {
    const unlinked = await User.create({ name: 'New Joiner', email: 'new@test.com', password: PASSWORD, role: 'employee' });
    const res = await api().post('/api/attendance/checkin').set(auth(tokenFor(unlinked))).send({});
    expect(res.status).toBe(403);
  });
});

describe('F-06 Manager permissions on employee records', () => {
  test("a manager cannot change a colleague's salary or leave balance", async () => {
    const res = await api().put(`/api/employees/${data.carol._id}`).set(auth(mgr))
      .send({ position: 'Senior Analyst', salary: 999999, leaveBalance: { annual: 200 } });
    expect(res.status).toBe(200);
    const carol = await Employee.findById(data.carol._id);
    expect(carol.position).toBe('Senior Analyst');
    expect(carol.salary).toBe(65000);
    expect(carol.leaveBalance.annual).toBe(15);
  });

  test('a manager cannot edit their own employee record', async () => {
    const res = await api().put(`/api/employees/${data.bob._id}`).set(auth(mgr)).send({ salary: 999999 });
    expect(res.status).toBe(403);
  });

  test('an admin can change salary', async () => {
    const res = await api().put(`/api/employees/${data.carol._id}`).set(auth(admin)).send({ salary: 70000 });
    expect(res.status).toBe(200);
    expect(res.body.salary).toBe(70000);
  });

  test('employees cannot create or delete employees, and managers cannot delete', async () => {
    const create = await api().post('/api/employees').set(auth(emp)).send({ firstName: 'X' });
    const delAsEmployee = await api().delete(`/api/employees/${data.carol._id}`).set(auth(emp));
    const delAsManager = await api().delete(`/api/employees/${data.carol._id}`).set(auth(mgr));
    expect(create.status).toBe(403);
    expect(delAsEmployee.status).toBe(403);
    expect(delAsManager.status).toBe(403);
  });
});
