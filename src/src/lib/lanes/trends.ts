import type { LaneResult } from '@/types'
import { normalizeTrendsScore } from '@/lib/scoring'

// ─── Keyword basket ───────────────────────────────────────────────────────────
// These are the search terms we track as proxies for public search demand.
// Google Trends returns normalized 0–100 interest; we average across keywords.
const TRENDS_KEYWORDS = [
  'AI agent',
  'autonomous agent AI',
  'agentic AI',
  'AI assistant automation',
]

const APIFY_RUN_URL = 'https://api.apify.com/v2/acts/apify~google-trends-scraper/run-sync-get-dataset-items'

interface ApifyTrendsItem {
  keyword?: string
  interestOverTime?: Array<{ value: number; formattedAxisTime: string }>
  averageInterest?: number
}

async function runApifyActor(keywords: string[]): Promise<ApifyTrendsItem[]> {
  const token = process.env.APIFY_TOKEN
  if (!token) throw new Error('APIFY_TOKEN not set')

  const actorId = process.env.APIFY_TRENDS_ACTOR_ID ?? 'apify/google-trends-scraper'
  const url = `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?token=${token}&timeout=60`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      searchTerms: keywords,
      timeRange: 'today 3-m',
      geo: 'US',
      category: 0,
    }),
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Apify Trends error ${res.status}: ${text.slice(0, 200)}`)
  }

  return res.json()
}

function extractAverageInterest(items: ApifyTrendsItem[]): number {
  const averages: number[] = []

  for (const item of items) {
    if (typeof item.averageInterest === 'number') {
      averages.push(item.averageInterest)
      continue
    }
    // Fallback: compute from interestOverTime array
    const series = item.interestOverTime ?? []
    if (series.length > 0) {
      const avg = series.reduce((s, p) => s + (p.value ?? 0), 0) / series.length
      averages.push(avg)
    }
  }

  if (averages.length === 0) return 0
  return averages.reduce((a, b) => a + b, 0) / averages.length
}

export async function fetchTrendsLane(): Promise<LaneResult> {
  const freshAt = new Date().toISOString()

  try {
    const items = await runApifyActor(TRENDS_KEYWORDS)
    const avgInterest = extractAverageInterest(items)
    const score = normalizeTrendsScore(avgInterest)

    return {
      id: 'trends',
      label: 'Search momentum',
      score,
      rawValue: Math.round(avgInterest),
      rawLabel: `${Math.round(avgInterest)}/100 avg search interest`,
      delta7d: null,
      freshAt,
      sourceUrl: 'https://trends.google.com',
      status: 'live',
    }
  } catch (err) {
    return {
      id: 'trends',
      label: 'Search momentum',
      score: 0,
      rawValue: 0,
      rawLabel: 'unavailable',
      delta7d: null,
      freshAt,
      sourceUrl: 'https://trends.google.com',
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
