import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
};

const stats = [
  { label: 'Documents', value: '—', description: 'Policy documents uploaded' },
  { label: 'Policies', value: '—', description: 'Active policy sets' },
  { label: 'Open Actions', value: '—', description: 'Pending compliance actions' },
  { label: 'Changes Detected', value: '—', description: 'Unresolved policy changes' },
];

export default function DashboardPage() {
  return (
    <>
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          Overview of your policy compliance status.
        </p>
      </div>

      {/* Summary stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {stats.map((s) => (
          <div key={s.label} className="card">
            <div style={{
              fontSize: '2rem', fontWeight: 700,
              color: 'var(--color-text)', letterSpacing: '-0.03em',
              lineHeight: 1,
            }}>
              {s.value}
            </div>
            <div style={{
              fontSize: '0.9375rem', fontWeight: 600,
              color: 'var(--color-text)', marginTop: '0.5rem',
            }}>
              {s.label}
            </div>
            <div style={{
              fontSize: '0.8125rem', color: 'var(--color-text-muted)',
              marginTop: '0.25rem',
            }}>
              {s.description}
            </div>
          </div>
        ))}
      </div>

      {/* Product loop reminder */}
      <div className="card" style={{ borderStyle: 'dashed' }}>
        <div style={{
          fontSize: '0.75rem', fontWeight: 600,
          color: 'var(--color-text-muted)', textTransform: 'uppercase',
          letterSpacing: '0.08em', marginBottom: '1rem',
        }}>
          Product Loop
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          {[
            'Upload Policy',
            'Extract Requirements',
            'Create Actions',
            'Track Owners & Deadlines',
            'Upload New Version',
            'Detect Changes',
            'Map Impact',
            'Update Work',
          ].map((step, i, arr) => (
            <span key={step} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                fontSize: '0.8125rem', fontWeight: 500,
                color: 'var(--color-text)',
                background: '#f1f5f9', padding: '0.25rem 0.625rem',
                borderRadius: '0.25rem',
              }}>
                {step}
              </span>
              {i < arr.length - 1 && (
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>→</span>
              )}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
