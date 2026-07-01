import type { LaneId, LaneResult } from '@/types'
import { redis } from '@/lib/redis'

const SNAPSHOT_PREFIX = 'amm:snapshot:'
const LATEST_KEY = 'amm:latest'

export interface LaneSnapshot {
  id: LaneId
  score: number
}

export interface DailySnapshot {
  date: string
  savedAt: string
  lanes: LaneSnapshot[]
}

export function utcDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

function yesterdayUtcDateString(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return utcDateString(d)
}

function snapshotKey(date: string): string {
  return `${SNAPSHOT_PREFIX}${date}`
}

function toLaneSnapshots(lanes: LaneResult[]): LaneSnapshot[] {
  return lanes.map(l => ({ id: l.id, score: l.score }))
}

export async function saveSnapshot(lanes: LaneResult[]): Promise<DailySnapshot> {
  const date = utcDateString()
  const snapshot: DailySnapshot = {
    date,
    savedAt: new Date().toISOString(),
    lanes: toLaneSnapshots(lanes),
  }

  const json = JSON.stringify(snapshot)
  await redis.set(snapshotKey(date), json)
  await redis.set(LATEST_KEY, json)
  return snapshot
}

export async function getSnapshot(date: string): Promise<DailySnapshot | null> {
  const raw = await redis.get(snapshotKey(date))
  if (!raw) return null
  try {
    return JSON.parse(raw) as DailySnapshot
  } catch {
    return null
  }
}

export async function getYesterdaySnapshot(): Promise<DailySnapshot | null> {
  return getSnapshot(yesterdayUtcDateString())
}

export function getDelta(
  current: LaneResult[],
  yesterday: DailySnapshot | null,
): Record<string, number | null> {
  const deltas: Record<string, number | null> = {}

  if (!yesterday) {
    for (const lane of current) deltas[lane.id] = null
    return deltas
  }

  const yesterdayScores = new Map(yesterday.lanes.map(l => [l.id, l.score]))

  for (const lane of current) {
    const prev = yesterdayScores.get(lane.id)
    deltas[lane.id] = prev !== undefined ? lane.score - prev : null
  }

  return deltas
}
