// End-to-end journey required by the brief: authentication, gig creation, booking, transaction
// recording and the freelancer's income and tax dashboard (IIE, 2026c). The tests run in order and
// share one freelancer and one client; the browser sessions are re-used between steps so the
// rate-limited sign-in endpoint is only called when a real login is being demonstrated.
import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { loginThroughUi, registerThroughUi, uniqueEmail } from './helpers.js';

test.describe.configure({ mode: 'serial' });

const freelancerEmail = uniqueEmail('e2e-freelancer');
const clientEmail = uniqueEmail('e2e-client');
const gig = {
  title: `E2E Brand Identity ${Date.now()}`,
  category: 'design',
  price: '150000', // above the R99,000 tax threshold, so the estimate is a visible, non-zero figure
  description: 'Complete brand identity package: logo, colour palette and templates.',
};

fs.mkdirSync('.auth', { recursive: true });
fs.mkdirSync('evidence', { recursive: true });

test.describe('1. Freelancer onboarding and gig creation', () => {
  test('a freelancer registers, logs in and sees an empty dashboard', async ({ page }) => {
    await registerThroughUi(page, { email: freelancerEmail, role: 'freelancer' });
    await loginThroughUi(page, freelancerEmail);

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Income Dashboard' })).toBeVisible();
    await expect(page.getByLabel('Total income').getByText('R0.00')).toBeVisible();
    await page.screenshot({ path: 'evidence/01-dashboard-empty.png', fullPage: true });
    await page.context().storageState({ path: '.auth/freelancer.json' });
  });

  test('the freelancer creates a gig and rejects invalid input', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, ignoreHTTPSErrors: true, storageState: '.auth/freelancer.json' });
    const page = await context.newPage();
    await page.goto('/my-gigs');

    // Client-side validation stops a bad form before it reaches the API.
    await page.getByLabel('Title', { exact: true }).fill('ab');
    await page.getByRole('button', { name: 'Create gig' }).click();
    await expect(page.getByRole('alert')).toContainText('Title needs 3 to 120 characters.');

    await page.getByLabel('Title', { exact: true }).fill(gig.title);
    await page.getByLabel('Category', { exact: true }).fill(gig.category);
    await page.getByLabel('Price (ZAR)').fill(gig.price);
    await page.getByLabel('Description', { exact: true }).fill(gig.description);
    await page.getByRole('button', { name: 'Create gig' }).click();

    await expect(page.getByText('Gig created.')).toBeVisible();
    await expect(page.getByTestId('my-gig-item').filter({ hasText: gig.title })).toBeVisible();
    await page.screenshot({ path: 'evidence/02-my-gigs.png', fullPage: true });
    await context.close();
  });
});

test.describe('2. Client books the gig', () => {
  test('a client registers, logs in, books the gig and sees the booking', async ({ page }) => {
    await registerThroughUi(page, { email: clientEmail, role: 'client' });
    await loginThroughUi(page, clientEmail);
    await expect(page).toHaveURL(/\/$/);

    const card = page.getByTestId('gig-card').filter({ hasText: gig.title });
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Book this gig' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Payment is simulated');
    await dialog.getByRole('button', { name: 'Confirm booking' }).click();
    await expect(page.getByText('Booking confirmed. A simulated payment of R150000.00 was recorded.')).toBeVisible();
    await page.screenshot({ path: 'evidence/03-booking-confirmed.png', fullPage: true });

    await page.getByRole('link', { name: 'My Bookings' }).click();
    await expect(page.getByText(gig.title)).toBeVisible();
    await page.screenshot({ path: 'evidence/04-client-bookings.png', fullPage: true });
  });
});

test.describe('3. Freelancer sees the booking, the transaction income and the tax estimate', () => {
  test.use({ storageState: '.auth/freelancer.json' });

  test('received bookings list the booking', async ({ page }) => {
    await page.goto('/received-bookings');
    await expect(page.getByRole('heading', { name: 'Received Bookings' })).toBeVisible();
    await expect(page.getByText(gig.title)).toBeVisible();
  });

  test('the dashboard shows income, estimated tax, chart, bracket table and method', async ({ page }) => {
    await page.goto('/dashboard');

    // R150,000 x 18% = R27,000, less the R17,820 primary rebate = R9,180.
    await expect(page.getByLabel('Total income').getByText('R150000.00')).toBeVisible();
    await expect(page.getByLabel('Estimated tax so far this tax year').getByText('R9180.00')).toBeVisible();
    await expect(page.getByLabel('Estimated tax so far this tax year')).toContainText('Effective rate: 6.12%');

    await expect(page.getByRole('img', { name: /Bar chart of income received/ })).toBeVisible();
    const breakdown = page.getByLabel('How your tax is calculated');
    await expect(breakdown).toContainText('Tax before rebate');
    await expect(breakdown).toContainText('Primary rebate');
    await expect(page.getByText('How is this calculated?')).toBeVisible();
    await expect(page.getByText('Not professional tax advice', { exact: false })).toBeVisible();
    await page.screenshot({ path: 'evidence/05-dashboard-income-and-tax.png', fullPage: true });
  });
});
