'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';

export default function LoginPage() {
  const { login, register, isLoading } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (isRegisterMode) {
        if (!name.trim()) {
          setError('Please enter your full name.');
          return;
        }
        if (!email.trim()) {
          setError('Please enter your email address.');
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters long.');
          return;
        }
        await register(name.trim(), email.trim(), password, organizationName.trim() || undefined);
      } else {
        if (!email.trim() || !password) {
          setError('Please enter both email and password.');
          return;
        }
        await login(email.trim(), password);
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err?.message || 'Authentication failed. Please check your credentials.');
      }
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    try {
      await login('admin@policyengine.local', 'admin123');
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Demo login failed. Ensure server is in development/demo mode.');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        padding: '1.5rem',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#1e293b',
          borderRadius: '1rem',
          border: '1px solid #334155',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          padding: '2.25rem',
          color: '#f8fafc',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '3.25rem',
              height: '3.25rem',
              borderRadius: '0.75rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              marginBottom: '1rem',
              fontWeight: 800,
              fontSize: '1.25rem',
              letterSpacing: '-0.02em',
            }}
          >
            PC
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.375rem', color: '#ffffff' }}>
            Policy Change Impact Engine
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0 }}>
            {isRegisterMode
              ? 'Create a secure workspace for your organization'
              : 'Sign in to access your organization workspace'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              backgroundColor: '#450a0a',
              border: '1px solid #991b1b',
              color: '#fca5a5',
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.8125rem',
              marginBottom: '1.25rem',
              lineHeight: 1.4,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {isRegisterMode && (
            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  marginBottom: '0.375rem',
                }}
              >
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jane Doe"
                required
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  borderRadius: '0.375rem',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
            </div>
          )}

          {isRegisterMode && (
            <div style={{ marginBottom: '1rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  marginBottom: '0.375rem',
                }}
              >
                Organization / Company Name
              </label>
              <input
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="e.g. Acme Health Corp"
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  borderRadius: '0.375rem',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#cbd5e1',
                marginBottom: '0.375rem',
              }}
            >
              Work Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                borderRadius: '0.375rem',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                color: '#ffffff',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: '#cbd5e1',
                marginBottom: '0.375rem',
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                borderRadius: '0.375rem',
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                color: '#ffffff',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '0.375rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.875rem',
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              transition: 'background-color 0.15s ease',
              marginBottom: '1rem',
            }}
          >
            {isLoading ? 'Processing...' : isRegisterMode ? 'Create Organization Account' : 'Sign In'}
          </button>
        </form>

        {/* Demo Login Button */}
        {!isRegisterMode && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                margin: '1rem 0',
              }}
            >
              <div style={{ flex: 1, height: '1px', backgroundColor: '#334155' }} />
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                or development / demo evaluation
              </span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#334155' }} />
            </div>

            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.625rem',
                borderRadius: '0.375rem',
                backgroundColor: '#334155',
                color: '#f8fafc',
                fontWeight: 600,
                fontSize: '0.8125rem',
                border: '1px solid #475569',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              ⚡ Quick Demo Login (Dev/Demo Mode)
            </button>
          </div>
        )}

        {/* Toggle Mode */}
        <div style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#94a3b8' }}>
          {isRegisterMode ? 'Already have an account?' : "Don't have an organization account yet?"}{' '}
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setError(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#38bdf8',
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {isRegisterMode ? 'Sign In' : 'Register Organization'}
          </button>
        </div>
      </div>
    </div>
  );
}
