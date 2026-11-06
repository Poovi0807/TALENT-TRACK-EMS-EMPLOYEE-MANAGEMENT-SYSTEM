// Retests for F-03 (mass assignment), F-08 (approval workflow) and F-15 (audit log)
const { connect, disconnect, seed, tokenFor, api, auth, Employee } = require('./helpers');

let data;
let emp; let mgr; let admin;

const applyLeave = (token, body) => api().post('/api/leaves').set(auth(token)).send({
  leaveType: 'annual', startDate: '2026-12-01', endDate: '2026-12-03', reason: 'Holiday', ...body,
});
const decide = (token, id, body) => api().put(`/api/leaves/${id}/status`).set(auth(token)).send(body);
const annualBalance = async (employeeId) => (await Employee.findById(employeeId)).leaveBalance.annual;

beforeAll(async () => {
  await connect('leave');
  data = await seed();
  emp = tokenFor(data.employee);
  mgr = tokenFor(data.manager);
  admin = tokenFor(data.admin);
});
afterAll(disconnect);

describe('F-03 Mass assignment when applying for leave', () => {
  test('"status": "approved" in a new request is ignored', async () => {
    const res = await applyLeave(emp, { status: 'approved', approvedBy: data.bob._id.toString() });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending');
    expect(res.body.approvedBy).toBeUndefined();
  });

  test('an end date before the start date is rejected', async () => {
    const res = await applyLeave(emp, { startDate: '2026-12-10', endDate: '2026-12-01' });
    expect(res.status).toBe(400);
  });

  test('an unknown leave type is rejected', async () => {
    const res = await applyLeave(emp, { leaveType: 'bonus-holiday' });
    expect(res.status).toBe(400);
  });
});

describe('F-08 Leave approval workflow', () => {
  let leaveId;

  test('a manager approves a pending leave and the balance is deducted once', async () => {
    const leave = await applyLeave(emp, {});
    leaveId = leave.body._id;
    expect(leave.body.totalDays).toBe(3);

    const before = await annualBalance(data.alice._id);
    const res = await decide(mgr, leaveId, { status: 'approved', approvedBy: data.carol._id.toString() });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
    expect(await annualBalance(data.alice._id)).toBe(before - 3);
  });

  test('the approver is taken from the login, not from the request', async () => {
    const res = await api().get('/api/leaves').set(auth(mgr));
    const leave = res.body.find((l) => l._id === leaveId);
    expect(leave.approvedBy.firstName).toBe('Bob');
  });

  test('an approved leave cannot be approved again or reopened', async () => {
    const before = await annualBalance(data.alice._id);
    expect((await decide(mgr, leaveId, { status: 'approved' })).status).toBe(400);
    expect((await decide(mgr, leaveId, { status: 'pending' })).status).toBe(400);
    expect(await annualBalance(data.alice._id)).toBe(before);
  });

  test('nobody can approve their own leave', async () => {
    const own = await applyLeave(mgr, { reason: 'Manager holiday' });
    expect(own.body.employee._id).toBe(data.bob._id.toString());
    expect((await decide(mgr, own.body._id, { status: 'approved' })).status).toBe(403);
    // an independent reviewer (here the admin) can approve it
    expect((await decide(admin, own.body._id, { status: 'approved' })).status).toBe(200);
  });

  test('employees cannot approve leave', async () => {
    const leave = await applyLeave(emp, { startDate: '2026-12-20', endDate: '2026-12-20' });
    expect((await decide(emp, leave.body._id, { status: 'approved' })).status).toBe(403);
  });

  test('leave is not approved when the balance is too low', async () => {
    const leave = await applyLeave(emp, { leaveType: 'sick', startDate: '2027-01-01', endDate: '2027-01-20', reason: 'Long illness' });
    const res = await decide(mgr, leave.body._id, { status: 'approved' });
    expect(res.status).toBe(400);
    const list = await api().get('/api/leaves').set(auth(mgr));
    expect(list.body.find((l) => l._id === leave.body._id).status).toBe('pending');
  });

  test('an employee can cancel their own pending leave, but not an approved one', async () => {
    const pending = await applyLeave(emp, { startDate: '2027-02-01', endDate: '2027-02-01' });
    expect((await api().put(`/api/leaves/${pending.body._id}/cancel`).set(auth(emp))).status).toBe(200);
    expect((await api().put(`/api/leaves/${leaveId}/cancel`).set(auth(emp))).status).toBe(400);
  });
});

describe('F-15 Audit log', () => {
  test('approvals are recorded with who did them', async () => {
    const res = await api().get('/api/audit-logs?action=leave.approve').set(auth(admin));
    expect(res.status).toBe(200);
    expect(res.body.some((log) => log.actorEmail === 'manager@test.com' && log.targetType === 'Leave')).toBe(true);
  });

  test('only admins can read the audit log', async () => {
    expect((await api().get('/api/audit-logs').set(auth(emp))).status).toBe(403);
    expect((await api().get('/api/audit-logs').set(auth(mgr))).status).toBe(403);
  });
});
