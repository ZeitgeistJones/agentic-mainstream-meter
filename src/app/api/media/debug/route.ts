import { NextResponse } from 'next/server'
import { getDateChunks } from '@/lib/lanes/media'

const CURRENTS_SEARCH_URL = 'https://api.currentsapi.services/v1/search'
const TEST_KEYWORD = 'AI agent'

function toRfc3339(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, '+00:00')
}

async function probe(
  label: string,
  params: Record<string, string>,
  apiKey: string,
) {
  const qs = new URLSearchParams({ ...params, apiKey })
  const url = `${CURRENTS_SEARCH_URL}?${qs.toString()}`
  try {
    const res = await fetch(url, { cache: 'no-store' })
    const text = await res.text()
    let parsed: unknown = null
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = null
    }
    const news = parsed && typeof parsed === 'object' && parsed !== null && 'news' in parsed
      ? (parsed as { news?: unknown[] }).news
      : null
    return {
      label,
      params: { ...params },
      status: res.status,
      ok: res.ok,
      articleCount: Array.isArray(news) ? news.length : null,
      bodyPreview: text.slice(0, 400),
    }
  } catch (err) {
    return {
      label,
      params: { ...params },
      status: 0,
      ok: false,
      articleCount: null,
      bodyPreview: err instanceof Error ? err.message : 'fetch failed',
    }
  }
}

/** Visit /api/media/debug in browser to diagnose Currents API issues. */
export async function GET() {
  const apiKey = process.env.CURRENTS_API_KEY
  if (!apiKey) {
    return NextResponse.json({
      error: 'CURRENTS_API_KEY not configured in environment',
      hint: 'Add it in Vercel → Settings → Environment Variables, then redeploy.',
    })
  }

  const chunks = getDateChunks()
  const firstChunk = chunks[0]
  const thirtyDayStart = toRfc3339(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
  const now = toRfc3339(new Date())

  const probes = await Promise.all([
    probe('broken: 30-day range (single start_date)', {
      keywords: TEST_KEYWORD,
      start_date: thirtyDayStart,
      language: 'en',
    }, apiKey),
    probe('broken: 30-day range (start + end)', {
      keywords: TEST_KEYWORD,
      start_date: thirtyDayStart,
      end_date: now,
      language: 'en',
    }, apiKey),
    probe('fixed: first 7-day chunk', {
      keywords: TEST_KEYWORD,
      start_date: firstChunk.start_date,
      end_date: firstChunk.end_date,
      language: 'en',
    }, apiKey),
    probe('fixed: keywords only (no date)', {
      keywords: TEST_KEYWORD,
      language: 'en',
    }, apiKey),
  ])

  return NextResponse.json({
    summary: 'Currents API max date range is 7 days. Lane uses 5 chunks to cover 30 days.',
    testKeyword: TEST_KEYWORD,
    dateChunks: chunks,
    probes,
  })
}
