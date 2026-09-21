import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Administrator sign-in, reached only by typing /admin/login.
 *
 * Nothing on the storefront links here, and the customer login page does not
 * mention it. That keeps the console out of the way of ordinary shoppers — it is
 * NOT a security measure. Every /admin path is already visible in the production
 * JavaScript bundle, and the real boundary is server-side: the backend rejects
 * non-admin accounts at POST /api/auth/admin-login, and re-checks the role from the
 * database on every subsequent request.
 */
export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  // Local to this component. The `loading` on the context means "the initial session
  // check hasn't finished", is set false exactly once, and can never represent a
  // request in flight — reusing it would leave the button permanently enabled.
  const [submitting, setSubmitting] = useState(false);

  const { adminLogin, isAuthenticated, isAdmin, loading } = useAuth();

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };
  const navigate = useNavigate();

  // Wait for the session rehydration in AuthContext to settle before deciding
  // anything: rendering the form first would flash a sign-in prompt at an
  // administrator who already holds a valid session.
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '6rem' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  // An already-signed-in administrator has no reason to see this form. A signed-in
  // customer does get it — they may be on a shared machine and need to sign in as
  // the owner, which replaces their own session.
  if (isAuthenticated && isAdmin) return <Navigate to="/admin" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      const res = await adminLogin(email, password);
      if (res.success) {
        navigate('/admin', { replace: true });
      }
    } catch (err) {
      // The server returns one generic message for a wrong password, an unknown
      // email, and a valid non-admin account alike. Do not try to tell them apart
      // here — the distinction is in the server log, deliberately.
      setErrorMsg(err.message || 'Sign in failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ padding: '5rem 1.5rem', maxWidth: '440px' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <span className="text-uppercase-tracking" style={{ color: 'var(--text-muted)' }}>RESTRICTED</span>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginTop: '0.25rem' }}>Administrator Sign In</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.75rem' }}>
          Store management access. Customer accounts cannot sign in here.
        </p>
      </div>

      {errorMsg && (
        <div style={{ backgroundColor: '#fce8e6', color: '#c5221f', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="admin-email">Email Address</label>
          <input
            id="admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            className="form-input"
            placeholder="Enter your email"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="admin-password">Password</label>
          <div style={{ position: 'relative' }}>
            <input
              id="admin-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="form-input"
              placeholder="Enter your password"
              style={{ paddingRight: '44px' }}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={togglePasswordVisibility}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
                padding: 0
              }}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <button type="submit" disabled={submitting} className="btn btn-primary btn-full" style={{ marginTop: '1.5rem', padding: '0.9rem' }}>
          {submitting ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
