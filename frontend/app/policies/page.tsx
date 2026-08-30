'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Policy, PolicyVersion } from '@/types';
import { PolicyList } from '@/components/policies/PolicyList';
import { CreatePolicyModal } from '@/components/policies/CreatePolicyModal';
import { NewVersionModal } from '@/components/policies/NewVersionModal';
import { PolicyDetailsModal } from '@/components/policies/PolicyDetailsModal';
import { useRouter, useSearchParams } from 'next/navigation';

function PoliciesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlPolicyId = searchParams.get('policyId');

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newVersionPolicy, setNewVersionPolicy] = useState<Policy | null>(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(urlPolicyId || null);

  const openPolicyModal = (id: string) => {
    setSelectedPolicyId(id);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('policyId', id);
      window.history.replaceState(null, '', url.toString());
    }
  };

  const closePolicyModal = () => {
    setSelectedPolicyId(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('policyId');
      window.history.replaceState(null, '', url.toString());
    }
  };

  const fetchPolicies = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<Policy[]>('/policies');
      setPolicies(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not fetch policies.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handlePolicyCreated = (newPolicy: Policy) => {
    fetchPolicies();
    setSelectedPolicyId(newPolicy.id);
  };

  const handleVersionCreated = (version: PolicyVersion) => {
    fetchPolicies();
    if (newVersionPolicy) {
      setSelectedPolicyId(newVersionPolicy.id);
    }
  };

  const handleCompare = (policy: Policy) => {
    if (policy.versions && policy.versions.length >= 2) {
      const sorted = [...policy.versions].sort((a, b) => a.versionNumber - b.versionNumber);
      const fromVer = sorted[0].id;
      const toVer = sorted[sorted.length - 1].id;
      router.push(`/changes?policyId=${policy.id}&fromVersionId=${fromVer}&toVersionId=${toVer}`);
    } else {
      router.push(`/changes?policyId=${policy.id}`);
    }
  };

  // Metrics calculation
  const totalVersions = policies.reduce((sum, p) => sum + (p.versionCount || p.versions?.length || 0), 0);
  const totalRequirements = policies.reduce((sum, p) => sum + (p.totalRequirements || 0), 0);
  const totalChanges = policies.reduce((sum, p) => sum + (p.changeCount || 0), 0);

  return (
    <>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Policy & Version Management</h1>
          <p className="page-subtitle">
            Manage governing policy sets, maintain chronological version history, and extract AI compliance requirements.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1.25rem',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <svg style={{ width: '1.125rem', height: '1.125rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Policy
        </button>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1rem 1.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Tracked Policies
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
            {policies.length}
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1rem 1.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Total Versions
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a', marginTop: '0.25rem' }}>
            {totalVersions}
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1rem 1.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Active Requirements
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#2563eb', marginTop: '0.25rem' }}>
            {totalRequirements}
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1rem 1.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Version Diffs Tracked
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#d97706', marginTop: '0.25rem' }}>
            {totalChanges}
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '0.875rem 1.25rem',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{error}</span>
          <button
            onClick={fetchPolicies}
            style={{
              background: '#ffffff',
              border: '1px solid #fecaca',
              padding: '0.25rem 0.625rem',
              borderRadius: '0.25rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Policy List Component */}
      <PolicyList
        policies={policies}
        isLoading={isLoading}
        onSelectPolicy={(id) => openPolicyModal(id)}
        onNewVersion={(policy) => setNewVersionPolicy(policy)}
        onCompare={(policy) => handleCompare(policy)}
        onCreatePolicy={() => setIsCreateModalOpen(true)}
      />

      {/* Create Policy Modal */}
      <CreatePolicyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handlePolicyCreated}
      />

      {/* New Version Modal */}
      <NewVersionModal
        policy={newVersionPolicy}
        isOpen={Boolean(newVersionPolicy)}
        onClose={() => setNewVersionPolicy(null)}
        onSuccess={handleVersionCreated}
      />

      {/* Policy Details / Inspector Modal */}
      <PolicyDetailsModal
        policyId={selectedPolicyId}
        onClose={closePolicyModal}
        onNewVersionClick={(policy) => setNewVersionPolicy(policy)}
      />
    </>
  );
}

export default function PoliciesPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading policies...</div>}>
      <PoliciesPageContent />
    </Suspense>
  );
}
