// Tests for the Part 3 additional security features (IIE, 2026c):
//  1. account lockout after repeated failed sign-ins (OWASP, 2024c)
//  2. server-side logout that revokes issued tokens (OWASP, 2024e)
//  3. the administrator role and its read-only security view (OWASP, 2021)
const request = require('supertest');
const app = require('../src/app');
const config = require('../src/config/env');
const userRepository = require('../src/repositories/userRepository');
const authService = require('../src/services/authService');

let serial = 0;
const PASSWORD = 'Passw0rd123';
async function account(role) {
  const email = `feature-${Date.now()}-${serial++}@example.com`;
  await request(app).post('/api/auth/register').send({ email, password: PASSWORD, role });
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return { email, ...res.body.data.user, token: res.body.data.token };
}
async function adminAccount() {
  const email = `admin-${Date.now()}-${serial++}@example.com`;
  await userRepository.create({ email, passwordHash: await authService.hashPassword(PASSWORD), role: 'admin' });
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return { email, ...res.body.data.user, token: res.body.data.token };
}
const bearer = (user) => ({ Authorization: `Bearer ${user.token}` });
const attempt = (email, password) => request(app).post('/api/auth/login').send({ email, password });

describe('account lockout', () => {
  test('locks the account after the configured number of failures, even for the right password', async () => {
    const victim = await account('client');
    for (let i = 0; i < config.lockoutMaxAttempts; i += 1) {
      const res = await attempt(victim.email, 'WrongPass123');
      expect(res.status).toBe(401);
    }
    const blocked = await attempt(victim.email, PASSWORD);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    expect(blocked.body.message).toMatch(/temporarily locked/i);
  });

  test('does not lock other accounts', async () => {
    const victim = await account('client');
    const bystander = await account('client');
    for (let i = 0; i < config.lockoutMaxAttempts; i += 1) await attempt(victim.email, 'WrongPass123');
    expect((await attempt(bystander.email, PASSWORD)).status).toBe(200);
  });

  test('a successful sign-in resets the failure counter', async () => {
    const user = await account('client');
    for (let i = 0; i < config.lockoutMaxAttempts - 1; i += 1) await attempt(user.email, 'WrongPass123');
    expect((await attempt(user.email, PASSWORD)).status).toBe(200);
    // Counter was reset, so another run of (max - 1) failures must not lock the account.
    for (let i = 0; i < config.lockoutMaxAttempts - 1; i += 1) await attempt(user.email, 'WrongPass123');
    expect((await attempt(user.email, PASSWORD)).status).toBe(200);
  });

  test('the lock ends when the lock time has passed', async () => {
    const user = await account('client');
    for (let i = 0; i < config.lockoutMaxAttempts; i += 1) await attempt(user.email, 'WrongPass123');
    expect((await attempt(user.email, PASSWORD)).status).toBe(429);
    const stored = await userRepository.findByEmail(user.email);
    stored.lockUntil = new Date(Date.now() - 1000);
    expect((await attempt(user.email, PASSWORD)).status).toBe(200);
  });

  test('lockout data is never exposed through the API', async () => {
    const user = await account('client');
    await attempt(user.email, 'WrongPass123');
    const profile = await request(app).get('/api/auth/profile').set(bearer(user));
    expect(Object.keys(profile.body.data.user).sort()).toEqual(['createdAt', 'email', 'id', 'role']);
  });
});

describe('server-side logout (token revocation)', () => {
  test('a token stops working after logout, and a new login works again', async () => {
    const user = await account('client');
    expect((await request(app).get('/api/auth/profile').set(bearer(user))).status).toBe(200);

    const out = await request(app).post('/api/auth/logout').set(bearer(user));
    expect(out.status).toBe(200);
    const reuse = await request(app).get('/api/auth/profile').set(bearer(user));
    expect(reuse.status).toBe(401);
    expect(reuse.body.message).toBe('Invalid or expired token.');

    const again = await attempt(user.email, PASSWORD);
    expect(again.status).toBe(200);
    const fresh = await request(app).get('/api/auth/profile').set({ Authorization: `Bearer ${again.body.data.token}` });
    expect(fresh.status).toBe(200);
  });

  test('logout needs a valid token', async () => {
    expect((await request(app).post('/api/auth/logout')).status).toBe(401);
  });

  test('logging out one user does not affect another', async () => {
    const a = await account('client');
    const b = await account('freelancer');
    await request(app).post('/api/auth/logout').set(bearer(a));
    expect((await request(app).get('/api/auth/profile').set(bearer(b))).status).toBe(200);
  });
});

describe('administrator role', () => {
  test.each(['/api/admin/overview', '/api/admin/users', '/api/admin/security-events'])('%s rejects missing tokens', async (url) => {
    expect((await request(app).get(url)).status).toBe(401);
  });

  test.each(['client', 'freelancer'])('%s accounts cannot use admin endpoints', async (role) => {
    const user = await account(role);
    for (const url of ['/api/admin/overview', '/api/admin/users', '/api/admin/security-events']) {
      expect((await request(app).get(url).set(bearer(user))).status).toBe(403);
    }
  });

  test('public registration still cannot create an admin', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: `sneaky-${Date.now()}@example.com`, password: PASSWORD, role: 'admin' });
    expect(res.status).toBe(400);
  });

  test('an admin sees platform totals', async () => {
    await account('client');
    await account('freelancer');
    const admin = await adminAccount();
    const res = await request(app).get('/api/admin/overview').set(bearer(admin));
    expect(res.status).toBe(200);
    const { users, gigs, bookings, transactions } = res.body.data;
    expect(users.admin).toBeGreaterThanOrEqual(1);
    expect(users.total).toBe(users.client + users.freelancer + users.admin);
    expect(gigs).toEqual(expect.objectContaining({ total: expect.any(Number), active: expect.any(Number) }));
    expect(typeof bookings).toBe('number');
    expect(transactions).toEqual(expect.objectContaining({ count: expect.any(Number), value: expect.any(Number) }));
  });

  test('the user list contains no password hashes or security counters, and flags locked accounts', async () => {
    const target = await account('client');
    for (let i = 0; i < config.lockoutMaxAttempts; i += 1) await attempt(target.email, 'WrongPass123');
    const admin = await adminAccount();
    const res = await request(app).get('/api/admin/users?limit=200').set(bearer(admin));
    expect(res.status).toBe(200);
    const row = res.body.data.users.find((u) => u.email === target.email);
    expect(row.locked).toBe(true);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|tokenVersion|failedLoginAttempts|\$2[aby]\$/);
  });

  test('security events can be read and the limit is validated', async () => {
    const admin = await adminAccount();
    const ok = await request(app).get('/api/admin/security-events?limit=5').set(bearer(admin));
    expect(ok.status).toBe(200);
    expect(Array.isArray(ok.body.data.events)).toBe(true);
    expect((await request(app).get('/api/admin/security-events?limit=9999').set(bearer(admin))).status).toBe(400);
    expect((await request(app).get('/api/admin/users?limit=abc').set(bearer(admin))).status).toBe(400);
  });
});

describe('JWT algorithm pinning', () => {
  const jwt = require('jsonwebtoken');
  test('a token signed with another HMAC algorithm is refused even with the right secret', async () => {
    const user = await account('client');
    const forged = jwt.sign({ sub: user.id, role: 'client', tv: 0 }, config.jwtSecret, { algorithm: 'HS512', issuer: 'hustlehub-plus-api', expiresIn: '1h' });
    expect((await request(app).get('/api/auth/profile').set({ Authorization: `Bearer ${forged}` })).status).toBe(401);
  });
  test('an unsigned ("alg": "none") token is refused', async () => {
    const user = await account('client');
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const unsigned = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: user.id, role: 'admin', iss: 'hustlehub-plus-api', exp: Math.floor(Date.now() / 1000) + 3600 })}.`;
    expect((await request(app).get('/api/admin/overview').set({ Authorization: `Bearer ${unsigned}` })).status).toBe(401);
  });
  test('a correctly signed HS256 token still works', async () => {
    const user = await account('client');
    expect((await request(app).get('/api/auth/profile').set({ Authorization: `Bearer ${user.token}` })).status).toBe(200);
  });
});
