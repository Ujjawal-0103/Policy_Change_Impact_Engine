'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Sidebar } from './Sidebar';

function ShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const isLoginPage = pathname?.startsWith('/login');

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading && !user) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: 'var(--color-bg, #f8fafc)',
          color: 'var(--color-text-muted, #64748b)',
          fontSize: '0.875rem',
          fontWeight: 500,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '2rem',
              height: '2rem',
              border: '3px solid #e2e8f0',
              borderTopColor: '#2563eb',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 0.75rem',
            }}
          />
          Loading workspace...
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <div className="app-content">{children}</div>
      </main>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ShellContent>{children}</ShellContent>
    </AuthProvider>
  );
}
