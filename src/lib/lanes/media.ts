import type { LaneResult, LaneExample } from '@/types'
import { normalizeMediaScore } from '@/lib/scoring'


// ─── Trusted RSS sources ──────────────────────────────────────────────────────
const RSS_FEEDS = [
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/' },
  { name: 'VentureBeat', url: 'https://venturebeat.com/feed/' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab' },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
  { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/' },
]

const KEYWORDS = ['ai agent', 'agentic', 'autonomous agent', 'llm agent', 'multi-agent']

const SIGNAL_PHRASES = [
  'ai agent', 'agentic', 'autonomous agent', 'llm agent',
  'multi-agent', 'agent framework', 'mcp server', 'ai assistant',
]

const BLOCKED_TITLE_WORDS = [
  'stock', 'nba', 'nfl', 'trade', 'draft', 'betting', 'etf',
  'earnings', 'travel plan', 'real estate',
]

interface Article {
  title: string
  url: string
  source: string
}

// ─── RSS fetcher ──────────────────────────────────────────────────────────────
async function fetchRSSFeed(feed: { name: string; url: string }): Promise<Article[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'AgenticMainstreamMeter/1.0' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const xml = await res.text()

    // Simple XML parsing for <item> blocks
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? []
    const articles: Article[] = []

    for (const item of items) {
      const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)
      const linkMatch = item.match(/<link>(.*?)<\/link>/) ?? item.match(/<guid[^>]*>(https?:\/\/[^<]+)<\/guid>/)
      const title = titleMatch?.[1]?.trim()
      const url = linkMatch?.[1]?.trim()
      if (title && url) articles.push({ title, url, source: feed.name })
    }

    return articles
  } catch {
    return []
  }
}

// ─── NewsData.io fetcher ──────────────────────────────────────────────────────
async function fetchNewsData(apiKey: string): Promise<Article[]> {
  try {
    const params = new URLSearchParams({
      apikey: apiKey,
      q: 'AI agent OR agentic AI OR autonomous agent',
      language: 'en',
      category: 'technology,business,science',
    })

    const res = await fetch(`https://newsdata.io/api/1/news?${params}`, {
      next: { revalidate: 3600 },
    })

    if (!res.ok) return []
    const data = await res.json()
    const results = Array.isArray(data.results) ? data.results : []

    return results
      .filter((r: { title?: string; link?: string }) => r.title && r.link)
      .map((r: { title: string; link: string; source_id?: string }) => ({
        title: r.title,
        url: r.link,
        source: r.source_id ?? 'NewsData',
      }))
  } catch {
    return []
  }
}

// ─── Article filter ───────────────────────────────────────────────────────────
function isQualityArticle(article: Article): boolean {
  const titleLower = article.title.toLowerCase()

  // Must have signal phrase
  if (!SIGNAL_PHRASES.some(p => titleLower.includes(p))) return false

  // Must not have blocked words
  if (BLOCKED_TITLE_WORDS.some(w => titleLower.includes(w))) return false

  // Must be a real headline (at least 5 words)
  if (article.title.split(' ').length < 5) return false

  return true
}

export async function fetchMediaLane(): Promise<LaneResult> {
  const freshAt = new Date().toISOString()
  const newsdataKey = process.env.NEWSDATA_API_KEY

  try {
    // Fetch RSS and NewsData in parallel
    const [rssResults, newsdataResults] = await Promise.all([
      Promise.all(RSS_FEEDS.map(fetchRSSFeed)).then(r => r.flat()),
      newsdataKey ? fetchNewsData(newsdataKey) : Promise.resolve([]),
    ])

    const allArticles = [...rssResults, ...newsdataResults]

    // Dedupe and filter
    const seenUrls = new Set<string>()
    const seenTitles = new Set<string>()
    const qualityArticles: Article[] = []

    for (const article of allArticles) {
      const normalizedTitle = article.title.toLowerCase().trim()
      if (seenUrls.has(article.url)) continue
      if (seenTitles.has(normalizedTitle)) continue
      if (!isQualityArticle(article)) continue
      seenUrls.add(article.url)
      seenTitles.add(normalizedTitle)
      qualityArticles.push(article)
    }

    const totalArticles = qualityArticles.length
    console.log('[media] quality articles:', totalArticles)

    const exampleLinks: LaneExample[] = qualityArticles.slice(0, 3).map(a => ({
      label: a.title.length > 60 ? a.title.slice(0, 57) + '...' : a.title,
      url: a.url,
    }))

    const score = normalizeMediaScore(totalArticles)

    return {
      id: 'media',
      label: 'Media coverage',
      score,
      rawValue: totalArticles,
      rawLabel: `${totalArticles} quality articles tracked`,
      delta7d: null,
      freshAt,
      sourceUrl: 'https://newsdata.io',
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
      sourceUrl: 'https://newsdata.io',
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
