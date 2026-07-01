import type { LaneResult, LaneExample } from '@/types'
import { normalizeMediaScore } from '@/lib/scoring'

const MEDIA_KEYWORDS = ['AI agent', 'agentic AI', 'autonomous agent']

// Skip build-time fetches to preserve API credits
const IS_BUILD = process.env.NEXT_PHASE === 'phase-production-build'

// Categories that are almost always noise for this dashboard
const BLOCKED_CATEGORIES = ['sport', 'finance', 'news']

// Title must contain at least one of these to be shown as an example
const SIGNAL_PHRASES = [
  'ai agent', 'agentic', 'autonomous agent', 'llm agent',
  'ai assistant', 'mcp server', 'multi-agent', 'agent framework',
]

interface CurrentsArticle {
  title?: string
  url?: string
  category?: string[]
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

  // Skip API call during build to preserve credits
  if (IS_BUILD) {
    return {
      id: 'media',
      label: 'Media coverage',
      score: 0,
      rawValue: 0,
      rawLabel: 'loading...',
      delta7d: null,
      freshAt,
      sourceUrl: 'https://currentsapi.services',
      status: 'stale' as const,
    }
  }

  try {
    const results = await Promise.all(
      MEDIA_KEYWORDS.map(kw => fetchKeywordSafe(kw, apiKey))
    )

    const totalArticles = results.reduce((a, r) => a + r.count, 0)
    console.log('[media] total articles:', totalArticles)

    const seenUrls = new Set<string>()
    const seenTitles = new Set<string>()

    const exampleLinks: LaneExample[] = results
      .flatMap(r => r.articles)
      .filter(a => {
        if (!a.title || !a.url) return false

        // Dedupe by URL and normalized title
        const normalizedTitle = a.title.toLowerCase().trim()
        if (seenUrls.has(a.url)) return false
        if (seenTitles.has(normalizedTitle)) return false

        // Block noisy categories
        const cats = a.category ?? []
        if (cats.some(c => BLOCKED_CATEGORIES.includes(c.toLowerCase()))) return false

        // Must contain a meaningful signal phrase in the title
        const titleLower = a.title.toLowerCase()
        const hasSignal = SIGNAL_PHRASES.some(p => titleLower.includes(p))
        if (!hasSignal) return false

        // Block entries with no real title (short, generic, or company-only names)
        if (a.title.split(' ').length < 4) return false

        seenUrls.add(a.url)
        seenTitles.add(normalizedTitle)
        return true
      })
      .slice(0, 3)
      .map(a => ({
        label: a.title!.length > 60 ? a.title!.slice(0, 57) + '...' : a.title!,
        url: a.url!,
      }))

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
