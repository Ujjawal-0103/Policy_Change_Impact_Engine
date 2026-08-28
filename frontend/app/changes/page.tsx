import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Policy Changes' };

export default function ChangesPage() {
  return (
    <>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Policy Changes</h1>
        <p className="page-subtitle">
          Detected changes between policy versions.
        </p>
      </div>

      <div className="placeholder-state">
        <svg className="placeholder-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <p className="placeholder-title">No changes detected</p>
        <p className="placeholder-desc">
          Policy comparison and change detection will be implemented after versioning is set up.
        </p>
      </div>
    </>
  );
}
