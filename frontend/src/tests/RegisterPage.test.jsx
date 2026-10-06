import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RegisterPage from '../pages/RegisterPage';
import { AuthProvider } from '../context/AuthContext';

function renderRegisterPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('RegisterPage', () => {
  test('renders email, password, and role fields', () => {
    renderRegisterPage();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/i am a/i)).toBeInTheDocument();
  });

  test('defaults the role selector to "client" and allows switching to "freelancer"', async () => {
    renderRegisterPage();
    const user = userEvent.setup();
    const roleSelect = screen.getByLabelText(/i am a/i);

    expect(roleSelect).toHaveValue('client');

    await user.selectOptions(roleSelect, 'freelancer');
    expect(roleSelect).toHaveValue('freelancer');
  });

  test('includes password constraints alongside explicit form validation', () => {
    renderRegisterPage();
    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveAttribute('minlength', '8');
    expect(passwordInput).toBeRequired();
  });
});
