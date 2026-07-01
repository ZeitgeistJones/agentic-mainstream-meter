export type LaneId = 'wikipedia' | 'trends' | 'jobs' | 'media'

export interface LaneExample {
  label: string
  url: string
}

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
  exampleLinks?: LaneExample[]
}

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

export interface Anchor {
  label: string
  score: number
  year: number
}

export interface GateStatus {
  enabled: boolean
  isUnlocked: boolean
  walletAddress?: string
  clawdBalance?: bigint
}
