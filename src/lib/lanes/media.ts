import type { LaneResult } from '@/types'
import { normalizeMediaScore } from '@/lib/scoring'

const CURRENTS_SEARCH_URL = 'https://api.currentsapi.services/v1/search'

const MEDIA_KEYWORDS = ['AI agent', 'agentic AI', 'autonomous agent']

function getStartDate(): string {
  const date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

async function countArticlesForKeyword(keyword: string, apiKey: string): Promise<number> {
  const params = new URLSearchParams({
    keywords: keyword,
    start_date: getStartDate(),
    language: 'en',
    apiKey,
  })
  const url = `${CURRENTS_SEARCH_URL}?${params.toString()}`
  console.log('[media] fetching:', url.replace(apiKey, '***'))

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Currents API error ${res.status} for "${keyword}": ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  const news = Array.isArray(data.news) ? data.news : []
  console.log('[media] articles for', keyword, ':', news.length)
  return news.length
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
      MEDIA_KEYWORDS.map(keyword => countArticlesForKeyword(keyword, apiKey))
    )
    const totalArticles = counts.reduce((a, b) => a + b, 0)
    console.log('[media] total articles:', totalArticles)
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
