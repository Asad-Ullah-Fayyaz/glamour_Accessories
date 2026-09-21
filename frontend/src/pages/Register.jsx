import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword((prev) => !prev);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await register(name, email, password);
      if (res.success) {
        navigate('/profile');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container register-page" style={{ padding: '5rem 1.5rem', maxWidth: '480px' }}>
      <div className="register-header" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <span className="text-uppercase-tracking register-eyebrow" style={{ color: 'var(--text-muted)' }}>NEW CLIENT</span>
        <h1 className="register-title" style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', marginTop: '0.25rem' }}>Create Account</h1>
      </div>

      {errorMsg && (
        <div className="register-alert" style={{ backgroundColor: '#fce8e6', color: '#c5221f', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="register-form">
        <div className="form-group">
          <label className="form-label">Full Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="form-input"
            placeholder="e.g. Alexander Wright"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Email Address *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="form-input"
            placeholder="Enter your email"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password *</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="form-input"
              placeholder="At least 6 characters"
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

        <div className="form-group">
          <label className="form-label">Confirm Password *</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="form-input"
              placeholder="Repeat password"
              style={{ paddingRight: '44px' }}
            />
            <button
              type="button"
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              onClick={toggleConfirmPasswordVisibility}
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
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary btn-full register-submit" style={{ marginTop: '1.5rem', padding: '0.9rem' }}>
          {loading ? 'Creating Account...' : 'Register Account'}
        </button>
      </form>

      <div className="register-footer" style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        Already registered? <Link to="/login" className="register-footer-link" style={{ fontWeight: 600, textDecoration: 'underline', color: '#000' }}>Sign In</Link>
      </div>

      <style>{`
        /* === Responsive fixes only === */
        .register-form .form-input,
        .register-form textarea,
        .register-form select {
          width: 100%;
          box-sizing: border-box;
        }

        @media (max-width: 640px) {
          .register-page {
            padding: 3rem 1rem !important;
          }
          .register-header {
            margin-bottom: 2rem !important;
          }
          .register-title {
            font-size: 1.75rem !important;
          }
          .register-footer {
            margin-top: 1.5rem !important;
            font-size: 0.8rem !important;
          }
        }

        @media (max-width: 360px) {
          .register-page {
            padding: 2rem 0.75rem !important;
          }
          .register-title {
            font-size: 1.5rem !important;
          }
          .register-submit {
            padding: 0.8rem !important;
          }
        }
      `}</style>
    </div>
  );
}