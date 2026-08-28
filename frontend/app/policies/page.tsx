import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Policies' };

export default function PoliciesPage() {
  return (
    <>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Policies</h1>
        <p className="page-subtitle">
          Manage policy sets and track versions over time.
        </p>
      </div>

      <div className="placeholder-state">
        <svg className="placeholder-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <p className="placeholder-title">No policies yet</p>
        <p className="placeholder-desc">
          Policy management and version tracking will be implemented after document upload.
        </p>
      </div>
    </>
  );
}
