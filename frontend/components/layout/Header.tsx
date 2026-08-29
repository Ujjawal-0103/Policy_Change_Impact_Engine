'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { user, logout } = useAuth();

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <header className="app-header">
      <h1
        style={{
          fontSize: '1rem',
          fontWeight: 600,
          color: 'var(--color-text)',
          margin: 0,
          flex: 1,
        }}
      >
        {title}
      </h1>

      {user && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          {/* Organization & User info */}
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--color-text)',
                lineHeight: 1.2,
              }}
            >
              {user.name}
            </span>
            <span
              style={{
                fontSize: '0.6875rem',
                color: '#2563eb',
                fontWeight: 600,
                marginTop: '0.125rem',
              }}
            >
              🏢 {user.org?.name || 'My Organization'}
            </span>
          </div>

          {/* User Avatar */}
          <div
            title={`${user.name} (${user.email})`}
            style={{
              width: '2rem',
              height: '2rem',
              borderRadius: '9999px',
              background: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#ffffff',
            }}
          >
            {userInitials}
          </div>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={logout}
            title="Sign out of your account"
            style={{
              background: '#f1f5f9',
              border: '1px solid var(--color-border)',
              borderRadius: '0.375rem',
              padding: '0.35rem 0.65rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Sign Out
          </button>
        </div>
      )}
    </header>
  );
}
