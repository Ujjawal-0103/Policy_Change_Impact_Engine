'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Policy, Impact, Action, User } from '@/types';

interface ComplianceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPolicyId?: string;
}

export function ComplianceReportModal({ isOpen, onClose, defaultPolicyId }: ComplianceReportModalProps) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [impacts, setImpacts] = useState<Impact[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>(defaultPolicyId || 'ALL');
  const [loading, setLoading] = useState(false);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const [pols, imps, acts, user] = await Promise.all([
        api.get<Policy[]>('/policies').catch(() => []),
        api.get<Impact[]>('/impact').catch(() => []),
        api.get<Action[]>('/actions').catch(() => []),
        api.get<User>('/auth/me').catch(() => null),
      ]);
      setPolicies(pols);
      setImpacts(imps);
      setActions(acts);
      setCurrentUser(user);
    } catch {
      // Graceful
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchReportData();
    }
  }, [isOpen, fetchReportData]);

  const filteredImpacts = selectedPolicyId === 'ALL'
    ? impacts
    : impacts.filter((i) => i.policyChange?.policyId === selectedPolicyId);

  const filteredActions = selectedPolicyId === 'ALL'
    ? actions
    : actions.filter((a) => a.requirement?.policyVersion?.policy?.id === selectedPolicyId);

  const criticalAndHighCount = filteredImpacts.filter(
    (i) => i.severity === 'CRITICAL' || i.severity === 'HIGH',
  ).length;

  const completedActionsCount = filteredActions.filter((a) => a.status === 'COMPLETED').length;
  const overdueActionsCount = filteredActions.filter(
    (a) => a.status === 'OVERDUE' || (a.deadline && new Date(a.deadline) < new Date() && a.status !== 'COMPLETED'),
  ).length;

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 80,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '900px',
          maxHeight: '92vh',
          backgroundColor: '#ffffff',
          borderRadius: '0.75rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Controls Toolbar (Hidden during print) */}
        <div
          className="no-print"
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>📄</span>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                Executive Compliance Impact Report
              </h2>
              <div style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                PoliTrace Audit & Traceability Report
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <select
              value={selectedPolicyId}
              onChange={(e) => setSelectedPolicyId(e.target.value)}
              style={{
                padding: '0.375rem 0.625rem',
                fontSize: '0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid #334155',
                backgroundColor: '#1e293b',
                color: '#ffffff',
                outline: 'none',
              }}
            >
              <option value="ALL">All Policies (Organization-Wide)</option>
              {policies.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handlePrint}
              style={{
                padding: '0.375rem 0.875rem',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
              }}
            >
              <span>🖨️</span> Download PDF / Print
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '1.25rem',
                cursor: 'pointer',
                padding: '0.25rem',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Report Content */}
        <div
          id="printable-compliance-report"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '2.5rem',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            fontFamily: 'var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              Compiling compliance impact report...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Document Header */}
              <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, display: 'flex', gap: '0.125rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: '#0f172a' }}>Poli</span>
                    <span style={{ color: '#2563eb' }}>Trace</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Policy Change Impact Intelligence & Compliance Audit Report
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#475569' }}>
                  <div><strong>Date:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  <div><strong>Auditor:</strong> {currentUser?.name || 'Authorized Compliance Officer'}</div>
                  <div><strong>Scope:</strong> {selectedPolicyId === 'ALL' ? 'Organization-Wide' : policies.find((p) => p.id === selectedPolicyId)?.name}</div>
                </div>
              </div>

              {/* Executive Summary Metrics */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.375rem' }}>
                  1. Executive Risk & Impact Summary
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                  <div style={{ padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>{policies.length}</div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Active Policies</div>
                  </div>
                  <div style={{ padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563eb' }}>{filteredImpacts.length}</div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Impacts</div>
                  </div>
                  <div style={{ padding: '1rem', backgroundColor: criticalAndHighCount > 0 ? '#fef2f2' : '#f0fdf4', border: '1px solid', borderColor: criticalAndHighCount > 0 ? '#fecaca' : '#bbf7d0', borderRadius: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: criticalAndHighCount > 0 ? '#991b1b' : '#166534' }}>{criticalAndHighCount}</div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: criticalAndHighCount > 0 ? '#991b1b' : '#166534', textTransform: 'uppercase' }}>High / Critical Risks</div>
                  </div>
                  <div style={{ padding: '1rem', backgroundColor: overdueActionsCount > 0 ? '#fff7ed' : '#f0fdf4', border: '1px solid', borderColor: overdueActionsCount > 0 ? '#fed7aa' : '#bbf7d0', borderRadius: '0.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: overdueActionsCount > 0 ? '#c2410c' : '#166534' }}>{overdueActionsCount}</div>
                    <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: overdueActionsCount > 0 ? '#c2410c' : '#166534', textTransform: 'uppercase' }}>Overdue Actions</div>
                  </div>
                </div>
              </div>

              {/* High & Critical Impacts */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.375rem' }}>
                  2. Critical & High Priority Impact Assessments
                </h3>
                {filteredImpacts.length === 0 ? (
                  <div style={{ fontSize: '0.8125rem', color: '#64748b', fontStyle: 'italic' }}>No impact records found in selected scope.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Severity</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Policy & Change</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Why It Matters (Reason)</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Affected Action / Owner</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredImpacts.map((imp) => (
                        <tr key={imp.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '0.5rem', verticalAlign: 'top', fontWeight: 800, color: imp.severity === 'CRITICAL' ? '#991b1b' : imp.severity === 'HIGH' ? '#c2410c' : '#854d0e' }}>
                            {imp.severity}
                          </td>
                          <td style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: 700 }}>{imp.policyChange?.policy?.name}</div>
                            <div style={{ color: '#64748b', fontSize: '0.6875rem' }}>{imp.description}</div>
                          </td>
                          <td style={{ padding: '0.5rem', verticalAlign: 'top', color: '#334155' }}>
                            {imp.reason || 'Calculated policy modification risk.'}
                          </td>
                          <td style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                            {imp.action ? (
                              <div>
                                <div style={{ fontWeight: 600 }}>{imp.action.title}</div>
                                <div style={{ color: '#64748b', fontSize: '0.6875rem' }}>
                                  👤 {imp.action.assignedTo?.name || imp.action.department || 'Unassigned'}
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>General Policy Level</span>
                            )}
                          </td>
                          <td style={{ padding: '0.5rem', verticalAlign: 'top', fontWeight: 700 }}>
                            {imp.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Action Implementation & Accountability Table */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.375rem' }}>
                  3. Action Accountability & Evidence Verification
                </h3>
                {filteredActions.length === 0 ? (
                  <div style={{ fontSize: '0.8125rem', color: '#64748b', fontStyle: 'italic' }}>No actions created yet.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Action Title</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Owner / Dept</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Deadline</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Status</th>
                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Evidence Verification</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredActions.map((act) => (
                        <tr key={act.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                            <div style={{ fontWeight: 700 }}>{act.title}</div>
                            <div style={{ color: '#64748b', fontSize: '0.6875rem' }}>{act.description}</div>
                          </td>
                          <td style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                            <div>{act.assignedTo?.name || 'Unassigned'}</div>
                            <div style={{ color: '#64748b', fontSize: '0.6875rem' }}>{act.department || '—'}</div>
                          </td>
                          <td style={{ padding: '0.5rem', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                            {act.deadline ? new Date(act.deadline).toLocaleDateString() : 'None'}
                          </td>
                          <td style={{ padding: '0.5rem', verticalAlign: 'top', fontWeight: 700 }}>
                            {act.status}
                          </td>
                          <td style={{ padding: '0.5rem', verticalAlign: 'top' }}>
                            {act.evidence && act.evidence.length > 0 ? (
                              <span style={{ color: '#166534', fontWeight: 700 }}>
                                ✓ {act.evidence.length} Evidence Verified
                              </span>
                            ) : (
                              <span style={{ color: '#ea580c', fontWeight: 600 }}>
                                ⚠️ Missing Upload
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Audit Sign-off Footer */}
              <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: '#64748b' }}>
                <div>PoliTrace Compliance Impact Engine • Confidential & Proprietary</div>
                <div>Generated on {new Date().toISOString()} • Page 1 of 1</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global CSS for Print */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-compliance-report,
          #printable-compliance-report * {
            visibility: visible;
          }
          #printable-compliance-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
