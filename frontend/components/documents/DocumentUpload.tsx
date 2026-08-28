'use client';

import React, { useState, useRef } from 'react';
import { api, ApiError } from '@/lib/api';
import type { DocumentWithDetails, DocumentUploadResponse } from '@/types';

interface DocumentUploadProps {
  onUploadSuccess?: (document: DocumentWithDetails) => void;
}

export function DocumentUpload({ onUploadSuccess }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<DocumentUploadResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File | null) => {
    setError(null);
    setSuccess(null);

    if (!selectedFile) return;

    // Validate PDF MIME type and extension
    const isPdf =
      selectedFile.type === 'application/pdf' ||
      selectedFile.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      setError('Invalid file type. Please select a valid PDF document (.pdf).');
      setFile(null);
      return;
    }

    // Validate size (max 25MB)
    const MAX_SIZE = 25 * 1024 * 1024;
    if (selectedFile.size > MAX_SIZE) {
      setError('File is too large. Maximum allowed size is 25MB.');
      setFile(null);
      return;
    }

    setFile(selectedFile);
    // Pre-fill title with original name minus extension
    const autoTitle = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    setTitle(autoTitle);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a PDF file before uploading.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (title.trim()) {
        formData.append('title', title.trim());
      }

      const result = await api.upload<DocumentUploadResponse>(
        '/documents/upload',
        formData,
      );

      setSuccess(result);
      setFile(null);
      setTitle('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      if (onUploadSuccess) {
        onUploadSuccess(result);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Upload failed: ${err.message}`);
      } else {
        setError('An unexpected error occurred during upload. Please check your connection.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 0.25rem', color: 'var(--color-text)' }}>
            Upload Policy Document
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0 }}>
            Select a policy PDF to upload, store remotely, and extract page-by-page text.
          </p>
        </div>
      </div>

      {/* Success Alert */}
      {success && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            padding: '1rem',
            borderRadius: '0.5rem',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            color: '#166534',
            marginBottom: '1.25rem',
          }}
        >
          <svg style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0, marginTop: '0.125rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Document uploaded and extracted successfully!</div>
            <div style={{ fontSize: '0.8125rem', marginTop: '0.25rem', color: '#15803d' }}>
              <strong>{success.title}</strong> — {success.totalPages || success.pages?.length || 1} pages extracted.
            </div>
            {success.storageUrl && (
              <div style={{ marginTop: '0.5rem' }}>
                {!success.storageUrl.includes('/documents/dev-preview/') ? (
                  <a
                    href={success.storageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.75rem',
                      color: '#15803d',
                      textDecoration: 'underline',
                      fontWeight: 500,
                    }}
                  >
                    View stored PDF file ↗
                  </a>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: '#15803d' }}>
                    Stored in local database (dev mode fallback)
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSuccess(null)}
            style={{ background: 'none', border: 'none', color: '#166534', cursor: 'pointer', padding: '0.25rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            padding: '1rem',
            borderRadius: '0.5rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            marginBottom: '1.25rem',
          }}
        >
          <svg style={{ width: '1.25rem', height: '1.25rem', flexShrink: 0, marginTop: '0.125rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div style={{ flex: 1, fontSize: '0.875rem' }}>{error}</div>
          <button
            type="button"
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', padding: '0.25rem' }}
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleUpload}>
        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !file && fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? 'var(--color-primary)' : 'var(--color-border)'}`,
            backgroundColor: isDragging ? '#eff6ff' : '#f8fafc',
            borderRadius: '0.625rem',
            padding: file ? '1.5rem' : '2.5rem 1.5rem',
            textAlign: 'center',
            cursor: file ? 'default' : 'pointer',
            transition: 'all 0.2s ease',
            marginBottom: '1.25rem',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
            style={{ display: 'none' }}
          />

          {!file ? (
            <div>
              <div
                style={{
                  width: '3.5rem',
                  height: '3.5rem',
                  borderRadius: '50%',
                  backgroundColor: '#e0e7ff',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}
              >
                <svg style={{ width: '1.75rem', height: '1.75rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text)', margin: '0 0 0.375rem' }}>
                Drag and drop your PDF policy here, or <span style={{ color: 'var(--color-primary)' }}>browse</span>
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>
                Supports standard PDF files up to 25MB
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div
                  style={{
                    width: '2.75rem',
                    height: '2.75rem',
                    borderRadius: '0.5rem',
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                  }}
                >
                  PDF
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--color-text)' }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
                    {formatFileSize(file.size)} • Ready for extraction
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setTitle('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid var(--color-border)',
                  borderRadius: '0.375rem',
                  padding: '0.375rem 0.75rem',
                  fontSize: '0.8125rem',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                }}
              >
                Change File
              </button>
            </div>
          )}
        </div>

        {/* Document Title Input */}
        {file && (
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="document-title"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-text)',
                marginBottom: '0.375rem',
              }}
            >
              Document Title
            </label>
            <input
              id="document-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Employee Remote Work Policy 2026"
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                borderRadius: '0.375rem',
                border: '1px solid var(--color-border)',
                fontSize: '0.875rem',
                color: 'var(--color-text)',
                backgroundColor: '#ffffff',
                outline: 'none',
              }}
            />
          </div>
        )}

        {/* Upload Action Button */}
        {file && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setTitle('');
              }}
              disabled={isUploading}
              style={{
                padding: '0.625rem 1.125rem',
                borderRadius: '0.375rem',
                border: '1px solid var(--color-border)',
                backgroundColor: '#ffffff',
                color: 'var(--color-text)',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: isUploading ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.25rem',
                borderRadius: '0.375rem',
                border: 'none',
                backgroundColor: isUploading ? '#93c5fd' : 'var(--color-primary)',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: isUploading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s',
              }}
            >
              {isUploading ? (
                <>
                  <svg
                    style={{
                      width: '1rem',
                      height: '1rem',
                      animation: 'spin 1s linear infinite',
                    }}
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      style={{ opacity: 0.25 }}
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      style={{ opacity: 0.75 }}
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Uploading & Extracting Text...
                </>
              ) : (
                <>
                  <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Upload & Process PDF
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
