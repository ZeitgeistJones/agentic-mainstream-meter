import type { LaneResult } from '@/types'
import { normalizeJobsScore } from '@/lib/scoring'

const AGENT_ALMANAC_URL = 'https://agentalmanac.org/api/v1/mcp/servers'

function extractServerCount(data: unknown): number | null {
  if (data === null || typeof data !== 'object') return null

  const record = data as Record<string, unknown>

  if (typeof record.total === 'number') return record.total
  if (typeof record.count === 'number') return record.count

  if (Array.isArray(data)) return data.length

  if (Array.isArray(record.servers)) return record.servers.length
  if (Array.isArray(record.data)) return record.data.length
  if (Array.isArray(record.items)) return record.items.length

  return null
}

export async function fetchJobsLane(): Promise<LaneResult> {
  const freshAt = new Date().toISOString()

  try {
    console.log('[jobs] fetching:', AGENT_ALMANAC_URL)
    const res = await fetch(AGENT_ALMANAC_URL, {
      headers: { 'User-Agent': 'AgenticMainstreamMeter/1.0 (contact@example.com)' },
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Agent Almanac error ${res.status}: ${text.slice(0, 200)}`)
    }

    const data: unknown = await res.json()
    const totalServers = extractServerCount(data)

    if (totalServers === null) {
      console.error('[jobs] unexpected response shape:', JSON.stringify(data).slice(0, 2000))
      return {
        id: 'jobs',
        label: 'MCP ecosystem size',
        score: 0,
        rawValue: 0,
        rawLabel: 'unavailable',
        delta7d: null,
        freshAt,
        sourceUrl: 'https://agentalmanac.org',
        status: 'error',
        error: `Unexpected response shape: ${JSON.stringify(data).slice(0, 500)}`,
      }
    }

    console.log('[jobs] total MCP servers:', totalServers)
    const score = normalizeJobsScore(totalServers)

    return {
      id: 'jobs',
      label: 'MCP ecosystem size',
      score,
      rawValue: totalServers,
      rawLabel: `${totalServers.toLocaleString()} MCP servers indexed`,
      delta7d: null,
      freshAt,
      sourceUrl: 'https://agentalmanac.org',
      status: 'live',
    }
  } catch (err) {
    console.error('[jobs] caught error:', err)
    return {
      id: 'jobs',
      label: 'MCP ecosystem size',
      score: 0,
      rawValue: 0,
      rawLabel: 'unavailable',
      delta7d: null,
      freshAt,
      sourceUrl: 'https://agentalmanac.org',
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
