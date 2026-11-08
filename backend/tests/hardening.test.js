// Tests for the fixes made during the final security review (IIE, 2026c; OWASP, 2024k):
//  - user enumeration: unknown and real addresses must be indistinguishable (status, message, lockout, timing)
//  - the token middleware must not reveal that an account no longer exists
//  - the input sanitiser must escape markup but never alter passwords or pollute prototypes
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const request = require('supertest');
const app = require('../src/app');
const config = require('../src/config/env');
const authService = require('../src/services/authService');
const identifierThrottle = require('../src/utils/identifierThrottle');
const { clean } = require('../src/middleware/sanitizeInput');

const PASSWORD = 'Passw0rd123';
let serial = 0;
const freshEmail = (label) => `${label}-${Date.now()}-${serial++}@example.com`;
const attempt = (email, password) => request(app).post('/api/auth/login').send({ email, password });
async function realAccount() {
  const email = freshEmail('real');
  const res = await request(app).post('/api/auth/register').send({ email, password: PASSWORD, role: 'client' });
  expect(res.status).toBe(201);
  return email;
}

describe('user enumeration: unknown and real addresses behave identically', () => {
  test('both follow the same status sequence and give the same message at every step', async () => {
    const real = await realAccount();
    const ghost = freshEmail('ghost');
    const realSteps = [];
    const ghostSteps = [];
    for (let i = 0; i <= config.lockoutMaxAttempts; i += 1) {
      const a = await attempt(real, 'WrongPass123');
      const b = await attempt(ghost, 'WrongPass123');
      realSteps.push({ status: a.status, message: a.body.message, retry: Boolean(a.headers['retry-after']) });
      ghostSteps.push({ status: b.status, message: b.body.message, retry: Boolean(b.headers['retry-after']) });
    }
    expect(ghostSteps).toEqual(realSteps);
    // The first N answers are the generic 401, then both addresses are locked with a 429 and Retry-After.
    expect(realSteps.slice(0, config.lockoutMaxAttempts).every((s) => s.status === 401 && s.message === 'Invalid email or password.')).toBe(true);
    expect(realSteps[config.lockoutMaxAttempts]).toMatchObject({ status: 429, retry: true });
  });

  test('a locked unknown address stays locked even when the "right" password is sent', async () => {
    const ghost = freshEmail('ghost');
    for (let i = 0; i < config.lockoutMaxAttempts; i += 1) await attempt(ghost, 'WrongPass123');
    expect((await attempt(ghost, PASSWORD)).status).toBe(429);
  });

  test('an unknown address still costs one bcrypt comparison, so response time does not reveal it', async () => {
    const spy = jest.spyOn(bcrypt, 'compare');
    try {
      await attempt(freshEmail('ghost'), 'WrongPass123');
      expect(spy).toHaveBeenCalledTimes(1);
      const [plain, hash] = spy.mock.calls[0];
      expect(plain).toBe('WrongPass123');
      expect(hash).toMatch(/^\$2[aby]\$/); // a real bcrypt hash, so the work done is comparable
    } finally {
      spy.mockRestore();
    }
  });

  test('the unknown-address table is bounded', () => {
    identifierThrottle.reset();
    for (let i = 0; i < identifierThrottle.MAX_TRACKED + 25; i += 1) identifierThrottle.recordFailure(`flood-${i}@example.com`);
    expect(identifierThrottle._size()).toBeLessThanOrEqual(identifierThrottle.MAX_TRACKED);
    identifierThrottle.reset();
  });

  test('the lock on an unknown address expires', () => {
    identifierThrottle.reset();
    const start = Date.now();
    for (let i = 0; i < config.lockoutMaxAttempts; i += 1) identifierThrottle.recordFailure('x@example.com', start);
    expect(identifierThrottle.lockedFor('x@example.com', start + 1000)).toBeGreaterThan(0);
    expect(identifierThrottle.lockedFor('x@example.com', start + (config.lockoutMinutes * 60 * 1000) + 1)).toBe(0);
    identifierThrottle.reset();
  });
});

describe('token middleware gives one generic answer', () => {
  test('a valid token for an account that no longer exists looks the same as a garbage token', async () => {
    const orphan = authService.issueToken({ id: crypto.randomUUID(), role: 'client', tokenVersion: 0 });
    const gone = await request(app).get('/api/auth/profile').set('Authorization', `Bearer ${orphan}`);
    const garbage = await request(app).get('/api/auth/profile').set('Authorization', 'Bearer not.a.token');
    expect(gone.status).toBe(401);
    expect(gone.body).toEqual(garbage.body);
    expect(gone.body.message).toBe('Invalid or expired token.');
    expect(JSON.stringify(gone.body)).not.toMatch(/exist/i);
  });
});

describe('input sanitiser', () => {
  test('escapes "<" in strings, arrays and nested objects', () => {
    expect(clean({ a: '<b>', list: ['<i>', 3], deep: { x: '<script>' } })).toEqual({ a: '&lt;b>', list: ['&lt;i>', 3], deep: { x: '&lt;script>' } });
  });
  test('never alters a password', () => {
    expect(clean({ email: 'a@b.co', password: 'Pa<ss>w0rd' })).toEqual({ email: 'a@b.co', password: 'Pa<ss>w0rd' });
  });
  test('leaves numbers, booleans and null alone', () => {
    expect(clean({ n: 5, t: true, z: null })).toEqual({ n: 5, t: true, z: null });
  });
  test('a "__proto__" key from JSON becomes an ordinary property and pollutes nothing', () => {
    const hostile = JSON.parse('{"__proto__":{"polluted":"<x>"},"ok":"fine"}');
    const result = clean(hostile);
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect({}.polluted).toBeUndefined();
    expect(result.ok).toBe('fine');
  });
  test('discards absurdly deep nesting', () => {
    let nested = '<x>';
    for (let i = 0; i < 30; i += 1) nested = { n: nested };
    expect(JSON.stringify(clean(nested))).not.toContain('<x>');
  });
  test('a registration password containing "<" is accepted and the same password signs in', async () => {
    const email = freshEmail('angle');
    const password = 'Pass<w0rd>123';
    expect((await request(app).post('/api/auth/register').send({ email, password, role: 'client' })).status).toBe(201);
    expect((await attempt(email, password)).status).toBe(200);
  });
});

describe('container image does not contain private keys', () => {
  const fs = require('fs');
  const path = require('path');
  const dockerfile = fs.readFileSync(path.join(__dirname, '..', 'Dockerfile'), 'utf8');
  const entrypoint = fs.readFileSync(path.join(__dirname, '..', 'docker-entrypoint.sh'), 'utf8');
  // Ignore comment lines: the Dockerfile explains the old mistake in its header.
  const instructions = dockerfile.split(/\r?\n/).filter((line) => !line.trim().startsWith('#')).join('\n');

  test('no RUN instruction creates certificates or keys while the image is built', () => {
    expect(instructions).not.toMatch(/RUN[^\n]*generateCert/);
    expect(instructions).not.toMatch(/RUN[^\n]*openssl\s+(req|genrsa|genpkey|x509)/);
  });
  test('the container starts through the entrypoint script, which generates a certificate only when none is mounted', () => {
    expect(instructions).toMatch(/ENTRYPOINT \["sh", "\/app\/docker-entrypoint\.sh"\]/);
    expect(entrypoint).toMatch(/generateCert\.js/);
    expect(entrypoint).toMatch(/\[ ! -s .*key\.pem.* \]/);
  });
  test('the temporary CA private key is deleted straight after the server certificate is signed', () => {
    expect(entrypoint).toMatch(/rm -f certs\/rootCA-key\.pem/);
  });
  test('the entrypoint hands over to node with exec so SIGTERM reaches the server', () => {
    expect(entrypoint).toMatch(/exec node src\/server\.js/);
  });
  test('the API still runs as the unprivileged node user', () => {
    expect(instructions).toMatch(/^USER node$/m);
  });
});
