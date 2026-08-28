import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Actions' };

export default function ActionsPage() {
  return (
    <>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Actions</h1>
        <p className="page-subtitle">
          Track compliance actions, owners, deadlines, and evidence.
        </p>
      </div>

      <div className="placeholder-state">
        <svg className="placeholder-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <p className="placeholder-title">No actions yet</p>
        <p className="placeholder-desc">
          Actions will be generated automatically from extracted policy requirements.
        </p>
      </div>
    </>
  );
}
