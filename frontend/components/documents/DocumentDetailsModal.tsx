'use client';

import React, { useState, useEffect } from 'react';
import { api, ApiError } from '@/lib/api';
import type { DocumentWithDetails } from '@/types';

interface DocumentDetailsModalProps {
  documentId: string | null;
  onClose: () => void;
}

export function DocumentDetailsModal({ documentId, onClose }: DocumentDetailsModalProps) {
  const [document, setDocument] = useState<DocumentWithDetails | null>(null);
  const [selectedPageNumber, setSelectedPageNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!documentId) return;

    let isMounted = true;

    api.get<DocumentWithDetails>(`/documents/${documentId}`)
      .then((data) => {
        if (isMounted) {
          setDocument(data);
          setSelectedPageNumber(1);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof ApiError ? err.message : 'Failed to load document details.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [documentId]);

  if (!documentId) return null;

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
          maxWidth: '850px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                {document?.title || 'Document Details'}
              </h3>
              <span className="badge badge-green">Uploaded</span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>
              {document?.originalName} • Uploaded {formatDate(document?.createdAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '0.375rem',
              width: '2rem',
              height: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-muted)' }}>
              <div style={{ fontSize: '0.9375rem', fontWeight: 500 }}>Loading document details...</div>
            </div>
          )}

          {error && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                padding: '1rem',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
              }}
            >
              {error}
            </div>
          )}

          {!isLoading && document && (
            <div>
              {/* Metadata Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '0.75rem',
                  padding: '1rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--color-border)',
                  marginBottom: '1.5rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Document ID
                  </div>
                  <div style={{ fontSize: '0.8125rem', fontFamily: 'monospace', marginTop: '0.125rem', color: 'var(--color-text)' }}>
                    {document.id}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Total Pages
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: '0.125rem', color: 'var(--color-text)' }}>
                    {pages.length} Pages Extracted
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    MIME Type
                  </div>
                  <div style={{ fontSize: '0.8125rem', marginTop: '0.125rem', color: 'var(--color-text)' }}>
                    {document.mimeType}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                    Storage URL
                  </div>
                  <div style={{ fontSize: '0.8125rem', marginTop: '0.125rem' }}>
                    {document.storageUrl && !document.storageUrl.includes('/documents/dev-preview/') ? (
                      <a
                        href={document.storageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
                      >
                        Open PDF Link ↗
                      </a>
                    ) : document.storageUrl?.includes('/documents/dev-preview/') ? (
                      <span
                        style={{
                          display: 'inline-block',
                          color: '#b45309',
                          backgroundColor: '#fef3c7',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                        }}
                        title="Document was uploaded before Cloudinary was configured. Extracted text is fully preserved."
                      >
                        Local Dev Fallback (No Cloud PDF)
                      </span>
                    ) : (
                      '—'
                    )}
                  </div>
                </div>
              </div>

              {/* Page-Aware Text Extraction Viewer */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0, color: 'var(--color-text)' }}>
                    Page-Aware Extracted Text
                  </h4>
                  {currentPage && (
                    <button
                      type="button"
                      onClick={handleCopy}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        fontSize: '0.75rem',
                        padding: '0.3125rem 0.625rem',
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

                {/* Page Navigation Pills */}
                {pages.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '0.375rem',
                      overflowX: 'auto',
                      paddingBottom: '0.5rem',
                      marginBottom: '0.75rem',
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
                            padding: '0.375rem 0.75rem',
                            borderRadius: '0.375rem',
                            border: '1px solid',
                            borderColor: isActive ? 'var(--color-primary)' : 'var(--color-border)',
                            backgroundColor: isActive ? '#eff6ff' : '#ffffff',
                            color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                            fontWeight: isActive ? 600 : 500,
                            fontSize: '0.8125rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s',
                          }}
                        >
                          Page {p.pageNumber}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Page Text Content Box */}
                {currentPage ? (
                  <div
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: '0.5rem',
                      backgroundColor: '#f8fafc',
                      padding: '1.25rem',
                      minHeight: '220px',
                      maxHeight: '340px',
                      overflowY: 'auto',
                      fontSize: '0.875rem',
                      lineHeight: '1.6',
                      color: 'var(--color-text)',
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'inherit',
                    }}
                  >
                    {currentPage.content ? (
                      currentPage.content
                    ) : (
                      <em style={{ color: 'var(--color-text-muted)' }}>
                        No text detected on Page {currentPage.pageNumber} (scanned page or image-only).
                      </em>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '2rem',
                      textAlign: 'center',
                      color: 'var(--color-text-muted)',
                      border: '1px dashed var(--color-border)',
                      borderRadius: '0.5rem',
                    }}
                  >
                    No pages available for this document.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--color-border)',
            backgroundColor: '#f8fafc',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: '1px solid var(--color-border)',
              backgroundColor: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
