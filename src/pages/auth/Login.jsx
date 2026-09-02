import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import AuthLayout from '../../components/AuthLayout.jsx';
import FormField from '../../components/FormField.jsx';
import { login } from '../../api/auth.js';
import { getPlatformAccounts } from '../../api/platformAccounts.js';
import { useAuth } from '../../context/AuthContext.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const navigate = useNavigate();
  const { setUser, setCompany, setIsAuthenticated } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function validate() {
    const next = {};
    if (!EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid email';
    if (!form.password) next.password = 'Enter your password';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const { user, company, token } = await login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      localStorage.setItem('orderly_token', token);
      localStorage.setItem('orderly_company', JSON.stringify(company));
      localStorage.setItem('orderly_user', JSON.stringify(user));

      setUser(user);
      setCompany(company);
      setIsAuthenticated(true);

      let userAccounts = [];
      try {
        userAccounts = await getPlatformAccounts();
      } catch (_e) {
        /* non-fatal */
      }

      toast.success('Signed in');
      if (!userAccounts || userAccounts.length === 0) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      // Deliberately generic — the backend returns the same message whether
      // the email doesn't exist or the password is wrong.
      const message = err.response?.data?.message || 'Invalid email or password';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div className="max-w-sm mx-auto">
        <h1 className="text-lg font-medium mb-6">Sign in</h1>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <FormField
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="name@company.com"
            error={errors.email}
          />
          <FormField
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Enter your password"
            error={errors.password}
          />

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-10 rounded-md bg-ink text-white text-sm font-medium disabled:opacity-60"
          >
            {submitting ? 'Signing in\u2026' : 'Sign in'}
          </button>

          <p className="text-sm text-gray-500 text-center">
            New to Orderly?{' '}
            <Link to="/register" className="text-accent">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </AuthLayout>
  );
}
