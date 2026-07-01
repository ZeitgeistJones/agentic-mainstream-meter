import type { LaneResult, LaneExample } from '@/types'
import { normalizeMediaScore } from '@/lib/scoring'

async function fetchRedis(key: string): Promise<string | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    })
    const data = await res.json()
    return data.result ?? null
  } catch {
    return null
  }
}

async function setRedis(key: string, value: string, exSeconds?: number): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return
  try {
    const path = exSeconds
      ? `/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}/ex/${exSeconds}`
      : `/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`
    await fetch(`${url}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    // ignore cache write failures
  }
}

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
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
}

async function scoreArticleSentiment(
  title: string,
  description: string,
  apiKey: string,
): Promise<'positive' | 'neutral' | 'negative'> {
  const cacheKey = `amm:sentiment:${Buffer.from(title).toString('base64').slice(0, 32)}`

  const cached = await fetchRedis(cacheKey)
  if (cached === 'positive' || cached === 'neutral' || cached === 'negative') {
    return cached
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{
          role: 'user',
          content: `Classify the sentiment of this news article about AI agents as exactly one word: positive, neutral, or negative.\n\nTitle: ${title}\nDescription: ${description}\n\nRespond with only one word.`,
        }],
      }),
    })

    if (!res.ok) return 'neutral'
    const data = await res.json()
    const sentiment = data?.content?.[0]?.text?.trim().toLowerCase()
    const result = (sentiment === 'positive' || sentiment === 'negative') ? sentiment : 'neutral'

    await setRedis(cacheKey, result, 604800)
    return result
  } catch {
    return 'neutral'
  }
}

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
      const decodedTitle = decodeHtmlEntities(article.title)
      const normalizedTitle = decodedTitle.toLowerCase().trim()
      if (seenUrls.has(article.url)) continue
      if (seenTitles.has(normalizedTitle)) continue
      if (!isQualityArticle({ ...article, title: decodedTitle })) continue
      seenUrls.add(article.url)
      seenTitles.add(normalizedTitle)
      qualityArticles.push({ ...article, title: decodedTitle })
    }

    const totalArticles = qualityArticles.length
    console.log('[media] quality articles:', totalArticles)

    const anthropicKey = process.env.ANTHROPIC_API_KEY

    const scoredArticles = await Promise.all(
      qualityArticles.slice(0, 10).map(async a => ({
        ...a,
        sentiment: anthropicKey
          ? await scoreArticleSentiment(a.title, '', anthropicKey)
          : 'neutral' as const,
      }))
    )

    const sentimentWeights = { positive: 1.0, neutral: 0.6, negative: -0.4 }
    const weightedCount = scoredArticles.reduce(
      (sum, a) => sum + (sentimentWeights[a.sentiment] ?? 0.6),
      0,
    )
    const remainingCount = Math.max(0, qualityArticles.length - 10)
    const adjustedTotal = weightedCount + (remainingCount * 0.6)

    const exampleLinks: LaneExample[] = qualityArticles.slice(0, 3).map(a => {
      const decoded = decodeHtmlEntities(a.title)
      return {
        label: decoded.length > 60 ? decoded.slice(0, 57) + '...' : decoded,
        url: a.url,
      }
    })

    const score = normalizeMediaScore(adjustedTotal)

    return {
      id: 'media',
      label: 'Media coverage',
      score,
      rawValue: totalArticles,
      rawLabel: `${totalArticles} articles · ${scoredArticles.filter(a => a.sentiment === 'positive').length} positive`,
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
