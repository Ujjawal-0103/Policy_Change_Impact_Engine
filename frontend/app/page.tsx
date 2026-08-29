'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Action, ActionStats, Document, Policy } from '@/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<ActionStats | null>(null);
  const [recentActions, setRecentActions] = useState<Action[]>([]);
  const [documentsCount, setDocumentsCount] = useState<number | null>(null);
  const [policiesCount, setPoliciesCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      api.get<ActionStats>('/actions/stats'),
      api.get<Action[]>('/actions'),
      api.get<Document[]>('/documents'),
      api.get<Policy[]>('/policies'),
    ]).then(([statsRes, actionsRes, docsRes, policiesRes]) => {
      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (actionsRes.status === 'fulfilled') setRecentActions((actionsRes.value || []).slice(0, 5));
      if (docsRes.status === 'fulfilled') setDocumentsCount((docsRes.value || []).length);
      if (policiesRes.status === 'fulfilled') setPoliciesCount((policiesRes.value || []).length);
      setLoading(false);
    });
  }, []);

  const openActionsCount = stats ? stats.pending + stats.inProgress : null;
  const completionRate = stats && stats.totalActions > 0
    ? Math.round((stats.completed / stats.totalActions) * 100)
    : 0;

  return (
    <>
      {/* Dashboard Title */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Real-time overview of your policy compliance mandates, deadlines, and active action items.
        </p>
      </div>

      {/* Primary KPI Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        {/* Policy Documents */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1 }}>
            {documentsCount !== null ? documentsCount : '—'}
          </div>
          <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text)', marginTop: '0.5rem' }}>
            Documents
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Policy documents uploaded
          </div>
        </div>

        {/* Policies */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1 }}>
            {policiesCount !== null ? policiesCount : '—'}
          </div>
          <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text)', marginTop: '0.5rem' }}>
            Policies
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Active policy sets
          </div>
        </div>

        {/* Open Compliance Actions */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#2563eb', lineHeight: 1 }}>
            {openActionsCount !== null ? openActionsCount : '—'}
          </div>
          <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text)', marginTop: '0.5rem' }}>
            Open Actions
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            Pending & in-progress items
          </div>
        </div>

        {/* Overdue Warnings */}
        <div
          className="card"
          style={{
            padding: '1.25rem',
            backgroundColor: stats && stats.overdue > 0 ? '#fef2f2' : '#ffffff',
            borderColor: stats && stats.overdue > 0 ? '#fecaca' : 'var(--color-border)',
          }}
        >
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: stats && stats.overdue > 0 ? '#b91c1c' : 'var(--color-text)',
              lineHeight: 1,
            }}
          >
            {stats ? stats.overdue : '—'}
          </div>
          <div
            style={{
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: stats && stats.overdue > 0 ? '#991b1b' : 'var(--color-text)',
              marginTop: '0.5rem',
            }}
          >
            {stats && stats.overdue > 0 ? '⚠️ Overdue Actions' : 'Overdue Actions'}
          </div>
          <div style={{ fontSize: '0.8125rem', color: stats && stats.overdue > 0 ? '#b91c1c' : 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            {stats && stats.overdue > 0 ? 'Urgent attention required' : 'Zero overdue items'}
          </div>
        </div>

        {/* Compliance Completion Rate */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#16a34a', lineHeight: 1 }}>
            {stats ? `${completionRate}%` : '—'}
          </div>
          <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text)', marginTop: '0.5rem' }}>
            Compliance Rate
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
            {stats ? `${stats.completed} of ${stats.totalActions} completed` : 'Completion progress'}
          </div>
        </div>
      </div>

      {/* Compliance Actions Health Breakdown */}
      {stats && stats.totalActions > 0 && (
        <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Action Status Breakdown
            </h2>
            <Link
              href="/actions"
              style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}
            >
              View all {stats.totalActions} actions →
            </Link>
          </div>

          {/* Progress bar */}
          <div style={{ height: '0.75rem', width: '100%', backgroundColor: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden', display: 'flex' }}>
            {stats.completed > 0 && (
              <div style={{ width: `${(stats.completed / stats.totalActions) * 100}%`, backgroundColor: '#16a34a' }} title={`Completed: ${stats.completed}`} />
            )}
            {stats.inProgress > 0 && (
              <div style={{ width: `${(stats.inProgress / stats.totalActions) * 100}%`, backgroundColor: '#2563eb' }} title={`In Progress: ${stats.inProgress}`} />
            )}
            {stats.pending > 0 && (
              <div style={{ width: `${(stats.pending / stats.totalActions) * 100}%`, backgroundColor: '#94a3b8' }} title={`Pending: ${stats.pending}`} />
            )}
            {stats.overdue > 0 && (
              <div style={{ width: `${(stats.overdue / stats.totalActions) * 100}%`, backgroundColor: '#b91c1c' }} title={`Overdue: ${stats.overdue}`} />
            )}
            {stats.blocked > 0 && (
              <div style={{ width: `${(stats.blocked / stats.totalActions) * 100}%`, backgroundColor: '#be123c' }} title={`Blocked: ${stats.blocked}`} />
            )}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', marginTop: '1rem', fontSize: '0.8125rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ width: '0.625rem', height: '0.625rem', borderRadius: '50%', backgroundColor: '#16a34a' }} />
              <span>Completed ({stats.completed})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ width: '0.625rem', height: '0.625rem', borderRadius: '50%', backgroundColor: '#2563eb' }} />
              <span>In Progress ({stats.inProgress})</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span style={{ width: '0.625rem', height: '0.625rem', borderRadius: '50%', backgroundColor: '#94a3b8' }} />
              <span>Pending ({stats.pending})</span>
            </div>
            {stats.overdue > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span style={{ width: '0.625rem', height: '0.625rem', borderRadius: '50%', backgroundColor: '#b91c1c' }} />
                <span style={{ color: '#b91c1c', fontWeight: 600 }}>Overdue ({stats.overdue})</span>
              </div>
            )}
            {stats.blocked > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span style={{ width: '0.625rem', height: '0.625rem', borderRadius: '50%', backgroundColor: '#be123c' }} />
                <span>Blocked ({stats.blocked})</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Actions List */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Recent Compliance Actions
          </h2>
          <Link
            href="/actions"
            style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}
          >
            Manage Actions →
          </Link>
        </div>

        {recentActions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {recentActions.map((act) => (
              <Link
                key={act.id}
                href="/actions"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.375rem',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>
                    {act.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>
                    🏢 {act.department || 'General'} {act.deadline && `• Due: ${new Date(act.deadline).toLocaleDateString()}`}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '0.25rem',
                      backgroundColor:
                        act.status === 'COMPLETED' ? '#f0fdf4' :
                        act.status === 'IN_PROGRESS' ? '#eff6ff' :
                        act.status === 'OVERDUE' ? '#fef2f2' : '#f8fafc',
                      color:
                        act.status === 'COMPLETED' ? '#166534' :
                        act.status === 'IN_PROGRESS' ? '#1e40af' :
                        act.status === 'OVERDUE' ? '#b91c1c' : '#475569',
                      border: '1px solid',
                      borderColor:
                        act.status === 'COMPLETED' ? '#bbf7d0' :
                        act.status === 'IN_PROGRESS' ? '#bfdbfe' :
                        act.status === 'OVERDUE' ? '#fecaca' : '#e2e8f0',
                    }}
                  >
                    {act.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
            No compliance actions recorded yet.{' '}
            <Link href="/actions" style={{ color: '#2563eb', fontWeight: 600 }}>
              Create an action
            </Link>
          </div>
        )}
      </div>

      {/* Product loop reminder */}
      <div className="card" style={{ borderStyle: 'dashed' }}>
        <div style={{
          fontSize: '0.75rem', fontWeight: 600,
          color: 'var(--color-text-muted)', textTransform: 'uppercase',
          letterSpacing: '0.08em', marginBottom: '1rem',
        }}>
          Product Loop
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          {[
            'Upload Policy',
            'Extract Requirements',
            'Create Actions',
            'Track Owners & Deadlines',
            'Upload New Version',
            'Detect Changes',
            'Map Impact',
            'Update Work',
          ].map((step, i, arr) => (
            <span key={step} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                fontSize: '0.8125rem', fontWeight: 500,
                color: 'var(--color-text)',
                background: '#f1f5f9', padding: '0.25rem 0.625rem',
                borderRadius: '0.25rem',
              }}>
                {step}
              </span>
              {i < arr.length - 1 && (
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>→</span>
              )}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
