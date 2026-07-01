import type { LaneResult } from '@/types'
import { normalizeMediaScore } from '@/lib/scoring'

const CURRENTS_SEARCH_URL = 'https://api.currentsapi.services/v1/search'
const MEDIA_KEYWORDS = ['AI agent', 'agentic AI', 'autonomous agent']
const LOOKBACK_DAYS = 30
const MAX_CHUNK_DAYS = 7
const PAGE_SIZE = 200
const MAX_PAGES = 10

function toRfc3339(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, '+00:00')
}

/** Currents API allows at most 7 days per start_date/end_date window. */
export function getDateChunks(): { start_date: string; end_date: string }[] {
  const msPerDay = 24 * 60 * 60 * 1000
  const now = Date.now()
  const chunks: { start_date: string; end_date: string }[] = []

  let offsetDays = 0
  while (offsetDays < LOOKBACK_DAYS) {
    const chunkDays = Math.min(MAX_CHUNK_DAYS, LOOKBACK_DAYS - offsetDays)
    const endMs = now - offsetDays * msPerDay
    const startMs = endMs - chunkDays * msPerDay
    chunks.push({
      start_date: toRfc3339(new Date(startMs)),
      end_date: toRfc3339(new Date(endMs)),
    })
    offsetDays += chunkDays
  }

  return chunks
}

async function fetchSearchPage(
  keyword: string,
  apiKey: string,
  start_date: string,
  end_date: string,
  page: number,
): Promise<{ count: number; hasMore: boolean }> {
  const params = new URLSearchParams()
  params.set('keywords', keyword)
  params.set('start_date', start_date)
  params.set('end_date', end_date)
  params.set('language', 'en')
  params.set('page_number', String(page))
  params.set('page_size', String(PAGE_SIZE))
  params.set('apiKey', apiKey)

  const url = `${CURRENTS_SEARCH_URL}?${params.toString()}`
  const res = await fetch(url, { cache: 'no-store' })
  const text = await res.text()

  // #region agent log
  fetch('http://127.0.0.1:7447/ingest/b75b2913-6a42-4c12-97b9-023a9799687e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5c2ab9'},body:JSON.stringify({sessionId:'5c2ab9',location:'media.ts:fetchSearchPage',message:'chunk page response',data:{keyword,start_date,end_date,page,status:res.status,ok:res.ok,bodyPreview:text.slice(0,300)},timestamp:Date.now(),runId:'post-fix-v2',hypothesisId:'H6'})}).catch(()=>{});
  // #endregion

  if (!res.ok) {
    console.error('[media] error for keyword:', keyword, start_date, end_date, 'page', page, res.status, text)
    throw new Error(`Currents API error ${res.status} for "${keyword}": ${text}`)
  }

  const data = JSON.parse(text)
  const news = Array.isArray(data.news) ? data.news : []
  return { count: news.length, hasMore: news.length >= PAGE_SIZE }
}

async function countArticlesForKeywordInChunk(
  keyword: string,
  apiKey: string,
  start_date: string,
  end_date: string,
): Promise<number> {
  let total = 0
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { count, hasMore } = await fetchSearchPage(keyword, apiKey, start_date, end_date, page)
    total += count
    if (!hasMore) break
  }
  return total
}

async function countArticlesForKeyword(keyword: string, apiKey: string): Promise<number> {
  const chunks = getDateChunks()
  console.log('[media] fetching keyword:', keyword, 'chunks:', chunks.length)

  // #region agent log
  fetch('http://127.0.0.1:7447/ingest/b75b2913-6a42-4c12-97b9-023a9799687e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5c2ab9'},body:JSON.stringify({sessionId:'5c2ab9',location:'media.ts:countArticlesForKeyword:pre-fetch',message:'request plan',data:{keyword,chunkCount:chunks.length,chunks},timestamp:Date.now(),runId:'post-fix-v2',hypothesisId:'H6'})}).catch(()=>{});
  // #endregion

  let total = 0
  for (const chunk of chunks) {
    total += await countArticlesForKeywordInChunk(keyword, apiKey, chunk.start_date, chunk.end_date)
  }

  console.log('[media] articles for', keyword, ':', total)

  // #region agent log
  fetch('http://127.0.0.1:7447/ingest/b75b2913-6a42-4c12-97b9-023a9799687e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5c2ab9'},body:JSON.stringify({sessionId:'5c2ab9',location:'media.ts:countArticlesForKeyword:success',message:'keyword total',data:{keyword,articleCount:total},timestamp:Date.now(),runId:'post-fix-v2',hypothesisId:'H6'})}).catch(()=>{});
  // #endregion

  return total
}

async function countArticlesForKeywordSafe(keyword: string, apiKey: string): Promise<{ count: number; failed: boolean; error?: string }> {
  try {
    const count = await countArticlesForKeyword(keyword, apiKey)
    return { count, failed: false }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error'
    console.error('[media] failed keyword:', keyword, err)
    return { count: 0, failed: true, error }
  }
}

export async function fetchMediaLane(): Promise<LaneResult> {
  const freshAt = new Date().toISOString()
  const apiKey = process.env.CURRENTS_API_KEY

  if (!apiKey) {
    return {
      id: 'media',
      label: 'Media coverage',
      score: 0,
      rawValue: 0,
      rawLabel: 'unavailable',
      delta7d: null,
      freshAt,
      sourceUrl: 'https://currentsapi.services',
      status: 'error',
      error: 'CURRENTS_API_KEY not configured',
    }
  }

  try {
    // #region agent log
    fetch('http://127.0.0.1:7447/ingest/b75b2913-6a42-4c12-97b9-023a9799687e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5c2ab9'},body:JSON.stringify({sessionId:'5c2ab9',location:'media.ts:fetchMediaLane:entry',message:'lane fetch start',data:{keywordCount:MEDIA_KEYWORDS.length,keywords:MEDIA_KEYWORDS,chunkCount:getDateChunks().length,apiKeyConfigured:true},timestamp:Date.now(),runId:'post-fix-v2',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion

    const results = await Promise.all(
      MEDIA_KEYWORDS.map(keyword => countArticlesForKeywordSafe(keyword, apiKey))
    )
    const counts = results.map(r => r.count)
    const failures = results.filter(r => r.failed)
    const totalArticles = counts.reduce((a, b) => a + b, 0)
    console.log('[media] total articles:', totalArticles)

    // #region agent log
    fetch('http://127.0.0.1:7447/ingest/b75b2913-6a42-4c12-97b9-023a9799687e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5c2ab9'},body:JSON.stringify({sessionId:'5c2ab9',location:'media.ts:fetchMediaLane:summary',message:'lane fetch complete',data:{counts,totalArticles,failures:failures.map(f=>f.error)},timestamp:Date.now(),runId:'post-fix-v2',hypothesisId:'H6'})}).catch(()=>{});
    // #endregion

    if (failures.length === MEDIA_KEYWORDS.length) {
      return {
        id: 'media',
        label: 'Media coverage',
        score: 0,
        rawValue: 0,
        rawLabel: 'unavailable',
        delta7d: null,
        freshAt,
        sourceUrl: 'https://currentsapi.services',
        status: 'error',
        error: failures[0]?.error ?? 'All keyword fetches failed',
      }
    }

    const score = normalizeMediaScore(totalArticles)

    return {
      id: 'media',
      label: 'Media coverage',
      score,
      rawValue: totalArticles,
      rawLabel: `${totalArticles.toLocaleString()} articles tracked / 30d`,
      delta7d: null,
      freshAt,
      sourceUrl: 'https://currentsapi.services',
      status: 'live',
    }
  } catch (err) {
    console.error('[media] caught error:', err)
    return {
      id: 'media',
      label: 'Media coverage',
      score: 0,
      rawValue: 0,
      rawLabel: 'unavailable',
      delta7d: null,
      freshAt,
      sourceUrl: 'https://currentsapi.services',
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
