import type { LaneResult, LaneExample } from '@/types'
import { normalizeMediaScore } from '@/lib/scoring'

const MEDIA_KEYWORDS = ['AI agent', 'agentic AI', 'autonomous agent']

interface CurrentsArticle {
  title?: string
  url?: string
}

async function fetchKeywordResults(keyword: string, apiKey: string): Promise<{ count: number; articles: CurrentsArticle[] }> {
  const params = new URLSearchParams({
    keywords: keyword,
    language: 'en',
    page_size: '20',
    apiKey: apiKey,
  })

  const res = await fetch(`https://api.currentsapi.services/v1/search?${params}`, {
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Currents API error ${res.status} for "${keyword}": ${text.slice(0, 100)}`)
  }

  const data = await res.json()
  const articles: CurrentsArticle[] = Array.isArray(data.news) ? data.news : []
  console.log('[media] keyword:', keyword, 'count:', articles.length)
  return { count: articles.length, articles }
}

async function fetchKeywordSafe(keyword: string, apiKey: string): Promise<{ count: number; articles: CurrentsArticle[] }> {
  try {
    return await fetchKeywordResults(keyword, apiKey)
  } catch (err) {
    console.error('[media] failed keyword:', keyword, err)
    return { count: 0, articles: [] }
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
    const results = await Promise.all(
      MEDIA_KEYWORDS.map(kw => fetchKeywordSafe(kw, apiKey))
    )

    const totalArticles = results.reduce((a, r) => a + r.count, 0)
    console.log('[media] total articles:', totalArticles)

    // Pick 3 example articles from across keywords — one per keyword if possible
    const exampleLinks: LaneExample[] = results
      .flatMap(r => r.articles.slice(0, 1))
      .filter(a => a.title && a.url)
      .slice(0, 3)
      .map(a => ({ label: a.title!, url: a.url! }))

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
      exampleLinks,
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
