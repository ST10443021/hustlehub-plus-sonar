import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';

// Fictional, disposable accounts. Every action below uses the actual browser UI,
// real HTTPS API and MongoDB; no route interception or injected session state.
const password = 'BrowserCheck9!Disposable';
const emailFor = (role) => `poe-${role}-${randomUUID()}@example.com`;

async function register(page, email, role) {
  await page.goto('/register');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('I am a').selectOption(role);
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Account created successfully. You can now log in.');
}

async function login(page, email, enteredPassword = password) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(enteredPassword);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
}

async function expectIncome(page) {
  await expect(page.getByRole('heading', { name: 'Income Dashboard', exact: true })).toBeVisible();
  const total = page.locator('[aria-label="Total income"]');
  await expect(total).toContainText('R150000.00');
  await expect(total).toContainText('1 booking(s)');
  await expect(page.locator('[aria-label="Estimated annual tax"]')).toContainText('R9180.00');
  await expect(page.locator('[aria-label="Income after tax"]')).toContainText('R140820.00');
  await expect(page.getByRole('img', { name: 'Bar chart of income received in each of the last 12 months' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Recent payments' }).getByRole('cell', { name: 'R150000.00', exact: true })).toBeVisible();
  await page.getByText('View chart data as a table', { exact: true }).click();
  await expect(page.getByRole('table', { name: 'Income per month', exact: true }).getByRole('cell', { name: 'R150000.00', exact: true })).toBeVisible();
}

test('real marketplace flow: register, log in, create a gig, book, and verify saved income', async ({ page, browser, baseURL }) => {
  const freelancerEmail = emailFor('freelancer');
  const clientEmail = emailFor('client');
  const title = `Browser integration gig ${randomUUID().slice(0, 8)}`;
  await register(page, freelancerEmail, 'freelancer');
  await login(page, freelancerEmail);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator('[aria-label="Total income"]')).toContainText('R0.00');

  await page.getByRole('link', { name: 'My Gigs', exact: true }).click();
  await page.getByLabel('Title', { exact: true }).fill(title);
  await page.getByLabel('Category', { exact: true }).fill('Browser testing');
  await page.getByLabel('Price (ZAR)', { exact: true }).fill('150000');
  await page.getByLabel('Description', { exact: true }).fill('Fictional service created by the disposable browser integration check.');
  await page.getByRole('button', { name: 'Create gig', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Gig created.');
  await expect(page.getByTestId('my-gig-item').filter({ hasText: title })).toContainText('R150000.00');

  // Separate browser context gives the client an independent login/session.
  const clientContext = await browser.newContext({ baseURL, ignoreHTTPSErrors: true });
  try {
    const client = await clientContext.newPage();
    await register(client, clientEmail, 'client');
    await login(client, clientEmail);
    await expect(client.getByRole('button', { name: 'Log out', exact: true })).toBeVisible();
    const gig = client.getByTestId('gig-card').filter({ has: client.getByRole('heading', { name: title, exact: true }) });
    await gig.getByRole('button', { name: 'Book this gig', exact: true }).click();
    const confirmation = client.getByRole('dialog', { name: 'Confirm booking', exact: true });
    await expect(confirmation).toContainText('R150000.00');
    await confirmation.getByRole('button', { name: 'Confirm booking', exact: true }).click();
    await expect(client.getByRole('alert')).toHaveText('Booking confirmed. A simulated payment of R150000.00 was recorded.');
    await client.getByRole('link', { name: 'My Bookings', exact: true }).click();
    await expect(client.getByRole('listitem').filter({ hasText: title })).toContainText('R150000.00');
    await client.reload();
    await expect(client.getByRole('listitem').filter({ hasText: title })).toContainText('R150000.00');
  } finally {
    await clientContext.close();
  }

  await page.getByRole('link', { name: 'Received Bookings', exact: true }).click();
  await expect(page.getByRole('listitem').filter({ hasText: title })).toContainText('R150000.00');
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  await expectIncome(page);
  await page.reload();
  await expectIncome(page);
});

test('real session flow: private pages require login, bad passwords fail, client routes stay restricted and logout clears access', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  const email = emailFor('restricted-client');
  await register(page, email, 'client');
  await login(page, email, 'IncorrectBrowserPassword9!');
  await expect(page.getByRole('alert')).toContainText(/invalid|incorrect|credentials/i);
  await expect(page.getByRole('button', { name: 'Log out', exact: true })).toHaveCount(0);

  await login(page, email);
  await expect(page.getByRole('button', { name: 'Log out', exact: true })).toBeVisible();
  await page.goto('/my-gigs');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Browse Gigs', exact: true })).toBeVisible();
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Income Dashboard', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/my-bookings');
  await expect(page).toHaveURL(/\/login$/);
});
