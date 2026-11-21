import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Feedback } from '../components/ui.js';
import { AuthLayout } from '../components/AuthLayout.js';
import { KeyRound, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout formId="login-heading" title="Welcome back" description="Sign in to pick up where you left off.">
      {error && <div className="mb-4"><Feedback tone="error">{error}</Feedback></div>}

      <form onSubmit={handleSubmit} className="grid gap-4" aria-busy={isSubmitting}>
        <div>
          <label htmlFor="login-email" className="field-label">Email address</label>
          <div className="relative">
            <Mail aria-hidden="true" className="field-icon" />
            <input id="login-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="field field-with-icon" />
          </div>
        </div>
        <div>
          <label htmlFor="login-password" className="field-label">Password</label>
          <div className="relative">
            <KeyRound aria-hidden="true" className="field-icon" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field field-with-icon pr-11"
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword(!showPassword)}
              className="icon-button absolute right-1 top-1/2 -translate-y-1/2"
            >
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </button>
          </div>
        </div>
        <button type="submit" className="button button-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign In'}
          {!isSubmitting && <ArrowRight aria-hidden="true" />}
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        Don't have an account?{' '}
        <Link to="/signup" className="font-bold text-accent-bright underline underline-offset-3">Sign up</Link>
      </p>
    </AuthLayout>
  );
};
