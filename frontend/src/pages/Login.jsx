import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from || '/profile';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        // No admin branch here on purpose. Administrators sign in at /admin/login;
        // this page is the customer door and must not hint that another one exists.
        navigate(redirectPath);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container login-page">
      <div className="login-header">
        <span className="text-uppercase-tracking login-eyebrow">CLIENT PORTAL</span>
        <h1 className="login-title">Sign In to AXI</h1>
      </div>

      {errorMsg && <div className="login-alert">{errorMsg}</div>}

      <form onSubmit={handleSubmit} className="login-form">
        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="form-input"
            placeholder="Enter your email"
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="form-input"
              placeholder="Enter your password"
              autoComplete="current-password"
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

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary btn-full login-submit"
        >
          {loading ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>

      <div className="login-footer">
        Don't have an account yet?{' '}
        <Link to="/register" className="login-footer-link">
          Register Account
        </Link>
      </div>

      <style>{`
        .login-page {
          padding: 5rem 1.5rem;
          max-width: 480px;
        }
        .login-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }
        .login-eyebrow {
          color: var(--text-muted);
        }
        .login-title {
          font-family: var(--font-serif);
          font-size: 2.2rem;
          margin-top: 0.25rem;
          line-height: 1.2;
        }
        .login-alert {
          background-color: #fce8e6;
          color: #c5221f;
          padding: 0.85rem 1rem;
          border-radius: var(--radius-sm);
          margin-bottom: 1.5rem;
          font-size: 0.85rem;
        }
        .login-form .form-input,
        .login-form textarea,
        .login-form select {
          width: 100%;
          box-sizing: border-box;
        }
        .login-submit {
          margin-top: 1.5rem;
          padding: 0.9rem;
        }
        .login-footer {
          text-align: center;
          margin-top: 2rem;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .login-footer-link {
          font-weight: 600;
          text-decoration: underline;
          color: #000;
        }

        @media (max-width: 640px) {
          .login-page {
            padding: 3rem 1rem;
          }
          .login-header {
            margin-bottom: 2rem;
          }
          .login-title {
            font-size: 1.75rem;
          }
          .login-footer {
            margin-top: 1.5rem;
            font-size: 0.8rem;
          }
        }

        @media (max-width: 360px) {
          .login-page {
            padding: 2rem 0.75rem;
          }
          .login-title {
            font-size: 1.5rem;
          }
          .login-submit {
            padding: 0.8rem;
          }
        }
      `}</style>
    </div>
  );
}