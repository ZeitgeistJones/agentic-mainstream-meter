import { NextResponse } from 'next/server'
import { fetchWikipediaLane } from '@/lib/lanes/wikipedia'
import { fetchTrendsLane } from '@/lib/lanes/trends'
import { fetchJobsLane } from '@/lib/lanes/jobs'
import { fetchMediaLane } from '@/lib/lanes/media'
import { computeComposite } from '@/lib/scoring'
import { saveSnapshot } from '@/lib/snapshot'
import { redis } from '@/lib/redis'

export const maxDuration = 60

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const headerSecret = request.headers.get('x-cron-secret')
  if (headerSecret === secret) return true

  // Vercel Cron sends CRON_SECRET as Authorization: Bearer <secret>
  const auth = request.headers.get('authorization')
  if (auth === `Bearer ${secret}`) return true

  return false
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!redis.isConfigured()) {
    return NextResponse.json({ error: 'Upstash Redis is not configured' }, { status: 503 })
  }

  try {
    const [wikipedia, trends, jobs, media] = await Promise.all([
      fetchWikipediaLane(),
      fetchTrendsLane(),
      fetchJobsLane(),
      fetchMediaLane(),
    ])

    const lanes = [wikipedia, trends, jobs, media]
    const composite = computeComposite(lanes, '')
    const snapshot = await saveSnapshot(lanes)

    return NextResponse.json({
      snapshot,
      composite: {
        score: composite.score,
        stage: composite.stage.label,
        computedAt: composite.computedAt,
      },
    })
  } catch (err) {
    console.error('[snapshot] failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save snapshot' },
      { status: 500 },
    )
  }
}
