'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import type { Impact, Action, ImpactSeverity, ImpactStatus, ImpactStats, Policy } from '@/types';
import { TraceabilityChain } from '@/components/impact/TraceabilityChain';
import { WhyThisImpactCard } from '@/components/impact/WhyThisImpactCard';
import { RiskMatrix } from '@/components/impact/RiskMatrix';
import { ComplianceReportModal } from '@/components/impact/ComplianceReportModal';

function ImpactPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlPolicyId = searchParams.get('policyId');
  const urlImpactId = searchParams.get('impactId');

  const [impacts, setImpacts] = useState<Impact[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [stats, setStats] = useState<ImpactStats | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Filters
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>(urlPolicyId || 'ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected impact for drill-down modal
  const [selectedImpact, setSelectedImpact] = useState<Impact | null>(null);
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  // Synchronize initial deep-linked impact ID if present
  useEffect(() => {
    if (urlImpactId) {
      api.get<Impact>(`/impact/${urlImpactId}`)
        .then((data) => {
          setSelectedImpact(data);
        })
        .catch(() => {
          // If direct fetch fails, ignore gracefully
        });
    }
  }, [urlImpactId]);

  const openImpactModal = (imp: Impact) => {
    setSelectedImpact(imp);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('impactId', imp.id);
      window.history.replaceState(null, '', url.toString());
    }
  };

  const closeImpactModal = () => {
    setSelectedImpact(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('impactId');
      window.history.replaceState(null, '', url.toString());
    }
  };

  const fetchPolicies = useCallback(async () => {
    try {
      const data = await api.get<Policy[]>('/policies');
      setPolicies(data);
    } catch {
      // Ignore policy list fetch errors gracefully
    }
  }, []);

  const fetchImpacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (selectedPolicyId !== 'ALL') queryParams.append('policyId', selectedPolicyId);
      if (severityFilter !== 'ALL') queryParams.append('severity', severityFilter);
      if (statusFilter !== 'ALL') queryParams.append('status', statusFilter);
      if (searchQuery.trim()) queryParams.append('search', searchQuery.trim());

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const [impactsData, statsData, actionsData] = await Promise.all([
        api.get<Impact[]>(`/impact${queryString}`),
        api.get<ImpactStats>(`/impact/stats${selectedPolicyId !== 'ALL' ? `?policyId=${selectedPolicyId}` : ''}`),
        api.get<Action[]>('/actions').catch(() => []),
      ]);

      setImpacts(impactsData);
      setStats(statsData);
      setActions(actionsData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to fetch impact analyses.');
    } finally {
      setLoading(false);
    }
  }, [selectedPolicyId, severityFilter, statusFilter, searchQuery]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  useEffect(() => {
    fetchImpacts();
  }, [fetchImpacts]);

  const handleStatusChange = async (impactId: string, newStatus: ImpactStatus) => {
    setUpdatingStatusId(impactId);
    try {
      const updated = await api.patch<Impact>(`/impact/${impactId}/status`, { status: newStatus });
      setImpacts((prev) =>
        prev.map((imp) => (imp.id === impactId ? { ...imp, status: updated.status } : imp)),
      );
      if (selectedImpact?.id === impactId) {
        setSelectedImpact((prev) => (prev ? { ...prev, status: updated.status } : null));
      }
      setSuccessMessage(`Status updated to ${newStatus}`);
      setTimeout(() => setSuccessMessage(null), 3000);
      // Refresh stats
      api.get<ImpactStats>(`/impact/stats${selectedPolicyId !== 'ALL' ? `?policyId=${selectedPolicyId}` : ''}`).then(setStats).catch(() => {});
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update impact status.');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleReanalyze = async (changeId: string) => {
    setReanalyzingId(changeId);
    try {
      await api.post(`/impact/analyze/change/${changeId}`);
      setSuccessMessage('Impact analysis successfully re-evaluated.');
      setTimeout(() => setSuccessMessage(null), 3000);
      await fetchImpacts();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to re-run impact analysis.');
    } finally {
      setReanalyzingId(null);
    }
  };

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
          padding: '0.2rem 0.5rem',
          borderRadius: '0.25rem',
          fontSize: '0.6875rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.025em',
        }}
      >
        {severity}
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
          padding: '0.2rem 0.5rem',
          borderRadius: '0.25rem',
          fontSize: '0.6875rem',
          fontWeight: 700,
        }}
      >
        {status}
      </span>
    );
  };

  const filteredImpacts = useMemo(() => {
    const now = new Date();
    const sevenDays = new Date();
    sevenDays.setDate(now.getDate() + 7);

    return impacts.filter((imp) => {
      if (selectedPolicyId !== 'ALL' && imp.policyChange?.policyId !== selectedPolicyId) return false;
      if (severityFilter !== 'ALL' && imp.severity !== severityFilter) return false;
      if (statusFilter !== 'ALL' && imp.status !== statusFilter) return false;

      if (urgencyFilter !== 'ALL') {
        const act = imp.action;
        if (!act || !act.deadline) {
          if (urgencyFilter !== 'UPCOMING') return false;
        } else {
          const due = new Date(act.deadline);
          const isOverdue = due < now || act.status === 'OVERDUE';
          if (urgencyFilter === 'OVERDUE' && !isOverdue) return false;
          if (urgencyFilter === 'DUE_SOON' && !(due >= now && due <= sevenDays)) return false;
          if (urgencyFilter === 'UPCOMING' && !(due > sevenDays)) return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const desc = (imp.description || '').toLowerCase();
        const reason = (imp.reason || '').toLowerCase();
        const reqTitle = (imp.requirement?.title || '').toLowerCase();
        const actTitle = (imp.action?.title || '').toLowerCase();
        const owner = (imp.action?.assignedTo?.name || imp.action?.department || '').toLowerCase();
        if (!desc.includes(q) && !reason.includes(q) && !reqTitle.includes(q) && !actTitle.includes(q) && !owner.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [impacts, selectedPolicyId, severityFilter, statusFilter, urgencyFilter, searchQuery]);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
            Policy Change Impact Engine
          </h1>
          <p style={{ fontSize: '0.9375rem', color: '#64748b', margin: 0 }}>
            Trace how policy version differences directly affect operational requirements, actions, team assignments, deadlines, and compliance evidence.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsReportModalOpen(true)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.8125rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
          }}
        >
          <span>📄</span> Generate Compliance Report
        </button>
      </div>

      {/* Success / Error Alerts */}
      {successMessage && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#15803d',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            marginBottom: '1rem',
          }}
        >
          ✓ {successMessage}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Summary KPI Cards Bar */}
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
          <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
            {stats?.total ?? impacts.length}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Across all policy changes
          </span>
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
            Critical & High Severity
          </span>
          <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#dc2626', marginTop: '0.25rem' }}>
            {stats?.criticalAndHigh ?? impacts.filter((i) => i.severity === 'CRITICAL' || i.severity === 'HIGH').length}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#991b1b' }}>
            Urgent operational attention required
          </span>
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
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563eb', textTransform: 'uppercase' }}>
            Affected Actions
          </span>
          <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#2563eb', marginTop: '0.25rem' }}>
            {stats?.actionsAffectedCount ?? impacts.filter((i) => i.actionId).length}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#1e40af' }}>
            Work items requiring review/update
          </span>
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
            Mitigated / Resolved
          </span>
          <div style={{ fontSize: '1.875rem', fontWeight: 800, color: '#16a34a', marginTop: '0.25rem' }}>
            {stats?.byStatus?.mitigated ?? impacts.filter((i) => i.status === 'MITIGATED').length}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#166534' }}>
            Workflow updates completed
          </span>
        </div>
      </div>

      {/* Policy Change Risk Matrix */}
      <div style={{ marginBottom: '1.5rem' }}>
        <RiskMatrix
          impacts={impacts}
          actions={actions}
          selectedSeverity={severityFilter !== 'ALL' ? severityFilter : undefined}
          selectedUrgency={urgencyFilter !== 'ALL' ? urgencyFilter : undefined}
          onSelectCell={(sev, urg) => {
            setSeverityFilter(sev);
            setUrgencyFilter(urg);
          }}
        />
      </div>

      {/* Filter and Control Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.875rem',
          padding: '1rem 1.25rem',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '0.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flexWrap: 'wrap' }}>
          {/* Policy filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>Policy:</label>
            <select
              value={selectedPolicyId}
              onChange={(e) => setSelectedPolicyId(e.target.value)}
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
              <option value="ALL">All Policies</option>
              {policies.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Severity filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>Severity:</label>
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

          {/* Status filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569' }}>Status:</label>
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

          {/* Search input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <input
              type="text"
              placeholder="Search keyword, action, owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '0.375rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.375rem',
                fontSize: '0.8125rem',
                color: '#0f172a',
                backgroundColor: '#ffffff',
                minWidth: '220px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        <button
          onClick={fetchImpacts}
          style={{
            padding: '0.375rem 0.875rem',
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '0.375rem',
            fontSize: '0.8125rem',
            color: '#334155',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Main Table / Impact List */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
            Evaluating policy impact mappings...
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>Connecting policy changes to requirements, actions, and owners.</p>
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
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
            No Impact Analyses Found
          </h3>
          <p style={{ fontSize: '0.875rem', maxWidth: '500px', margin: '0 auto 1.5rem auto' }}>
            To generate impact records, compare two versions of a policy in the Policy Changes view. The engine will automatically trace affected work.
          </p>
          <Link
            href="/changes"
            style={{
              display: 'inline-block',
              padding: '0.5rem 1.25rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Go to Policy Version Comparison ➔
          </Link>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Severity</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Policy & Version Change</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Affected Requirement</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Affected Action & Owner</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Deadline</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredImpacts.map((impact) => {
                  const chg = impact.policyChange;
                  const req = impact.requirement;
                  const act = impact.action;
                  const deadline = act?.deadline || req?.deadline;

                  return (
                    <tr
                      key={impact.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Severity */}
                      <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                        {getSeverityBadge(impact.severity)}
                      </td>

                      {/* Policy & Change Info */}
                      <td style={{ padding: '1rem', verticalAlign: 'top', maxWidth: '280px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
                          {chg?.policy?.name || 'Policy'}
                        </div>
                        {chg?.fromVersion && chg?.toVersion && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.375rem' }}>
                            <span style={{ backgroundColor: '#f1f5f9', padding: '0.125rem 0.375rem', borderRadius: '0.25rem' }}>
                              v{chg.fromVersion.versionNumber} ➔ v{chg.toVersion.versionNumber}
                            </span>
                            {chg.affectedSection && (
                              <span style={{ marginLeft: '0.375rem' }}>§ {chg.affectedSection}</span>
                            )}
                          </div>
                        )}
                        <div style={{ fontSize: '0.75rem', color: '#334155', lineHeight: 1.4 }}>
                          <span style={{ fontWeight: 600, color: '#2563eb' }}>[{chg?.changeType || 'MODIFIED'}]</span>{' '}
                          {chg?.description || impact.description}
                        </div>
                      </td>

                      {/* Affected Requirement */}
                      <td style={{ padding: '1rem', verticalAlign: 'top', maxWidth: '240px' }}>
                        {req ? (
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>
                              {req.title}
                            </div>
                            {req.responsibleRole && (
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                Role: {req.responsibleRole}
                              </div>
                            )}
                            {req.evidenceNeeded && (
                              <div style={{ fontSize: '0.6875rem', color: '#059669', marginTop: '0.125rem' }}>
                                📁 Evidence required
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>General Policy Level</span>
                        )}
                      </td>

                      {/* Affected Action & Owner */}
                      <td style={{ padding: '1rem', verticalAlign: 'top', maxWidth: '240px' }}>
                        {act ? (
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>
                              {act.title}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                              {act.assignedTo ? (
                                <span style={{ color: '#0284c7', fontWeight: 600 }}>👤 {act.assignedTo.name}</span>
                              ) : act.department ? (
                                <span>🏢 {act.department}</span>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>Unassigned</span>
                              )}
                            </div>
                            {act.evidence && act.evidence.length > 0 && (
                              <div style={{ fontSize: '0.6875rem', color: '#16a34a', marginTop: '0.25rem' }}>
                                ✓ {act.evidence.length} evidence attached
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>No linked action yet</span>
                        )}
                      </td>

                      {/* Deadline */}
                      <td style={{ padding: '1rem', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        {deadline ? (
                          <span style={{ color: '#b91c1c', fontWeight: 600, fontSize: '0.75rem' }}>
                            📅 {new Date(deadline).toLocaleDateString()}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>None</span>
                        )}
                      </td>

                      {/* Status Dropdown */}
                      <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                          <div>{getStatusBadge(impact.status)}</div>
                          <select
                            disabled={updatingStatusId === impact.id}
                            value={impact.status}
                            onChange={(e) => handleStatusChange(impact.id, e.target.value as ImpactStatus)}
                            style={{
                              padding: '0.2rem 0.4rem',
                              fontSize: '0.6875rem',
                              border: '1px solid #cbd5e1',
                              borderRadius: '0.25rem',
                              backgroundColor: '#ffffff',
                              color: '#334155',
                              cursor: 'pointer',
                              outline: 'none',
                            }}
                          >
                            <option value="IDENTIFIED">IDENTIFIED</option>
                            <option value="ASSESSED">ASSESSED</option>
                            <option value="MITIGATED">MITIGATED</option>
                            <option value="ACCEPTED">ACCEPTED</option>
                          </select>
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem', verticalAlign: 'top', textAlign: 'right' }}>
                        <button
                          onClick={() => openImpactModal(impact)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          View Details ➔
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drilldown Modal */}
      {selectedImpact && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '1.5rem',
          }}
          onClick={closeImpactModal}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '0.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              width: '100%',
              maxWidth: '850px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                  {getSeverityBadge(selectedImpact.severity)}
                  {getStatusBadge(selectedImpact.status)}
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Impact Record #{selectedImpact.id.slice(-6)}</span>
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Impact Assessment & Traceability Chain
                </h2>
              </div>
              <button
                onClick={closeImpactModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '0 0.5rem',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Signature Why This Impact Intelligence Card */}
              <WhyThisImpactCard
                impact={selectedImpact}
                onNavigateAction={(actionId) => {
                  closeImpactModal();
                  router.push(`/actions?actionId=${actionId}`);
                }}
              />

              {/* Complete Traceability Chain Component */}
              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span>⛓️</span> Complete Traceability Chain
                </div>
                <TraceabilityChain
                  impact={selectedImpact}
                  onNavigateAction={() => closeImpactModal()}
                />
              </div>

              {/* Status Update & Re-analysis Controls */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  marginTop: '0.5rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b' }}>Update Status:</label>
                  {(['IDENTIFIED', 'ASSESSED', 'MITIGATED', 'ACCEPTED'] as ImpactStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={updatingStatusId === selectedImpact.id}
                      onClick={() => handleStatusChange(selectedImpact.id, st)}
                      style={{
                        padding: '0.3125rem 0.75rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: selectedImpact.status === st ? '#2563eb' : '#ffffff',
                        color: selectedImpact.status === st ? '#ffffff' : '#475569',
                        border: '1px solid',
                        borderColor: selectedImpact.status === st ? '#2563eb' : '#cbd5e1',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        boxShadow: selectedImpact.status === st ? '0 1px 2px rgba(37, 99, 235, 0.2)' : 'none',
                      }}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {selectedImpact.policyChangeId && (
                    <button
                      type="button"
                      disabled={reanalyzingId === selectedImpact.policyChangeId}
                      onClick={() => handleReanalyze(selectedImpact.policyChangeId)}
                      style={{
                        padding: '0.375rem 0.875rem',
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#334155',
                        cursor: 'pointer',
                      }}
                    >
                      {reanalyzingId === selectedImpact.policyChangeId ? 'Re-analyzing...' : '↻ Re-run Analysis'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={closeImpactModal}
                    style={{
                      padding: '0.375rem 0.875rem',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compliance Impact Report Modal */}
      <ComplianceReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        defaultPolicyId={selectedPolicyId !== 'ALL' ? selectedPolicyId : undefined}
      />
    </div>
  );
}

export default function ImpactPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading impact engine...</div>}>
      <ImpactPageContent />
    </Suspense>
  );
}
