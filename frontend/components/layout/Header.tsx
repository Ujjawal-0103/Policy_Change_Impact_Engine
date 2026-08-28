interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="app-header">
      <h1 style={{
        fontSize: '1rem',
        fontWeight: 600,
        color: 'var(--color-text)',
        margin: 0,
        flex: 1,
      }}>
        {title}
      </h1>

      {/* Future: user avatar / org switcher will go here */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
      }}>
        <div style={{
          width: '2rem', height: '2rem', borderRadius: '9999px',
          background: '#e2e8f0', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600,
          color: 'var(--color-text-muted)',
        }}>
          U
        </div>
      </div>
    </header>
  );
}
