import { NextResponse } from 'next/server'

const CURRENTS_SEARCH_URL = 'https://api.currentsapi.services/v1/search'
const TEST_KEYWORD = 'AI agent'

function getStartDateBroken(): string {
  const date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function getStartDateFixed(): string {
  const date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
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

/** Visit /api/media/debug in browser to diagnose Currents API 400s — no local dev tricks needed. */
export async function GET() {
  const apiKey = process.env.CURRENTS_API_KEY
  if (!apiKey) {
    return NextResponse.json({
      error: 'CURRENTS_API_KEY not configured in environment',
      hint: 'Add it in Vercel → Settings → Environment Variables, then redeploy.',
    })
  }

  const startBroken = getStartDateBroken()
  const startFixed = getStartDateFixed()

  const probes = await Promise.all([
    probe('current (keyword + space date)', {
      keyword: TEST_KEYWORD,
      start_date: startBroken,
      language: 'en',
    }, apiKey),
    probe('fixed (keywords + RFC3339 date)', {
      keywords: TEST_KEYWORD,
      start_date: startFixed,
      language: 'en',
    }, apiKey),
    probe('keywords only (no date)', {
      keywords: TEST_KEYWORD,
      language: 'en',
    }, apiKey),
  ])

  // #region agent log
  fetch('http://127.0.0.1:7447/ingest/b75b2913-6a42-4c12-97b9-023a9799687e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5c2ab9'},body:JSON.stringify({sessionId:'5c2ab9',location:'api/media/debug/route.ts',message:'probe results',data:{probes,startBroken,startFixed},timestamp:Date.now(),runId:'pre-fix',hypothesisId:'H1-H2'})}).catch(()=>{});
  // #endregion

  return NextResponse.json({
    summary: 'Compare probes below. If "current" fails but "fixed" succeeds, the lane param/date format is the bug.',
    testKeyword: TEST_KEYWORD,
    startDateBroken: startBroken,
    startDateFixed: startFixed,
    probes,
  })
}
