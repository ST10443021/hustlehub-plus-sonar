// Browser and API checks that the security controls hold in the running stack: route guards, role-based
// access control, the Content Security Policy, safe rendering of hostile input, account lockout,
// server-side token revocation and the admin console (OWASP, 2021; IIE, 2026c).
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { apiRegisterAndLogin, loginThroughUi, PASSWORD, startSession, uniqueEmail } from './helpers.js';

test.describe.configure({ mode: 'serial' });
fs.mkdirSync('evidence', { recursive: true });

let freelancer;
let client;

test.beforeAll(async ({ playwright, baseURL }) => {
  const request = await playwright.request.newContext({ baseURL, ignoreHTTPSErrors: true });
  freelancer = await apiRegisterAndLogin(request, { email: uniqueEmail('sec-freelancer'), role: 'freelancer' });
  client = await apiRegisterAndLogin(request, { email: uniqueEmail('sec-client'), role: 'client' });
  await request.dispose();
});

test('an anonymous visitor is sent to the login page for protected pages', async ({ page }) => {
  for (const path of ['/my-gigs', '/dashboard', '/my-bookings', '/admin']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
});

test('a client is turned away from freelancer and admin pages, and the API refuses them too', async ({ page, request }) => {
  await startSession(page.context(), client);
  for (const path of ['/my-gigs', '/dashboard', '/admin']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/$/);
  }
  await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);

  // The route guard is only a convenience. The server is the real boundary.
  const headers = { Authorization: `Bearer ${client.token}` };
  expect((await request.get('/api/admin/overview', { headers })).status()).toBe(403);
  expect((await request.get('/api/income/summary', { headers })).status()).toBe(403);
  const createGig = await request.post('/api/gigs', {
    headers, data: { title: 'Not allowed', category: 'test', description: 'Clients cannot create gigs', price: 10 },
  });
  expect(createGig.status()).toBe(403);
});

test('the page is served with a strict Content Security Policy and HSTS', async ({ page }) => {
  const response = await page.goto('/');
  const headers = response.headers();
  expect(headers['content-security-policy']).toContain("default-src 'self'");
  expect(headers['content-security-policy']).toContain("object-src 'none'");
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['strict-transport-security']).toBeTruthy();
  expect(headers['x-content-type-options']).toBe('nosniff');
});

test('script in a gig title is stored and shown as harmless text', async ({ page, request }) => {
  const created = await request.post('/api/gigs', {
    headers: { Authorization: `Bearer ${freelancer.token}` },
    data: {
      title: '<img src=x onerror="window.__xss=1"> Hostile title',
      category: 'security',
      description: 'A gig used to prove that markup in user input is never executed.',
      price: 100,
    },
  });
  expect(created.status()).toBe(201);

  await page.goto('/');
  await expect(page.getByTestId('gig-card').filter({ hasText: 'Hostile title' })).toBeVisible();
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  await expect(page.locator('.gig-card img')).toHaveCount(0);
});

test('five wrong passwords lock the account, even for the correct password', async ({ page, request }) => {
  const email = uniqueEmail('sec-victim');
  const registered = await request.post('/api/auth/register', { data: { email, password: PASSWORD, role: 'client' } });
  expect(registered.status()).toBe(201);

  await page.goto('/login');
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('Wrong-Passw0rd');
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/auth/login')),
      page.getByRole('button', { name: 'Log in' }).click(),
    ]);
    expect(response.status()).toBe(401);
    await expect(page.getByRole('alert')).toContainText('Invalid email or password.');
  }

  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  const [blocked] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/auth/login')),
    page.getByRole('button', { name: 'Log in' }).click(),
  ]);
  expect(blocked.status()).toBe(429);
  await expect(page.getByRole('alert')).toContainText('temporarily locked');
  await page.screenshot({ path: 'evidence/06-account-lockout.png', fullPage: true });
});

test('logging out ends the session on the server, so the old token stops working', async ({ request }) => {
  const headers = { Authorization: `Bearer ${freelancer.token}` };
  expect((await request.get('/api/auth/profile', { headers })).status()).toBe(200);
  expect((await request.post('/api/auth/logout', { headers })).status()).toBe(200);
  expect((await request.get('/api/auth/profile', { headers })).status()).toBe(401);
});

test('the admin console shows platform totals, accounts and security events', async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(!email || !password, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (an account made with scripts/seedAdmin.js) to run the admin check.');

  await loginThroughUi(page, email, password);
  await page.getByRole('link', { name: 'Admin' }).click();
  await expect(page.getByRole('heading', { name: 'Admin Console' })).toBeVisible();
  await expect(page.getByLabel('Users')).toBeVisible();
  await expect(page.getByLabel('Transactions')).toBeVisible();
  const events = page.getByLabel('Security events');
  await expect(events).toContainText('login_failed');
  await expect(events).toContainText('account_locked');
  await page.screenshot({ path: 'evidence/07-admin-console.png', fullPage: true });
});
