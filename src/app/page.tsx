import { Suspense } from 'react'
import { fetchWikipediaLane } from '@/lib/lanes/wikipedia'
import { fetchTrendsLane } from '@/lib/lanes/trends'
import { fetchJobsLane } from '@/lib/lanes/jobs'
import { fetchMediaLane } from '@/lib/lanes/media'
import { computeComposite } from '@/lib/scoring'
import { generateNarrative } from '@/lib/narrative'
import { Dashboard } from '@/components/Dashboard'
import type { CompositeScore } from '@/types'

export const revalidate = 3600

async function getScore(): Promise<CompositeScore> {
  const [wikipedia, trends, jobs, media] = await Promise.all([
    fetchWikipediaLane(),
    fetchTrendsLane(),
    fetchJobsLane(),
    fetchMediaLane(),
  ])
  const lanes = [wikipedia, trends, jobs, media]
  const roughScore = computeComposite(lanes, '').score
  const narrative = await generateNarrative(roughScore, lanes)
  return computeComposite(lanes, narrative)
}

export default async function Home() {
  const score = await getScore()
  return (
    <Suspense fallback={<div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>}>
      <Dashboard data={score} />
    </Suspense>
  )
}
