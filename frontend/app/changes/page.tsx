'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { VersionComparisonView } from '@/components/changes/VersionComparisonView';

function ChangesPageContent() {
  const searchParams = useSearchParams();
  const policyId = searchParams.get('policyId');
  const fromVersionId = searchParams.get('fromVersionId');
  const toVersionId = searchParams.get('toVersionId');

  return (
    <>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title">Policy Version Comparison</h1>
        <p className="page-subtitle">
          Detect added, removed, and modified requirements, deadline shifts, and evidence updates across policy versions with source citations.
        </p>
      </div>

      <VersionComparisonView
        initialPolicyId={policyId}
        initialFromVersionId={fromVersionId}
        initialToVersionId={toVersionId}
      />
    </>
  );
}

export default function ChangesPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
          Loading Policy Comparison Engine...
        </div>
      }
    >
      <ChangesPageContent />
    </Suspense>
  );
}
