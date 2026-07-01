import type { LaneResult } from '@/types'
import { normalizeTrendsScore } from '@/lib/scoring'

export const TRENDS_BASKET = [
  'ChatGPT',
  'Large_language_model',
  'Artificial_intelligence',
  'Generative_artificial_intelligence',
  'GPT-4',
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
  const start = `${startYear}${pad(startMonth)}0100`
  const end = `${endYear}${pad(endMonth)}0100`
  return { start, end }
}

interface WikiItem {
  views: number
  timestamp: string
}

async function fetchArticleViews(article: string, start: string, end: string): Promise<number> {
  const url = `${WIKI_API}/${encodeURIComponent(article)}/monthly/${start}/${end}`
  console.log('[trends] fetching:', url)
  const res = await fetch(url, {
    headers: { 'User-Agent': 'AgenticMainstreamMeter/1.0 (contact@example.com)' },
    cache: 'no-store',
  })
  if (!res.ok) {
    console.error('[trends] error for', article, res.status, await res.text())
    return 0
  }
  const data = await res.json()
  console.log('[trends] result for', article, ':', JSON.stringify(data).slice(0, 200))
  const items: WikiItem[] = data.items ?? []
  return items.reduce((sum, i) => sum + i.views, 0)
}

export async function fetchTrendsLane(): Promise<LaneResult> {
  const { start, end } = getDateRange()
  console.log('[trends] date range:', start, '->', end)
  const freshAt = new Date().toISOString()

  try {
    const viewCounts = await Promise.all(
      TRENDS_BASKET.map(article => fetchArticleViews(article, start, end))
    )
    const totalViews = viewCounts.reduce((a, b) => a + b, 0)
    console.log('[trends] total views:', totalViews)
    const score = normalizeTrendsScore(totalViews)

    return {
      id: 'trends',
      label: 'Mainstream awareness',
      score,
      rawValue: totalViews,
      rawLabel: totalViews > 0
        ? `${(totalViews / 1_000_000).toFixed(1)}M mainstream AI pageviews / 30d`
        : '0 pageviews — check logs',
      delta7d: null,
      freshAt,
      sourceUrl: 'https://wikimedia.org/api/rest_v1/',
      status: 'live',
    }
  } catch (err) {
    console.error('[trends] caught error:', err)
    return {
      id: 'trends',
      label: 'Mainstream awareness',
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
