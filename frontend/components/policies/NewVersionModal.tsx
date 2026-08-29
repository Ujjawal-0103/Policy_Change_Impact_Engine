'use client';

import React, { useState, useEffect } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Policy, Document, PolicyVersion } from '@/types';

interface NewVersionModalProps {
  policy: Policy | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (version: PolicyVersion) => void;
}

export function NewVersionModal({ policy, isOpen, onClose, onSuccess }: NewVersionModalProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [status, setStatus] = useState<'ACTIVE' | 'DRAFT'>('ACTIVE');
  const [autoExtract, setAutoExtract] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File upload inline state
  const [uploadMode, setUploadMode] = useState<'SELECT' | 'UPLOAD'>('SELECT');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  useEffect(() => {
    if (isOpen && policy) {
      setSelectedDocumentId('');
      setFileToUpload(null);
      setError(null);
      setLoadingDocs(true);
      api.get<Document[]>('/documents')
        .then((docs) => setDocuments(docs))
        .catch(() => setDocuments([]))
        .finally(() => setLoadingDocs(false));
    }
  }, [isOpen, policy]);

  if (!isOpen || !policy) return null;

  const nextVersionNumber = (policy.versionCount || policy.versions?.length || 0) + 1;

  const handleFileUpload = async () => {
    if (!fileToUpload) return null;
    setUploadingPdf(true);
    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('title', `${policy.name} - Version ${nextVersionNumber}`);
      const uploadedDoc = await api.upload<Document>('/documents/upload', formData);
      return uploadedDoc.id;
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      let docId = selectedDocumentId;
      if (uploadMode === 'UPLOAD') {
        if (!fileToUpload) {
          setError('Please select a PDF file to upload.');
          setIsSubmitting(false);
          return;
        }
        const newDocId = await handleFileUpload();
        if (!newDocId) {
          throw new Error('Failed to upload PDF document.');
        }
        docId = newDocId;
      }

      if (!docId) {
        setError('Please select or upload a document for this version.');
        setIsSubmitting(false);
        return;
      }

      const newVersion = await api.post<PolicyVersion>(`/policies/${policy.id}/versions`, {
        documentId: docId,
        status,
        autoExtractRequirements: autoExtract,
      });

      onSuccess(newVersion);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create new policy version.');
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
          maxWidth: '580px',
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
                width: '2.25rem',
                height: '2.25rem',
                borderRadius: '0.375rem',
                backgroundColor: '#f0fdf4',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.875rem',
              }}
            >
              v{nextVersionNumber}
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                Upload New Version
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                {policy.name} — Previous versions will be preserved for comparison
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

          {/* Mode Switcher */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', gap: '1rem' }}>
            <button
              type="button"
              onClick={() => setUploadMode('SELECT')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: uploadMode === 'SELECT' ? 600 : 400,
                color: uploadMode === 'SELECT' ? '#2563eb' : '#64748b',
                borderBottom: uploadMode === 'SELECT' ? '2px solid #2563eb' : 'none',
                paddingBottom: '0.25rem',
                cursor: 'pointer',
              }}
            >
              Select Existing Document
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('UPLOAD')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: uploadMode === 'UPLOAD' ? 600 : 400,
                color: uploadMode === 'UPLOAD' ? '#2563eb' : '#64748b',
                borderBottom: uploadMode === 'UPLOAD' ? '2px solid #2563eb' : 'none',
                paddingBottom: '0.25rem',
                cursor: 'pointer',
              }}
            >
              Upload New PDF File
            </button>
          </div>

          {uploadMode === 'SELECT' ? (
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                Select Document for Version {nextVersionNumber} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={selectedDocumentId}
                onChange={(e) => setSelectedDocumentId(e.target.value)}
                disabled={loadingDocs}
                required
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
                <option value="">-- Choose an uploaded PDF document --</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.title} ({doc.originalName})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                Upload PDF File for Version {nextVersionNumber} <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.75rem',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  color: '#0f172a',
                  backgroundColor: '#f8fafc',
                  cursor: 'pointer',
                }}
              />
            </div>
          )}

          {/* Status Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
              Version Status
            </label>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#334155', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="status"
                  value="ACTIVE"
                  checked={status === 'ACTIVE'}
                  onChange={() => setStatus('ACTIVE')}
                />
                <span style={{ fontWeight: 600, color: '#16a34a' }}>ACTIVE</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>(Current governing version)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#334155', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="status"
                  value="DRAFT"
                  checked={status === 'DRAFT'}
                  onChange={() => setStatus('DRAFT')}
                />
                <span style={{ fontWeight: 600, color: '#d97706' }}>DRAFT</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>(Pending review)</span>
              </label>
            </div>
          </div>

          {/* Auto Extract Checkbox */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0' }}>
            <input
              type="checkbox"
              id="autoExtract"
              checked={autoExtract}
              onChange={(e) => setAutoExtract(e.target.checked)}
              style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
            />
            <label htmlFor="autoExtract" style={{ fontSize: '0.8125rem', color: '#334155', cursor: 'pointer' }}>
              <strong>Automatically extract requirements</strong> from the document via Gemini AI
            </label>
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
              disabled={isSubmitting || uploadingPdf}
              style={{
                padding: '0.5rem 1.25rem',
                backgroundColor: '#16a34a',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#ffffff',
                cursor: isSubmitting || uploadingPdf ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || uploadingPdf ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {isSubmitting || uploadingPdf ? (
                <>
                  <svg className="animate-spin" style={{ width: '1rem', height: '1rem' }} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" className="opacity-75" />
                  </svg>
                  Processing Version {nextVersionNumber}...
                </>
              ) : (
                `Create Version ${nextVersionNumber}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
