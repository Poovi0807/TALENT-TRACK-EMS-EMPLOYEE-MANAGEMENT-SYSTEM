// Retests for F-01 (privilege escalation), F-02 (forged tokens), F-07 (login injection),
// F-09 (session handling) and F-10 (password rules) from SECURITY_REPORT.md
const jwt = require('jsonwebtoken');
const { connect, disconnect, seed, tokenFor, api, auth, PASSWORD, User } = require('./helpers');

let data;
beforeAll(async () => { await connect('auth'); data = await seed(); });
afterAll(disconnect);

describe('F-01 Privilege escalation at registration', () => {
  let newUser;

  test('a sign-up that asks for role "admin" is created as an employee', async () => {
    const res = await api().post('/api/auth/register')
      .send({ name: 'Attacker', email: 'attacker@test.com', password: 'Attack3rPass', role: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe('employee');
    newUser = await User.findOne({ email: 'attacker@test.com' });
    expect(newUser.role).toBe('employee');
  });

  test('the new account cannot use admin functions', async () => {
    const res = await api().delete(`/api/employees/${data.carol._id}`).set(auth(tokenFor(newUser)));
    expect(res.status).toBe(403);
  });

  test('only an admin can change roles', async () => {
    const asEmployee = await api().put(`/api/auth/users/${newUser._id}`)
      .set(auth(tokenFor(data.employee))).send({ role: 'admin' });
    expect(asEmployee.status).toBe(403);

    const asAdmin = await api().put(`/api/auth/users/${newUser._id}`)
      .set(auth(tokenFor(data.admin))).send({ role: 'manager' });
    expect(asAdmin.status).toBe(200);
    expect(asAdmin.body.role).toBe('manager');
  });

  test('an admin cannot change their own access', async () => {
    const res = await api().put(`/api/auth/users/${data.admin._id}`)
      .set(auth(tokenFor(data.admin))).send({ role: 'employee' });
    expect(res.status).toBe(400);
  });

  test('an invalid role value is rejected', async () => {
    const res = await api().put(`/api/auth/users/${newUser._id}`)
      .set(auth(tokenFor(data.admin))).send({ role: 'superuser' });
    expect(res.status).toBe(400);
  });
});

describe('F-02 Forged login tokens', () => {
  test('a token signed with any other secret is rejected', async () => {
    const forged = jwt.sign({ id: data.admin._id.toString() }, 'an-attacker-guessed-or-leaked-secret-value', { expiresIn: '1h' });
    const res = await api().get('/api/auth/me').set(auth(forged));
    expect(res.status).toBe(401);
  });

  test('an unsigned token ("alg": "none") is rejected', async () => {
    const unsigned = jwt.sign({ id: data.admin._id.toString() }, null, { algorithm: 'none' });
    const res = await api().get('/api/auth/me').set(auth(unsigned));
    expect(res.status).toBe(401);
  });

  test('requests without a token are rejected', async () => {
    const res = await api().get('/api/employees');
    expect(res.status).toBe(401);
  });
});

describe('F-07 NoSQL injection in login', () => {
  test('an email like {"$ne": null} is rejected', async () => {
    const res = await api().post('/api/auth/login').send({ email: { $ne: null }, password: PASSWORD });
    expect(res.status).toBe(400);
    expect(res.body.token).toBeUndefined();
  });

  test('a password like {"$ne": null} is rejected', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'admin@test.com', password: { $ne: null } });
    expect(res.status).toBe(400);
    expect(res.body.token).toBeUndefined();
  });
});

describe('F-09 Session handling', () => {
  test('a normal login works and its token expires after 1 hour', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'admin@test.com', password: PASSWORD });
    expect(res.status).toBe(200);
    const { iat, exp } = jwt.decode(res.body.token);
    expect(exp - iat).toBe(3600);
  });

  test('a deactivated account loses access immediately', async () => {
    const temp = await User.create({ name: 'Leaver', email: 'leaver@test.com', password: PASSWORD, role: 'employee' });
    const token = tokenFor(temp);
    expect((await api().get('/api/auth/me').set(auth(token))).status).toBe(200);

    await User.updateOne({ _id: temp._id }, { isActive: false });
    expect((await api().get('/api/auth/me').set(auth(token))).status).toBe(401);
  });

  test('a deactivated account cannot log in', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'leaver@test.com', password: PASSWORD });
    expect(res.status).toBe(401);
  });
});

describe('F-10 Passwords and account enumeration', () => {
  test('a weak password is rejected at sign-up', async () => {
    const res = await api().post('/api/auth/register')
      .send({ name: 'Weak', email: 'weak@test.com', password: 'abc123' });
    expect(res.status).toBe(400);
  });

  test('a wrong password and an unknown email get the same answer', async () => {
    const wrongPassword = await api().post('/api/auth/login').send({ email: 'admin@test.com', password: 'Wrong-pass1' });
    const unknownEmail = await api().post('/api/auth/login').send({ email: 'nobody@test.com', password: 'Wrong-pass1' });
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
  });

  test('password hashes are never returned', async () => {
    const me = await api().get('/api/auth/me').set(auth(tokenFor(data.admin)));
    expect(me.body.password).toBeUndefined();

    const users = await api().get('/api/auth/users').set(auth(tokenFor(data.admin)));
    expect(users.status).toBe(200);
    users.body.forEach((u) => expect(u.password).toBeUndefined());
  });
});
