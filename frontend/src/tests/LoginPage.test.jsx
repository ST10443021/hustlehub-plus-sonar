import apiClient from '../api/client';
// Component rendering + user-interaction test, using React Testing Library
// (the standard choice for testing React components from the user's
// perspective rather than implementation detail (Node.js Foundation,
// n.d.)), satisfying the POE's "basic automated tests that demonstrate
// component rendering and user interaction" requirement (IIE, 2026).
import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import { AuthProvider } from '../context/AuthContext';

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  test('renders email and password fields and a submit button', () => {
    renderLoginPage();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  test('lets the user type into the email and password fields', async () => {
    renderLoginPage();
    const user = userEvent.setup();
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'Passw0rd123');

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('Passw0rd123');
  });

  test('shows a safe error message when login fails, without crashing', async () => {
    const post = vi.spyOn(apiClient, 'post').mockRejectedValue({ response: { status: 401, data: { message: 'Invalid email or password.' } } });
    renderLoginPage();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'nobody@example.com');
    await user.type(screen.getByLabelText(/password/i), 'WrongPass1');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    // Mock the actual Axios request so this check needs no running server.
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Invalid email or password.');
    expect(post).toHaveBeenCalledWith('/auth/login', { email: 'nobody@example.com', password: 'WrongPass1' });
  });
});
