import type { LaneResult } from '@/types'
import { normalizeMediaScore } from '@/lib/scoring'

const MEDIA_KEYWORDS = ['AI agent', 'agentic AI', 'autonomous agent']

async function fetchKeywordCount(keyword: string, apiKey: string): Promise<number> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const startDate = thirtyDaysAgo.toISOString().slice(0, 10)

  const params = new URLSearchParams({
    keywords: keyword,
    language: 'en',
    start_date: startDate,
    page_size: '20',
  })

  params.set('apiKey', apiKey)
  const res = await fetch(`https://api.currentsapi.services/v1/search?${params}`, {
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Currents API error ${res.status} for "${keyword}": ${text.slice(0, 100)}`)
  }

  const data = await res.json()
  return Array.isArray(data.news) ? data.news.length : 0
}

async function fetchKeywordSafe(keyword: string, apiKey: string): Promise<number> {
  try {
    return await fetchKeywordCount(keyword, apiKey)
  } catch (err) {
    console.error('[media] failed keyword:', keyword, err)
    return 0
  }
}

export async function fetchMediaLane(): Promise<LaneResult> {
  const freshAt = new Date().toISOString()
  const apiKey = process.env.CURRENTS_API_KEY

  if (!apiKey) {
    return {
      id: 'media',
      label: 'Media coverage',
      score: 0,
      rawValue: 0,
      rawLabel: 'unavailable',
      delta7d: null,
      freshAt,
      sourceUrl: 'https://currentsapi.services',
      status: 'error',
      error: 'CURRENTS_API_KEY not configured',
    }
  }

  try {
    const counts = await Promise.all(
      MEDIA_KEYWORDS.map(kw => fetchKeywordSafe(kw, apiKey))
    )
    const totalArticles = counts.reduce((a, b) => a + b, 0)
    console.log('[media] total articles:', totalArticles, counts)

    const score = normalizeMediaScore(totalArticles)

    return {
      id: 'media',
      label: 'Media coverage',
      score,
      rawValue: totalArticles,
      rawLabel: `${totalArticles.toLocaleString()} articles tracked / 30d`,
      delta7d: null,
      freshAt,
      sourceUrl: 'https://currentsapi.services',
      status: 'live',
    }
  } catch (err) {
    console.error('[media] caught error:', err)
    return {
      id: 'media',
      label: 'Media coverage',
      score: 0,
      rawValue: 0,
      rawLabel: 'unavailable',
      delta7d: null,
      freshAt,
      sourceUrl: 'https://currentsapi.services',
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
