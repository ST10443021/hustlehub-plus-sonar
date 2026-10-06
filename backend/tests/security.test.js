const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const config = require('../src/config/env');
const bookingRepository = require('../src/repositories/bookingRepository');
const transactionRepository = require('../src/repositories/transactionRepository');
const bookingService = require('../src/services/bookingService');
let serial = 0;
async function account(role) {
  const email = `security-${Date.now()}-${serial++}@example.com`;
  await request(app).post('/api/auth/register').send({ email, password: 'Passw0rd123', role });
  const res = await request(app).post('/api/auth/login').send({ email, password: 'Passw0rd123' });
  return { ...res.body.data.user, token: res.body.data.token };
}
async function gig(owner, price = 123.45) {
  const res = await request(app).post('/api/gigs').set('Authorization', `Bearer ${owner.token}`).send({ title: 'Safe listing', description: 'A useful service description', category: 'design', price });
  return res.body.data.gig;
}
afterEach(() => jest.restoreAllMocks());

test('public API cannot create admin accounts', async () => {
  const res = await request(app).post('/api/auth/register').send({ email: 'public-admin@example.com', password: 'Passw0rd123', role: 'admin' });
  expect(res.status).toBe(400);
});
test('gig ownership cannot be transferred through updates', async () => {
  const owner = await account('freelancer'); const other = await account('freelancer'); const listing = await gig(owner);
  const res = await request(app).put(`/api/gigs/${listing.id}`).set('Authorization', `Bearer ${owner.token}`).send({ freelancerId: other.id });
  expect(res.status).toBe(400);
  const list = await request(app).get('/api/gigs/mine').set('Authorization', `Bearer ${owner.token}`);
  expect(list.body.data.gigs.find((g) => g.id === listing.id).freelancerId).toBe(owner.id);
});
test('client identity and price cannot be supplied on a booking', async () => {
  const owner = await account('freelancer'); const client = await account('client'); const listing = await gig(owner);
  const res = await request(app).post('/api/bookings').set('Authorization', `Bearer ${client.token}`).send({ gigId: listing.id, price: 1, clientId: 'someone-else' });
  expect(res.status).toBe(400);
});
test('a failed transaction write removes the newly created booking', async () => {
  const owner = await account('freelancer'); const client = await account('client'); const listing = await gig(owner);
  jest.spyOn(transactionRepository, 'create').mockRejectedValue(new Error('Simulated write failure'));
  await expect(bookingService.createBooking(listing.id, client.id)).rejects.toThrow('Simulated write failure');
  expect(await bookingRepository.findByClient(client.id)).toEqual([]);
});
test('private booking lists are scoped to both correct parties', async () => {
  const owner = await account('freelancer'); const other = await account('freelancer'); const client = await account('client'); const otherClient = await account('client');
  const listing = await gig(owner);
  await request(app).post('/api/bookings').set('Authorization', `Bearer ${client.token}`).send({ gigId: listing.id });
  const own = await request(app).get('/api/bookings/received').set('Authorization', `Bearer ${owner.token}`);
  expect(own.body.data.bookings).toHaveLength(1);
  expect(own.body.data.bookings[0].gigTitle).toBe('Safe listing');
  const received = await request(app).get('/api/bookings/received').set('Authorization', `Bearer ${other.token}`);
  const mine = await request(app).get('/api/bookings/mine').set('Authorization', `Bearer ${otherClient.token}`);
  const income = await request(app).get('/api/income/summary').set('Authorization', `Bearer ${other.token}`);
  expect(received.body.data.bookings).toEqual([]); expect(mine.body.data.bookings).toEqual([]); expect(income.body.data.totalIncome).toBe(0);
});
test('old booking amount and title survive gig edits and deletion', async () => {
  const owner = await account('freelancer'); const client = await account('client'); const listing = await gig(owner);
  await request(app).post('/api/bookings').set('Authorization', `Bearer ${client.token}`).send({ gigId: listing.id });
  await request(app).put(`/api/gigs/${listing.id}`).set('Authorization', `Bearer ${owner.token}`).send({ price: 900 });
  await request(app).delete(`/api/gigs/${listing.id}`).set('Authorization', `Bearer ${owner.token}`);
  const bookings = await bookingRepository.findByClient(client.id);
  expect(bookings[0].priceAtBooking).toBe(123.45); expect(bookings[0].gigTitle).toBe('Safe listing');
  const income = await request(app).get('/api/income/summary').set('Authorization', `Bearer ${owner.token}`);
  expect(income.body.data.totalIncome).toBe(123.45);
});
test.each(['garbage', jwt.sign({ sub: 'fake' }, config.jwtSecret, { issuer: 'hustlehub-plus-api', expiresIn: -1 }), jwt.sign({ sub: 'fake' }, 'wrong-signing-secret', { issuer: 'hustlehub-plus-api' })])('rejects invalid, expired or tampered JWT', async (token) => {
  const res = await request(app).get('/api/auth/profile').set('Authorization', `Bearer ${token}`); expect(res.status).toBe(401);
});
test('invalid JSON returns a safe 400, not a server error', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  const res = await request(app).post('/api/auth/register').set('Content-Type', 'application/json').send('{broken');
  expect(res.status).toBe(400); expect(res.body.message).toBe('Request contains invalid JSON.'); log.mockRestore();
});
test('forwarded IPs are not trusted on the default direct backend', () => expect(app.get('trust proxy')).toBe(false));
test('profile exposes a safe verified email and role', async () => {
  const client = await account('client'); const res = await request(app).get('/api/auth/profile').set('Authorization', `Bearer ${client.token}`);
  expect(res.body.data.user.email).toBe(client.email); expect(res.body.data.user.passwordHash).toBeUndefined();
});
