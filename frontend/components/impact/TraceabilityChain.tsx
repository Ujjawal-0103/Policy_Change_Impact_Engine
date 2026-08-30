'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { Impact, ImpactSeverity, ImpactStatus, Priority, ActionStatus } from '@/types';

interface TraceabilityChainProps {
  impact: Impact;
  compact?: boolean;
  onNavigateAction?: (actionId: string) => void;
}

export function TraceabilityChain({ impact, compact = false, onNavigateAction }: TraceabilityChainProps) {
  const [isSourceTextExpanded, setIsSourceTextExpanded] = useState(false);

  const chg = impact.policyChange;
  const req = impact.requirement;
  const act = impact.action;
  const owner = act?.assignedTo;
  const deadline = act?.deadline || req?.deadline;
  const evidenceList = act?.evidence || [];

  // Severity style helper
  const getSeverityStyle = (severity: ImpactSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' };
      case 'HIGH':
        return { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' };
      case 'MEDIUM':
        return { bg: '#fef9c3', text: '#854d0e', border: '#fde047' };
      case 'LOW':
      default:
        return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
    }
  };

  // Status style helper
  const getStatusStyle = (status: ImpactStatus | ActionStatus | string) => {
    switch (status) {
      case 'MITIGATED':
      case 'COMPLETED':
        return { bg: '#dcfce7', text: '#166534', border: '#86efac' };
      case 'IN_PROGRESS':
      case 'ASSESSED':
        return { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' };
      case 'ACCEPTED':
        return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
      case 'OVERDUE':
        return { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' };
      case 'BLOCKED':
        return { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5' };
      case 'IDENTIFIED':
      case 'PENDING':
      default:
        return { bg: '#ede9fe', text: '#6d28d9', border: '#c4b5fd' };
    }
  };

  const sevStyle = getSeverityStyle(impact.severity);
  const statStyle = getStatusStyle(impact.status);

  // Format date safely
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return null;
    }
  };

  const isOverdue = deadline ? new Date(deadline).getTime() < Date.now() && act?.status !== 'COMPLETED' : false;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        width: '100%',
      }}
    >
      {/* ─── Breadcrumb Progress Bar ────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.375rem',
          padding: '0.625rem 0.875rem',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '0.5rem',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: '#475569',
        }}
      >
        <span style={{ color: '#2563eb' }}>1. Policy {chg?.fromVersion && chg?.toVersion ? `(v${chg.fromVersion.versionNumber} ➔ v${chg.toVersion.versionNumber})` : ''}</span>
        <span style={{ color: '#94a3b8' }}>➔</span>
        <span style={{ color: '#7c3aed' }}>2. Change [{chg?.changeType || 'MODIFIED'}]</span>
        <span style={{ color: '#94a3b8' }}>➔</span>
        <span style={{ color: sevStyle.text, fontWeight: 700 }}>3. Impact ({impact.severity})</span>
        <span style={{ color: '#94a3b8' }}>➔</span>
        <span style={{ color: req ? '#0f172a' : '#94a3b8' }}>4. Requirement</span>
        <span style={{ color: '#94a3b8' }}>➔</span>
        <span style={{ color: act ? '#0f172a' : '#94a3b8' }}>5. Action</span>
        <span style={{ color: '#94a3b8' }}>➔</span>
        <span style={{ color: owner ? '#0369a1' : '#94a3b8' }}>6. Owner</span>
        <span style={{ color: '#94a3b8' }}>➔</span>
        <span style={{ color: deadline ? (isOverdue ? '#dc2626' : '#059669') : '#94a3b8' }}>7. Deadline</span>
        <span style={{ color: '#94a3b8' }}>➔</span>
        <span style={{ color: evidenceList.length > 0 ? '#16a34a' : '#94a3b8' }}>8. Evidence</span>
      </div>

      {/* ─── Traceability Cards Grid ────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '0.875rem',
        }}
      >
        {/* Node 1 & 2: Policy & Change Origin */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '0.5rem',
            padding: '0.875rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🏛️ Policy & Change Origin
              </span>
              {chg?.policyId && (
                <Link
                  href={`/changes?policyId=${chg.policyId}${chg.fromVersionId ? `&fromVersionId=${chg.fromVersionId}` : ''}${chg.toVersionId ? `&toVersionId=${chg.toVersionId}` : ''}`}
                  style={{
                    fontSize: '0.6875rem',
                    color: '#2563eb',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  View Comparison ↗
                </Link>
              )}
            </div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
              {chg?.policy?.name || 'Policy Mandate'}
            </div>
            {chg?.fromVersion && chg?.toVersion && (
              <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '0.5rem' }}>
                Comparing <strong style={{ color: '#0f172a' }}>v{chg.fromVersion.versionNumber}</strong> to <strong style={{ color: '#0f172a' }}>v{chg.toVersion.versionNumber}</strong>
                {chg.affectedSection && <span> • § {chg.affectedSection}</span>}
              </div>
            )}
            <div style={{ fontSize: '0.8125rem', color: '#334155', lineHeight: 1.4 }}>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  padding: '0.125rem 0.375rem',
                  borderRadius: '0.25rem',
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                  marginRight: '0.375rem',
                }}
              >
                {chg?.changeType || 'MODIFIED'}
              </span>
              {chg?.description || impact.description}
            </div>

            {/* Old vs New Value Diff */}
            {(chg?.oldValue || chg?.newValue) && (
              <div
                style={{
                  marginTop: '0.625rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.375rem',
                  fontSize: '0.6875rem',
                }}
              >
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '0.25rem', padding: '0.375rem 0.5rem' }}>
                  <span style={{ fontWeight: 700, color: '#991b1b', display: 'block', textTransform: 'uppercase' }}>Baseline</span>
                  <span style={{ color: '#7f1d1d' }}>{chg.oldValue || 'None'}</span>
                </div>
                <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '0.25rem', padding: '0.375rem 0.5rem' }}>
                  <span style={{ fontWeight: 700, color: '#166534', display: 'block', textTransform: 'uppercase' }}>Revised</span>
                  <span style={{ color: '#14532d' }}>{chg.newValue || 'None'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Node 3: Impact Engine Reasoning */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: `1px solid ${sevStyle.border}`,
            borderRadius: '0.5rem',
            padding: '0.875rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ⚡ Impact Assessment
              </span>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    padding: '0.125rem 0.5rem',
                    borderRadius: '0.25rem',
                    backgroundColor: sevStyle.bg,
                    color: sevStyle.text,
                    border: `1px solid ${sevStyle.border}`,
                  }}
                >
                  {impact.severity}
                </span>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    padding: '0.125rem 0.5rem',
                    borderRadius: '0.25rem',
                    backgroundColor: statStyle.bg,
                    color: statStyle.text,
                    border: `1px solid ${statStyle.border}`,
                  }}
                >
                  {impact.status}
                </span>
              </div>
            </div>

            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.375rem' }}>
              {impact.description}
            </div>

            {impact.reason && (
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  borderLeft: `3px solid ${sevStyle.text}`,
                  borderRadius: '0 0.25rem 0.25rem 0',
                  padding: '0.5rem 0.625rem',
                  fontSize: '0.75rem',
                  color: '#334155',
                  lineHeight: 1.45,
                }}
              >
                <strong style={{ color: '#0f172a' }}>Engine Rationale:</strong> {impact.reason}
              </div>
            )}
          </div>
        </div>

        {/* Node 4: Requirement & Document Source */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '0.5rem',
            padding: '0.875rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                📋 Mandated Requirement
              </span>
              {req?.sourcePage && (
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    padding: '0.125rem 0.375rem',
                    borderRadius: '0.25rem',
                    backgroundColor: '#ecfdf5',
                    color: '#047857',
                    border: '1px solid #a7f3d0',
                  }}
                >
                  📄 Page {req.sourcePage}
                </span>
              )}
            </div>

            {req ? (
              <>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
                  {req.title}
                </div>
                {req.description && (
                  <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '0.375rem', lineHeight: 1.4 }}>
                    {req.description}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.6875rem', color: '#64748b' }}>
                  {req.priority && (
                    <span><strong>Priority:</strong> {req.priority}</span>
                  )}
                  {req.responsibleRole && (
                    <span><strong>Role:</strong> {req.responsibleRole}</span>
                  )}
                  {req.category && (
                    <span><strong>Category:</strong> {req.category}</span>
                  )}
                </div>

                {/* Source Text Citation Toggle */}
                {req.sourceText && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setIsSourceTextExpanded(!isSourceTextExpanded)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        color: '#2563eb',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      {isSourceTextExpanded ? 'Hide Source Citation ▲' : 'View Source Citation ▼'}
                    </button>
                    {isSourceTextExpanded && (
                      <blockquote
                        style={{
                          margin: '0.375rem 0 0 0',
                          padding: '0.5rem 0.625rem',
                          backgroundColor: '#f8fafc',
                          borderLeft: '3px solid #059669',
                          borderRadius: '0 0.25rem 0.25rem 0',
                          fontSize: '0.6875rem',
                          color: '#334155',
                          fontStyle: 'italic',
                          lineHeight: 1.4,
                        }}
                      >
                        &ldquo;{req.sourceText}&rdquo;
                      </blockquote>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: '0.8125rem', color: '#94a3b8', fontStyle: 'italic', paddingTop: '0.25rem' }}>
                General policy mandate (No requirement mapped)
              </div>
            )}
          </div>
        </div>

        {/* Node 5, 6, 7 & 8: Action, Owner, Deadline & Evidence */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '0.5rem',
            padding: '0.875rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🎯 Operational Action & Ownership
              </span>
              {act?.id ? (
                <button
                  type="button"
                  onClick={() => onNavigateAction ? onNavigateAction(act.id) : null}
                  style={{
                    fontSize: '0.6875rem',
                    color: '#0284c7',
                    fontWeight: 600,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <Link href="/actions" style={{ color: '#0284c7', textDecoration: 'none' }}>
                    Open Actions ↗
                  </Link>
                </button>
              ) : null}
            </div>

            {act ? (
              <>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
                  {act.title}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.375rem',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    borderRadius: '0.375rem',
                    padding: '0.5rem 0.625rem',
                    fontSize: '0.6875rem',
                    color: '#334155',
                    marginTop: '0.375rem',
                  }}
                >
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>Owner</span>
                    <strong style={{ color: owner?.name ? '#0369a1' : '#64748b' }}>
                      {owner?.name ? `👤 ${owner.name}` : (act.department ? `🏢 ${act.department}` : 'Owner not assigned')}
                    </strong>
                    {owner?.email && (
                      <div style={{ fontSize: '0.625rem', color: '#64748b' }}>{owner.email}</div>
                    )}
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>Action Status</span>
                    <span
                      style={{
                        display: 'inline-block',
                        fontWeight: 700,
                        padding: '0.0625rem 0.375rem',
                        borderRadius: '0.25rem',
                        backgroundColor: getStatusStyle(act.status).bg,
                        color: getStatusStyle(act.status).text,
                      }}
                    >
                      {act.status}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>Deadline</span>
                    <strong style={{ color: isOverdue ? '#dc2626' : (deadline ? '#0f172a' : '#94a3b8') }}>
                      {formatDate(deadline) || 'No deadline'} {isOverdue && '⚠️ OVERDUE'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block' }}>Evidence Artifacts</span>
                    <span style={{ color: evidenceList.length > 0 ? '#16a34a' : '#64748b', fontWeight: 600 }}>
                      {evidenceList.length > 0 ? `📁 ${evidenceList.length} attached` : 'No evidence attached'}
                    </span>
                  </div>
                </div>

                {/* Evidence Links */}
                {evidenceList.length > 0 && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Attached Evidence:</span>
                    {evidenceList.map((ev) => (
                      <div
                        key={ev.id}
                        style={{
                          fontSize: '0.6875rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.25rem',
                          padding: '0.25rem 0.5rem',
                        }}
                      >
                        <span style={{ color: '#334155', fontWeight: 600 }}>{ev.title}</span>
                        {ev.fileUrl && (
                          <a
                            href={ev.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600, fontSize: '0.625rem' }}
                          >
                            View File ↗
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontSize: '0.8125rem', color: '#94a3b8', fontStyle: 'italic', paddingTop: '0.25rem' }}>
                No operational action created
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
