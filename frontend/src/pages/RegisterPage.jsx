import { validateAuth } from '../lib/validation';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AlertMessage from '../components/AlertMessage';

export default function RegisterPage() {
  const { register, loading } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', role: 'client' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const validationError = validateAuth(form, true);
    if (validationError) { setError(validationError); return; }
    setSuccess('');
    try {
      await register(form);
      setSuccess('Account created successfully. You can now log in.');
      // The success message offers an explicit login link below.
    } catch (err) {
      // The backend's express-validator rules and centralised error
      // handler guarantee a safe, specific message here - never a stack
      // trace or internal detail (OWASP, 2021).
      setError(err.message);
    }
  };

  return (
    <div className="auth-page">
      <h1>Create an account</h1>
      <form onSubmit={handleSubmit} noValidate>
        <AlertMessage type="error" message={error} />
        <AlertMessage type="success" message={success} />

        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />

        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" value={form.password} onChange={handleChange} required minLength={8} maxLength={72} />
        <p className="hint">At least 8 characters, with uppercase, lowercase, and a number.</p>

        <label htmlFor="role">I am a</label>
        <select id="role" name="role" value={form.role} onChange={handleChange}>
          <option value="client">Client - I want to book services</option>
          <option value="freelancer">Freelancer - I want to offer services</option>
        </select>

        <button type="submit" disabled={loading}>{loading ? 'Creating account...' : 'Register'}</button>
      </form>
      <p>Already have an account? <Link to="/login">Log in</Link></p>
    </div>
  );
}
