import type { LaneResult } from '@/types'
import { normalizeMediaScore } from '@/lib/scoring'

const CURRENTS_SEARCH_URL = 'https://api.currentsapi.services/v1/search'

const MEDIA_KEYWORDS = ['AI agent', 'agentic AI', 'autonomous agent']

function getStartDate(): string {
  const date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

async function countArticlesForKeyword(keyword: string, apiKey: string): Promise<number> {
  const startDate = getStartDate()
  const params = new URLSearchParams()
  params.set('keyword', keyword)
  params.set('start_date', startDate)
  params.set('language', 'en')
  params.set('apiKey', apiKey)

  const url = `${CURRENTS_SEARCH_URL}?${params.toString()}`
  const safeQuery = params.toString().replace(apiKey, '***')
  console.log('[media] fetching:', url.replace(apiKey, '***'))

  // #region agent log
  fetch('http://127.0.0.1:7447/ingest/b75b2913-6a42-4c12-97b9-023a9799687e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5c2ab9'},body:JSON.stringify({sessionId:'5c2ab9',location:'media.ts:countArticlesForKeyword:pre-fetch',message:'request params',data:{keyword,startDate,paramNames:['keyword','start_date','language','apiKey'],encodedQuery:safeQuery,hypothesisId:'H1-H2-H5'},timestamp:Date.now(),runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  const res = await fetch(url, { cache: 'no-store' })
  const text = await res.text()

  // #region agent log
  fetch('http://127.0.0.1:7447/ingest/b75b2913-6a42-4c12-97b9-023a9799687e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5c2ab9'},body:JSON.stringify({sessionId:'5c2ab9',location:'media.ts:countArticlesForKeyword:post-fetch',message:'response received',data:{keyword,status:res.status,ok:res.ok,bodyPreview:text.slice(0,500),bodyLength:text.length,hypothesisId:'H1-H2-H3-H4-H5'},timestamp:Date.now(),runId:'pre-fix',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion

  if (!res.ok) {
    console.error('[media] error for keyword:', keyword, res.status, text)
    throw new Error(`Currents API error ${res.status} for "${keyword}": ${text}`)
  }

  const data = JSON.parse(text)
  const news = Array.isArray(data.news) ? data.news : []
  console.log('[media] articles for', keyword, ':', news.length)

  // #region agent log
  fetch('http://127.0.0.1:7447/ingest/b75b2913-6a42-4c12-97b9-023a9799687e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5c2ab9'},body:JSON.stringify({sessionId:'5c2ab9',location:'media.ts:countArticlesForKeyword:success',message:'parsed response',data:{keyword,articleCount:news.length,responseStatus:data.status,hypothesisId:'H3'},timestamp:Date.now(),runId:'pre-fix',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion

  return news.length
}

async function countArticlesForKeywordSafe(keyword: string, apiKey: string): Promise<number> {
  try {
    return await countArticlesForKeyword(keyword, apiKey)
  } catch (err) {
    console.error('[media] failed keyword:', keyword, err)
    return 0
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
    fetch('http://127.0.0.1:7447/ingest/b75b2913-6a42-4c12-97b9-023a9799687e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5c2ab9'},body:JSON.stringify({sessionId:'5c2ab9',location:'media.ts:fetchMediaLane:entry',message:'lane fetch start',data:{keywordCount:MEDIA_KEYWORDS.length,keywords:MEDIA_KEYWORDS,apiKeyConfigured:!!apiKey,apiKeyLength:apiKey?.length??0,hypothesisId:'H4'},timestamp:Date.now(),runId:'pre-fix',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion

    const counts = await Promise.all(
      MEDIA_KEYWORDS.map(keyword => countArticlesForKeywordSafe(keyword, apiKey))
    )
    const totalArticles = counts.reduce((a, b) => a + b, 0)
    console.log('[media] total articles:', totalArticles)

    // #region agent log
    fetch('http://127.0.0.1:7447/ingest/b75b2913-6a42-4c12-97b9-023a9799687e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'5c2ab9'},body:JSON.stringify({sessionId:'5c2ab9',location:'media.ts:fetchMediaLane:summary',message:'lane fetch complete',data:{counts,totalArticles,keywords:MEDIA_KEYWORDS,hypothesisId:'H3'},timestamp:Date.now(),runId:'pre-fix',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion

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
