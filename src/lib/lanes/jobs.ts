import type { LaneResult } from '@/types'
import { normalizeJobsScore } from '@/lib/scoring'

const JOBS_KEYWORDS = [
  'AI agent',
  'agentic AI',
  'autonomous AI',
  'LLM agent',
]

const REMOTIVE_URL = 'https://remotive.com/api/remote-jobs'

interface RemotiveJob {
  id: number
  title: string
  company_name: string
  url: string
  publication_date?: string
}

async function fetchKeywordJobs(keyword: string): Promise<RemotiveJob[]> {
  const url = `${REMOTIVE_URL}?search=${encodeURIComponent(keyword)}`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'agentic-mainstream-meter' },
    next: { revalidate: 3600 },
  })

  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data.jobs) ? data.jobs : []
}

export async function fetchJobsLane(): Promise<LaneResult> {
  const freshAt = new Date().toISOString()

  try {
    const results = await Promise.all(JOBS_KEYWORDS.map(fetchKeywordJobs))

    const seen = new Map<number, RemotiveJob>()
    for (const jobs of results) {
      for (const job of jobs) seen.set(job.id, job)
    }

    const allJobs = Array.from(seen.values())
    const totalPostings = allJobs.length
    const score = normalizeJobsScore(totalPostings)

    const sample = allJobs
      .sort((a, b) => (b.publication_date ?? '').localeCompare(a.publication_date ?? ''))
      .slice(0, 5)
      .map(job => ({
        title: job.title,
        company: job.company_name,
        url: job.url,
      }))

    return {
      id: 'jobs',
      label: 'Employer demand',
      score,
      rawValue: totalPostings,
      rawLabel: `${totalPostings.toLocaleString()} postings tracked`,
      delta7d: null,
      freshAt,
      sourceUrl: 'https://remotive.com',
      status: 'live',
      details: sample,
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
      sourceUrl: 'https://remotive.com',
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
