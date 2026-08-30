'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import type { Policy, PolicyComparisonResponse, PolicyChange, ChangeType, Impact } from '@/types';
import { ChangeSummaryCards } from './ChangeSummaryCards';
import { ChangeFilterBar } from './ChangeFilterBar';

interface VersionComparisonViewProps {
  initialPolicyId?: string | null;
  initialFromVersionId?: string | null;
  initialToVersionId?: string | null;
}

export function VersionComparisonView({
  initialPolicyId,
  initialFromVersionId,
  initialToVersionId,
}: VersionComparisonViewProps) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>(initialPolicyId || '');
  const [fromVersionId, setFromVersionId] = useState<string>(initialFromVersionId || '');
  const [toVersionId, setToVersionId] = useState<string>(initialToVersionId || '');

  const [isLoadingPolicies, setIsLoadingPolicies] = useState(true);
  const [isComparing, setIsComparing] = useState(false);
  const [analyzingChangeId, setAnalyzingChangeId] = useState<string | null>(null);
  const [comparisonResult, setComparisonResult] = useState<PolicyComparisonResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('ALL'); // 'ALL' | 'ADDED' | 'REMOVED' | 'MODIFIED' | 'DEADLINE' | 'EVIDENCE'
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch policies list
  useEffect(() => {
    setIsLoadingPolicies(true);
    api.get<Policy[]>('/policies')
      .then((data) => {
        setPolicies(data);
        if (!selectedPolicyId && data.length > 0) {
          // Select policy with multiple versions if available, or first policy
          const multiVer = data.find((p) => (p.versionCount || p.versions?.length || 0) >= 2);
          const defaultPolicy = multiVer || data[0];
          setSelectedPolicyId(defaultPolicy.id);
        }
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Could not fetch policies.');
      })
      .finally(() => setIsLoadingPolicies(false));
  }, []);

  // Update version options when selected policy changes
  const activePolicy = useMemo(() => {
    return policies.find((p) => p.id === selectedPolicyId) || null;
  }, [policies, selectedPolicyId]);

  useEffect(() => {
    if (activePolicy && activePolicy.versions && activePolicy.versions.length >= 2) {
      // Sort ascending by versionNumber
      const sortedVersions = [...activePolicy.versions].sort(
        (a, b) => a.versionNumber - b.versionNumber,
      );
      if (!fromVersionId || !activePolicy.versions.some((v) => v.id === fromVersionId)) {
        setFromVersionId(sortedVersions[0].id);
      }
      if (!toVersionId || !activePolicy.versions.some((v) => v.id === toVersionId)) {
        setToVersionId(sortedVersions[sortedVersions.length - 1].id);
      }
    } else if (activePolicy && activePolicy.versions && activePolicy.versions.length === 1) {
      setFromVersionId(activePolicy.versions[0].id);
      setToVersionId(activePolicy.versions[0].id);
    }
  }, [activePolicy]);

  // Trigger comparison when initial URL params are passed
  useEffect(() => {
    if (initialFromVersionId && initialToVersionId && initialFromVersionId !== initialToVersionId) {
      handleRunComparison(initialFromVersionId, initialToVersionId);
    }
  }, [initialFromVersionId, initialToVersionId]);

  const handleRunComparison = async (overrideFrom?: string, overrideTo?: string) => {
    const fromId = overrideFrom || fromVersionId;
    const toId = overrideTo || toVersionId;

    if (!fromId || !toId) {
      setError('Please select both a baseline version and a target version to compare.');
      return;
    }

    if (fromId === toId) {
      setError('Please select two distinct versions to compare.');
      return;
    }

    setIsComparing(true);
    setError(null);

    // Sync URL for deep-linking and browser reload survival
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('policyId', selectedPolicyId);
      url.searchParams.set('fromVersionId', fromId);
      url.searchParams.set('toVersionId', toId);
      window.history.replaceState(null, '', url.toString());
    }

    try {
      const result = await api.post<PolicyComparisonResponse>('/policies/compare', {
        fromVersionId: fromId,
        toVersionId: toId,
        policyId: selectedPolicyId,
      });
      setComparisonResult(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Comparison engine failed.');
    } finally {
      setIsComparing(false);
    }
  };

  const handleAnalyzeImpact = async (changeId: string) => {
    setAnalyzingChangeId(changeId);
    try {
      const impacts = await api.post<Impact[]>(`/impact/analyze/change/${changeId}`);
      // Update local comparison result with fresh impacts
      setComparisonResult((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          changes: prev.changes.map((c) =>
            c.id === changeId ? { ...c, impacts } : c,
          ),
        };
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to analyze impact.');
    } finally {
      setAnalyzingChangeId(null);
    }
  };

  // Filtered Changes List
  const filteredChanges = useMemo(() => {
    if (!comparisonResult) return [];

    return comparisonResult.changes.filter((change) => {
      // Type / Category filter
      if (typeFilter === 'ADDED' && change.changeType !== 'ADDED') return false;
      if (typeFilter === 'REMOVED' && change.changeType !== 'REMOVED') return false;
      if (typeFilter === 'MODIFIED' && change.changeType !== 'MODIFIED') return false;
      if (typeFilter === 'DEADLINE' && change.fieldChanged !== 'DEADLINE') return false;
      if (typeFilter === 'EVIDENCE' && change.fieldChanged !== 'EVIDENCE') return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDesc = change.description?.toLowerCase().includes(q);
        const matchesSection = change.affectedSection?.toLowerCase().includes(q);
        const matchesSource = change.sourceReference?.toLowerCase().includes(q);
        const matchesOld = change.oldValue?.toLowerCase().includes(q);
        const matchesNew = change.newValue?.toLowerCase().includes(q);
        if (!matchesDesc && !matchesSection && !matchesSource && !matchesOld && !matchesNew) {
          return false;
        }
      }

      return true;
    });
  }, [comparisonResult, typeFilter, searchQuery]);

  const getChangeBadge = (changeType: ChangeType, fieldChanged?: string | null) => {
    if (fieldChanged === 'DEADLINE') {
      return (
        <span
          style={{
            backgroundColor: '#e0f2fe',
            color: '#0284c7',
            border: '1px solid #bae6fd',
            fontSize: '0.6875rem',
            fontWeight: 700,
            padding: '0.125rem 0.5rem',
            borderRadius: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          ⏰ DEADLINE SHIFT
        </span>
      );
    }

    if (fieldChanged === 'EVIDENCE') {
      return (
        <span
          style={{
            backgroundColor: '#f3e8ff',
            color: '#9333ea',
            border: '1px solid #e9d5ff',
            fontSize: '0.6875rem',
            fontWeight: 700,
            padding: '0.125rem 0.5rem',
            borderRadius: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
          }}
        >
          📋 EVIDENCE CHANGE
        </span>
      );
    }

    switch (changeType) {
      case 'ADDED':
        return (
          <span
            style={{
              backgroundColor: '#dcfce7',
              color: '#166534',
              border: '1px solid #bbf7d0',
              fontSize: '0.6875rem',
              fontWeight: 700,
              padding: '0.125rem 0.5rem',
              borderRadius: '0.25rem',
            }}
          >
            + ADDED REQUIREMENT
          </span>
        );
      case 'REMOVED':
        return (
          <span
            style={{
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              fontSize: '0.6875rem',
              fontWeight: 700,
              padding: '0.125rem 0.5rem',
              borderRadius: '0.25rem',
            }}
          >
            - REMOVED REQUIREMENT
          </span>
        );
      case 'MODIFIED':
      default:
        return (
          <span
            style={{
              backgroundColor: '#fef3c7',
              color: '#92400e',
              border: '1px solid #fde68a',
              fontSize: '0.6875rem',
              fontWeight: 700,
              padding: '0.125rem 0.5rem',
              borderRadius: '0.25rem',
            }}
          >
            ~ MODIFIED
          </span>
        );
    }
  };

  return (
    <div>
      {/* Policy and Version Selection Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '0.75rem',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          marginBottom: '1.75rem',
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', alignItems: 'flex-end' }}>
          {/* Policy Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
              Select Policy
            </label>
            <select
              value={selectedPolicyId}
              onChange={(e) => setSelectedPolicyId(e.target.value)}
              disabled={isLoadingPolicies}
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                color: '#0f172a',
                backgroundColor: '#ffffff',
                outline: 'none',
              }}
            >
              {policies.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.versionCount || p.versions?.length || 0} versions)
                </option>
              ))}
            </select>
          </div>

          {/* Baseline Version Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
              Baseline Version (From)
            </label>
            <select
              value={fromVersionId}
              onChange={(e) => setFromVersionId(e.target.value)}
              disabled={!activePolicy?.versions || activePolicy.versions.length === 0}
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                color: '#0f172a',
                backgroundColor: '#ffffff',
                outline: 'none',
              }}
            >
              {activePolicy?.versions?.map((v) => (
                <option key={v.id} value={v.id}>
                  Version {v.versionNumber} ({v.status}) - {new Date(v.createdAt).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          {/* Target Version Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
              Revised Version (To)
            </label>
            <select
              value={toVersionId}
              onChange={(e) => setToVersionId(e.target.value)}
              disabled={!activePolicy?.versions || activePolicy.versions.length === 0}
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                color: '#0f172a',
                backgroundColor: '#ffffff',
                outline: 'none',
              }}
            >
              {activePolicy?.versions?.map((v) => (
                <option key={v.id} value={v.id}>
                  Version {v.versionNumber} ({v.status}) - {new Date(v.createdAt).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          {/* Run Button */}
          <div>
            <button
              onClick={() => handleRunComparison()}
              disabled={isComparing || !fromVersionId || !toVersionId || fromVersionId === toVersionId}
              style={{
                width: '100%',
                padding: '0.625rem 1.25rem',
                backgroundColor: isComparing ? '#93c5fd' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: isComparing || fromVersionId === toVersionId ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              }}
            >
              {isComparing ? (
                <>
                  <svg className="animate-spin" style={{ width: '1rem', height: '1rem' }} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" className="opacity-75" />
                  </svg>
                  Comparing Versions...
                </>
              ) : (
                <>
                  <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Run Comparison
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              borderRadius: '0.375rem',
              fontSize: '0.8125rem',
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Comparison Results Container */}
      {comparisonResult && (
        <>
          {/* Version Header Banner */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '0.5rem',
              padding: '1rem 1.5rem',
              marginBottom: '1.25rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Comparison Report
              </span>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: '0.125rem 0' }}>
                {comparisonResult.policyName}
              </h2>
              <p style={{ fontSize: '0.8125rem', color: '#475569', margin: 0 }}>
                Comparing <strong>Version {comparisonResult.fromVersion.versionNumber}</strong> ({comparisonResult.fromVersion.requirementsCount} requirements) with <strong>Version {comparisonResult.toVersion.versionNumber}</strong> ({comparisonResult.toVersion.requirementsCount} requirements)
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', padding: '0.25rem 0.625rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                v{comparisonResult.fromVersion.versionNumber} ➔ v{comparisonResult.toVersion.versionNumber}
              </span>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <ChangeSummaryCards
            summary={comparisonResult.summary}
            selectedFilter={typeFilter}
            onFilterChange={(f) => setTypeFilter(f)}
          />

          {/* Filter and Search Bar */}
          <ChangeFilterBar
            searchQuery={searchQuery}
            onSearchChange={(q) => setSearchQuery(q)}
            severityFilter={severityFilter}
            onSeverityChange={(s) => setSeverityFilter(s)}
            totalFiltered={filteredChanges.length}
            totalChanges={comparisonResult.summary.totalChanges}
            onReset={() => {
              setSearchQuery('');
              setTypeFilter('ALL');
              setSeverityFilter('ALL');
            }}
          />

          {/* Itemized Detected Changes */}
          {filteredChanges.length === 0 ? (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '0.75rem',
                border: '1px dashed #cbd5e1',
                padding: '3rem 2rem',
                textAlign: 'center',
                color: '#64748b',
              }}
            >
              <p style={{ fontSize: '0.9375rem', fontWeight: 500, margin: 0 }}>
                No changes match the selected filter criteria.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredChanges.map((change, idx) => (
                <div
                  key={change.id || idx}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '0.75rem',
                    border: '1px solid #e2e8f0',
                    padding: '1.25rem 1.5rem',
                    boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03)',
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {getChangeBadge(change.changeType, change.fieldChanged)}
                      {change.affectedSection && (
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b' }}>
                          § {change.affectedSection}
                        </span>
                      )}
                    </div>
                    {change.confidence && (
                      <span style={{ fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 500 }}>
                        Confidence: {(change.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>

                  {/* Change Description */}
                  <p style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
                    {change.description}
                  </p>

                  {/* Old vs New Side-by-Side Comparison Box */}
                  {(change.oldValue || change.newValue) && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '0.75rem',
                        marginBottom: '0.875rem',
                      }}
                    >
                      {/* Old Value (Baseline) */}
                      <div
                        style={{
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fee2e2',
                          borderRadius: '0.375rem',
                          padding: '0.75rem',
                        }}
                      >
                        <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                          Baseline (v{comparisonResult.fromVersion.versionNumber})
                        </span>
                        <div style={{ fontSize: '0.8125rem', color: '#7f1d1d', lineHeight: 1.4 }}>
                          {change.oldValue ? (
                            <span>{change.oldValue}</span>
                          ) : (
                            <em style={{ color: '#9ca3af' }}>None (Newly added obligation)</em>
                          )}
                        </div>
                      </div>

                      {/* New Value (Revised) */}
                      <div
                        style={{
                          backgroundColor: '#f0fdf4',
                          border: '1px solid #dcfce7',
                          borderRadius: '0.375rem',
                          padding: '0.75rem',
                        }}
                      >
                        <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                          Revised (v{comparisonResult.toVersion.versionNumber})
                        </span>
                        <div style={{ fontSize: '0.8125rem', color: '#14532d', lineHeight: 1.4 }}>
                          {change.newValue ? (
                            <span>{change.newValue}</span>
                          ) : (
                            <em style={{ color: '#9ca3af' }}>None (Requirement removed/deprecated)</em>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Source Reference & Excerpt Citations */}
                  {change.sourceReference && (
                    <div
                      style={{
                        padding: '0.625rem 0.875rem',
                        backgroundColor: '#f8fafc',
                        borderLeft: '3px solid #3b82f6',
                        borderRadius: '0 0.375rem 0.375rem 0',
                        fontSize: '0.75rem',
                        color: '#475569',
                        marginBottom: change.impacts && change.impacts.length > 0 ? '0.75rem' : '0',
                      }}
                    >
                      <strong style={{ color: '#1d4ed8' }}>Source Reference:</strong> &ldquo;{change.sourceReference}&rdquo;
                    </div>
                  )}

                  {/* Impact Analysis Section */}
                  {change.impacts && change.impacts.length > 0 ? (
                    <div
                      style={{
                        marginTop: '0.75rem',
                        padding: '0.75rem 1rem',
                        backgroundColor: '#faf5ff',
                        border: '1px solid #f3e8ff',
                        borderRadius: '0.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7e22ce', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          ⚡ Impact Analysis ({change.impacts.length})
                        </span>
                        {change.impacts[0] && (
                          <Link
                            href={`/impact?impactId=${change.impacts[0].id}&policyId=${selectedPolicyId}`}
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: '#7e22ce',
                              textDecoration: 'none',
                              backgroundColor: '#f3e8ff',
                              padding: '0.25rem 0.625rem',
                              borderRadius: '0.375rem',
                              border: '1px solid #e9d5ff',
                            }}
                          >
                            View Impact Details ➔
                          </Link>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {change.impacts.map((imp) => {
                          const sevBg = imp.severity === 'CRITICAL' ? '#fee2e2' : imp.severity === 'HIGH' ? '#ffedd5' : imp.severity === 'LOW' ? '#f1f5f9' : '#dbeafe';
                          const sevColor = imp.severity === 'CRITICAL' ? '#991b1b' : imp.severity === 'HIGH' ? '#c2410c' : imp.severity === 'LOW' ? '#475569' : '#1e40af';
                          const statBg = imp.status === 'MITIGATED' ? '#dcfce7' : imp.status === 'ASSESSED' ? '#e0f2fe' : imp.status === 'ACCEPTED' ? '#f1f5f9' : '#ede9fe';
                          const statColor = imp.status === 'MITIGATED' ? '#166534' : imp.status === 'ASSESSED' ? '#075985' : imp.status === 'ACCEPTED' ? '#475569' : '#5b21b6';

                          return (
                            <div
                              key={imp.id}
                              style={{
                                backgroundColor: '#ffffff',
                                border: '1px solid #e9d5ff',
                                borderRadius: '0.375rem',
                                padding: '0.625rem 0.75rem',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                <div style={{ display: 'flex', gap: '0.375rem' }}>
                                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.0625rem 0.375rem', borderRadius: '0.25rem', backgroundColor: sevBg, color: sevColor }}>
                                    {imp.severity}
                                  </span>
                                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '0.0625rem 0.375rem', borderRadius: '0.25rem', backgroundColor: statBg, color: statColor }}>
                                    {imp.status}
                                  </span>
                                </div>
                                <Link
                                  href={`/impact?impactId=${imp.id}&policyId=${selectedPolicyId}`}
                                  style={{ fontSize: '0.6875rem', color: '#7e22ce', textDecoration: 'none', fontWeight: 600 }}
                                >
                                  Open in Impact Matrix ↗
                                </Link>
                              </div>
                              <p style={{ fontSize: '0.8125rem', color: '#334155', margin: '0 0 0.25rem 0', lineHeight: 1.4 }}>
                                {imp.description}
                              </p>
                              {imp.reason && (
                                <p style={{ fontSize: '0.75rem', color: '#6b21a8', margin: '0 0 0.25rem 0', fontStyle: 'italic' }}>
                                  {imp.reason}
                                </p>
                              )}
                              {imp.requirement && (
                                <div style={{ fontSize: '0.6875rem', color: '#047857', marginTop: '0.25rem', fontWeight: 600 }}>
                                  📋 Requirement: {imp.requirement.title}
                                </div>
                              )}
                              {imp.action && (
                                <div style={{ fontSize: '0.6875rem', color: '#0369a1', marginTop: '0.125rem', fontWeight: 600 }}>
                                  🎯 Action: {imp.action.title} {imp.action.assignedTo ? `(👤 ${imp.action.assignedTo.name})` : ''}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        marginTop: '0.75rem',
                        padding: '0.75rem 1rem',
                        backgroundColor: '#f8fafc',
                        border: '1px dashed #cbd5e1',
                        borderRadius: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                        No impact assessment generated yet for this change.
                      </span>
                      <button
                        type="button"
                        disabled={analyzingChangeId === change.id}
                        onClick={() => handleAnalyzeImpact(change.id)}
                        style={{
                          padding: '0.375rem 0.75rem',
                          backgroundColor: '#7c3aed',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '0.375rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {analyzingChangeId === change.id ? 'Analyzing...' : '⚡ Analyze Impact'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Empty State before comparison */}
      {!comparisonResult && !isComparing && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '0.75rem',
            border: '1px dashed #cbd5e1',
            padding: '4rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '4rem',
              height: '4rem',
              borderRadius: '50%',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}
          >
            <svg style={{ width: '2rem', height: '2rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
            Ready to Compare Policy Versions
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '460px', margin: 0 }}>
            Select a policy and choose two versions above, then click <strong>Run Comparison</strong> to detect added, removed, and modified requirements, deadline shifts, and evidence updates.
          </p>
        </div>
      )}
    </div>
  );
}
