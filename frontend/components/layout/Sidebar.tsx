'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserProfileModal } from './UserProfileModal';
import { GlobalSearchModal } from './GlobalSearchModal';
import { AttentionCenter } from './AttentionCenter';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (
      <svg className="sidebar-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/documents',
    label: 'Documents',
    icon: (
      <svg className="sidebar-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    href: '/policies',
    label: 'Policies',
    icon: (
      <svg className="sidebar-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    href: '/actions',
    label: 'Actions',
    icon: (
      <svg className="sidebar-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    href: '/changes',
    label: 'Policy Changes',
    icon: (
      <svg className="sidebar-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    href: '/impact',
    label: 'Impact View',
    icon: (
      <svg className="sidebar-link-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAttentionOpen, setIsAttentionOpen] = useState(false);
  const [attentionCount, setAttentionCount] = useState(0);

  // Global Keyboard Shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <aside className="app-sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div style={{
          width: '2.25rem', height: '2.25rem', borderRadius: '0.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          overflow: 'hidden',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/politrace-logo.png"
            alt="PoliTrace"
            width={36}
            height={36}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
              const next = e.currentTarget.nextElementSibling as HTMLElement | null;
              if (next) next.style.display = 'flex';
            }}
          />
          <div style={{
            display: 'none', width: '100%', height: '100%', backgroundColor: '#2563eb',
            borderRadius: '0.5rem', alignItems: 'center', justifyContent: 'center', color: '#ffffff',
            fontWeight: 800, fontSize: '0.875rem'
          }}>
            PT
          </div>
        </div>
        <div>
          <div className="sidebar-brand-name" style={{ display: 'flex', alignItems: 'center', gap: '0.125rem' }}>
            <span style={{ color: '#0f172a', fontWeight: 800 }}>Poli</span>
            <span style={{ color: '#2563eb', fontWeight: 800 }}>Trace</span>
          </div>
          <div className="sidebar-brand-sub">Policy Impact Intelligence</div>
        </div>
      </div>

      {/* Quick Actions: Spotlight Search & Attention Center */}
      <div style={{ padding: '0 1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '0.375rem',
            color: '#64748b',
            fontSize: '0.75rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span>🔍</span> Search workspace...
          </span>
          <kbd
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              padding: '0.1rem 0.35rem',
              borderRadius: '0.2rem',
              fontSize: '0.6875rem',
              fontWeight: 700,
            }}
          >
            ⌘K
          </kbd>
        </button>

        <button
          type="button"
          onClick={() => setIsAttentionOpen(true)}
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            backgroundColor: attentionCount > 0 ? '#fff7ed' : '#f8fafc',
            border: '1px solid',
            borderColor: attentionCount > 0 ? '#fed7aa' : '#e2e8f0',
            borderRadius: '0.375rem',
            color: attentionCount > 0 ? '#c2410c' : '#475569',
            fontSize: '0.75rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span>🔔</span> Attention Center
          </span>
          {attentionCount > 0 ? (
            <span
              style={{
                backgroundColor: '#dc2626',
                color: '#ffffff',
                padding: '0.1rem 0.45rem',
                borderRadius: '9999px',
                fontSize: '0.6875rem',
                fontWeight: 800,
              }}
            >
              {attentionCount}
            </span>
          ) : (
            <span style={{ fontSize: '0.6875rem', color: '#16a34a', fontWeight: 700 }}>✓ Clear</span>
          )}
        </button>
      </div>

      {/* Navigation */}
      <div className="sidebar-section" style={{ flex: 1 }}>
        <div className="sidebar-section-label">Navigation</div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link${isActive(item.href) ? ' active' : ''}`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Authenticated User Profile Section */}
      {user && (
        <div style={{ position: 'relative', borderTop: '1px solid var(--color-border)' }}>
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{
              width: '100%',
              padding: '0.875rem 1rem',
              background: isMenuOpen ? '#f1f5f9' : 'transparent',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 0.15s ease',
            }}
          >
            {/* Avatar Initials */}
            <div
              style={{
                width: '2.25rem',
                height: '2.25rem',
                borderRadius: '9999px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8125rem',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {userInitials}
            </div>

            {/* Name and Org */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--color-text)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.name}
              </div>
              <div
                style={{
                  fontSize: '0.6875rem',
                  color: 'var(--color-text-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginTop: '0.0625rem',
                }}
              >
                🏢 {user.org?.name || 'Organization'}
              </div>
            </div>

            {/* Chevron / Popover icon */}
            <svg
              style={{
                width: '1rem',
                height: '1rem',
                color: '#94a3b8',
                transform: isMenuOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s ease',
              }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>

          {/* Popover Menu */}
          {isMenuOpen && (
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '0.75rem',
                right: '0.75rem',
                marginBottom: '0.5rem',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                padding: '0.375rem',
                zIndex: 40,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsProfileModalOpen(true);
                }}
                style={{
                  padding: '0.5rem 0.75rem',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: '0.375rem',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  color: '#334155',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                👤 View Profile Details
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  logout();
                }}
                style={{
                  padding: '0.5rem 0.75rem',
                  border: 'none',
                  background: 'transparent',
                  borderRadius: '0.375rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#b91c1c',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                🚪 Sign Out
              </button>
            </div>
          )}
        </div>
      )}

      {/* User Profile Details Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Global Spotlight Search Modal (⌘K / Ctrl+K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* In-App Attention Center Drawer */}
      <AttentionCenter
        isOpen={isAttentionOpen}
        onClose={() => setIsAttentionOpen(false)}
        onCountChange={(count) => setAttentionCount(count)}
      />
    </aside>
  );
}
