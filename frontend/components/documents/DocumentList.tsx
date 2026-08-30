'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { Document, DocumentAnalysisResponse } from '@/types';
import { api, ApiError } from '@/lib/api';
import { DocumentAnalysisModal } from './DocumentAnalysisModal';

interface DocumentListProps {
  documents: Document[];
  isLoading: boolean;
  onSelectDocument: (id: string) => void;
  onRefresh: () => void;
}

export function DocumentList({
  documents,
  isLoading,
  onSelectDocument,
  onRefresh,
}: DocumentListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [analyzingDocId, setAnalyzingDocId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysisResponse | null>(null);
  const [analysisError, setAnalysisError] = useState<{ docId: string; message: string } | null>(null);

  const filteredDocuments = documents.filter((doc) => {
    const term = searchTerm.toLowerCase();
    return (
      doc.title.toLowerCase().includes(term) ||
      doc.originalName.toLowerCase().includes(term)
    );
  });

  const handleAnalyze = async (doc: Document) => {
    setAnalyzingDocId(doc.id);
    setAnalysisError(null);
    try {
      const data = await api.post<DocumentAnalysisResponse>(`/documents/${doc.id}/analyze`);
      setAnalysisResult(data);
    } catch (err) {
      setAnalysisError({
        docId: doc.id,
        message:
          err instanceof ApiError
            ? err.message
            : 'AI analysis request failed. Please verify that the Gemini API key is configured in the backend.',
      });
    } finally {
      setAnalyzingDocId(null);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <div className="card">
        {/* List Header & Controls */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1.25rem',
          }}
        >
          <div>
            <h3
              style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: 'var(--color-text)',
                margin: '0 0 0.25rem',
              }}
            >
              Uploaded Documents ({documents.length})
            </h3>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-muted)',
                margin: 0,
              }}
            >
              Manage policy PDFs, extract structured requirements with Gemini AI, and inspect page text.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            {/* Search bar */}
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '0.4375rem 0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid var(--color-border)',
                fontSize: '0.8125rem',
                outline: 'none',
                minWidth: '180px',
              }}
            />

            {/* Refresh Button */}
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading || Boolean(analyzingDocId)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.4375rem 0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid var(--color-border)',
                background: '#ffffff',
                fontSize: '0.8125rem',
                fontWeight: 500,
                cursor: isLoading || Boolean(analyzingDocId) ? 'not-allowed' : 'pointer',
                color: 'var(--color-text)',
              }}
            >
              <svg
                style={{
                  width: '0.875rem',
                  height: '0.875rem',
                  animation: isLoading ? 'spin 1s linear infinite' : 'none',
                }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* AI Analysis Error Alert */}
        {analysisError && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '0.75rem 1rem',
              borderRadius: '0.375rem',
              fontSize: '0.8125rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
            }}
          >
            <span>
              <strong>Analysis Error:</strong> {analysisError.message}
            </span>
            <button
              type="button"
              onClick={() => setAnalysisError(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#991b1b',
                cursor: 'pointer',
                fontWeight: 700,
                padding: '0.125rem 0.375rem',
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-muted)' }}>
            <div style={{ fontSize: '0.875rem' }}>Loading documents from engine...</div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && documents.length === 0 && (
          <div className="placeholder-state" style={{ padding: '3rem 1.5rem' }}>
            <svg className="placeholder-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="placeholder-title">No documents uploaded yet</p>
            <p className="placeholder-desc">
              Upload your first policy PDF above to see it appear here with extracted text.
            </p>
          </div>
        )}

        {/* Document Table */}
        {!isLoading && documents.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: '#f8fafc' }}>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Document Title
                  </th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Status
                  </th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Pages
                  </th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Upload Date
                  </th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                      No documents matching &quot;{searchTerm}&quot;
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc) => {
                    const isAnalyzing = analyzingDocId === doc.id;

                    return (
                      <tr
                        key={doc.id}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          transition: 'background-color 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)' }}>
                            {doc.title}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
                            {doc.originalName}
                          </div>
                          {doc.policyVersions && doc.policyVersions.length > 0 && doc.policyVersions[0]?.policy && (
                            <div style={{ marginTop: '0.375rem' }}>
                              <Link
                                href={`/policies?policyId=${doc.policyVersions[0].policyId}`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: '0.6875rem',
                                  fontWeight: 600,
                                  color: '#2563eb',
                                  backgroundColor: '#eff6ff',
                                  border: '1px solid #bfdbfe',
                                  borderRadius: '0.25rem',
                                  padding: '0.125rem 0.375rem',
                                  textDecoration: 'none',
                                }}
                              >
                                🏛️ {doc.policyVersions[0].policy.name} (v{doc.policyVersions[0].versionNumber}) ↗
                              </Link>
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span className="badge badge-green">Uploaded</span>
                        </td>

                        <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--color-text)' }}>
                          <span
                            style={{
                              backgroundColor: '#f1f5f9',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '0.25rem',
                              fontWeight: 500,
                            }}
                          >
                            {doc.pageCount ?? 1} {doc.pageCount === 1 ? 'page' : 'pages'}
                          </span>
                        </td>

                        <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                          {formatDate(doc.createdAt)}
                        </td>

                        <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            {/* Analyze with AI Button */}
                            <button
                              type="button"
                              onClick={() => handleAnalyze(doc)}
                              disabled={Boolean(analyzingDocId)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                padding: '0.375rem 0.75rem',
                                borderRadius: '0.375rem',
                                border: '1px solid #2563eb',
                                backgroundColor: isAnalyzing ? '#eff6ff' : '#2563eb',
                                color: isAnalyzing ? '#2563eb' : '#ffffff',
                                fontSize: '0.8125rem',
                                fontWeight: 600,
                                cursor: analyzingDocId ? 'not-allowed' : 'pointer',
                                opacity: analyzingDocId && !isAnalyzing ? 0.6 : 1,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {isAnalyzing ? (
                                <>
                                  <svg
                                    style={{
                                      width: '0.875rem',
                                      height: '0.875rem',
                                      animation: 'spin 1s linear infinite',
                                    }}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    />
                                  </svg>
                                  Analyzing with Gemini AI...
                                </>
                              ) : (
                                <>
                                  <svg style={{ width: '0.875rem', height: '0.875rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                  Analyze with AI
                                </>
                              )}
                            </button>

                            {/* View Details & Text Button */}
                            <button
                              type="button"
                              onClick={() => onSelectDocument(doc.id)}
                              disabled={Boolean(analyzingDocId)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.375rem 0.75rem',
                                borderRadius: '0.375rem',
                                border: '1px solid var(--color-border)',
                                backgroundColor: '#ffffff',
                                color: 'var(--color-text)',
                                fontSize: '0.8125rem',
                                fontWeight: 500,
                                cursor: analyzingDocId ? 'not-allowed' : 'pointer',
                              }}
                            >
                              View Details & Text
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AI Extraction Analysis Results Modal */}
      <DocumentAnalysisModal
        analysis={analysisResult}
        onClose={() => setAnalysisResult(null)}
      />
    </>
  );
}
