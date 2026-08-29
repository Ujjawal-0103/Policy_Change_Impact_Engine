'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import type { Impact, ImpactSeverity, ImpactStatus } from '@/types';

interface PopulatedImpact extends Impact {
  policyChange?: {
    id: string;
    policyId: string;
    changeType: string;
    fieldChanged: string | null;
    description: string;
    affectedSection: string | null;
    oldValue: string | null;
    newValue: string | null;
    sourceReference: string | null;
    policy?: { id: string; name: string };
    fromVersion?: { id: string; versionNumber: number };
    toVersion?: { id: string; versionNumber: number };
  };
}

export default function ImpactPage() {
  const [impacts, setImpacts] = useState<PopulatedImpact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchImpacts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<PopulatedImpact[]>('/impacts');
      setImpacts(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to fetch impact analyses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImpacts();
  }, []);

  const handleStatusChange = async (impactId: string, newStatus: ImpactStatus) => {
    try {
      await api.patch(`/impacts/${impactId}/status`, { status: newStatus });
      setImpacts((prev) =>
        prev.map((imp) => (imp.id === impactId ? { ...imp, status: newStatus } : imp)),
      );
    } catch (err) {
      console.error('Failed to update impact status:', err);
    }
  };

  const filteredImpacts = impacts.filter((imp) => {
    if (severityFilter !== 'ALL' && imp.severity !== severityFilter) return false;
    if (statusFilter !== 'ALL' && imp.status !== statusFilter) return false;
    return true;
  });

  const criticalCount = impacts.filter((i) => i.severity === 'CRITICAL' || i.severity === 'HIGH').length;
  const identifiedCount = impacts.filter((i) => i.status === 'IDENTIFIED').length;
  const mitigatedCount = impacts.filter((i) => i.status === 'MITIGATED').length;

  const getSeverityBadge = (severity: ImpactSeverity) => {
    const map: Record<ImpactSeverity, { bg: string; text: string; border: string }> = {
      CRITICAL: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
      HIGH: { bg: '#fff7ed', text: '#c2410c', border: '#ffedd5' },
      MEDIUM: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
      LOW: { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
    };
    const s = map[severity] || map.MEDIUM;
    return (
      <span
        style={{
          backgroundColor: s.bg,
          color: s.text,
          border: `1px solid ${s.border}`,
          padding: '0.125rem 0.5rem',
          borderRadius: '0.25rem',
          fontSize: '0.6875rem',
          fontWeight: 700,
        }}
      >
        {severity} SEVERITY
      </span>
    );
  };

  const getStatusBadge = (status: ImpactStatus) => {
    const map: Record<ImpactStatus, { bg: string; text: string; border: string }> = {
      IDENTIFIED: { bg: '#faf5ff', text: '#6d28d9', border: '#e9d5ff' },
      ASSESSED: { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' },
      MITIGATED: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
      ACCEPTED: { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
    };
    const s = map[status] || map.IDENTIFIED;
    return (
      <span
        style={{
          backgroundColor: s.bg,
          color: s.text,
          border: `1px solid ${s.border}`,
          padding: '0.125rem 0.5rem',
          borderRadius: '0.25rem',
          fontSize: '0.6875rem',
          fontWeight: 700,
        }}
      >
        {status}
      </span>
    );
  };

  return (
    <>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title">Impact Analysis Dashboard</h1>
        <p className="page-subtitle">
          Track operational, workflow, and compliance impacts generated from policy version differences.
        </p>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '0.5rem',
            padding: '1.25rem',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Total Impacts
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
            {impacts.length}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '0.5rem',
            padding: '1.25rem',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#dc2626', textTransform: 'uppercase' }}>
            Critical / High Priority
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#dc2626', marginTop: '0.25rem' }}>
            {criticalCount}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '0.5rem',
            padding: '1.25rem',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#7c3aed', textTransform: 'uppercase' }}>
            Identified
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#7c3aed', marginTop: '0.25rem' }}>
            {identifiedCount}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '0.5rem',
            padding: '1.25rem',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#16a34a', textTransform: 'uppercase' }}>
            Mitigated
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a', marginTop: '0.25rem' }}>
            {mitigatedCount}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          padding: '0.875rem 1.25rem',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '0.5rem',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              style={{
                padding: '0.375rem 0.625rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.375rem',
                fontSize: '0.8125rem',
                color: '#0f172a',
                backgroundColor: '#ffffff',
                outline: 'none',
              }}
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '0.375rem 0.625rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.375rem',
                fontSize: '0.8125rem',
                color: '#0f172a',
                backgroundColor: '#ffffff',
                outline: 'none',
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="IDENTIFIED">Identified</option>
              <option value="ASSESSED">Assessed</option>
              <option value="MITIGATED">Mitigated</option>
              <option value="ACCEPTED">Accepted</option>
            </select>
          </div>
        </div>

        <button
          onClick={fetchImpacts}
          style={{
            padding: '0.375rem 0.75rem',
            backgroundColor: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '0.375rem',
            fontSize: '0.8125rem',
            color: '#334155',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ↻ Refresh Impacts
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '0.375rem',
            fontSize: '0.8125rem',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Impact Cards List */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          Loading Impact Analyses...
        </div>
      ) : filteredImpacts.length === 0 ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px dashed #cbd5e1',
            padding: '4rem 2rem',
            textAlign: 'center',
            color: '#64748b',
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>
            No Impact Analyses Found
          </h3>
          <p style={{ fontSize: '0.875rem', margin: 0 }}>
            Run version comparison on a policy in the Changes view to generate and track operational impacts.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredImpacts.map((impact) => {
            const chg = impact.policyChange;
            return (
              <div
                key={impact.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '0.75rem',
                  border: '1px solid #e2e8f0',
                  padding: '1.25rem 1.5rem',
                  boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {getSeverityBadge(impact.severity)}
                    {getStatusBadge(impact.status)}
                    {chg?.policy && (
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a' }}>
                        {chg.policy.name}
                      </span>
                    )}
                    {chg?.fromVersion && chg?.toVersion && (
                      <span style={{ fontSize: '0.75rem', color: '#64748b', backgroundColor: '#f1f5f9', padding: '0.125rem 0.375rem', borderRadius: '0.25rem' }}>
                        v{chg.fromVersion.versionNumber} ➔ v{chg.toVersion.versionNumber}
                      </span>
                    )}
                  </div>

                  {/* Status Dropdown */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Update Status:</label>
                    <select
                      value={impact.status}
                      onChange={(e) => handleStatusChange(impact.id, e.target.value as ImpactStatus)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.75rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '0.25rem',
                        backgroundColor: '#ffffff',
                        color: '#0f172a',
                      }}
                    >
                      <option value="IDENTIFIED">IDENTIFIED</option>
                      <option value="ASSESSED">ASSESSED</option>
                      <option value="MITIGATED">MITIGATED</option>
                      <option value="ACCEPTED">ACCEPTED</option>
                    </select>
                  </div>
                </div>

                <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b', margin: '0 0 0.5rem 0' }}>
                  {impact.description}
                </p>

                {chg && (
                  <div style={{ padding: '0.625rem 0.875rem', backgroundColor: '#f8fafc', borderRadius: '0.375rem', border: '1px solid #f1f5f9', fontSize: '0.8125rem', color: '#475569', marginBottom: '0.75rem' }}>
                    <strong>Detected Policy Change:</strong> [{chg.changeType}] {chg.description}
                    {chg.sourceReference && (
                      <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#2563eb' }}>
                        Source: &ldquo;{chg.sourceReference}&rdquo;
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                  <span>Recorded: {new Date(impact.createdAt).toLocaleString()}</span>
                  {chg?.policyId && (
                    <Link
                      href={`/changes?policyId=${chg.policyId}&fromVersionId=${chg.fromVersion?.id || ''}&toVersionId=${chg.toVersion?.id || ''}`}
                      style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}
                    >
                      View in Version Comparison ➔
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
