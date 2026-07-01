import type { LaneResult } from '@/types'
import { normalizeTrendsScore } from '@/lib/scoring'

// ─── Keyword basket ───────────────────────────────────────────────────────────
// Repos created/pushed in the last 30 days matching these topics/terms.
// Used as a proxy for developer-side momentum behind agentic AI.
const SEARCH_TERMS = [
  'ai-agent',
  'agentic-ai',
  'autonomous-agent',
  'llm-agent',
]

const GITHUB_SEARCH_URL = 'https://api.github.com/search/repositories'

async function countRecentRepos(term: string): Promise<number> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  const q = encodeURIComponent(`${term} in:topics,name,description pushed:>${since}`)
  const url = `${GITHUB_SEARCH_URL}?q=${q}&per_page=1`

  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'agentic-mainstream-meter',
    },
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub Search error ${res.status}: ${text.slice(0, 200)}`)
  }

  const data = await res.json()
  return typeof data.total_count === 'number' ? data.total_count : 0
}

export async function fetchTrendsLane(): Promise<LaneResult> {
  const freshAt = new Date().toISOString()

  try {
    // Run sequentially with small gaps — GitHub's unauthenticated rate limit
    // is 10 requests/minute, so four calls back-to-back is safe.
    const counts: number[] = []
    for (const term of SEARCH_TERMS) {
      counts.push(await countRecentRepos(term))
    }

    const totalRepos = counts.reduce((a, b) => a + b, 0)
    const score = normalizeTrendsScore(totalRepos)

    return {
      id: 'trends',
      label: 'Developer momentum',
      score,
      rawValue: totalRepos,
      rawLabel: `${totalRepos.toLocaleString()} repos updated / 30d`,
      delta7d: null,
      freshAt,
      sourceUrl: 'https://github.com/search',
      status: 'live',
    }
  } catch (err) {
    return {
      id: 'trends',
      label: 'Developer momentum',
      score: 0,
      rawValue: 0,
      rawLabel: 'unavailable',
      delta7d: null,
      freshAt,
      sourceUrl: 'https://github.com/search',
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
