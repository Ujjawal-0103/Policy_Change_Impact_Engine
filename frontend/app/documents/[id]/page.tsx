'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import type { DocumentWithDetails } from '@/types';
import Link from 'next/link';

export default function DocumentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [document, setDocument] = useState<DocumentWithDetails | null>(null);
  const [selectedPageNumber, setSelectedPageNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    let isCancelled = false;

    api.get<DocumentWithDetails>(`/documents/${id}`)
      .then((data) => {
        if (!isCancelled) {
          setDocument(data);
          setSelectedPageNumber(1);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setError(err instanceof ApiError ? err.message : 'Failed to load document details.');
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [id]);

  const pages = document?.pages ?? [];
  const currentPage = pages.find((p) => p.pageNumber === selectedPageNumber) || pages[0];

  const handleCopy = () => {
    if (currentPage?.content) {
      navigator.clipboard.writeText(currentPage.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      {/* Back button */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href="/documents"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            fontSize: '0.875rem',
            color: 'var(--color-text-muted)',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          ← Back to Documents
        </Link>
      </div>

      {isLoading && (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--color-text-muted)' }}>
          <div>Loading document details & extracted text...</div>
        </div>
      )}

      {error && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '1.25rem',
            borderRadius: '0.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ fontWeight: 600 }}>Error loading document</div>
          <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>{error}</div>
          <button
            type="button"
            onClick={() => router.push('/documents')}
            style={{
              marginTop: '0.75rem',
              padding: '0.375rem 0.75rem',
              borderRadius: '0.375rem',
              border: '1px solid #fca5a5',
              background: '#ffffff',
              color: '#991b1b',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              fontWeight: 500,
            }}
          >
            Return to documents list
          </button>
        </div>
      )}

      {!isLoading && document && (
        <>
          {/* Document Header Card */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem' }}>
                  <h1 className="page-title" style={{ margin: 0, fontSize: '1.375rem' }}>
                    {document.title}
                  </h1>
                  <span className="badge badge-green">Uploaded</span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0 }}>
                  Original: <strong>{document.originalName}</strong> • Uploaded {formatDate(document.createdAt)}
                </p>
              </div>

              {document.storageUrl && !document.storageUrl.includes('/documents/dev-preview/') ? (
                <a
                  href={document.storageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.5rem 0.875rem',
                    borderRadius: '0.375rem',
                    border: '1px solid var(--color-border)',
                    backgroundColor: '#ffffff',
                    color: 'var(--color-text)',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    textDecoration: 'none',
                  }}
                >
                  <svg style={{ width: '0.875rem', height: '0.875rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View Cloudinary PDF ↗
                </a>
              ) : document.storageUrl?.includes('/documents/dev-preview/') ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.5rem 0.875rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #fde68a',
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                  }}
                  title="Document was uploaded before Cloudinary was configured. Extracted text is stored in the database."
                >
                  Dev Mode Document (No Cloud PDF)
                </span>
              ) : null}
            </div>

            {/* Metadata Badges */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '0.75rem',
                marginTop: '1.25rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid var(--color-border)',
              }}
            >
              <div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  Total Pages
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: '0.125rem' }}>
                  {pages.length} Pages Extracted
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  MIME Type
                </div>
                <div style={{ fontSize: '0.8125rem', marginTop: '0.125rem' }}>
                  {document.mimeType}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  Document ID
                </div>
                <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', marginTop: '0.125rem', color: 'var(--color-text-muted)' }}>
                  {document.id}
                </div>
              </div>
            </div>

            {/* Document -> Policy Provenance Section */}
            {document.policyVersions && document.policyVersions.length > 0 && (
              <div
                style={{
                  marginTop: '1.25rem',
                  padding: '1rem 1.25rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '0.5rem',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span>🔗</span> Document & Policy Provenance
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {document.policyVersions.map((pv) => (
                    <div
                      key={pv.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                        padding: '0.625rem 0.875rem',
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '0.375rem',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                          {pv.policy?.name || 'Linked Policy'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>
                          Version {pv.versionNumber} • Status: <span style={{ fontWeight: 600, color: pv.status === 'ACTIVE' ? '#166534' : '#64748b' }}>{pv.status}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <Link
                          href={`/policies?policyId=${pv.policyId}`}
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.3125rem 0.625rem',
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            borderRadius: '0.25rem',
                            textDecoration: 'none',
                            border: '1px solid #bfdbfe',
                          }}
                        >
                          Open Policy ➔
                        </Link>
                        <Link
                          href={`/changes?policyId=${pv.policyId}`}
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.3125rem 0.625rem',
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                            borderRadius: '0.25rem',
                            textDecoration: 'none',
                            border: '1px solid #cbd5e1',
                          }}
                        >
                          Compare Version ➔
                        </Link>
                        <Link
                          href={`/impact?policyId=${pv.policyId}`}
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.3125rem 0.625rem',
                            backgroundColor: '#fef2f2',
                            color: '#991b1b',
                            borderRadius: '0.25rem',
                            textDecoration: 'none',
                            border: '1px solid #fecaca',
                          }}
                        >
                          View Impacts ➔
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Extracted Page Text Section */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 0.25rem', color: 'var(--color-text)' }}>
                  Page-Aware Extracted Text
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: 0 }}>
                  Viewing text extracted from Page {selectedPageNumber} of {pages.length}
                </p>
              </div>

              {currentPage && (
                <button
                  type="button"
                  onClick={handleCopy}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    fontSize: '0.8125rem',
                    padding: '0.4375rem 0.75rem',
                    borderRadius: '0.375rem',
                    border: '1px solid var(--color-border)',
                    background: '#ffffff',
                    cursor: 'pointer',
                    color: 'var(--color-text)',
                  }}
                >
                  {copied ? '✓ Copied!' : '📋 Copy Page Text'}
                </button>
              )}
            </div>

            {/* Page selection pills */}
            {pages.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: '0.375rem',
                  overflowX: 'auto',
                  paddingBottom: '0.75rem',
                  marginBottom: '1rem',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                {pages.map((p) => {
                  const isActive = p.pageNumber === selectedPageNumber;
                  return (
                    <button
                      key={p.pageNumber}
                      type="button"
                      onClick={() => setSelectedPageNumber(p.pageNumber)}
                      style={{
                        padding: '0.375rem 0.875rem',
                        borderRadius: '0.375rem',
                        border: '1px solid',
                        borderColor: isActive ? 'var(--color-primary)' : 'var(--color-border)',
                        backgroundColor: isActive ? '#eff6ff' : '#ffffff',
                        color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        fontWeight: isActive ? 600 : 500,
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Page {p.pageNumber}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Page Content Display */}
            {currentPage ? (
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid var(--color-border)',
                  borderRadius: '0.5rem',
                  padding: '1.5rem',
                  fontSize: '0.875rem',
                  lineHeight: '1.7',
                  color: 'var(--color-text)',
                  whiteSpace: 'pre-wrap',
                  minHeight: '280px',
                }}
              >
                {currentPage.content || (
                  <em style={{ color: 'var(--color-text-muted)' }}>
                    No readable text extracted for Page {currentPage.pageNumber}.
                  </em>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
                No pages extracted for this document.
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
