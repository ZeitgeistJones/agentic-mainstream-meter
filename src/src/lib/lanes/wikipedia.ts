import type { LaneResult } from '@/types'
import { normalizeWikipediaScore } from '@/lib/scoring'

// ─── Page basket ─────────────────────────────────────────────────────────────
// These are the Wikipedia articles we track as proxies for public curiosity.
// Review and refine this list before launch — each article should be
// clearly about agentic AI, not just "AI" broadly.
export const WIKI_BASKET = [
  'AI_agent',
  'Autonomous_agent',
  'Intelligent_agent',
  'Multi-agent_system',
  'Software_agent',
]

const WIKI_API = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents'

function getDateRange(): { start: string; end: string } {
  const now = new Date()
  const end = new Date(now)
  end.setDate(end.getDate() - 1) // yesterday (API lag)

  const start = new Date(end)
  start.setDate(start.getDate() - 29) // 30-day window

  const fmt = (d: Date) =>
    d.toISOString().slice(0, 10).replace(/-/g, '') + '00'

  return { start: fmt(start), end: fmt(end) }
}

interface WikiItem {
  views: number
  timestamp: string
}

async function fetchArticleViews(article: string, start: string, end: string): Promise<number> {
  const url = `${WIKI_API}/${encodeURIComponent(article)}/monthly/${start}/${end}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'AgenticMainstreamMeter/1.0 (contact@example.com)' },
    next: { revalidate: 3600 },
  })
  if (!res.ok) return 0
  const data = await res.json()
  const items: WikiItem[] = data.items ?? []
  return items.reduce((sum, i) => sum + i.views, 0)
}

export async function fetchWikipediaLane(): Promise<LaneResult> {
  const { start, end } = getDateRange()
  const freshAt = new Date().toISOString()

  try {
    const viewCounts = await Promise.all(
      WIKI_BASKET.map(article => fetchArticleViews(article, start, end))
    )
    const totalViews = viewCounts.reduce((a, b) => a + b, 0)
    const score = normalizeWikipediaScore(totalViews)

    return {
      id: 'wikipedia',
      label: 'Public curiosity',
      score,
      rawValue: totalViews,
      rawLabel: `${(totalViews / 1000).toFixed(0)}k pageviews / 30d`,
      delta7d: null, // TODO: compute once historical data is stored
      freshAt,
      sourceUrl: 'https://wikimedia.org/api/rest_v1/',
      status: 'live',
    }
  } catch (err) {
    return {
      id: 'wikipedia',
      label: 'Public curiosity',
      score: 0,
      rawValue: 0,
      rawLabel: 'unavailable',
      delta7d: null,
      freshAt,
      sourceUrl: 'https://wikimedia.org/api/rest_v1/',
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
