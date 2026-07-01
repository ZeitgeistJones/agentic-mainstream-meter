'use client'

import { useState } from 'react'
import type { CompositeScore, LaneResult } from '@/types'
import { LANE_WEIGHTS } from '@/lib/scoring'

const ANCHORS = [
  { label: 'LLMs at this stage', score: 41, year: 2022 },
  { label: 'Blockchain peak', score: 72, year: 2021 },
  { label: 'Smartphones at mass market', score: 84, year: 2013 },
]

const LANE_META: Record<string, { icon: string; measures: string; doesNotMeasure: string }> = {
  wikipedia: {
    icon: '◎',
    measures: 'Public curiosity and information-seeking',
    doesNotMeasure: 'Actual usage, deployment, or revenue',
  },
  trends: {
    icon: '◈',
    measures: 'Mainstream AI Wikipedia pageviews as a proxy for broader public awareness',
    doesNotMeasure: 'Direct search query data or Google Trends scores',
  },
  jobs: {
    icon: '◆',
    measures: 'Number of active MCP servers indexed in the Agent Almanac — a proxy for real agentic infrastructure supply',
    doesNotMeasure: 'Actual agent usage, call volume, or revenue',
  },
  media: {
    icon: '◇',
    measures: 'Volume of mainstream press articles mentioning AI agents — a proxy for public narrative momentum',
    doesNotMeasure: 'Article sentiment, accuracy, or reach',
  },
}

function ScoreDial({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (score / 100) * circumference
  return (
    <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
      <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden>
        <circle cx="70" cy="70" r="54" fill="none" stroke="var(--border)" strokeWidth="8" />
        <circle
          cx="70" cy="70" r="54"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 2,
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2.6rem',
          lineHeight: 1,
          color: 'var(--text)',
          fontStyle: 'italic',
        }}>{score}</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>/ 100</span>
      </div>
    </div>
  )
}

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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
        <a
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

     {lane.exampleLinks && lane.exampleLinks.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-faint)', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tracked sources</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {lane.exampleLinks.map((ex, i) => (
              
                key={i}
                href={ex.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--accent)',
                  textDecoration: 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'block',
                }}
              >
                {ex.label} ↗
              </a>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}
function AnchorBadge({ label, score, year }: { label: string; score: number; year: number }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.6rem 1rem',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
    }}>
      <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.15rem', color: 'var(--text-muted)' }}>{score}</span>
      <div>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)' }}>{label}</p>
        <p style={{ fontSize: '0.68rem', color: 'var(--text-faint)' }}>{year}</p>
      </div>
    </div>
  )
}

function ThemeToggle() {
  const [dark, setDark] = useState(false)
  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
  }
  return (
    <button
      onClick={toggle}
      style={{
        background: 'none',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '0.4rem 0.7rem',
        fontSize: '0.78rem',
        color: 'var(--text-muted)',
        cursor: 'pointer',
      }}
      aria-label="Toggle theme"
    >
      {dark ? '☀' : '◑'}
    </button>
  )
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function Dashboard({ data }: { data: CompositeScore }) {
  const { score, stage, lanes, narrative, computedAt } = data
  const liveLanes = lanes.filter(l => l.status !== 'error').length

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'color-mix(in srgb, var(--bg) 90%, transparent)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 28, height: 28,
              border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius)',
              display: 'grid', placeItems: 'center',
              fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 700,
            }}>◈</div>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', letterSpacing: '-0.01em' }}>Agentic Mainstream Meter</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>Updated {formatRelative(computedAt)}</span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        <section style={{ padding: 'clamp(3rem, 7vw, 5rem) 0 3rem' }}>
          <div className="container">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '3rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-faint)', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Adoption index · {new Date(computedAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                  <h1 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
                    fontStyle: 'italic',
                    letterSpacing: '-0.03em',
                    color: 'var(--text)',
                    lineHeight: 1.05,
                  }}>
                    {stage.label}.
                  </h1>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <ScoreDial score={score} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '28ch', lineHeight: 1.55 }}>{stage.description}</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>{liveLanes} of 4 lanes live</p>
                  </div>
                </div>

                {narrative && (
                  <p style={{
                    fontSize: '0.9rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.65,
                    borderLeft: '2px solid var(--accent)',
                    paddingLeft: '1rem',
                    maxWidth: '52ch',
                  }}>
                    {narrative}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Historical anchors
                </p>
                {ANCHORS.map(a => <AnchorBadge key={a.label} {...a} />)}
                <p style={{ fontSize: '0.68rem', color: 'var(--text-faint)', lineHeight: 1.5, marginTop: '0.25rem' }}>
                  Anchors are estimated retrospective scores, not certified benchmarks.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="container"><div style={{ height: 1, background: 'var(--border)' }} /></div>

        <section style={{ padding: '3rem 0' }}>
          <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)', fontWeight: 600, marginBottom: '0.3rem' }}>Signal lanes</p>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 600, letterSpacing: '-0.02em' }}>Proxy lanes, not proof.</h2>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '44ch', lineHeight: 1.6 }}>
                Each lane measures a different signal of adoption. The composite score is a weighted blend with a freshness discount applied to stale data.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {lanes.map(lane => <LaneCard key={lane.id} lane={lane} />)}
            </div>
          </div>
        </section>

        <div className="container"><div style={{ height: 1, background: 'var(--border)' }} /></div>

        <section style={{ padding: '3rem 0' }}>
          <div className="container" style={{ maxWidth: 720 }}>
            <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-faint)', fontWeight: 600, marginBottom: '0.75rem' }}>Methodology</p>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '1.25rem' }}>How this score is computed.</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <MethodRow label="Composite formula" value="0.30 × wikipedia + 0.25 × trends + 0.25 × MCP ecosystem + 0.20 × media" />
              <MethodRow label="Normalization" value="Each lane is normalized against a rolling baseline. Baselines are updated periodically as real data accumulates." />
              <MethodRow label="Freshness discount" value="Data older than 24 hours receives an 85% confidence multiplier." />
              <MethodRow label="Update cadence" value="Scores recompute every hour. Raw data is cached at the source level." />
              <MethodRow label="What this is not" value="This score does not measure actual AI agent usage, revenue, retention, or enterprise deployment depth. It measures public signals that correlate with adoption." />
            </div>
          </div>
        </section>
      </main>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '1.5rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>
            Agentic Mainstream Meter — an independent community project.
          </p>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <a href="https://wikimedia.org/api/rest_v1/" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.72rem', color: 'var(--text-faint)', textDecoration: 'none' }}>Wikimedia API</a>
            <a href="https://agentalmanac.org" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.72rem', color: 'var(--text-faint)', textDecoration: 'none' }}>Agent Almanac</a>
            <a href="https://currentsapi.services" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.72rem', color: 'var(--text-faint)', textDecoration: 'none' }}>Currents API</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function MethodRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 2fr',
      gap: '1rem',
      padding: '0.75rem 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>{label}</p>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{value}</p>
    </div>
  )
}
