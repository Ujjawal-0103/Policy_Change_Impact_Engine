'use client';

import React, { useState, useEffect } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Document, Policy } from '@/types';

interface CreatePolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (policy: Policy) => void;
}

export function CreatePolicyModal({ isOpen, onClose, onSuccess }: CreatePolicyModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setSelectedDocumentId('');
      setError(null);
      setLoadingDocs(true);
      api.get<Document[]>('/documents')
        .then((docs) => setDocuments(docs))
        .catch(() => setDocuments([]))
        .finally(() => setLoadingDocs(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a policy name.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: { name: string; description?: string; documentId?: string } = {
        name: name.trim(),
        description: description.trim() || undefined,
      };
      if (selectedDocumentId) {
        payload.documentId = selectedDocumentId;
      }

      const created = await api.post<Policy>('/policies', payload);
      onSuccess(created);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create policy.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          maxWidth: '560px',
          width: '100%',
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
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '2rem',
                height: '2rem',
                borderRadius: '0.375rem',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                Create New Policy
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                Establish a tracked policy set and optionally link its baseline version
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {error && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                padding: '0.75rem 1rem',
                borderRadius: '0.375rem',
                fontSize: '0.8125rem',
              }}
            >
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
              Policy Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Information Security & Data Protection Policy"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                color: '#0f172a',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Brief summary of policy scope, governing regulations, or organizational domain..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                color: '#0f172a',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
              Attach Baseline Document (Version 1)
            </label>
            <select
              value={selectedDocumentId}
              onChange={(e) => setSelectedDocumentId(e.target.value)}
              disabled={loadingDocs}
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
              <option value="">-- Optional: Select an uploaded PDF document --</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title} ({doc.originalName})
                </option>
              ))}
            </select>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              If selected, Version 1 will be automatically created and AI requirements will be extracted.
            </p>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '0.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid #f1f5f9',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '0.5rem 1.25rem',
                backgroundColor: '#2563eb',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#ffffff',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin" style={{ width: '1rem', height: '1rem' }} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" className="opacity-75" />
                  </svg>
                  Creating Policy...
                </>
              ) : (
                'Create Policy'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
