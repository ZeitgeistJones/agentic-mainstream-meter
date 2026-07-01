import type { LaneResult } from '@/types'
import { normalizeJobsScore } from '@/lib/scoring'

interface AlmanacServer {
  name?: string
  slug?: string
  title?: string
  url?: string
  id?: string
}

export async function fetchJobsLane(): Promise<LaneResult> {
  const freshAt = new Date().toISOString()

  try {
    console.log('[jobs] fetching: https://agentalmanac.org/api/v1/mcp/servers')
    const res = await fetch('https://agentalmanac.org/api/v1/mcp/servers', {
      headers: { 'User-Agent': 'AgenticMainstreamMeter/1.0' },
      next: { revalidate: 3600 },
    })

    if (!res.ok) throw new Error(`Agent Almanac error ${res.status}`)

    const data = await res.json()
    console.log('[jobs] raw response shape:', JSON.stringify(data).slice(0, 200))

    const servers: AlmanacServer[] = Array.isArray(data)
      ? data
      : Array.isArray(data.servers)
      ? data.servers
      : Array.isArray(data.data)
      ? data.data
      : []

    const count = typeof data.total === 'number'
      ? data.total
      : typeof data.count === 'number'
      ? data.count
      : servers.length

    console.log('[jobs] MCP server count:', count)
    const score = normalizeJobsScore(count)

    const exampleLinks = servers.slice(0, 5).map(s => ({
      label: s.title ?? s.name ?? s.slug ?? 'MCP Server',
      url: s.url ?? `https://agentalmanac.org/servers/${s.slug ?? ''}`,
    }))

    return {
      id: 'jobs',
      label: 'MCP ecosystem size',
      score,
      rawValue: count,
      rawLabel: `${count.toLocaleString()} MCP servers indexed`,
      delta7d: null,
      freshAt,
      sourceUrl: 'https://agentalmanac.org',
      status: 'live',
      exampleLinks,
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
