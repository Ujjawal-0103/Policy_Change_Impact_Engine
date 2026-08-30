'use client';

import React from 'react';
import type { Impact, Action, ImpactSeverity } from '@/types';

interface RiskMatrixProps {
  impacts: Impact[];
  actions: Action[];
  onSelectCell?: (severity: ImpactSeverity | 'ALL', urgency: 'OVERDUE' | 'DUE_SOON' | 'UPCOMING' | 'ALL') => void;
  selectedSeverity?: string;
  selectedUrgency?: string;
}

export function RiskMatrix({
  impacts,
  actions,
  onSelectCell,
  selectedSeverity,
  selectedUrgency,
}: RiskMatrixProps) {
  const now = new Date();
  const sevenDays = new Date();
  sevenDays.setDate(now.getDate() + 7);

  // Compute urgency for an action
  const getActionUrgency = (act?: { deadline?: string | null; status?: string; isOverdue?: boolean } | null): 'OVERDUE' | 'DUE_SOON' | 'UPCOMING' => {
    if (!act || !act.deadline) return 'UPCOMING';
    const due = new Date(act.deadline);
    if (due < now || act.status === 'OVERDUE' || act.isOverdue) return 'OVERDUE';
    if (due <= sevenDays) return 'DUE_SOON';
    return 'UPCOMING';
  };

  // Matrix cell computation
  const severities: ImpactSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const urgencies: Array<{ key: 'OVERDUE' | 'DUE_SOON' | 'UPCOMING'; label: string; desc: string }> = [
    { key: 'OVERDUE', label: 'Overdue', desc: '< 0 days' },
    { key: 'DUE_SOON', label: 'Due Soon', desc: '≤ 7 days' },
    { key: 'UPCOMING', label: 'Upcoming', desc: '> 7 days / Planned' },
  ];

  // Populate counts: cellCounts[severity][urgency]
  const cellCounts: Record<ImpactSeverity, Record<'OVERDUE' | 'DUE_SOON' | 'UPCOMING', number>> = {
    CRITICAL: { OVERDUE: 0, DUE_SOON: 0, UPCOMING: 0 },
    HIGH: { OVERDUE: 0, DUE_SOON: 0, UPCOMING: 0 },
    MEDIUM: { OVERDUE: 0, DUE_SOON: 0, UPCOMING: 0 },
    LOW: { OVERDUE: 0, DUE_SOON: 0, UPCOMING: 0 },
  };

  impacts.forEach((imp) => {
    const urgency = getActionUrgency(imp.action);
    if (cellCounts[imp.severity]) {
      cellCounts[imp.severity][urgency]++;
    }
  });

  const getCellColor = (sev: ImpactSeverity, count: number, isCellActive: boolean) => {
    if (isCellActive) {
      return { bg: '#2563eb', text: '#ffffff', border: '#1d4ed8' };
    }
    if (count === 0) {
      return { bg: '#f8fafc', text: '#94a3b8', border: '#e2e8f0' };
    }
    switch (sev) {
      case 'CRITICAL':
        return { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' };
      case 'HIGH':
        return { bg: '#fff7ed', text: '#c2410c', border: '#ffedd5' };
      case 'MEDIUM':
        return { bg: '#fefce8', text: '#854d0e', border: '#fef08a' };
      case 'LOW':
        return { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' };
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '0.75rem',
        border: '1px solid #e2e8f0',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🎯</span> Policy Change Risk Matrix
          </h3>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
            Two-dimensional risk mapping: <strong>Impact Severity</strong> × <strong>Deadline Urgency</strong>. Click any cell to filter.
          </p>
        </div>

        {onSelectCell && (selectedSeverity || selectedUrgency) && (
          <button
            type="button"
            onClick={() => onSelectCell('ALL', 'ALL')}
            style={{
              fontSize: '0.75rem',
              color: '#2563eb',
              background: 'none',
              border: '1px solid #bfdbfe',
              padding: '0.25rem 0.625rem',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Reset Filter ✕
          </button>
        )}
      </div>

      {/* 2D Matrix Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0.375rem', textAlign: 'center' }}>
          <thead>
            <tr>
              <th style={{ padding: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textAlign: 'left', width: '120px' }}>
                SEVERITY \ URGENCY
              </th>
              {urgencies.map((urg) => (
                <th key={urg.key} style={{ padding: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#334155' }}>
                  <div>{urg.label}</div>
                  <div style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 400 }}>{urg.desc}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {severities.map((sev) => (
              <tr key={sev}>
                <td style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 700, fontSize: '0.8125rem', color: sev === 'CRITICAL' ? '#991b1b' : sev === 'HIGH' ? '#c2410c' : sev === 'MEDIUM' ? '#854d0e' : '#166534' }}>
                  {sev}
                </td>
                {urgencies.map((urg) => {
                  const count = cellCounts[sev][urg.key];
                  const isCellActive = selectedSeverity === sev && selectedUrgency === urg.key;
                  const colors = getCellColor(sev, count, isCellActive);

                  return (
                    <td key={urg.key}>
                      <button
                        type="button"
                        onClick={() => onSelectCell && onSelectCell(sev, urg.key)}
                        style={{
                          width: '100%',
                          padding: '0.75rem 0.5rem',
                          backgroundColor: colors.bg,
                          color: colors.text,
                          border: `1px solid ${colors.border}`,
                          borderRadius: '0.375rem',
                          cursor: onSelectCell ? 'pointer' : 'default',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.25rem',
                          transition: 'all 0.15s ease',
                          boxShadow: isCellActive ? '0 2px 4px rgba(37, 99, 235, 0.3)' : 'none',
                        }}
                      >
                        <span style={{ fontSize: '1.125rem', fontWeight: 800 }}>{count}</span>
                        <span style={{ fontSize: '0.6875rem', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {count === 1 ? 'Impact' : 'Impacts'}
                        </span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
