import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Documents' };

export default function DocumentsPage() {
  return (
    <>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Documents</h1>
        <p className="page-subtitle">
          Upload and manage policy documents for AI extraction.
        </p>
      </div>

      <div className="placeholder-state">
        <svg className="placeholder-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="placeholder-title">No documents yet</p>
        <p className="placeholder-desc">
          Document upload and AI extraction will be implemented in the next phase.
        </p>
      </div>
    </>
  );
}
