// Shared helpers for the Playwright tests. Every account uses a unique, fictional e-mail address so
// repeated runs never collide and no real personal data is involved.
import { expect } from '@playwright/test';

export const PASSWORD = 'Passw0rd123';

export function uniqueEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}@example.com`;
}

/** Registers through the real registration form and waits for the success message. */
export async function registerThroughUi(page, { email, role }) {
  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('I am a').selectOption(role);
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByText('Account created successfully')).toBeVisible();
}

/** Signs in through the real login form. */
export async function loginThroughUi(page, email, password = PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
}

/** Registers and signs in over the API (used where the browser journey is not what is being tested). */
export async function apiRegisterAndLogin(request, { email, role }) {
  const registered = await request.post('/api/auth/register', { data: { email, password: PASSWORD, role } });
  expect(registered.status()).toBe(201);
  const login = await request.post('/api/auth/login', { data: { email, password: PASSWORD } });
  expect(login.status()).toBe(200);
  const { data } = await login.json();
  return { token: data.token, user: data.user };
}

/** Puts a session in the browser exactly as the application does after a normal login. */
export async function startSession(context, { token, user }) {
  await context.addInitScript(([t, u]) => {
    window.localStorage.setItem('hustlehub_token', t);
    window.localStorage.setItem('hustlehub_user', u);
  }, [token, JSON.stringify(user)]);
}
