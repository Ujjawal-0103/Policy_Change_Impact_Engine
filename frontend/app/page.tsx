'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type {
  Action,
  ActionStats,
  Document,
  Policy,
  Impact,
  ImpactStats,
  ImpactSeverity,
  PolicyChange,
} from '@/types';
import { TraceabilityChain } from '@/components/impact/TraceabilityChain';
import { RiskMatrix } from '@/components/impact/RiskMatrix';
import { ComplianceReportModal } from '@/components/impact/ComplianceReportModal';
import { AttentionCenter } from '@/components/layout/AttentionCenter';
import { GlobalSearchModal } from '@/components/layout/GlobalSearchModal';

export default function ExecutiveRiskControlCenter() {
  const router = useRouter();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [impacts, setImpacts] = useState<Impact[]>([]);
  const [impactStats, setImpactStats] = useState<ImpactStats | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [actionStats, setActionStats] = useState<ActionStats | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isAttentionOpen, setIsAttentionOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [attentionCount, setAttentionCount] = useState(0);

  // Selected policy change for live consequence inspection
  const [selectedConsequenceImpactId, setSelectedConsequenceImpactId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    Promise.allSettled([
      api.get<Policy[]>('/policies'),
      api.get<Impact[]>('/impact'),
      api.get<ImpactStats>('/impact/stats'),
      api.get<Action[]>('/actions'),
      api.get<ActionStats>('/actions/stats'),
      api.get<Document[]>('/documents'),
    ])
      .then(([policiesRes, impactsRes, impactStatsRes, actionsRes, actionStatsRes, docsRes]) => {
        if (policiesRes.status === 'fulfilled') setPolicies(policiesRes.value || []);
        if (impactsRes.status === 'fulfilled') {
          const imps = impactsRes.value || [];
          setImpacts(imps);
          if (imps.length > 0) {
            setSelectedConsequenceImpactId(imps[0].id);
          }
        }
        if (impactStatsRes.status === 'fulfilled') setImpactStats(impactStatsRes.value || null);
        if (actionsRes.status === 'fulfilled') setActions(actionsRes.value || []);
        if (actionStatsRes.status === 'fulfilled') setActionStats(actionStatsRes.value || null);
        if (docsRes.status === 'fulfilled') setDocuments(docsRes.value || []);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load control center data.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // ─── Real Aggregated Metrics ────────────────────────────────────────────────
  const totalVersions = useMemo(() => {
    return policies.reduce((sum, p) => sum + (p.versionCount || p.versions?.length || 0), 0);
  }, [policies]);

  const totalChanges = useMemo(() => {
    return policies.reduce((sum, p) => sum + (p.changeCount || 0), 0);
  }, [policies]);

  const criticalAndHighCount = useMemo(() => {
    if (impactStats) return impactStats.criticalAndHigh;
    return impacts.filter((i) => i.severity === 'CRITICAL' || i.severity === 'HIGH').length;
  }, [impactStats, impacts]);

  const unresolvedImpacts = useMemo(() => {
    return impacts.filter((i) => i.status === 'IDENTIFIED' || i.status === 'ASSESSED');
  }, [impacts]);

  const criticalCount = impactStats?.critical ?? impacts.filter((i) => i.severity === 'CRITICAL').length;
  const highCount = impactStats?.high ?? impacts.filter((i) => i.severity === 'HIGH').length;
  const mediumCount = impactStats?.medium ?? impacts.filter((i) => i.severity === 'MEDIUM').length;
  const lowCount = impactStats?.low ?? impacts.filter((i) => i.severity === 'LOW').length;
  const totalImpactCount = impactStats?.total ?? impacts.length;

  const actionsRequiringAttention = useMemo(() => {
    return actions.filter(
      (a) => a.status === 'PENDING' || a.status === 'IN_PROGRESS' || a.status === 'OVERDUE' || a.status === 'BLOCKED',
    );
  }, [actions]);

  // Urgent attention items (Overdue actions or Critical/High unresolved impacts)
  const urgentAttentionItems = useMemo(() => {
    const overdueActions = actions
      .filter((a) => (a.isOverdue || a.status === 'OVERDUE') && a.status !== 'COMPLETED')
      .map((a) => ({
        id: a.id,
        type: 'ACTION' as const,
        title: a.title,
        status: a.status,
        priority: a.priority,
        owner: a.assignedTo?.name || a.department || 'Unassigned',
        deadline: a.deadline,
        policyName: a.requirement?.policyVersion?.policy?.name,
      }));

    const severeImpacts = unresolvedImpacts
      .filter((i) => i.severity === 'CRITICAL' || i.severity === 'HIGH')
      .map((i) => ({
        id: i.id,
        type: 'IMPACT' as const,
        title: i.description,
        status: i.status,
        priority: (i.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH') as any,
        owner: i.action?.assignedTo?.name || i.action?.department || 'Unassigned',
        deadline: i.action?.deadline || i.requirement?.deadline,
        policyName: i.policyChange?.policy?.name,
      }));

    return [...overdueActions, ...severeImpacts].slice(0, 6);
  }, [actions, unresolvedImpacts]);

  // Chronological Policy Change Timeline
  const changeTimeline = useMemo(() => {
    const changes: Array<{
      id: string;
      change: PolicyChange;
      impact?: Impact;
      policyName?: string;
      date: string;
    }> = [];

    impacts.forEach((imp) => {
      if (imp.policyChange && !changes.some((c) => c.change.id === imp.policyChangeId)) {
        changes.push({
          id: imp.policyChangeId,
          change: imp.policyChange,
          impact: imp,
          policyName: imp.policyChange.policy?.name,
          date: imp.createdAt,
        });
      }
    });

    return changes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);
  }, [impacts]);

  // Active Consequence Impact for the live Traceability panel
  const selectedConsequenceImpact = useMemo(() => {
    if (!selectedConsequenceImpactId) return impacts[0] || null;
    return impacts.find((i) => i.id === selectedConsequenceImpactId) || impacts[0] || null;
  }, [impacts, selectedConsequenceImpactId]);

  // Deadline formatting helper
  const getDeadlineBadge = (deadlineStr: string | null | undefined) => {
    if (!deadlineStr) return { text: 'No deadline', bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' };
    const deadline = new Date(deadlineStr);
    const now = new Date();
    const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: `⚠️ Overdue ${Math.abs(diffDays)}d`,
        bg: '#fee2e2',
        color: '#991b1b',
        border: '#fca5a5',
      };
    }
    if (diffDays === 0) {
      return {
        text: '🔥 Due today',
        bg: '#ffedd5',
        color: '#c2410c',
        border: '#fdba74',
      };
    }
    if (diffDays <= 7) {
      return {
        text: `⏳ Due in ${diffDays}d`,
        bg: '#fef9c3',
        color: '#854d0e',
        border: '#fde047',
      };
    }
    return {
      text: `📅 In ${diffDays}d`,
      bg: '#f0fdf4',
      color: '#166534',
      border: '#bbf7d0',
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', width: '100%' }}>
      {/* ─── 1. Executive Control Center Header ─────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                padding: '0.125rem 0.5rem',
                borderRadius: '0.25rem',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Enterprise Control Center
            </span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>• Live Risk Telemetry</span>
          </div>
          <h1 className="page-title" style={{ margin: '0 0 0.25rem' }}>
            Executive Risk & Compliance Dashboard
          </h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Real-time governing policy sets, automated change detection, operational risk triage, and end-to-end traceability.
          </p>
        </div>

        {/* Quick Action Navigation Bar */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setIsAttentionOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.4375rem 0.875rem',
              backgroundColor: attentionCount > 0 ? '#fff7ed' : '#ffffff',
              border: '1px solid',
              borderColor: attentionCount > 0 ? '#fed7aa' : '#cbd5e1',
              borderRadius: '0.375rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: attentionCount > 0 ? '#c2410c' : '#334155',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span>🔔</span> Attention Center {attentionCount > 0 ? `(${attentionCount})` : ''}
          </button>
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.4375rem 0.875rem',
              backgroundColor: '#0f172a',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
            }}
          >
            <span>📄</span> Compliance Report
          </button>
          <Link
            href="/changes"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.4375rem 0.875rem',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '0.375rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#334155',
              textDecoration: 'none',
              transition: 'all 0.15s ease',
            }}
          >
            ⚖️ Compare Versions ➔
          </Link>
          <Link
            href="/impact"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.4375rem 0.875rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
            }}
          >
            ⚡ Impact Matrix ➔
          </Link>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '1rem', color: '#991b1b', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* ─── 2. Interactive KPI Cards Grid ─────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* KPI 1: Policies & Versions */}
        <Link
          href="/policies"
          style={{ textDecoration: 'none', color: 'inherit' }}
          className="card"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Governing Policies
            </span>
            <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>Explore ↗</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.1, marginTop: '0.375rem' }}>
            {loading ? '—' : policies.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.375rem' }}>
            <strong>{totalVersions}</strong> active & historical versions
          </div>
        </Link>

        {/* KPI 2: Detected Changes */}
        <Link
          href="/changes"
          style={{ textDecoration: 'none', color: 'inherit' }}
          className="card"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Detected Changes
            </span>
            <span style={{ fontSize: '0.75rem', color: '#7c3aed', fontWeight: 600 }}>Diffs ↗</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#7c3aed', lineHeight: 1.1, marginTop: '0.375rem' }}>
            {loading ? '—' : totalChanges}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.375rem' }}>
            Across all version comparisons
          </div>
        </Link>

        {/* KPI 3: High/Critical Impacts */}
        <Link
          href="/impact?severity=HIGH"
          style={{ textDecoration: 'none', color: 'inherit' }}
          className="card"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Critical & High Risk
            </span>
            <span style={{ fontSize: '0.75rem', color: '#c2410c', fontWeight: 600 }}>Triage ↗</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#c2410c', lineHeight: 1.1, marginTop: '0.375rem' }}>
            {loading ? '—' : criticalAndHighCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.375rem' }}>
            <strong>{criticalCount}</strong> Critical • <strong>{highCount}</strong> High
          </div>
        </Link>

        {/* KPI 4: Unresolved Impacts */}
        <Link
          href="/impact?status=IDENTIFIED"
          style={{ textDecoration: 'none', color: 'inherit' }}
          className="card"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Unresolved Impacts
            </span>
            <span style={{ fontSize: '0.75rem', color: '#0369a1', fontWeight: 600 }}>Matrix ↗</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0369a1', lineHeight: 1.1, marginTop: '0.375rem' }}>
            {loading ? '—' : unresolvedImpacts.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.375rem' }}>
            Identified / under assessment
          </div>
        </Link>

        {/* KPI 5: Actions Requiring Attention */}
        <Link
          href="/actions"
          style={{ textDecoration: 'none', color: 'inherit' }}
          className="card"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Action Items
            </span>
            <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>Review ↗</span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#2563eb', lineHeight: 1.1, marginTop: '0.375rem' }}>
            {loading ? '—' : actionsRequiringAttention.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.375rem' }}>
            {actionStats ? `${actionStats.overdue} Overdue • ${actionStats.pending} Pending` : 'Requiring operational work'}
          </div>
        </Link>
      </div>

      {/* ─── 3. Split Row: Impact Risk Distribution & Operational Velocity ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Left: Impact Risk Distribution */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                ⚡ Impact Severity Distribution
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {totalImpactCount} total impact consequence assessments
              </span>
            </div>
            <Link
              href="/impact"
              style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}
            >
              View Matrix →
            </Link>
          </div>

          {/* Color Distribution Bar */}
          <div
            style={{
              height: '0.75rem',
              width: '100%',
              backgroundColor: '#f1f5f9',
              borderRadius: '9999px',
              overflow: 'hidden',
              display: 'flex',
              marginBottom: '1rem',
            }}
          >
            {totalImpactCount > 0 ? (
              <>
                <div style={{ width: `${(criticalCount / totalImpactCount) * 100}%`, backgroundColor: '#ef4444' }} title={`Critical: ${criticalCount}`} />
                <div style={{ width: `${(highCount / totalImpactCount) * 100}%`, backgroundColor: '#f97316' }} title={`High: ${highCount}`} />
                <div style={{ width: `${(mediumCount / totalImpactCount) * 100}%`, backgroundColor: '#eab308' }} title={`Medium: ${mediumCount}`} />
                <div style={{ width: `${(lowCount / totalImpactCount) * 100}%`, backgroundColor: '#94a3b8' }} title={`Low: ${lowCount}`} />
              </>
            ) : (
              <div style={{ width: '100%', backgroundColor: '#e2e8f0' }} />
            )}
          </div>

          {/* Interactive Severity Filter Pills */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
            <Link
              href="/impact?severity=CRITICAL"
              style={{
                padding: '0.5rem',
                backgroundColor: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: '0.375rem',
                textAlign: 'center',
                textDecoration: 'none',
                color: '#991b1b',
                transition: 'transform 0.15s ease',
              }}
            >
              <span style={{ fontSize: '0.625rem', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>CRITICAL</span>
              <strong style={{ fontSize: '1.125rem' }}>{criticalCount}</strong>
            </Link>

            <Link
              href="/impact?severity=HIGH"
              style={{
                padding: '0.5rem',
                backgroundColor: '#ffedd5',
                border: '1px solid #fdba74',
                borderRadius: '0.375rem',
                textAlign: 'center',
                textDecoration: 'none',
                color: '#c2410c',
                transition: 'transform 0.15s ease',
              }}
            >
              <span style={{ fontSize: '0.625rem', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>HIGH</span>
              <strong style={{ fontSize: '1.125rem' }}>{highCount}</strong>
            </Link>

            <Link
              href="/impact?severity=MEDIUM"
              style={{
                padding: '0.5rem',
                backgroundColor: '#fef9c3',
                border: '1px solid #fde047',
                borderRadius: '0.375rem',
                textAlign: 'center',
                textDecoration: 'none',
                color: '#854d0e',
                transition: 'transform 0.15s ease',
              }}
            >
              <span style={{ fontSize: '0.625rem', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>MEDIUM</span>
              <strong style={{ fontSize: '1.125rem' }}>{mediumCount}</strong>
            </Link>

            <Link
              href="/impact?severity=LOW"
              style={{
                padding: '0.5rem',
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '0.375rem',
                textAlign: 'center',
                textDecoration: 'none',
                color: '#475569',
                transition: 'transform 0.15s ease',
              }}
            >
              <span style={{ fontSize: '0.625rem', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>LOW</span>
              <strong style={{ fontSize: '1.125rem' }}>{lowCount}</strong>
            </Link>
          </div>
        </div>

        {/* Right: Operational Action Health */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                🎯 Operational Action Status
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {actionStats?.totalActions ?? actions.length} total operational compliance actions
              </span>
            </div>
            <Link
              href="/actions"
              style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}
            >
              View Actions →
            </Link>
          </div>

          {/* Action Progress Bar */}
          <div
            style={{
              height: '0.75rem',
              width: '100%',
              backgroundColor: '#f1f5f9',
              borderRadius: '9999px',
              overflow: 'hidden',
              display: 'flex',
              marginBottom: '1rem',
            }}
          >
            {actionStats && actionStats.totalActions > 0 ? (
              <>
                <div style={{ width: `${(actionStats.completed / actionStats.totalActions) * 100}%`, backgroundColor: '#16a34a' }} title={`Completed: ${actionStats.completed}`} />
                <div style={{ width: `${(actionStats.inProgress / actionStats.totalActions) * 100}%`, backgroundColor: '#2563eb' }} title={`In Progress: ${actionStats.inProgress}`} />
                <div style={{ width: `${(actionStats.pending / actionStats.totalActions) * 100}%`, backgroundColor: '#94a3b8' }} title={`Pending: ${actionStats.pending}`} />
                <div style={{ width: `${(actionStats.overdue / actionStats.totalActions) * 100}%`, backgroundColor: '#ef4444' }} title={`Overdue: ${actionStats.overdue}`} />
                <div style={{ width: `${(actionStats.blocked / actionStats.totalActions) * 100}%`, backgroundColor: '#be123c' }} title={`Blocked: ${actionStats.blocked}`} />
              </>
            ) : (
              <div style={{ width: '100%', backgroundColor: '#e2e8f0' }} />
            )}
          </div>

          {/* Quick Filter Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            <Link
              href="/actions"
              style={{
                padding: '0.5rem',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '0.375rem',
                textAlign: 'center',
                textDecoration: 'none',
                color: '#166534',
              }}
            >
              <span style={{ fontSize: '0.625rem', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>COMPLETED</span>
              <strong style={{ fontSize: '1.125rem' }}>{actionStats?.completed ?? 0}</strong>
            </Link>

            <Link
              href="/actions"
              style={{
                padding: '0.5rem',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '0.375rem',
                textAlign: 'center',
                textDecoration: 'none',
                color: '#1e40af',
              }}
            >
              <span style={{ fontSize: '0.625rem', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>IN PROGRESS</span>
              <strong style={{ fontSize: '1.125rem' }}>{actionStats?.inProgress ?? 0}</strong>
            </Link>

            <Link
              href="/actions"
              style={{
                padding: '0.5rem',
                backgroundColor: (actionStats?.overdue ?? 0) > 0 ? '#fee2e2' : '#f8fafc',
                border: `1px solid ${(actionStats?.overdue ?? 0) > 0 ? '#fca5a5' : '#e2e8f0'}`,
                borderRadius: '0.375rem',
                textAlign: 'center',
                textDecoration: 'none',
                color: (actionStats?.overdue ?? 0) > 0 ? '#991b1b' : '#64748b',
              }}
            >
              <span style={{ fontSize: '0.625rem', fontWeight: 700, display: 'block', textTransform: 'uppercase' }}>OVERDUE</span>
              <strong style={{ fontSize: '1.125rem' }}>{actionStats?.overdue ?? 0}</strong>
            </Link>
          </div>
        </div>
      </div>

      {/* Interactive Policy Change Risk Matrix */}
      <div style={{ marginBottom: '1.5rem' }}>
        <RiskMatrix
          impacts={impacts}
          actions={actions}
          onSelectCell={(sev, urg) => {
            const params = new URLSearchParams();
            if (sev !== 'ALL') params.append('severity', sev);
            if (urg !== 'ALL') params.append('urgency', urg);
            router.push(`/impact?${params.toString()}`);
          }}
        />
      </div>

      {/* ─── 4. Live Consequence Panel (TraceabilityChain on Dashboard) ───── */}
      {selectedConsequenceImpact && (
        <div className="card" style={{ padding: '1.5rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#7e22ce', backgroundColor: '#f3e8ff', padding: '0.125rem 0.5rem', borderRadius: '0.25rem', textTransform: 'uppercase' }}>
                  Live Policy Change ➔ Consequence Inspector
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {impacts.length > 1 ? `(${impacts.findIndex((i) => i.id === selectedConsequenceImpact.id) + 1} of ${impacts.length} impacts)` : ''}
                </span>
              </div>
              <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Traceability Chain: {selectedConsequenceImpact.policyChange?.policy?.name || 'Policy'} (v{selectedConsequenceImpact.policyChange?.fromVersion?.versionNumber} ➔ v{selectedConsequenceImpact.policyChange?.toVersion?.versionNumber})
              </h2>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {/* Impact selector if multiple exist */}
              {impacts.length > 1 && (
                <select
                  value={selectedConsequenceImpact.id}
                  onChange={(e) => setSelectedConsequenceImpactId(e.target.value)}
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.3125rem 0.625rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  {impacts.slice(0, 8).map((imp, idx) => (
                    <option key={imp.id} value={imp.id}>
                      [{imp.severity}] {imp.policyChange?.policy?.name || 'Policy'}: {imp.description.slice(0, 32)}...
                    </option>
                  ))}
                </select>
              )}
              <Link
                href={`/impact?impactId=${selectedConsequenceImpact.id}`}
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#2563eb',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  padding: '0.3125rem 0.75rem',
                  borderRadius: '0.375rem',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                Open Full Matrix ➔
              </Link>
            </div>
          </div>

          {/* Render Full Visual Traceability Chain */}
          <TraceabilityChain impact={selectedConsequenceImpact} />
        </div>
      )}

      {/* ─── 5. Grid: Needs Attention & Policy Change Timeline ─────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Needs Attention Feed */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              🚨 Urgent Attention Required ({urgentAttentionItems.length})
            </h2>
            <Link
              href="/actions"
              style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}
            >
              All Actions →
            </Link>
          </div>

          {urgentAttentionItems.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {urgentAttentionItems.map((item) => {
                const dBadge = getDeadlineBadge(item.deadline);

                return (
                  <Link
                    key={`${item.type}-${item.id}`}
                    href={item.type === 'ACTION' ? `/actions?actionId=${item.id}` : `/impact?impactId=${item.id}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      padding: '0.75rem 0.875rem',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          padding: '0.0625rem 0.375rem',
                          borderRadius: '0.25rem',
                          backgroundColor: item.type === 'ACTION' ? '#eff6ff' : '#fee2e2',
                          color: item.type === 'ACTION' ? '#1d4ed8' : '#991b1b',
                          border: `1px solid ${item.type === 'ACTION' ? '#bfdbfe' : '#fca5a5'}`,
                        }}
                      >
                        {item.type === 'ACTION' ? 'ACTION' : 'IMPACT'} • {item.priority || item.status}
                      </span>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          padding: '0.0625rem 0.375rem',
                          borderRadius: '0.25rem',
                          backgroundColor: dBadge.bg,
                          color: dBadge.color,
                          border: `1px solid ${dBadge.border}`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {dBadge.text}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a', marginTop: '0.125rem' }}>
                      {item.title}
                    </div>

                    <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                      {item.policyName ? `🏛️ ${item.policyName} • ` : ''}👤 {item.owner}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>
              ✓ No overdue actions or critical unresolved risks detected.
            </div>
          )}
        </div>

        {/* Chronological Policy Change Timeline */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              🏛️ Policy Change Timeline
            </h2>
            <Link
              href="/changes"
              style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}
            >
              Compare Versions →
            </Link>
          </div>

          {changeTimeline.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {changeTimeline.map(({ id, change, impact, policyName, date }) => (
                <div
                  key={id}
                  style={{
                    padding: '0.75rem 0.875rem',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.375rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <span
                        style={{
                          fontSize: '0.625rem',
                          fontWeight: 700,
                          padding: '0.0625rem 0.375rem',
                          borderRadius: '0.25rem',
                          backgroundColor: change.changeType === 'ADDED' ? '#f0fdf4' : change.changeType === 'REMOVED' ? '#fef2f2' : '#eff6ff',
                          color: change.changeType === 'ADDED' ? '#166534' : change.changeType === 'REMOVED' ? '#991b1b' : '#1d4ed8',
                        }}
                      >
                        {change.changeType}
                      </span>
                      <strong style={{ fontSize: '0.75rem', color: '#0f172a' }}>
                        {policyName || 'Policy'}
                      </strong>
                      {change.fromVersion && change.toVersion && (
                        <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                          (v{change.fromVersion.versionNumber} ➔ v{change.toVersion.versionNumber})
                        </span>
                      )}
                    </div>

                    {impact && (
                      <Link
                        href={`/impact?impactId=${impact.id}`}
                        style={{ fontSize: '0.6875rem', color: '#7e22ce', textDecoration: 'none', fontWeight: 600 }}
                      >
                        View Impact ↗
                      </Link>
                    )}
                  </div>

                  <div style={{ fontSize: '0.8125rem', color: '#334155', lineHeight: 1.35 }}>
                    {change.description}
                  </div>

                  {change.affectedSection && (
                    <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
                      Section: § {change.affectedSection}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>
              No policy changes recorded yet. Compare two policy versions to detect changes.
            </div>
          )}
        </div>
      </div>

      {/* ─── 6. Policy Operational Health Overview Table ──────────────────── */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.125rem' }}>
              🏛️ Policy Sets & Operational Status
            </h2>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Summary of all governing policy documents, active versions, and detected changes.
            </span>
          </div>
          <Link
            href="/policies"
            style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563eb', textDecoration: 'none' }}
          >
            Manage Policies →
          </Link>
        </div>

        {policies.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.625rem 0.875rem', fontWeight: 600, color: '#475569', fontSize: '0.6875rem', textTransform: 'uppercase' }}>
                    Policy Name
                  </th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, color: '#475569', fontSize: '0.6875rem', textTransform: 'uppercase' }}>
                    Versions
                  </th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, color: '#475569', fontSize: '0.6875rem', textTransform: 'uppercase' }}>
                    Requirements
                  </th>
                  <th style={{ padding: '0.625rem 0.75rem', fontWeight: 600, color: '#475569', fontSize: '0.6875rem', textTransform: 'uppercase' }}>
                    Changes Detected
                  </th>
                  <th style={{ padding: '0.625rem 0.875rem', fontWeight: 600, color: '#475569', fontSize: '0.6875rem', textTransform: 'uppercase', textAlign: 'right' }}>
                    Quick Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {policies.map((p) => {
                  const vCount = p.versionCount || p.versions?.length || 0;
                  const cCount = p.changeCount || 0;
                  const rCount = p.totalRequirements || 0;

                  return (
                    <tr
                      key={p.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '0.75rem 0.875rem', fontWeight: 600, color: '#0f172a' }}>
                        <Link href={`/policies?policyId=${p.id}`} style={{ color: '#0f172a', textDecoration: 'none' }}>
                          {p.name}
                        </Link>
                        {p.description && (
                          <div style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 400, marginTop: '0.0625rem' }}>
                            {p.description.slice(0, 60)}...
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '0.75rem 0.75rem', color: '#334155' }}>
                        <span style={{ backgroundColor: '#f1f5f9', padding: '0.125rem 0.375rem', borderRadius: '0.25rem', fontWeight: 600 }}>
                          {vCount} {vCount === 1 ? 'ver' : 'vers'}
                        </span>
                      </td>

                      <td style={{ padding: '0.75rem 0.75rem', color: '#2563eb', fontWeight: 600 }}>
                        {rCount}
                      </td>

                      <td style={{ padding: '0.75rem 0.75rem', color: cCount > 0 ? '#7c3aed' : '#94a3b8', fontWeight: cCount > 0 ? 700 : 400 }}>
                        {cCount}
                      </td>

                      <td style={{ padding: '0.75rem 0.875rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.375rem' }}>
                          {vCount >= 2 && (
                            <Link
                              href={`/changes?policyId=${p.id}`}
                              style={{
                                padding: '0.25rem 0.5rem',
                                backgroundColor: '#eff6ff',
                                color: '#2563eb',
                                border: '1px solid #bfdbfe',
                                borderRadius: '0.25rem',
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                textDecoration: 'none',
                              }}
                            >
                              Compare ↗
                            </Link>
                          )}
                          <Link
                            href={`/impact?policyId=${p.id}`}
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#faf5ff',
                              color: '#7e22ce',
                              border: '1px solid #f3e8ff',
                              borderRadius: '0.25rem',
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              textDecoration: 'none',
                            }}
                          >
                            Impacts ↗
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>
            No policies created yet.{' '}
            <Link href="/policies" style={{ color: '#2563eb', fontWeight: 600 }}>
              Create first policy
            </Link>
          </div>
        )}
      </div>

      {/* Compliance Impact Report Modal */}
      <ComplianceReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />

      {/* Attention Center Drawer */}
      <AttentionCenter
        isOpen={isAttentionOpen}
        onClose={() => setIsAttentionOpen(false)}
        onCountChange={(count) => setAttentionCount(count)}
      />

      {/* Global Spotlight Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  );
}
