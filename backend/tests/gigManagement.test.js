const request = require('supertest');
const app = require('../src/app');
const gigRepository = require('../src/repositories/gigRepository');
const gigService = require('../src/services/gigService');

let serial = 0;
async function account(role) {
  const email = `gig-management-${Date.now()}-${serial++}@example.com`;
  const password = 'Passw0rd123';
  await request(app).post('/api/auth/register').send({ email, password, role });
  const res = await request(app).post('/api/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  return res.body.data.token;
}
async function createGig(token) {
  const res = await request(app).post('/api/gigs').set('Authorization', `Bearer ${token}`)
    .send({ title: 'Original Logo', description: 'Design a useful business logo', category: 'design', price: 100 });
  expect(res.status).toBe(201);
  return res.body.data.gig;
}
afterEach(() => jest.restoreAllMocks());

test('an owner can edit all gig details and public browsing uses the saved values', async () => {
  const owner = await account('freelancer'); const gig = await createGig(owner);
  const changes = { title: 'Updated Logo', description: 'Design a new logo and brand kit', category: 'branding', price: 250.50 };
  const res = await request(app).put(`/api/gigs/${gig.id}`).set('Authorization', `Bearer ${owner}`).send(changes);
  expect(res.status).toBe(200);
  expect(res.body.data.gig).toMatchObject({ ...changes, id: gig.id, freelancerId: gig.freelancerId });
  const browse = await request(app).get('/api/gigs');
  expect(browse.body.data.gigs.find((item) => item.id === gig.id)).toMatchObject(changes);
});

test('invalid edits leave the original gig unchanged', async () => {
  const owner = await account('freelancer'); const gig = await createGig(owner);
  const res = await request(app).put(`/api/gigs/${gig.id}`).set('Authorization', `Bearer ${owner}`).send({ price: -1, title: '' });
  expect(res.status).toBe(400);
  expect(await gigRepository.findById(gig.id)).toMatchObject({ title: 'Original Logo', price: 100 });
});

test('clients, other freelancers and unauthenticated users cannot edit or delete a gig', async () => {
  const owner = await account('freelancer'); const gig = await createGig(owner);
  const other = await account('freelancer'); const client = await account('client');
  for (const method of ['put', 'delete']) {
    for (const token of [other, client, null]) {
      let operation = request(app)[method](`/api/gigs/${gig.id}`);
      if (token) operation = operation.set('Authorization', `Bearer ${token}`);
      const res = await operation.send(method === 'put' ? { price: 1 } : {});
      expect(res.status).toBe(token ? 403 : 401);
    }
  }
  expect(await gigRepository.findById(gig.id)).toMatchObject({ price: 100 });
});

test('deletion removes the gig from both lists, prevents new bookings and preserves old financial records', async () => {
  const owner = await account('freelancer'); const client = await account('client'); const gig = await createGig(owner);
  const booked = await request(app).post('/api/bookings').set('Authorization', `Bearer ${client}`).send({ gigId: gig.id });
  expect(booked.status).toBe(201);
  const edited = await request(app).put(`/api/gigs/${gig.id}`).set('Authorization', `Bearer ${owner}`).send({ title: 'Updated Logo', price: 250 });
  expect(edited.status).toBe(200);
  const removed = await request(app).delete(`/api/gigs/${gig.id}`).set('Authorization', `Bearer ${owner}`);
  expect(removed.status).toBe(200);
  const mine = await request(app).get('/api/gigs/mine').set('Authorization', `Bearer ${owner}`);
  const browse = await request(app).get('/api/gigs');
  expect(mine.body.data.gigs.some((item) => item.id === gig.id)).toBe(false);
  expect(browse.body.data.gigs.some((item) => item.id === gig.id)).toBe(false);
  const retryBooking = await request(app).post('/api/bookings').set('Authorization', `Bearer ${client}`).send({ gigId: gig.id });
  expect(retryBooking.status).toBe(404);
  const bookings = await request(app).get('/api/bookings/mine').set('Authorization', `Bearer ${client}`);
  expect(bookings.body.data.bookings).toEqual([expect.objectContaining({ gigTitle: 'Original Logo', priceAtBooking: 100 })]);
  const income = await request(app).get('/api/income/summary').set('Authorization', `Bearer ${owner}`);
  expect(income.body.data.totalIncome).toBe(100);
  expect(income.body.data.transactionCount).toBe(1);
  const retryDelete = await request(app).delete(`/api/gigs/${gig.id}`).set('Authorization', `Bearer ${owner}`);
  expect(retryDelete.status).toBe(404);
});

test('editing a gig removed after the ownership lookup returns a safe 404', async () => {
  const owner = await account('freelancer'); const gig = await createGig(owner);
  jest.spyOn(gigRepository, 'update').mockResolvedValue(null);
  await expect(gigService.updateGig(gig.id, { price: 200 }, gig.freelancerId)).rejects.toMatchObject({ statusCode: 404, expose: true });
});

test('deleting a gig removed after the ownership lookup returns a safe 404', async () => {
  const owner = await account('freelancer'); const gig = await createGig(owner);
  jest.spyOn(gigRepository, 'remove').mockResolvedValue(false);
  await expect(gigService.deleteGig(gig.id, gig.freelancerId)).rejects.toMatchObject({ statusCode: 404, expose: true });
});
