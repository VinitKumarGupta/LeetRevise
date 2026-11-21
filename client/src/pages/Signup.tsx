import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Feedback } from '../components/ui.js';
import { AuthLayout } from '../components/AuthLayout.js';
import { KeyRound, Mail, User, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const Signup: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await register(name, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout formId="signup-heading" title="Create your account" description="Set up your personal LeetCode revision queue.">
      {error && <div className="mb-4"><Feedback tone="error">{error}</Feedback></div>}

      <form onSubmit={handleSubmit} className="grid gap-4" aria-busy={isSubmitting}>
        <div>
          <label htmlFor="signup-name" className="field-label">Full name</label>
          <div className="relative">
            <User aria-hidden="true" className="field-icon" />
            <input id="signup-name" type="text" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} className="field field-with-icon" />
          </div>
        </div>
        <div>
          <label htmlFor="signup-email" className="field-label">Email address</label>
          <div className="relative">
            <Mail aria-hidden="true" className="field-icon" />
            <input id="signup-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="field field-with-icon" />
          </div>
        </div>
        <div>
          <label htmlFor="signup-password" className="field-label">Password</label>
          <div className="relative">
            <KeyRound aria-hidden="true" className="field-icon" />
            <input
              id="signup-password"
              aria-describedby="signup-password-hint"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
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
          <p id="signup-password-hint" className="field-help">Use at least 6 characters.</p>
        </div>
        <div>
          <label htmlFor="signup-confirmPassword" className="field-label">Confirm password</label>
          <div className="relative">
            <KeyRound aria-hidden="true" className="field-icon" />
            <input
              id="signup-confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="field field-with-icon pr-11"
            />
            <button
              type="button"
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="icon-button absolute right-1 top-1/2 -translate-y-1/2"
            >
              {showConfirmPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </button>
          </div>
        </div>
        <button type="submit" className="button button-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create Account'}
          {!isSubmitting && <ArrowRight aria-hidden="true" />}
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-accent-bright underline underline-offset-3">Sign in</Link>
      </p>
    </AuthLayout>
  );
};
