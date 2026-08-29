'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import type { Evidence } from '@/types';

interface EvidenceUploadModalProps {
  isOpen: boolean;
  actionId: string;
  actionTitle: string;
  onClose: () => void;
  onSuccess: (evidence: Evidence) => void;
}

export function EvidenceUploadModal({
  isOpen,
  actionId,
  actionTitle,
  onClose,
  onSuccess,
}: EvidenceUploadModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState('');
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Evidence title is required.');
      return;
    }
    if (uploadMode === 'file' && !file) {
      setError('Please select an evidence file to upload.');
      return;
    }
    if (uploadMode === 'url' && !fileUrl.trim()) {
      setError('Please enter a valid file URL.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let createdEvidence: Evidence;

      if (uploadMode === 'file' && file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title.trim());
        if (description.trim()) {
          formData.append('description', description.trim());
        }

        createdEvidence = await api.upload<Evidence>(
          `/actions/${actionId}/evidence`,
          formData,
        );
      } else {
        createdEvidence = await api.post<Evidence>(
          `/actions/${actionId}/evidence`,
          {
            title: title.trim(),
            description: description.trim() || undefined,
            fileUrl: fileUrl.trim() || undefined,
          },
        );
      }

      onSuccess(createdEvidence);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to attach evidence.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '0.75rem',
          maxWidth: '520px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
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
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Attach Compliance Evidence
            </h2>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0.25rem 0 0' }}>
              Action: &quot;{actionTitle}&quot;
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '0.375rem',
            }}
          >
            <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
          {error && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '0.375rem',
                padding: '0.75rem 1rem',
                color: '#991b1b',
                fontSize: '0.875rem',
              }}
            >
              {error}
            </div>
          )}

          {/* Mode Switcher */}
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setUploadMode('file')}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: '0.375rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: uploadMode === 'file' ? '#eff6ff' : 'transparent',
                color: uploadMode === 'file' ? '#2563eb' : '#64748b',
              }}
            >
              📁 File Upload (Cloudinary)
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('url')}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: '0.375rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: uploadMode === 'url' ? '#eff6ff' : 'transparent',
                color: uploadMode === 'url' ? '#2563eb' : '#64748b',
              }}
            >
              🔗 URL / External Link
            </button>
          </div>

          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
              Evidence Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. MFA Deployment Audit Report Q3"
              required
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
              }}
            />
          </div>

          {/* File Input or URL Input */}
          {uploadMode === 'file' ? (
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                Upload File (PDF, Image, Document) *
              </label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required={uploadMode === 'file'}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px dashed #94a3b8',
                  borderRadius: '0.375rem',
                  fontSize: '0.8125rem',
                  backgroundColor: '#f8fafc',
                }}
              />
              {file && (
                <p style={{ fontSize: '0.75rem', color: '#16a34a', margin: '0.25rem 0 0', fontWeight: 500 }}>
                  ✓ Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
                Evidence File URL *
              </label>
              <input
                type="url"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://..."
                required={uploadMode === 'url'}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.75rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                }}
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#334155', marginBottom: '0.375rem' }}>
              Description / Audit Proof Summary
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Verified 100% MFA enrollment across 450 admin accounts."
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '0.5rem',
              borderTop: '1px solid #e2e8f0',
              paddingTop: '1rem',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '0.5rem 1.25rem',
                backgroundColor: '#2563eb',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#ffffff',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Uploading Evidence...' : 'Attach Evidence'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
