// Retests for F-07 (NoSQL injection in filters), F-12 (ReDoS), F-13 (hardening)
// and the employee-code bug
const { connect, disconnect, seed, tokenFor, api, auth } = require('./helpers');

let data;
let mgr; let admin;

beforeAll(async () => {
  await connect('hardening');
  data = await seed();
  mgr = tokenFor(data.manager);
  admin = tokenFor(data.admin);
});
afterAll(disconnect);

describe('F-07 NoSQL injection in filters and input', () => {
  test('a query like ?status[$ne]=cancelled does not change the filter', async () => {
    const leave = await api().post('/api/leaves').set(auth(mgr)).send({
      employee: data.carol._id.toString(), leaveType: 'casual', startDate: '2026-12-01', endDate: '2026-12-01', reason: 'Errand',
    });
    await api().put(`/api/leaves/${leave.body._id}/cancel`).set(auth(mgr));

    const res = await api().get('/api/leaves?status[$ne]=cancelled').set(auth(mgr));
    expect(res.status).toBe(200);
    // the operator is ignored, so the cancelled leave is still listed
    expect(res.body.some((l) => l._id === leave.body._id && l.status === 'cancelled')).toBe(true);
  });

  test('operators inside a JSON body are removed', async () => {
    const res = await api().post('/api/employees').set(auth(admin)).send({
      firstName: { $gt: '' }, lastName: 'Test', email: 'op@test.com', department: 'IT', position: 'Tester', dateOfJoining: '2024-01-01',
    });
    expect(res.status).toBe(400);
  });

  test('an unknown status value is ignored, not used as a filter', async () => {
    const all = await api().get('/api/employees').set(auth(admin));
    const res = await api().get('/api/employees?status=whatever').set(auth(admin));
    expect(res.body.length).toBe(all.body.length);
  });
});

describe('F-12 Regular expressions in search', () => {
  test('search text is treated as plain text, not as a pattern', async () => {
    const pattern = await api().get('/api/employees?search=.*').set(auth(admin));
    expect(pattern.body.length).toBe(0);

    const name = await api().get('/api/employees?search=ali').set(auth(admin));
    expect(name.body.map((e) => e.firstName)).toEqual(['Alice']);
  });

  test('an expensive pattern returns quickly with no results', async () => {
    const started = Date.now();
    const res = await api().get(`/api/employees?search=${encodeURIComponent('(.*a){25}')}`).set(auth(admin));
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(0);
    expect(Date.now() - started).toBeLessThan(2000);
  });

  test('very long search text is ignored', async () => {
    const res = await api().get(`/api/employees?search=${'a'.repeat(500)}`).set(auth(admin));
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(3);
  });
});

describe('F-13 Error messages and security headers', () => {
  test('security headers are present and Express is not advertised', async () => {
    const res = await api().get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  test('an invalid id gives a clear message without internal details', async () => {
    const res = await api().get('/api/employees/abc').set(auth(admin));
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid employee id');
    expect(JSON.stringify(res.body)).not.toMatch(/Cast|mongoose|stack/i);
  });

  test('broken JSON gives a generic message', async () => {
    const res = await api().post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid JSON');
  });

  test('requests that are too large are refused', async () => {
    const res = await api().post('/api/auth/register').send({ name: 'x'.repeat(200 * 1024) });
    expect(res.status).toBe(413);
  });

  test('unknown routes return a plain 404', async () => {
    const res = await api().get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Not found');
  });
});

describe('Employee code bug', () => {
  test('a new employee can still be added after another one is deleted', async () => {
    expect((await api().delete(`/api/employees/${data.alice._id}`).set(auth(admin))).status).toBe(200);
    const res = await api().post('/api/employees').set(auth(admin)).send({
      firstName: 'Dave', lastName: 'New', email: 'dave@test.com', department: 'IT', position: 'Engineer', dateOfJoining: '2026-11-01',
    });
    expect(res.status).toBe(201);
    expect(res.body.employeeCode).toBe('EMP0004');
  });
});
