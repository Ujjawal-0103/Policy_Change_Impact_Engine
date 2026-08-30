'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Policy, PolicyVersion, Requirement, Priority } from '@/types';
import { useRouter } from 'next/navigation';
import { PolicyVersionTimeline } from './PolicyVersionTimeline';

interface PolicyDetailsModalProps {
  policyId: string | null;
  onClose: () => void;
  onNewVersionClick: (policy: Policy) => void;
}

export function PolicyDetailsModal({ policyId, onClose, onNewVersionClick }: PolicyDetailsModalProps) {
  const router = useRouter();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loadingReqs, setLoadingReqs] = useState(false);

  const [updatingStatus, setUpdatingStatus] = useState(false);

  const reloadPolicy = async () => {
    if (!policyId) return;
    try {
      const data = await api.get<Policy>(`/policies/${policyId}`);
      setPolicy(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (policyId) {
      setIsLoading(true);
      api.get<Policy>(`/policies/${policyId}`)
        .then((data) => {
          setPolicy(data);
          const initialVersion = data.versions?.[0]?.id || null;
          setActiveVersionId(initialVersion);
        })
        .catch(() => setPolicy(null))
        .finally(() => setIsLoading(false));
    }
  }, [policyId]);

  useEffect(() => {
    if (activeVersionId) {
      setLoadingReqs(true);
      api.get<Requirement[]>(`/requirements?policyVersionId=${activeVersionId}`)
        .then((reqs) => setRequirements(reqs))
        .catch(() => setRequirements([]))
        .finally(() => setLoadingReqs(false));
    }
  }, [activeVersionId]);

  const handleActivateVersion = async (versionId: string) => {
    if (!policyId || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      await api.patch(`/policies/${policyId}/versions/${versionId}/status`, {
        status: 'ACTIVE',
      });
      await reloadPolicy();
    } catch (err) {
      console.error('Failed to activate version:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (!policyId) return null;

  const getVersionStatusBadge = (status: string) => {
    if (status === 'ACTIVE') {
      return { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' };
    }
    if (status === 'DRAFT') {
      return { bg: '#fef3c7', text: '#92400e', border: '#fde68a' };
    }
    return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
  };

  const getPriorityBadge = (priority: Priority) => {
    const map: Record<Priority, { bg: string; text: string; border: string }> = {
      CRITICAL: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
      HIGH: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
      MEDIUM: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
      LOW: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
    };
    const s = map[priority] || map.MEDIUM;
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
        {priority}
      </span>
    );
  };

  const handleLaunchComparison = (fromVerId: string, toVerId: string) => {
    router.push(`/changes?policyId=${policy?.id}&fromVersionId=${fromVerId}&toVersionId=${toVerId}`);
    onClose();
  };

  const activeVersion = policy?.versions?.find((v) => v.id === activeVersionId) || null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '0.75rem',
          maxWidth: '960px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {policy?.name || 'Policy Details'}
              </h2>
              {policy?.versions && policy.versions.length > 0 && (
                <span
                  style={{
                    backgroundColor: '#dbeafe',
                    color: '#1e40af',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0.125rem 0.5rem',
                    borderRadius: '9999px',
                  }}
                >
                  {policy.versions.length} Version{policy.versions.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {policy?.description && (
              <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
                {policy.description}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {policy && policy.versions && policy.versions.length >= 2 && (
              <button
                onClick={() =>
                  handleLaunchComparison(
                    policy.versions![policy.versions!.length - 1].id,
                    policy.versions![0].id,
                  )
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.375rem 0.75rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#2563eb',
                  cursor: 'pointer',
                }}
              >
                <svg style={{ width: '0.875rem', height: '0.875rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Compare Latest Versions
              </button>
            )}
            {policy && (
              <button
                onClick={() => {
                  onClose();
                  onNewVersionClick(policy);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.375rem 0.75rem',
                  backgroundColor: '#2563eb',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                + Add Version
              </button>
            )}
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }}
            >
              <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Version Selector Sidebar */}
          <div
            style={{
              width: '260px',
              borderRight: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              overflowY: 'auto',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem 0.25rem' }}>
              Policy Versions
            </h3>
            {isLoading ? (
              <p style={{ fontSize: '0.8125rem', color: '#94a3b8', padding: '0.5rem' }}>Loading versions...</p>
            ) : !policy?.versions || policy.versions.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '0.375rem', border: '1px dashed #cbd5e1' }}>
                <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0 0 0.5rem 0' }}>No versions created yet</p>
                <button
                  onClick={() => policy && onNewVersionClick(policy)}
                  style={{
                    fontSize: '0.75rem',
                    color: '#2563eb',
                    fontWeight: 600,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  + Upload Version 1
                </button>
              </div>
            ) : (
              policy.versions.map((ver) => {
                const isSelected = ver.id === activeVersionId;
                const badgeStyle = getVersionStatusBadge(ver.status);
                return (
                  <div
                    key={ver.id}
                    onClick={() => setActiveVersionId(ver.id)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '0.375rem',
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                      border: isSelected ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.875rem', color: isSelected ? '#1d4ed8' : '#1e293b' }}>
                        Version {ver.versionNumber}
                      </span>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          padding: '0.125rem 0.375rem',
                          borderRadius: '0.25rem',
                          backgroundColor: badgeStyle.bg,
                          color: badgeStyle.text,
                          border: `1px solid ${badgeStyle.border}`,
                        }}
                      >
                        {ver.status}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ver.document?.title || ver.document?.originalName || 'No document title'}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.375rem', fontSize: '0.6875rem', color: '#94a3b8' }}>
                      <span>{new Date(ver.createdAt).toLocaleDateString()}</span>
                      <span>{ver.requirements?.length || 0} reqs</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Active Version Requirements & Document Inspector */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', backgroundColor: '#ffffff' }}>
            {policy && (
              <div style={{ marginBottom: '1.5rem' }}>
                <PolicyVersionTimeline
                  policy={policy}
                  selectedVersionId={activeVersionId}
                  onSelectVersion={(ver) => setActiveVersionId(ver.id)}
                />
              </div>
            )}

            {activeVersion ? (
              <div>
                {/* Version Overview Card */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    padding: '1rem 1.25rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                        Version {activeVersion.versionNumber} Overview
                      </h4>
                      {(() => {
                        const s = getVersionStatusBadge(activeVersion.status);
                        return (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '0.125rem 0.5rem',
                              borderRadius: '9999px',
                              backgroundColor: s.bg,
                              color: s.text,
                              border: `1px solid ${s.border}`,
                            }}
                          >
                            {activeVersion.status}
                          </span>
                        );
                      })()}
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
                      Source Document: <strong>{activeVersion.document?.title}</strong> ({activeVersion.document?.originalName})
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {activeVersion.status !== 'ACTIVE' && (
                      <button
                        onClick={() => handleActivateVersion(activeVersion.id)}
                        disabled={updatingStatus}
                        style={{
                          padding: '0.375rem 0.75rem',
                          backgroundColor: '#f0fdf4',
                          border: '1px solid #86efac',
                          borderRadius: '0.375rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#166534',
                          cursor: updatingStatus ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {updatingStatus ? 'Activating...' : '✓ Set as Active'}
                      </button>
                    )}
                    {activeVersion.document?.storageUrl && (
                      <a
                        href={activeVersion.document.storageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: '#2563eb',
                          textDecoration: 'none',
                          padding: '0.375rem 0.75rem',
                          border: '1px solid #bfdbfe',
                          borderRadius: '0.375rem',
                          backgroundColor: '#ffffff',
                        }}
                      >
                        <svg style={{ width: '0.875rem', height: '0.875rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View Original PDF
                      </a>
                    )}
                  </div>
                </div>

                {/* Requirements Section */}
                <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                    Extracted Requirements ({requirements.length})
                  </h4>
                </div>

                {loadingReqs ? (
                  <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>Loading requirements...</p>
                ) : requirements.length === 0 ? (
                  <div
                    style={{
                      padding: '2rem',
                      textAlign: 'center',
                      backgroundColor: '#f8fafc',
                      borderRadius: '0.5rem',
                      border: '1px dashed #cbd5e1',
                    }}
                  >
                    <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
                      No structured requirements extracted for this version.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {requirements.map((req, idx) => (
                      <div
                        key={req.id}
                        style={{
                          padding: '1rem',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0.5rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>
                                #{idx + 1}
                              </span>
                              <h5 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                                {req.title}
                              </h5>
                            </div>
                            <p style={{ fontSize: '0.8125rem', color: '#475569', margin: '0 0 0.5rem 0', lineHeight: 1.5 }}>
                              {req.description}
                            </p>
                          </div>
                          {getPriorityBadge(req.priority)}
                        </div>

                        {/* Metadata Pills */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.75rem' }}>
                          {req.deadline && (
                            <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '0.125rem 0.5rem', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              ⏰ Deadline: {new Date(req.deadline).toLocaleDateString()}
                            </span>
                          )}
                          {req.responsibleRole && (
                            <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '0.125rem 0.5rem', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              👤 Role: {req.responsibleRole}
                            </span>
                          )}
                          {req.evidenceNeeded && (
                            <span style={{ backgroundColor: '#faf5ff', color: '#7e22ce', border: '1px solid #f3e8ff', padding: '0.125rem 0.5rem', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              📋 Evidence: {req.evidenceNeeded}
                            </span>
                          )}
                          {req.sourcePage && (
                            <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #dbeafe', padding: '0.125rem 0.5rem', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              📄 Page {req.sourcePage}
                            </span>
                          )}
                        </div>

                        {/* Source Text Excerpt */}
                        {req.sourceText && (
                          <div
                            style={{
                              marginTop: '0.5rem',
                              padding: '0.5rem 0.75rem',
                              backgroundColor: '#f8fafc',
                              borderLeft: '3px solid #cbd5e1',
                              fontSize: '0.75rem',
                              color: '#64748b',
                              fontStyle: 'italic',
                            }}
                          >
                            &ldquo;{req.sourceText}&rdquo;
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                Select a version from the left to view requirements.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
