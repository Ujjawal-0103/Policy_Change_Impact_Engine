import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Impact View' };

export default function ImpactPage() {
  return (
    <>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Impact View</h1>
        <p className="page-subtitle">
          Map detected policy changes to affected workflows and actions.
        </p>
      </div>

      <div className="placeholder-state">
        <svg className="placeholder-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <p className="placeholder-title">No impact data yet</p>
        <p className="placeholder-desc">
          The impact mapping engine will be implemented after change detection is in place.
        </p>
      </div>
    </>
  );
}
