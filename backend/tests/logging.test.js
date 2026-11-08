// Tests for the Part 3 logging and monitoring features: structured events, redaction of sensitive
// values, the request ID header and shipping of entries to a cloud log platform (IIE, 2026c;
// OWASP, 2024d). Run with Jest and Supertest against the in-memory repositories.
const fs = require('fs');
const os = require('os');
const path = require('path');

// The log directory must be set before the app modules are loaded, because they read it once.
const logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hustlehub-logs-'));
process.env.LOG_DIR = logDir;
process.env.LOG_TO_FILE_IN_TESTS = '1';

const request = require('supertest');
const app = require('../src/app');
const config = require('../src/config/env');
const cloudLogger = require('../src/utils/cloudLogger');
const { logEvent, readRecentEvents, sanitise } = require('../src/utils/eventLogger');

let serial = 0;
async function account(role) {
  const email = `log-${Date.now()}-${serial++}@example.com`;
  await request(app).post('/api/auth/register').send({ email, password: 'Passw0rd123', role });
  const res = await request(app).post('/api/auth/login').send({ email, password: 'Passw0rd123' });
  return { email, ...res.body.data.user, token: res.body.data.token };
}
const events = (name) => readRecentEvents({ limit: 200 }).filter((e) => e.event === name);

afterAll(() => fs.rmSync(logDir, { recursive: true, force: true }));

describe('sanitise (log redaction)', () => {
  test('replaces sensitive fields and masks credentials inside connection strings', () => {
    const safe = sanitise({ password: 'x', passwordHash: 'y', Authorization: 'Bearer abc', jwtToken: 'z', uri: 'mongodb://bob:secret@db/app', ok: 'fine' });
    expect(safe).toMatchObject({ password: '[REDACTED]', passwordHash: '[REDACTED]', Authorization: '[REDACTED]', jwtToken: '[REDACTED]', ok: 'fine' });
    expect(safe.uri).toBe('mongodb://[REDACTED]@db/app');
  });
  test('replaces e-mail addresses with a keyed hash so the raw address is never logged', () => {
    const safe = sanitise({ email: 'Jane.Doe@Example.com', reason: 'bad_password' });
    expect(safe).not.toHaveProperty('email');
    expect(safe.emailHash).toMatch(/^[0-9a-f]{16}$/);
    expect(JSON.stringify(safe)).not.toMatch(/jane/i);
    expect(sanitise({ email: 'jane.doe@example.com' }).emailHash).toBe(safe.emailHash); // case-insensitive, stable
    expect(sanitise({ email: 'someone.else@example.com' }).emailHash).not.toBe(safe.emailHash);
  });
  test('truncates very long values and does not log nested objects', () => {
    const safe = sanitise({ big: 'a'.repeat(900), nested: { password: 'secret' } });
    expect(safe.big.length).toBeLessThan(510);
    expect(safe.nested).toBe('[object]');
  });
});

describe('logEvent', () => {
  test('writes a JSON line with timestamp, level and category', () => {
    logEvent('login_failed', { email: 'a@example.com', reason: 'bad_password' });
    const [entry] = events('login_failed');
    expect(entry).toMatchObject({ level: 'warn', category: 'auth', event: 'login_failed', reason: 'bad_password' });
    expect(Number.isNaN(Date.parse(entry.timestamp))).toBe(false);
  });
  test('never stores a password even if a caller passes one by mistake', () => {
    logEvent('user_login', { userId: 'u1', password: 'Passw0rd123' });
    const raw = fs.readFileSync(path.join(logDir, 'events.log'), 'utf8');
    expect(raw).not.toContain('Passw0rd123');
  });
  test('readRecentEvents filters by category and limit', () => {
    logEvent('gig_created', { gigId: 'g1' });
    expect(readRecentEvents({ limit: 5, categories: ['gig'] }).every((e) => e.category === 'gig')).toBe(true);
    expect(readRecentEvents({ limit: 1 })).toHaveLength(1);
  });
});

describe('key events produced by the API', () => {
  test('a failed login, a booking and its transaction are all recorded, and requests get an ID', async () => {
    const freelancer = await account('freelancer');
    const client = await account('client');
    const bad = await request(app).post('/api/auth/login').send({ email: client.email, password: 'WrongPass123' });
    expect(bad.status).toBe(401);
    expect(bad.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);

    const gig = await request(app).post('/api/gigs').set('Authorization', `Bearer ${freelancer.token}`)
      .send({ title: 'Logo design', description: 'A clean logo for your business', category: 'design', price: 500 });
    const booking = await request(app).post('/api/bookings').set('Authorization', `Bearer ${client.token}`).send({ gigId: gig.body.data.gig.id });
    expect(booking.status).toBe(201);

    expect(events('login_failed').some((e) => e.userId === client.id && e.reason === 'bad_password')).toBe(true);
    expect(events('booking_created').some((e) => e.bookingId === booking.body.data.booking.id)).toBe(true);
    expect(events('transaction_created').some((e) => e.transactionId === booking.body.data.transaction.id && e.amount === 500)).toBe(true);
  });

  test('failed sign-ins for real and unknown addresses never write the e-mail address to the log', async () => {
    const client = await account('client');
    const unknown = `nobody-${Date.now()}@example.com`;
    // A user who types a password into the e-mail box must not leak it either; the validator rejects
    // that request, so it never reaches the log at all.
    await request(app).post('/api/auth/login').send({ email: client.email, password: 'WrongPass123' });
    await request(app).post('/api/auth/login').send({ email: unknown, password: 'WrongPass123' });
    await request(app).post('/api/auth/login').send({ email: 'MyS3cretPassw0rd!', password: 'WrongPass123' });
    const raw = fs.readFileSync(path.join(logDir, 'events.log'), 'utf8');
    expect(raw).not.toContain(client.email);
    expect(raw).not.toContain(unknown);
    expect(raw).not.toContain('MyS3cretPassw0rd');
    const real = events('login_failed').find((e) => e.userId === client.id);
    const ghost = events('login_failed').find((e) => e.reason === 'no_such_account');
    expect(real.emailHash).toMatch(/^[0-9a-f]{16}$/);
    expect(ghost.emailHash).toMatch(/^[0-9a-f]{16}$/);
  });

  test('a role violation is logged as access_denied and a bad token as token_rejected', async () => {
    const client = await account('client');
    const denied = await request(app).get('/api/income/summary').set('Authorization', `Bearer ${client.token}`);
    expect(denied.status).toBe(403);
    expect(events('access_denied').some((e) => e.userId === client.id && e.role === 'client')).toBe(true);

    await request(app).get('/api/auth/profile').set('Authorization', 'Bearer not.a.token');
    expect(events('token_rejected').length).toBeGreaterThan(0);
  });

  test.each(['test', 'production', 'development'])('an unexpected failure keeps credentials out of the response and all logs (%s)', async (nodeEnv) => {
    const gigRepository = require('../src/repositories/gigRepository');
    const originalNodeEnv = config.nodeEnv;
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const repositorySpy = jest.spyOn(gigRepository, 'findActive')
      .mockRejectedValue(new Error('driver exploded mongodb://root:hunter2@db/x'));
    try {
      config.nodeEnv = nodeEnv;
      const res = await request(app).get('/api/gigs?trace=private-query-fixture');
      expect(res.status).toBe(500);
      expect(JSON.stringify(res.body)).not.toMatch(/driver|hunter2|mongodb/);
      const entry = events('server_error').find((e) => e.requestId === res.headers['x-request-id']);
      expect(entry).toBeDefined();
      expect(entry.level).toBe('error');
      expect(entry.message).toContain('mongodb://[REDACTED]@db/x');

      const consoleOutput = JSON.stringify(errorSpy.mock.calls);
      expect(consoleOutput).toContain('mongodb://[REDACTED]@db/x');
      expect(consoleOutput).toContain(res.headers['x-request-id']);
      expect(consoleOutput).not.toMatch(/hunter2|private-query-fixture/);
      const consoleDetails = errorSpy.mock.calls[0][1];
      expect(consoleDetails.path).toBe('/api/gigs');
      if (nodeEnv === 'development') expect(consoleDetails.stack).toContain('[REDACTED]');
      else expect(consoleDetails).not.toHaveProperty('stack');
    } finally {
      config.nodeEnv = originalNodeEnv;
      repositorySpy.mockRestore();
      errorSpy.mockRestore();
    }
  });
});

describe('cloud log shipping', () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    cloudLogger._reset();
    config.logCloudUrl = 'https://logs.example.test/ingest';
    config.logCloudToken = 'source-token-123';
  });
  afterEach(() => {
    global.fetch = originalFetch;
    config.logCloudUrl = '';
    config.logCloudToken = '';
    cloudLogger._reset();
  });

  test('is disabled unless both the URL and token are configured', () => {
    config.logCloudToken = '';
    expect(cloudLogger.isEnabled()).toBe(false);
    cloudLogger.enqueue({ message: 'ignored' });
    expect(cloudLogger._pending()).toBe(0);
  });

  test('posts a JSON batch over HTTPS with a bearer token', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 202 });
    logEvent('booking_created', { bookingId: 'b1', password: 'must-not-leave' });
    await cloudLogger.flush();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://logs.example.test/ingest');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer source-token-123');
    const body = JSON.parse(options.body);
    expect(body[0]).toMatchObject({ message: 'booking_created', category: 'booking', bookingId: 'b1' });
    expect(body[0].dt).toBeDefined();
    expect(options.body).not.toContain('must-not-leave');
  });

  test('keeps entries and retries when the log service is down, without throwing', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('network down')).mockResolvedValue({ ok: true, status: 200 });
    logEvent('user_login', { userId: 'u1' });
    expect(await cloudLogger.flush()).toBe(false);
    expect(cloudLogger._pending()).toBe(1);
    expect(await cloudLogger.flush()).toBe(true);
    expect(cloudLogger._pending()).toBe(0);
    errorSpy.mockRestore();
  });

  test('flushAll drains everything queued', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    for (let i = 0; i < 45; i += 1) logEvent('gig_created', { gigId: `g${i}` });
    await cloudLogger.flushAll();
    expect(cloudLogger._pending()).toBe(0);
    const sent = global.fetch.mock.calls.reduce((n, call) => n + JSON.parse(call[1].body).length, 0);
    expect(sent).toBe(45);
  });
});
