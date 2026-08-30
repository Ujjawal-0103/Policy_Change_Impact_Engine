'use client';

import React from 'react';
import Link from 'next/link';
import type { Policy, PolicyVersion, PolicyChange } from '@/types';

interface PolicyVersionTimelineProps {
  policy: Policy;
  selectedVersionId?: string | null;
  onSelectVersion?: (version: PolicyVersion) => void;
}

export function PolicyVersionTimeline({
  policy,
  selectedVersionId,
  onSelectVersion,
}: PolicyVersionTimelineProps) {
  const versions = [...(policy.versions || [])].sort((a, b) => a.versionNumber - b.versionNumber);
  const changes = policy.changes || [];

  if (versions.length === 0) {
    return (
      <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.8125rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
        No policy versions created yet.
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>⏳</span> Policy Version Timeline & Evolution
          </h3>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
            Track version transitions, detected regulatory changes, and impact progression.
          </p>
        </div>
        <span style={{ fontSize: '0.6875rem', padding: '0.2rem 0.5rem', backgroundColor: '#eff6ff', color: '#1e40af', borderRadius: '9999px', fontWeight: 700 }}>
          {versions.length} Version{versions.length === 1 ? '' : 's'} Total
        </span>
      </div>

      {/* Visual Timeline Flow */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative' }}>
        {versions.map((ver, idx) => {
          const isSelected = selectedVersionId === ver.id;
          const nextVersion = idx < versions.length - 1 ? versions[idx + 1] : null;

          // Find transition changes from this version to the next
          const transitionChanges = nextVersion
            ? changes.filter(
                (c) =>
                  (c.fromVersionId === ver.id && c.toVersionId === nextVersion.id) ||
                  (c.fromVersion?.versionNumber === ver.versionNumber && c.toVersion?.versionNumber === nextVersion.versionNumber),
              )
            : [];

          const highCritImpacts = transitionChanges.reduce((acc, c) => {
            const count = (c.impacts || []).filter((i) => i.severity === 'CRITICAL' || i.severity === 'HIGH').length;
            return acc + count;
          }, 0);

          return (
            <React.Fragment key={ver.id}>
              {/* Version Node */}
              <div
                onClick={() => onSelectVersion && onSelectVersion(ver)}
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: '0.5rem',
                  border: '1px solid',
                  borderColor: isSelected ? '#2563eb' : '#cbd5e1',
                  backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                  cursor: onSelectVersion ? 'pointer' : 'default',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  boxShadow: isSelected ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '2.25rem',
                      height: '2.25rem',
                      borderRadius: '0.375rem',
                      backgroundColor: ver.status === 'ACTIVE' ? '#2563eb' : '#64748b',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.875rem',
                    }}
                  >
                    v{ver.versionNumber}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#0f172a' }}>
                        Version {ver.versionNumber}
                      </span>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '0.25rem',
                          fontWeight: 700,
                          backgroundColor: ver.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9',
                          color: ver.status === 'ACTIVE' ? '#166534' : '#64748b',
                        }}
                      >
                        {ver.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>
                      Created: {new Date(ver.createdAt).toLocaleDateString()}
                      {ver.document?.title && ` • Document: ${ver.document.title}`}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#475569', backgroundColor: '#f8fafc', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', border: '1px solid #e2e8f0' }}>
                    📋 {ver.requirements?.length || ver._count?.requirements || 0} Requirements
                  </span>
                  {onSelectVersion && (
                    <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>
                      {isSelected ? 'Selected' : 'View Details ➔'}
                    </span>
                  )}
                </div>
              </div>

              {/* Transition Node if next version exists */}
              {nextVersion && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.25rem 0',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      backgroundColor: '#f8fafc',
                      border: '1px dashed #94a3b8',
                      borderRadius: '0.375rem',
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.75rem',
                    }}
                  >
                    <span style={{ color: '#64748b', fontWeight: 600 }}>
                      v{ver.versionNumber} ➔ v{nextVersion.versionNumber}
                    </span>
                    {transitionChanges.length > 0 ? (
                      <span style={{ color: '#0f172a', fontWeight: 700 }}>
                        {transitionChanges.length} change{transitionChanges.length === 1 ? '' : 's'} detected
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                        No changes compared yet
                      </span>
                    )}

                    {highCritImpacts > 0 && (
                      <span style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '0.125rem 0.375rem', borderRadius: '0.25rem', fontWeight: 800, fontSize: '0.6875rem' }}>
                        ⚠️ {highCritImpacts} High/Critical Impact{highCritImpacts === 1 ? '' : 's'}
                      </span>
                    )}

                    <Link
                      href={`/changes?policyId=${policy.id}&fromVersionId=${ver.id}&toVersionId=${nextVersion.id}`}
                      style={{
                        color: '#2563eb',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      Compare Transition ➔
                    </Link>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
