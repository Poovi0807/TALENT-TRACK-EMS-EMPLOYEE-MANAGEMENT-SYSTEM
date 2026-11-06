// Retest for F-10 (no brute-force protection). Kept in its own file so the login limit
// starts fresh and does not affect other tests.
const { connect, disconnect, seed, api } = require('./helpers');

beforeAll(async () => { await connect('ratelimit'); await seed(); });
afterAll(disconnect);

test('F-10 login is blocked after 10 attempts in 15 minutes', async () => {
  for (let i = 0; i < 10; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const res = await api().post('/api/auth/login').send({ email: 'admin@test.com', password: `Guess${i}pass` });
    expect(res.status).toBe(401);
  }
  const blocked = await api().post('/api/auth/login').send({ email: 'admin@test.com', password: 'Guess10pass' });
  expect(blocked.status).toBe(429);
});
