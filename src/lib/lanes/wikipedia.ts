import type { LaneResult } from '@/types'
import { normalizeWikipediaScore } from '@/lib/scoring'

const WIKI_BASKET = [
  { article: 'AI_agent', label: 'AI agent' },
  { article: 'Autonomous_agent', label: 'Autonomous agent' },
  { article: 'Intelligent_agent', label: 'Intelligent agent' },
  { article: 'Multi-agent_system', label: 'Multi-agent system' },
  { article: 'Software_agent', label: 'Software agent' },
]

const WIKI_API = 'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia.org/all-access/all-agents'

function getDateRange(): { start: string; end: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const endYear = month >= 1 ? year : year - 1
  const endMonth = month >= 1 ? month : 12
  const startYear = month >= 3 ? year : year - 1
  const startMonth = month >= 3 ? month - 2 : 12 + (month - 2)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    start: `${startYear}${pad(startMonth)}0100`,
    end: `${endYear}${pad(endMonth)}0100`,
  }
}

interface WikiItem { views: number }

async function fetchArticleViews(article: string, start: string, end: string): Promise<number> {
  const url = `${WIKI_API}/${encodeURIComponent(article)}/monthly/${start}/${end}`
  console.log('[wikipedia] fetching:', url)
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
  console.log('[wikipedia] date range:', start, '->', end)
  const freshAt = new Date().toISOString()

  try {
    const viewCounts = await Promise.all(
      WIKI_BASKET.map(b => fetchArticleViews(b.article, start, end))
    )
    const totalViews = viewCounts.reduce((a, b) => a + b, 0)
    console.log('[wikipedia] total views:', totalViews)
    const score = normalizeWikipediaScore(totalViews)

    return {
      id: 'wikipedia',
      label: 'Public curiosity',
      score,
      rawValue: totalViews,
      rawLabel: totalViews > 0 ? `${(totalViews / 1000).toFixed(0)}k pageviews / 30d` : '0 pageviews',
      delta7d: null,
      freshAt,
      sourceUrl: 'https://wikimedia.org/api/rest_v1/',
      status: 'live',
      examples: WIKI_BASKET.map(b => b.label),
      exampleLinks: WIKI_BASKET.map(b => ({
        label: b.label,
        url: `https://en.wikipedia.org/wiki/${b.article}`,
      })),
    }
  } catch (err) {
    console.error('[wikipedia] caught error:', err)
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
