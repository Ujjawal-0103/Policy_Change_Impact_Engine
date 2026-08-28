'use client';

import React, { useState, useEffect } from 'react';
import { api, ApiError } from '@/lib/api';
import type { Document, DocumentWithDetails } from '@/types';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { DocumentList } from '@/components/documents/DocumentList';
import { DocumentDetailsModal } from '@/components/documents/DocumentDetailsModal';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const fetchDocuments = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await api.get<Document[]>('/documents');
      setDocuments(data);
    } catch (err) {
      setFetchError(
        err instanceof ApiError ? err.message : 'Could not fetch documents from the backend engine.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;

    api.get<Document[]>('/documents')
      .then((data) => {
        if (!isCancelled) {
          setDocuments(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setFetchError(
            err instanceof ApiError ? err.message : 'Could not fetch documents from the backend engine.',
          );
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleUploadSuccess = (newDoc: DocumentWithDetails) => {
    // Prepend newly uploaded document and re-sync
    setDocuments((prev) => [
      {
        ...newDoc,
        pageCount: newDoc.totalPages || newDoc.pages?.length || 1,
      },
      ...prev.filter((d) => d.id !== newDoc.id),
    ]);
  };

  return (
    <>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Document Management</h1>
        <p className="page-subtitle">
          Upload policy PDFs, validate contents, and extract page-aware text for downstream compliance mapping.
        </p>
      </div>

      {fetchError && (
        <div
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#92400e',
            padding: '0.875rem 1.25rem',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>Note: Backend is currently unreachable or disconnected. ({fetchError})</span>
          <button
            type="button"
            onClick={fetchDocuments}
            style={{
              background: '#ffffff',
              border: '1px solid #fde68a',
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

      {/* Upload Component */}
      <DocumentUpload onUploadSuccess={handleUploadSuccess} />

      {/* Document List Component */}
      <DocumentList
        documents={documents}
        isLoading={isLoading}
        onSelectDocument={(id) => setSelectedDocId(id)}
        onRefresh={fetchDocuments}
      />

      {/* Modal for Document Details & Extracted Text */}
      <DocumentDetailsModal
        documentId={selectedDocId}
        onClose={() => setSelectedDocId(null)}
      />
    </>
  );
}
