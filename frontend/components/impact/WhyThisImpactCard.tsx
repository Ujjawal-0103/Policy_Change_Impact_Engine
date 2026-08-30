'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { Impact, ImpactSeverity } from '@/types';

interface WhyThisImpactCardProps {
  impact: Impact;
  onClose?: () => void;
  onNavigateAction?: (actionId: string) => void;
}

export function WhyThisImpactCard({ impact, onClose, onNavigateAction }: WhyThisImpactCardProps) {
  const [isSourceExpanded, setIsSourceExpanded] = useState(false);

  const chg = impact.policyChange;
  const req = impact.requirement;
  const act = impact.action;

  const severityColor: Record<ImpactSeverity, { bg: string; text: string; border: string; desc: string }> = {
    CRITICAL: {
      bg: '#fef2f2',
      text: '#991b1b',
      border: '#fecaca',
      desc: 'Immediate action required — major compliance risk, severe penalty, or urgent policy mandate violation.',
    },
    HIGH: {
      bg: '#fff7ed',
      text: '#c2410c',
      border: '#ffedd5',
      desc: 'Significant change affecting mandatory obligations, shortened deadlines, or critical audit evidence.',
    },
    MEDIUM: {
      bg: '#fefce8',
      text: '#854d0e',
      border: '#fef08a',
      desc: 'Moderate policy adjustment requiring operational workflow alignment or process review.',
    },
    LOW: {
      bg: '#f0fdf4',
      text: '#166534',
      border: '#bbf7d0',
      desc: 'Minor wording update or non-breaking clarification with low operational disruption.',
    },
  };

  const currentSev = severityColor[impact.severity] || severityColor.MEDIUM;

  const getSourceExcerpt = () => {
    return req?.sourceText || chg?.newValue || chg?.sourceReference || null;
  };

  const sourceText = getSourceExcerpt();
  const shouldTruncate = sourceText && sourceText.length > 220;

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '0.75rem',
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          padding: '1.25rem 1.5rem',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <span style={{ fontSize: '1.125rem' }}>💡</span>
          <div>
            <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', fontWeight: 700 }}>
              PoliTrace Impact Intelligence
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
              WHY THIS IMPACT?
            </h3>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              padding: '0.25rem 0.625rem',
              borderRadius: '9999px',
              fontSize: '0.6875rem',
              fontWeight: 800,
              backgroundColor: currentSev.bg,
              color: currentSev.text,
              border: `1px solid ${currentSev.border}`,
            }}
          >
            {impact.severity} SEVERITY
          </span>
          <span
            style={{
              padding: '0.25rem 0.625rem',
              borderRadius: '9999px',
              fontSize: '0.6875rem',
              fontWeight: 700,
              backgroundColor: '#1e293b',
              color: '#94a3b8',
            }}
          >
            STATUS: {impact.status}
          </span>
        </div>
      </div>

      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* ─── 1. WHAT CHANGED? ────────────────────────────────────────── */}
        <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span>🔄</span> 1. WHAT CHANGED?
          </div>
          <div style={{ fontSize: '0.875rem', color: '#0f172a', fontWeight: 600, marginBottom: '0.5rem' }}>
            <span style={{ padding: '0.125rem 0.375rem', backgroundColor: '#dbeafe', color: '#1d4ed8', borderRadius: '0.25rem', fontSize: '0.75rem', marginRight: '0.5rem' }}>
              {chg?.changeType || 'MODIFIED'}
            </span>
            {chg?.fieldChanged && (
              <span style={{ padding: '0.125rem 0.375rem', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '0.25rem', fontSize: '0.75rem', marginRight: '0.5rem' }}>
                FIELD: {chg.fieldChanged}
              </span>
            )}
            {chg?.affectedSection && (
              <span style={{ color: '#475569', fontSize: '0.8125rem' }}>
                Section: § {chg.affectedSection}
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.8125rem', color: '#334155', margin: '0 0 0.75rem', lineHeight: 1.5 }}>
            {chg?.description || impact.description}
          </p>

          {/* Old Value vs New Value Diff */}
          {(chg?.oldValue || chg?.newValue) && (
            <div style={{ display: 'grid', gridTemplateColumns: chg.oldValue && chg.newValue ? '1fr 1fr' : '1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
              {chg.oldValue && (
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '0.375rem' }}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.25rem' }}>PREVIOUS POLICY TERM</div>
                  <div style={{ fontSize: '0.75rem', color: '#7f1d1d', fontStyle: 'italic', lineHeight: 1.4 }}>{chg.oldValue}</div>
                </div>
              )}
              {chg.newValue && (
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '0.375rem' }}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#166534', marginBottom: '0.25rem' }}>UPDATED MANDATE (CURRENT)</div>
                  <div style={{ fontSize: '0.75rem', color: '#14532d', fontWeight: 600, lineHeight: 1.4 }}>{chg.newValue}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── 2. WHY DOES IT MATTER? ──────────────────────────────────── */}
        <div style={{ padding: '1rem', backgroundColor: currentSev.bg, borderRadius: '0.5rem', border: `1px solid ${currentSev.border}` }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: currentSev.text, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span>⚡</span> 2. WHY DOES IT MATTER?
          </div>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: currentSev.text, marginBottom: '0.375rem' }}>
            {impact.reason || `Calculated as ${impact.severity} severity based on organizational policy comparison.`}
          </div>
          <div style={{ fontSize: '0.75rem', color: currentSev.text, opacity: 0.9, lineHeight: 1.4 }}>
            {currentSev.desc}
          </div>
        </div>

        {/* ─── 3. WHAT IS AFFECTED & WHAT MUST BE DONE? ─────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: req && act ? '1fr 1fr' : '1fr', gap: '1rem' }}>
          {/* Affected Requirement */}
          <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span>📋</span> 3. AFFECTED REQUIREMENT
            </div>
            {req ? (
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
                  {req.title}
                </div>
                <p style={{ fontSize: '0.75rem', color: '#475569', margin: '0 0 0.5rem', lineHeight: 1.4 }}>
                  {req.description}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', fontSize: '0.6875rem' }}>
                  <span style={{ padding: '0.125rem 0.375rem', backgroundColor: '#e2e8f0', borderRadius: '0.25rem', color: '#334155' }}>
                    Priority: {req.priority}
                  </span>
                  {req.responsibleRole && (
                    <span style={{ padding: '0.125rem 0.375rem', backgroundColor: '#e0f2fe', borderRadius: '0.25rem', color: '#0369a1' }}>
                      Role: {req.responsibleRole}
                    </span>
                  )}
                  {req.evidenceNeeded && (
                    <span style={{ padding: '0.125rem 0.375rem', backgroundColor: '#dcfce7', borderRadius: '0.25rem', color: '#15803d' }}>
                      Audit Artifact Needed
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                General organization-wide policy impact without isolated single requirement.
              </div>
            )}
          </div>

          {/* Action to Execute */}
          <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span>🚀</span> 4. REQUIRED ACTION & OWNER
            </div>
            {act ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                    {act.title}
                  </div>
                  <span style={{ fontSize: '0.6875rem', padding: '0.125rem 0.375rem', borderRadius: '0.25rem', fontWeight: 700, backgroundColor: act.status === 'COMPLETED' ? '#dcfce7' : act.status === 'IN_PROGRESS' ? '#dbeafe' : '#fef3c7', color: act.status === 'COMPLETED' ? '#166534' : act.status === 'IN_PROGRESS' ? '#1e40af' : '#92400e' }}>
                    {act.status}
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#475569', margin: '0 0 0.5rem', lineHeight: 1.4 }}>
                  {act.description}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.75rem', alignItems: 'center' }}>
                  {act.assignedTo ? (
                    <span style={{ color: '#0284c7', fontWeight: 600 }}>👤 {act.assignedTo.name}</span>
                  ) : act.department ? (
                    <span style={{ color: '#475569', fontWeight: 600 }}>🏢 {act.department}</span>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>Unassigned</span>
                  )}
                  {act.deadline && (
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>
                      📅 Due: {new Date(act.deadline).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {onNavigateAction && (
                  <button
                    type="button"
                    onClick={() => onNavigateAction(act.id)}
                    style={{
                      marginTop: '0.5rem',
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      color: '#2563eb',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Open Action Details ➔
                  </button>
                )}
              </div>
            ) : (
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                No compliance action currently linked. You can create a new action from the Actions page.
              </div>
            )}
          </div>
        </div>

        {/* ─── 5. EVIDENCE STATUS ──────────────────────────────────────── */}
        <div style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span>📁</span> 5. EVIDENCE & AUDIT ARTIFACTS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#334155' }}>
              <strong>Evidence Mandate:</strong> {req?.evidenceNeeded || 'Standard internal compliance review record.'}
            </div>
            {act?.evidence && act.evidence.length > 0 ? (
              <div style={{ marginTop: '0.25rem' }}>
                <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#16a34a', marginBottom: '0.25rem' }}>
                  ✓ {act.evidence.length} Evidence Attached:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {act.evidence.map((ev) => (
                    <span
                      key={ev.id}
                      style={{
                        fontSize: '0.6875rem',
                        padding: '0.125rem 0.5rem',
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '0.25rem',
                        color: '#334155',
                      }}
                    >
                      📎 {ev.title}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.6875rem', color: '#ea580c', fontWeight: 600, marginTop: '0.25rem' }}>
                ⚠️ No evidence uploaded yet for this requirement.
              </div>
            )}
          </div>
        </div>

        {/* ─── 6. AUDIT PROVENANCE & SOURCE ────────────────────────────── */}
        <div style={{ padding: '1rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span>🔍</span> 6. PROVENANCE & VERBATIM SOURCE
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.75rem' }}>
            <div>
              <span style={{ color: '#64748b' }}>Policy:</span>{' '}
              <strong style={{ color: '#0f172a' }}>{chg?.policy?.name || 'Policy Document'}</strong>
            </div>
            {chg?.fromVersion && chg?.toVersion && (
              <div>
                <span style={{ color: '#64748b' }}>Version:</span>{' '}
                <strong style={{ color: '#0f172a' }}>v{chg.fromVersion.versionNumber} ➔ v{chg.toVersion.versionNumber}</strong>
              </div>
            )}
            {req?.sourcePage && (
              <div>
                <span style={{ color: '#64748b' }}>Page:</span>{' '}
                <strong style={{ color: '#2563eb' }}>Page {req.sourcePage}</strong>
              </div>
            )}
            {chg?.affectedSection && (
              <div>
                <span style={{ color: '#64748b' }}>Section:</span>{' '}
                <strong style={{ color: '#0f172a' }}>§ {chg.affectedSection}</strong>
              </div>
            )}
          </div>

          {sourceText && (
            <div style={{ backgroundColor: '#ffffff', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', marginBottom: '0.25rem' }}>
                VERBATIM EXTRACTED EXCERPT:
              </div>
              <blockquote style={{ margin: 0, fontSize: '0.75rem', color: '#1e293b', fontStyle: 'italic', lineHeight: 1.5 }}>
                &ldquo;{shouldTruncate && !isSourceExpanded ? `${sourceText.slice(0, 220)}...` : sourceText}&rdquo;
              </blockquote>
              {shouldTruncate && (
                <button
                  type="button"
                  onClick={() => setIsSourceExpanded(!isSourceExpanded)}
                  style={{
                    marginTop: '0.375rem',
                    fontSize: '0.6875rem',
                    color: '#2563eb',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {isSourceExpanded ? 'Show less ▲' : 'Show full excerpt ▼'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
