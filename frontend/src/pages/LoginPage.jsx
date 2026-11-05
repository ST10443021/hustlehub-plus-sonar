import { validateAuth } from '../lib/validation';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AlertMessage from '../components/AlertMessage';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const validationError = validateAuth(form);
    if (validationError) { setError(validationError); return; }
    try {
      const user = await login(form);
      navigate(user.role === 'freelancer' ? '/dashboard' : '/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-page">
      <h1>Log in</h1>
      <form onSubmit={handleSubmit} noValidate>
        <AlertMessage type="error" message={error} />

        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />

        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" value={form.password} onChange={handleChange} required />

        <button type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Log in'}</button>
      </form>
      <p>Don&apos;t have an account? <Link to="/register">Register</Link></p>
    </div>
  );
}
