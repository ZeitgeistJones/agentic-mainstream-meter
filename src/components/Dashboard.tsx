function LaneCard({ lane }: { lane: LaneResult }) {
  const meta = LANE_META[lane.id]
  const weight = Math.round((LANE_WEIGHTS[lane.id] ?? 0) * 100)
  const isError = lane.status === 'error'

  return (
    <article style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.875rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600 }}>{meta?.icon}</span>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{lane.label}</span>
        </div>
        <span style={{
          fontSize: '0.7rem',
          background: 'var(--border)',
          color: 'var(--text-muted)',
          padding: '0.2rem 0.5rem',
          borderRadius: '999px',
          whiteSpace: 'nowrap',
          fontWeight: 500,
          letterSpacing: '0.04em',
        }}>{weight}% weight</span>
      </div>

      {/* Score bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
          <span style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontStyle: 'italic', color: isError ? 'var(--text-faint)' : 'var(--text)' }}>
            {isError ? '—' : lane.score}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{lane.rawLabel}</span>
        </div>
        <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${isError ? 0 : lane.score}%`,
            background: isError ? 'var(--text-faint)' : 'var(--accent)',
            borderRadius: 2,
            transition: 'width 0.8s ease',
          }} />
        </div>
      </div>

      {/* Source + freshness */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
        
          href={lane.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: '0.72rem', color: 'var(--accent)', textDecoration: 'none' }}
        >
          {lane.sourceUrl.replace('https://', '').split('/')[0]} ↗
        </a>
        <span style={{ fontSize: '0.7rem', color: lane.status === 'error' ? 'var(--error)' : 'var(--text-faint)' }}>
          {lane.status === 'error' ? `Error: ${lane.error?.slice(0, 40)}` : `Updated ${formatRelative(lane.freshAt)}`}
        </span>
      </div>

      {/* Methodology note */}
      {meta && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--success)', fontWeight: 600 }}>Measures:</span> {meta.measures}
          </p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--text-faint)', fontWeight: 600 }}>Not:</span> {meta.doesNotMeasure}
          </p>
        </div>
      )}

      {/* Tracked sources */}
      {lane.examples && lane.examples.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginBottom: '0.3rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tracked sources</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {lane.examples.join(' · ')}
          </p>
        </div>
      )}
    </article>
  )
}
