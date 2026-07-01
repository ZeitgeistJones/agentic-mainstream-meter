// ─── Lane types ──────────────────────────────────────────────────────────────

export type LaneId = 'wikipedia' | 'trends' | 'jobs'

export interface LaneDetail {
  title: string
  company: string
  url: string
}

export interface LaneResult {
  id: LaneId
  label: string
  score: number          // 0–100 normalized
  rawValue: number       // the actual number from the source
  rawLabel: string       // human-readable version of rawValue
  delta7d: number | null // change vs 7 days ago, percentage points
  freshAt: string        // ISO timestamp of when data was fetched
  sourceUrl: string
  status: 'live' | 'stale' | 'error'
  error?: string
  details?: LaneDetail[] // optional sample of underlying items, for transparency
}

// ─── Composite score ──────────────────────────────────────────────────────────

export interface AdoptionStage {
  label: string          // e.g. "Crossing the Chasm"
  range: [number, number]
  description: string
}

export interface CompositeScore {
  score: number          // 0–100
  stage: AdoptionStage
  lanes: LaneResult[]
  computedAt: string     // ISO timestamp
  narrative: string      // Claude-generated plain-English explanation
}

// ─── Anchor baselines ─────────────────────────────────────────────────────────

export interface Anchor {
  label: string          // e.g. "LLMs at this stage"
  score: number
  year: number
}

// ─── Auth / gate (stubbed for CLAWDGate) ─────────────────────────────────────

export interface GateStatus {
  enabled: boolean       // false until CLAWDGate is wired in
  isUnlocked: boolean
  walletAddress?: string
  clawdBalance?: bigint
}
