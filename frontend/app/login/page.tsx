'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import PasswordStrengthMeter, { evaluatePassword } from '@/components/auth/PasswordStrengthMeter';

function LoginForm() {
  const { login, register, isLoading } = useAuth();
  const searchParams = useSearchParams();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setSuccessMessage('Account created successfully. Please sign in to continue.');
    }
  }, [searchParams]);

  const passwordEvaluation = evaluatePassword(password);
  const isPasswordValid = passwordEvaluation.isComplete;
  const doPasswordsMatch = Boolean(password && confirmPassword && password === confirmPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      if (isRegisterMode) {
        if (!name.trim()) {
          setError('Please enter your full name.');
          setIsSubmitting(false);
          return;
        }
        if (!email.trim()) {
          setError('Please enter your email address.');
          setIsSubmitting(false);
          return;
        }
        if (!isPasswordValid) {
          setError('Password must meet all 5 security requirements before submitting.');
          setIsSubmitting(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match. Please ensure both fields are identical.');
          setIsSubmitting(false);
          return;
        }

        const res = await register(name.trim(), email.trim(), password, organizationName.trim() || undefined);
        setSuccessMessage(res?.message || 'Account created successfully. Please sign in to continue.');
        setIsRegisterMode(false);
        setPassword('');
        setConfirmPassword('');
      } else {
        if (!email.trim() || !password) {
          setError('Please enter both email and password.');
          setIsSubmitting(false);
          return;
        }
        // Login does not reject weak/legacy passwords based on the strength meter
        await login(email.trim(), password);
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err?.message || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      await login('admin@policyengine.local', 'admin123');
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Demo login failed. Ensure server is in development/demo mode.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        fontFamily: 'var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1040px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          backgroundColor: '#ffffff',
          borderRadius: '1rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
          overflow: 'hidden',
        }}
      >
        {/* ─── LEFT COLUMN: Brand & Product Value Proposition ─────────────── */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderRight: '1px solid #e2e8f0',
            padding: '2.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '2rem',
          }}
        >
          <div>
            {/* Logo + Product Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
              <div
                style={{
                  width: '2.75rem',
                  height: '2.75rem',
                  borderRadius: '0.625rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '1rem',
                }}
              >
                PT
              </div>

              <div>
                <div style={{ fontSize: '1.375rem', fontWeight: 800, lineHeight: 1.1, display: 'flex', gap: '0.125rem' }}>
                  <span style={{ color: '#0f172a' }}>Poli</span>
                  <span style={{ color: '#2563eb' }}>Trace</span>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', letterSpacing: '0.02em', marginTop: '0.125rem' }}>
                  Policy Change Impact Intelligence
                </div>
              </div>
            </div>

            {/* Main Headline */}
            <h1
              style={{
                fontSize: '1.625rem',
                fontWeight: 800,
                color: '#0f172a',
                lineHeight: 1.25,
                margin: '0 0 1rem',
                letterSpacing: '-0.02em',
              }}
            >
              Turn policy changes into clear operational action.
            </h1>

            {/* Supporting Text */}
            <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.5, margin: '0 0 1.75rem' }}>
              Compare policy versions, identify downstream impacts, trace affected requirements and actions, and understand exactly why a change matters.
            </p>

            {/* Visual Workflow Step-Ladder */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '1.75rem',
              }}
            >
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.625rem' }}>
                Automated Traceability Pipeline
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap', fontSize: '0.75rem', fontWeight: 600 }}>
                <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', border: '1px solid #bfdbfe' }}>
                  Policy Change
                </span>
                <span style={{ color: '#94a3b8' }}>➔</span>
                <span style={{ backgroundColor: '#faf5ff', color: '#7e22ce', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', border: '1px solid #f3e8ff' }}>
                  Impact
                </span>
                <span style={{ color: '#94a3b8' }}>➔</span>
                <span style={{ backgroundColor: '#f0fdf4', color: '#166534', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', border: '1px solid #bbf7d0' }}>
                  Requirement
                </span>
                <span style={{ color: '#94a3b8' }}>➔</span>
                <span style={{ backgroundColor: '#fff7ed', color: '#c2410c', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', border: '1px solid #fed7aa' }}>
                  Action
                </span>
                <span style={{ color: '#94a3b8' }}>➔</span>
                <span style={{ backgroundColor: '#f8fafc', color: '#475569', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', border: '1px solid #e2e8f0' }}>
                  Evidence
                </span>
              </div>
            </div>

            {/* 3 Compact Trust / Value Points */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#334155' }}>
                <span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span>
                <span>Version-to-version policy comparison</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#334155' }}>
                <span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span>
                <span>Explainable impact traceability</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#334155' }}>
                <span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span>
                <span>Requirement ➔ Action ➔ Evidence mapping</span>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
            Enterprise Grade • Multi-Tenant Isolation • Continuous Compliance
          </div>
        </div>

        {/* ─── RIGHT COLUMN: Clean Authentication Card ────────────────────── */}
        <div
          style={{
            padding: '2.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.375rem' }}>
              {isRegisterMode ? 'Create your workspace' : 'Welcome back'}
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
              {isRegisterMode
                ? 'Register your organization to start tracking policy changes.'
                : 'Sign in to access your PoliTrace workspace.'}
            </p>
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div
              style={{
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                padding: '0.75rem 1rem',
                borderRadius: '0.375rem',
                fontSize: '0.8125rem',
                marginBottom: '1.25rem',
                lineHeight: 1.4,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span style={{ fontWeight: 800 }}>✓</span>
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                padding: '0.75rem 1rem',
                borderRadius: '0.375rem',
                fontSize: '0.8125rem',
                marginBottom: '1.25rem',
                lineHeight: 1.4,
              }}
            >
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {isRegisterMode && (
              <div>
                <label
                  htmlFor="fullName"
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '0.375rem',
                  }}
                >
                  Full Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  disabled={isSubmitting || isLoading}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5625rem 0.875rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '0.375rem',
                }}
              >
                Work Email <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                autoComplete="email"
                disabled={isSubmitting || isLoading}
                required
                style={{
                  width: '100%',
                  padding: '0.5625rem 0.875rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                <label
                  htmlFor="password"
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#334155',
                  }}
                >
                  Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {!isRegisterMode && (
                  <Link
                    href="/forgot-password"
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#2563eb',
                      textDecoration: 'none',
                    }}
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                  disabled={isSubmitting || isLoading}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5625rem 2.5rem 0.5625rem 0.875rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '0.5rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>

              {/* Password Strength Meter */}
              <PasswordStrengthMeter
                password={password}
                showRequirements={isRegisterMode}
                mode={isRegisterMode ? 'register' : 'login'}
              />
            </div>

            {isRegisterMode && (
              <div>
                <label
                  htmlFor="confirmPassword"
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '0.375rem',
                  }}
                >
                  Confirm Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={isSubmitting || isLoading}
                    required
                    style={{
                      width: '100%',
                      padding: '0.5625rem 2.5rem 0.5625rem 0.875rem',
                      borderRadius: '0.375rem',
                      border: confirmPassword
                        ? doPasswordsMatch
                          ? '1px solid #10b981'
                          : '1px solid #ef4444'
                        : '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    style={{
                      position: 'absolute',
                      right: '0.5rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      padding: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {showConfirmPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {confirmPassword && (
                  <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
                    {doPasswordsMatch ? (
                      <span style={{ color: '#059669' }}>✓ Passwords match</span>
                    ) : (
                      <span style={{ color: '#dc2626' }}>✕ Passwords do not match</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {isRegisterMode && (
              <div>
                <label
                  htmlFor="orgName"
                  style={{
                    display: 'block',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '0.375rem',
                  }}
                >
                  Organization Name (Optional)
                </label>
                <input
                  id="orgName"
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  disabled={isSubmitting || isLoading}
                  style={{
                    width: '100%',
                    padding: '0.5625rem 0.875rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={
                isSubmitting ||
                isLoading ||
                (isRegisterMode && (!isPasswordValid || !doPasswordsMatch || !name.trim() || !email.trim()))
              }
              style={{
                width: '100%',
                padding: '0.6875rem',
                backgroundColor:
                  isSubmitting ||
                  isLoading ||
                  (isRegisterMode && (!isPasswordValid || !doPasswordsMatch || !name.trim() || !email.trim()))
                    ? '#cbd5e1'
                    : '#2563eb',
                color:
                  isSubmitting ||
                  isLoading ||
                  (isRegisterMode && (!isPasswordValid || !doPasswordsMatch || !name.trim() || !email.trim()))
                    ? '#64748b'
                    : '#ffffff',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor:
                  isSubmitting ||
                  isLoading ||
                  (isRegisterMode && (!isPasswordValid || !doPasswordsMatch || !name.trim() || !email.trim()))
                    ? 'not-allowed'
                    : 'pointer',
                boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
                marginTop: '0.5rem',
                transition: 'all 0.15s ease',
              }}
            >
              {isSubmitting || isLoading
                ? isRegisterMode
                  ? 'Creating workspace...'
                  : 'Signing in...'
                : isRegisterMode
                ? 'Create Workspace'
                : 'Sign In'}
            </button>
          </form>

          {/* Toggle Register / Sign In */}
          <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.8125rem', color: '#64748b' }}>
            {isRegisterMode ? (
              <>
                Already have a workspace?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode(false);
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Need a new workspace?{' '}
                <Link
                  href="/register"
                  style={{
                    color: '#2563eb',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Create account
                </Link>
              </>
            )}
          </div>

          {/* Quick Demo Login Option */}
          <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isSubmitting || isLoading}
              style={{
                width: '100%',
                padding: '0.5625rem',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '0.375rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#334155',
                cursor: isSubmitting || isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.375rem',
                transition: 'background-color 0.15s ease',
              }}
            >
              ⚡ Quick Demo Login
            </button>
            <div style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: '0.375rem' }}>
              Development / Demo only
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }} />}>
      <LoginForm />
    </Suspense>
  );
}
