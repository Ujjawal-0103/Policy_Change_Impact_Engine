'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post<{ message: string }>('/auth/forgot-password', {
        email: email.trim(),
      });
      setSuccessMessage(
        res.message || 'If an account exists for this email, a password reset link will be sent.',
      );
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        // Safe generic message
        setSuccessMessage(
          'If an account exists for this email, a password reset link will be sent.',
        );
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
          maxWidth: '460px',
          backgroundColor: '#ffffff',
          borderRadius: '1rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03)',
          padding: '2.5rem',
        }}
      >
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/politrace-logo.png"
              alt="PoliTrace"
              width={40}
              height={40}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
                const next = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (next) next.style.display = 'flex';
              }}
            />
            <div
              style={{
                display: 'none',
                width: '100%',
                height: '100%',
                backgroundColor: '#2563eb',
                borderRadius: '0.5rem',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.875rem',
              }}
            >
              PT
            </div>
          </div>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.1, display: 'flex', gap: '0.125rem' }}>
              <span style={{ color: '#0f172a' }}>Poli</span>
              <span style={{ color: '#2563eb' }}>Trace</span>
            </div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', marginTop: '0.125rem' }}>
              Policy Change Impact Intelligence
            </div>
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.375rem' }}>
            Forgot your password?
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
            Enter your work email and we&apos;ll send you a secure link to reset your password.
          </p>
        </div>

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
            }}
          >
            {error}
          </div>
        )}

        {/* Generic Success Alert */}
        {successMessage ? (
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#166534',
              padding: '1rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              lineHeight: 1.5,
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>✓ Check your email</div>
            {successMessage}
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                Work Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                autoComplete="email"
                disabled={isSubmitting}
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '0.6875rem',
                backgroundColor: isSubmitting ? '#93c5fd' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
                marginTop: '0.25rem',
                transition: 'background-color 0.15s ease',
              }}
            >
              {isSubmitting ? 'Sending Reset Link...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        {/* Back to Sign In */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
          <Link
            href="/login"
            style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: '#2563eb',
              textDecoration: 'none',
            }}
          >
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
