import { NextResponse } from 'next/server'
import { fetchWikipediaLane } from '@/lib/lanes/wikipedia'
import { fetchTrendsLane } from '@/lib/lanes/trends'
import { fetchJobsLane } from '@/lib/lanes/jobs'
import { computeComposite } from '@/lib/scoring'
import { generateNarrative } from '@/lib/narrative'

export const revalidate = 3600 // 1 hour

export async function GET() {
  try {
    // Fetch all lanes in parallel
    const [wikipedia, trends, jobs] = await Promise.all([
      fetchWikipediaLane(),
      fetchTrendsLane(),
      fetchJobsLane(),
    ])

    const lanes = [wikipedia, trends, jobs]

    // Generate narrative based on live data
    const narrative = await generateNarrative(
      computeComposite(lanes, '').score,
      lanes,
    )

    const composite = computeComposite(lanes, narrative)

    return NextResponse.json(composite, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    })
  } catch (err) {
    console.error('[score] Failed to compute composite:', err)
    return NextResponse.json(
      { error: 'Failed to compute score' },
      { status: 500 },
    )
  }
}
