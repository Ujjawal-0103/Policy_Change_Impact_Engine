'use client';

import React from 'react';
import type { Policy } from '@/types';

interface PolicyListProps {
  policies: Policy[];
  isLoading: boolean;
  onSelectPolicy: (policyId: string) => void;
  onNewVersion: (policy: Policy) => void;
  onCompare: (policy: Policy) => void;
  onCreatePolicy: () => void;
}

export function PolicyList({
  policies,
  isLoading,
  onSelectPolicy,
  onNewVersion,
  onCompare,
  onCreatePolicy,
}: PolicyListProps) {
  if (isLoading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              minHeight: '180px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ width: '40%', height: '1.25rem', backgroundColor: '#f1f5f9', borderRadius: '0.25rem', marginBottom: '0.75rem' }} />
              <div style={{ width: '80%', height: '0.875rem', backgroundColor: '#f8fafc', borderRadius: '0.25rem' }} />
            </div>
            <div style={{ width: '100%', height: '2rem', backgroundColor: '#f1f5f9', borderRadius: '0.25rem' }} />
          </div>
        ))}
      </div>
    );
  }

  if (policies.length === 0) {
    return (
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '0.75rem',
          border: '1px dashed #cbd5e1',
          padding: '3.5rem 2rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '3.5rem',
            height: '3.5rem',
            borderRadius: '50%',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem',
          }}
        >
          <svg style={{ width: '1.75rem', height: '1.75rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
          No policies created yet
        </h3>
        <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '420px', margin: '0 0 1.5rem 0' }}>
          Create a policy to start tracking multiple versions, extract AI compliance requirements, and compare policy revisions.
        </p>
        <button
          onClick={onCreatePolicy}
          style={{
            padding: '0.625rem 1.25rem',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          + Create First Policy
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
      {policies.map((policy) => {
        const versionCount = policy.versionCount || policy.versions?.length || 0;
        const latestVer = policy.latestVersion || policy.versions?.[0] || null;

        return (
          <div
            key={policy.id}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
          >
            {/* Header / Info */}
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <h3
                  onClick={() => onSelectPolicy(policy.id)}
                  style={{
                    fontSize: '1.0625rem',
                    fontWeight: 700,
                    color: '#0f172a',
                    margin: 0,
                    cursor: 'pointer',
                    lineHeight: 1.3,
                  }}
                >
                  {policy.name}
                </h3>
                {latestVer && (() => {
                  const s =
                    latestVer.status === 'ACTIVE'
                      ? { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' }
                      : latestVer.status === 'DRAFT'
                        ? { bg: '#fef3c7', text: '#92400e', border: '#fde68a' }
                        : { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
                  return (
                    <span
                      style={{
                        flexShrink: 0,
                        backgroundColor: s.bg,
                        color: s.text,
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        padding: '0.125rem 0.5rem',
                        borderRadius: '0.25rem',
                        border: `1px solid ${s.border}`,
                      }}
                    >
                      v{latestVer.versionNumber} ({latestVer.status})
                    </span>
                  );
                })()}
              </div>

              <p
                style={{
                  fontSize: '0.8125rem',
                  color: '#64748b',
                  margin: '0 0 1rem 0',
                  lineHeight: 1.4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {policy.description || 'No description provided.'}
              </p>

              {/* Version & Requirement Stats */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.75rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '0.375rem',
                  border: '1px solid #f1f5f9',
                  marginBottom: '1.25rem',
                }}
              >
                <div>
                  <span style={{ display: 'block', fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                    Versions
                  </span>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1e293b' }}>
                    {versionCount}
                  </span>
                </div>
                <div style={{ width: '1px', height: '1.5rem', backgroundColor: '#e2e8f0' }} />
                <div>
                  <span style={{ display: 'block', fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                    Requirements
                  </span>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#2563eb' }}>
                    {policy.totalRequirements || 0}
                  </span>
                </div>
                <div style={{ width: '1px', height: '1.5rem', backgroundColor: '#e2e8f0' }} />
                <div>
                  <span style={{ display: 'block', fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                    Changes Detected
                  </span>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#d97706' }}>
                    {policy.changeCount || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.875rem' }}>
              <button
                onClick={() => onSelectPolicy(policy.id)}
                style={{
                  flex: 1,
                  padding: '0.4375rem 0.75rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                Inspect
              </button>

              <button
                onClick={() => onNewVersion(policy)}
                style={{
                  padding: '0.4375rem 0.75rem',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#16a34a',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                + New Version
              </button>

              {versionCount >= 2 && (
                <button
                  onClick={() => onCompare(policy)}
                  style={{
                    padding: '0.4375rem 0.75rem',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '0.375rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#2563eb',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <svg style={{ width: '0.75rem', height: '0.75rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Compare
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
