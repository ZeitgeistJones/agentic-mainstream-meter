import type { LaneResult, CompositeScore, AdoptionStage } from '@/types'

// ─── Weights (must sum to 1.0) ────────────────────────────────────────────────
export const LANE_WEIGHTS: Record<string, number> = {
  wikipedia: 0.35,
  trends: 0.35,
  jobs: 0.30,
}

// ─── Freshness discount ───────────────────────────────────────────────────────
// Data older than STALE_HOURS gets a penalty multiplier
const STALE_HOURS = 24
const STALE_MULTIPLIER = 0.85

function freshnessMultiplier(freshAt: string): number {
  const ageMs = Date.now() - new Date(freshAt).getTime()
  const ageHours = ageMs / (1000 * 60 * 60)
  return ageHours > STALE_HOURS ? STALE_MULTIPLIER : 1.0
}

// ─── Adoption stages ──────────────────────────────────────────────────────────
const STAGES: AdoptionStage[] = [
  {
    label: 'Early Signals',
    range: [0, 20],
    description: 'Mostly researchers and enthusiasts. Limited mainstream awareness.',
  },
  {
    label: 'Gaining Traction',
    range: [21, 40],
    description: 'Growing media coverage and enterprise interest. Still early adopter territory.',
  },
  {
    label: 'Crossing the Chasm',
    range: [41, 60],
    description: 'Mainstream awareness building. Enterprise deployments accelerating.',
  },
  {
    label: 'Early Mainstream',
    range: [61, 75],
    description: 'Broad public awareness. Significant real-world deployment underway.',
  },
  {
    label: 'Mainstream',
    range: [76, 88],
    description: 'Widely adopted. Household-level recognition.',
  },
  {
    label: 'Peak & Plateau',
    range: [89, 100],
    description: 'Ubiquitous. Commoditized.',
  },
]

export function getStage(score: number): AdoptionStage {
  return (
    STAGES.find(s => score >= s.range[0] && score <= s.range[1]) ?? STAGES[0]
  )
}

// ─── Composite computation ────────────────────────────────────────────────────
export function computeComposite(
  lanes: LaneResult[],
  narrative: string,
): CompositeScore {
  let weighted = 0
  let totalWeight = 0

  for (const lane of lanes) {
    if (lane.status === 'error') continue
    const w = LANE_WEIGHTS[lane.id] ?? 0
    const fm = freshnessMultiplier(lane.freshAt)
    weighted += lane.score * w * fm
    totalWeight += w
  }

  // If all lanes errored, return 0
  const score = totalWeight > 0 ? Math.round(weighted / totalWeight) : 0

  return {
    score,
    stage: getStage(score),
    lanes,
    computedAt: new Date().toISOString(),
    narrative,
  }
}

// ─── Wikipedia normalization ──────────────────────────────────────────────────
// Baseline: ~2M monthly pageviews for the basket = score of 50
// Adjust WIKI_BASELINE to re-anchor as real data comes in
const WIKI_BASELINE = 2_000_000

export function normalizeWikipediaScore(totalViews: number): number {
  const raw = (totalViews / WIKI_BASELINE) * 50
  return Math.min(100, Math.max(0, Math.round(raw)))
}

// ─── Trends normalization ─────────────────────────────────────────────────────
// Apify returns interest 0–100; we remap against a baseline average
// Baseline: 40 average interest = score of 50
const TRENDS_BASELINE = 40

export function normalizeTrendsScore(averageInterest: number): number {
  const raw = (averageInterest / TRENDS_BASELINE) * 50
  return Math.min(100, Math.max(0, Math.round(raw)))
}

// ─── Jobs normalization ───────────────────────────────────────────────────────
// Baseline: 5000 postings/month for the keyword basket = score of 50
const JOBS_BASELINE = 5_000

export function normalizeJobsScore(totalPostings: number): number {
  const raw = (totalPostings / JOBS_BASELINE) * 50
  return Math.min(100, Math.max(0, Math.round(raw)))
}
