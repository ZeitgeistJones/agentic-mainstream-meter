import type { LaneResult } from '@/types'
import { normalizeJobsScore } from '@/lib/scoring'

// ─── Keyword basket ───────────────────────────────────────────────────────────
// These keywords are designed to capture enterprise-serious agentic AI roles.
// Deduplicated at the Apify level — counts reflect unique postings.
const JOBS_KEYWORDS = [
  'AI agent engineer',
  'agentic AI',
  'autonomous AI',
  'LLM agent',
  'AI automation engineer',
]

interface ApifyJobItem {
  title?: string
  company?: string
  location?: string
  postedAt?: string
  url?: string
}

async function fetchKeywordJobs(keyword: string, token: string): Promise<number> {
  const actorId = process.env.APIFY_JOBS_ACTOR_ID ?? 'sian.agency/ziprecruiter-jobs-scraper'
  const url = `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/run-sync-get-dataset-items?token=${token}&timeout=60`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      keyword,
      location: 'United States',
      maxItems: 100,
      mode: 'overview', // cheaper — just title + count
    }),
    next: { revalidate: 3600 },
  })

  if (!res.ok) return 0
  const items: ApifyJobItem[] = await res.json()
  return items.length
}

export async function fetchJobsLane(): Promise<LaneResult> {
  const freshAt = new Date().toISOString()
  const token = process.env.APIFY_TOKEN

  if (!token) {
    return {
      id: 'jobs',
      label: 'Employer demand',
      score: 0,
      rawValue: 0,
      rawLabel: 'unavailable — APIFY_TOKEN not set',
      delta7d: null,
      freshAt,
      sourceUrl: 'https://www.ziprecruiter.com',
      status: 'error',
      error: 'APIFY_TOKEN not configured',
    }
  }

  try {
    // Run keyword searches in parallel to stay within Apify timeout
    const counts = await Promise.all(
      JOBS_KEYWORDS.map(kw => fetchKeywordJobs(kw, token))
    )
    const totalPostings = counts.reduce((a, b) => a + b, 0)
    const score = normalizeJobsScore(totalPostings)

    return {
      id: 'jobs',
      label: 'Employer demand',
      score,
      rawValue: totalPostings,
      rawLabel: `${totalPostings.toLocaleString()} postings tracked`,
      delta7d: null,
      freshAt,
      sourceUrl: 'https://www.ziprecruiter.com',
      status: 'live',
    }
  } catch (err) {
    return {
      id: 'jobs',
      label: 'Employer demand',
      score: 0,
      rawValue: 0,
      rawLabel: 'unavailable',
      delta7d: null,
      freshAt,
      sourceUrl: 'https://www.ziprecruiter.com',
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
