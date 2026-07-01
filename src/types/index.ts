// ─── Lane types ──────────────────────────────────────────────────────────────

export type LaneId = 'wikipedia' | 'trends' | 'jobs' | 'media'

export interface LaneResult {
  id: LaneId
  label: string
  score: number
  rawValue: number
  rawLabel: string
  delta7d: number | null
  freshAt: string
  sourceUrl: string
  status: 'live' | 'stale' | 'error'
  error?: string
  examples?: string[]
}

// ─── Composite score ──────────────────────────────────────────────────────────

export interface AdoptionStage {
  label: string
  range: [number, number]
  description: string
}

export interface CompositeScore {
  score: number
  stage: AdoptionStage
  lanes: LaneResult[]
  computedAt: string
  narrative: string
}

// ─── Anchor baselines ─────────────────────────────────────────────────────────

export interface Anchor {
  label: string
  score: number
  year: number
}

// ─── Auth / gate (stubbed for CLAWDGate) ─────────────────────────────────────

export interface GateStatus {
  enabled: boolean
  isUnlocked: boolean
  walletAddress?: string
  clawdBalance?: bigint
}
