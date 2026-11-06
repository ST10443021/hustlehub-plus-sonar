// Attack-payload tests for the final security review: NoSQL operator injection, stored and reflected
// script injection, prototype pollution, oversized bodies and mass assignment (OWASP, 2021;
// OWASP, 2024g; OWASP, 2024h). Each test sends a hostile request and checks that the application
// refuses it or neutralises it.
const request = require('supertest');
const app = require('../src/app');

let serial = 0;
const PASSWORD = 'Passw0rd123';
async function account(role) {
  const email = `inject-${Date.now()}-${serial++}@example.com`;
  await request(app).post('/api/auth/register').send({ email, password: PASSWORD, role });
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return { email, ...res.body.data.user, token: res.body.data.token };
}
const bearer = (u) => ({ Authorization: `Bearer ${u.token}` });
const validGig = { title: 'Logo design', description: 'A clean logo for your business', category: 'design', price: 500 };

describe('NoSQL operator injection', () => {
  test('a login that uses query operators instead of strings is rejected', async () => {
    const victim = await account('client');
    const res = await request(app).post('/api/auth/login').send({ email: { $ne: null }, password: { $ne: null } });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed.');
    expect(res.body.data).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain(victim.email);
  });

  test('operator objects hidden in the email field cannot match an account', async () => {
    await account('client');
    const res = await request(app).post('/api/auth/login').send({ email: { $regex: '.*' }, password: PASSWORD });
    expect(res.status).toBe(400);
  });

  test('operators in the browse filter do not widen the query', async () => {
    const freelancer = await account('freelancer');
    await request(app).post('/api/gigs').set(bearer(freelancer)).send(validGig);
    const res = await request(app).get('/api/gigs').query({ 'category[$ne]': 'nothing' });
    expect(res.status).toBe(400); // an object where text is expected fails validation instead of reaching the database
  });

  test('operator keys inside a gig body are refused or stripped, never stored', async () => {
    const freelancer = await account('freelancer');
    const res = await request(app).post('/api/gigs').set(bearer(freelancer)).send({ ...validGig, price: { $gt: 0 } });
    expect(res.status).toBe(400);
  });
});

describe('script injection', () => {
  test('script tags in a gig are escaped before they are stored or returned', async () => {
    const freelancer = await account('freelancer');
    const res = await request(app).post('/api/gigs').set(bearer(freelancer))
      .send({ ...validGig, title: 'Cheap logos <script>alert(1)</script>', description: 'Great work <img src=x onerror=alert(1)> guaranteed' });
    expect(res.status).toBe(201);
    const { title, description } = res.body.data.gig;
    expect(title).toContain('&lt;script');
    expect(title).not.toContain('<script');
    expect(description).not.toContain('<img'); // the angle bracket is escaped, so no element can be created
    const listed = await request(app).get('/api/gigs');
    expect(JSON.stringify(listed.body)).not.toMatch(/<script|<img/i);
  });

  test('a script tag in the registration email is rejected by validation', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: '<script>alert(1)</script>@example.com', password: PASSWORD, role: 'client' });
    expect(res.status).toBe(400);
  });
});

describe('prototype pollution and mass assignment', () => {
  test('a __proto__ payload is refused and does not pollute Object', async () => {
    const freelancer = await account('freelancer');
    const res = await request(app).post('/api/gigs').set(bearer(freelancer)).set('Content-Type', 'application/json')
      .send('{"title":"Logo design","description":"A clean logo for your business","category":"design","price":500,"__proto__":{"isAdmin":true}}');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/fields that cannot be changed/);
    expect({}.isAdmin).toBeUndefined();
  });

  test('role and ownership fields cannot be injected into a gig', async () => {
    const freelancer = await account('freelancer');
    const res = await request(app).post('/api/gigs').set(bearer(freelancer)).send({ ...validGig, freelancerId: 'someone-else', role: 'admin' });
    expect(res.status).toBe(400);
  });

  test('a user cannot promote themselves through registration', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: `promote-${Date.now()}@example.com`, password: PASSWORD, role: 'admin' });
    expect(res.status).toBe(400);
  });
});

describe('oversized and malformed requests', () => {
  test('a body larger than 10 kb is refused', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'a@example.com', password: 'x'.repeat(20000) });
    expect(res.status).toBe(413);
  });

  test('a very long password is rejected without being hashed', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: `long-${Date.now()}@example.com`, password: `Aa1${'x'.repeat(200)}`, role: 'client' });
    expect(res.status).toBe(400);
  });
});
