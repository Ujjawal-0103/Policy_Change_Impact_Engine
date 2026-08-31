'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import PasswordStrengthMeter, { evaluatePassword } from '@/components/auth/PasswordStrengthMeter';

export default function RegisterPage() {
  const { register, isLoading } = useAuth();
  const router = useRouter();

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

  const passwordEvaluation = evaluatePassword(password);
  const isPasswordValid = passwordEvaluation.isComplete;
  const doPasswordsMatch = Boolean(password && confirmPassword && password === confirmPassword);
  const isFormValid = Boolean(
    name.trim() &&
    email.trim() &&
    isPasswordValid &&
    doPasswordsMatch &&
    !isSubmitting &&
    !isLoading
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your work email address.');
      return;
    }
    if (!isPasswordValid) {
      setError('Password must meet all 5 security requirements before submitting.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password, organizationName.trim() || undefined);
      setSuccessMessage('Account created successfully. Please sign in to continue.');
      setTimeout(() => {
        router.push('/login?registered=true');
      }, 1500);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err?.message || 'Registration failed. Please try again.');
      }
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
        {/* ─── LEFT COLUMN: Product Value Proposition ─────────────── */}
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
                fontSize: '1.5rem',
                fontWeight: 800,
                color: '#0f172a',
                lineHeight: 1.3,
                margin: '0 0 1rem',
                letterSpacing: '-0.02em',
              }}
            >
              Create your organization workspace.
            </h1>

            <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.5, margin: '0 0 1.75rem' }}>
              Set up your isolated workspace to analyze policy revisions, map requirements, track action items, and maintain explainable compliance records.
            </p>

            {/* Trust Badges */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#334155' }}>
                <span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span>
                <span>Strong password protection with real-time validation</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#334155' }}>
                <span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span>
                <span>Isolated tenant data partition and RBAC</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: '#334155' }}>
                <span style={{ color: '#16a34a', fontWeight: 700 }}>✓</span>
                <span>Explicit manual sign-in required after account creation</span>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
            Enterprise Grade • Multi-Tenant Isolation • Continuous Compliance
          </div>
        </div>

        {/* ─── RIGHT COLUMN: Registration Form ───────────────────────────── */}
        <div
          style={{
            padding: '2.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.375rem' }}>
              Create Account
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
              Enter your information to register a new organization workspace.
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
              <span>✓</span>
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
            <div>
              <label
                htmlFor="regFullName"
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
                id="regFullName"
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

            <div>
              <label
                htmlFor="regEmail"
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
                id="regEmail"
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
              <label
                htmlFor="regOrgName"
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
                id="regOrgName"
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

            {/* Password with Strength Meter */}
            <div>
              <label
                htmlFor="regPassword"
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '0.375rem',
                }}
              >
                Password <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="regPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
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
              <PasswordStrengthMeter password={password} showRequirements={true} mode="register" />
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="regConfirmPassword"
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
                  id="regConfirmPassword"
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

              {/* Password Match Indicator */}
              {confirmPassword && (
                <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
                  {doPasswordsMatch ? (
                    <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span>✓</span> Passwords match
                    </span>
                  ) : (
                    <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span>✕</span> Passwords do not match
                    </span>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!isFormValid}
              style={{
                width: '100%',
                padding: '0.6875rem',
                backgroundColor: !isFormValid ? '#cbd5e1' : '#2563eb',
                color: !isFormValid ? '#64748b' : '#ffffff',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: !isFormValid ? 'not-allowed' : 'pointer',
                boxShadow: isFormValid ? '0 1px 2px rgba(37, 99, 235, 0.2)' : 'none',
                marginTop: '0.5rem',
                transition: 'all 0.15s ease',
              }}
            >
              {isSubmitting ? 'Creating workspace...' : 'Create Workspace'}
            </button>
          </form>

          {/* Toggle back to Login */}
          <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.8125rem', color: '#64748b' }}>
            Already have a workspace?{' '}
            <Link
              href="/login"
              style={{
                color: '#2563eb',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
