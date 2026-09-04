/**
 * 2MD Live Financial, Web Search & Document/PDF Engine for stockbot
 * Prioritizes Primary (https://2md.aiurl.tw) and falls back to Backups (2md.glsoft.ai, create360.ai).
 */

export interface TwoMDResultItem {
  title: string
  url: string
  description: string
  publisher?: string
}

export interface ParsedDocumentResult {
  success: boolean
  filename: string
  title?: string
  pages?: number
  content: string
  error?: string
}

const ENDPOINTS = [
  process.env.TWOMD_PRIMARY_URL || 'https://2md.aiurl.tw',
  process.env.TWOMD_BACKUP1_URL || 'https://2md.glsoft.ai',
  process.env.TWOMD_BACKUP2_URL || 'https://create360.ai'
]

// In-flight Singleflight deduplication maps to prevent thundering herd
const inFlightSearch = new Map<string, Promise<TwoMDResultItem[]>>()
const inFlightRead = new Map<string, Promise<string>>()

// Short-lived In-memory TTL Cache
interface CacheItem<T> {
  data: T
  expiresAt: number
}
const searchCache = new Map<string, CacheItem<TwoMDResultItem[]>>()
const readCache = new Map<string, CacheItem<string>>()
const SEARCH_CACHE_TTL_MS = 60_000 // 60s
const READ_CACHE_TTL_MS = 180_000 // 3m

// Circuit Breaker & Endpoint Health Tracking
interface EndpointHealth {
  consecutiveFailures: number
  cooldownUntil: number
}
const endpointHealth = new Map<string, EndpointHealth>()
const CIRCUIT_BREAKER_THRESHOLD = 2
const CIRCUIT_BREAKER_COOLDOWN_MS = 30_000 // 30s cooldown

function isEndpointHealthy(endpoint: string): boolean {
  const h = endpointHealth.get(endpoint)
  if (!h) return true
  return Date.now() > h.cooldownUntil
}

function recordEndpointFailure(endpoint: string) {
  const h = endpointHealth.get(endpoint) || { consecutiveFailures: 0, cooldownUntil: 0 }
  h.consecutiveFailures += 1
  if (h.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    h.cooldownUntil = Date.now() + CIRCUIT_BREAKER_COOLDOWN_MS
    console.warn(
      `[2MD Circuit Breaker] Endpoint ${endpoint} entered cooldown for 30s (${h.consecutiveFailures} consecutive failures)`
    )
  }
  endpointHealth.set(endpoint, h)
}

function recordEndpointSuccess(endpoint: string) {
  endpointHealth.delete(endpoint)
}

function getCandidateEndpoints(): string[] {
  const healthy = ENDPOINTS.filter(isEndpointHealthy)
  // If all endpoints are cooling down, attempt all to avoid complete deadlock
  return healthy.length > 0 ? healthy : ENDPOINTS
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Perform live web search for financial news, tickers, IPOs, or market data.
 * Equipped with Singleflight request coalescing, TTL cache, and Circuit Breaker.
 */
export async function searchWeb2MD(
  query: string,
  limit = 5
): Promise<TwoMDResultItem[]> {
  const trimmed = (query || '').trim()
  if (!trimmed) return []

  const cacheKey = `${trimmed}:${limit}`

  // 1. Check in-memory cache
  const cached = searchCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  // 2. Check in-flight request (Singleflight pattern)
  const existingPromise = inFlightSearch.get(cacheKey)
  if (existingPromise) {
    return existingPromise
  }

  // 3. Initiate single request with deduplication
  const fetchPromise = (async () => {
    const candidates = getCandidateEndpoints()

    for (let i = 0; i < candidates.length; i++) {
      const baseUrl = candidates[i]
      const isPrimary = baseUrl === ENDPOINTS[0]
      const timeoutMs = isPrimary ? 3500 : 3000

      try {
        // Micro-jitter on fallback attempts to prevent synchronized retry spikes
        if (i > 0) {
          await sleep(20 + Math.floor(Math.random() * 40))
        }

        const searchUrl = `${baseUrl.replace(/\/+$/, '')}/search?q=${encodeURIComponent(trimmed)}`
        const res = await fetch(searchUrl, {
          headers: {
            Accept: 'application/json, text/plain, */*',
            'User-Agent': 'stockbot/2.0'
          },
          signal: AbortSignal.timeout(timeoutMs),
          next: { revalidate: 60 }
        })

        if (res.ok) {
          const text = await res.text()
          if (text && text.trim().length > 0) {
            let results: TwoMDResultItem[] = []

            // Attempt 1: Parse JSON
            try {
              const data = JSON.parse(text)
              const items = data?.data
              if (Array.isArray(items) && items.length > 0) {
                for (const it of items) {
                  const title = String(it.title || '').trim()
                  const url = String(it.url || '').trim()
                  const description = String(it.description || '').trim()
                  if (title && url && title.length > 2) {
                    results.push({
                      title,
                      url,
                      description,
                      publisher: '2MD Live Search'
                    })
                  }
                  if (results.length >= limit) break
                }
              }
            } catch {
              // Attempt 2: Parse plain text format "[1] Title: ... \n[1] URL Source: ... \n[1] Description: ..."
              const regex =
                /\[\d+\]\s*Title:\s*([^\n]+)\s*\n\[\d+\]\s*URL Source:\s*([^\n]+)\s*\n\[\d+\]\s*Description:\s*([^\n]+)/g
              let match: RegExpExecArray | null
              while ((match = regex.exec(text)) !== null) {
                results.push({
                  title: match[1].trim(),
                  url: match[2].trim(),
                  description: match[3].trim(),
                  publisher: '2MD Live Search'
                })
                if (results.length >= limit) break
              }
            }

            if (results.length > 0) {
              recordEndpointSuccess(baseUrl)
              searchCache.set(cacheKey, {
                data: results,
                expiresAt: Date.now() + SEARCH_CACHE_TTL_MS
              })
              return results
            }
          }
        }

        recordEndpointFailure(baseUrl)
      } catch (err: any) {
        recordEndpointFailure(baseUrl)
        console.warn(`[2MD Search] Failed on ${baseUrl}:`, err?.message || err)
      }
    }

    return []
  })()

  inFlightSearch.set(cacheKey, fetchPromise)
  try {
    return await fetchPromise
  } finally {
    inFlightSearch.delete(cacheKey)
  }
}

/**
 * Read any web page, online financial article, or remote PDF URL and convert to Markdown.
 * Equipped with Singleflight request coalescing, TTL cache, and Circuit Breaker.
 */
export async function readUrl2MD(targetUrl: string, customTimeoutMs?: number): Promise<string> {
  const trimmed = (targetUrl || '').trim()
  if (!trimmed) return ''

  const cleanTarget = trimmed.replace(/^https?:\/\//, '').trim()
  const cacheKey = cleanTarget

  // 1. Check in-memory cache
  const cached = readCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  // 2. Check in-flight request (Singleflight pattern)
  const existingPromise = inFlightRead.get(cacheKey)
  if (existingPromise) {
    return existingPromise
  }

  // 3. Initiate single request with deduplication
  const fetchPromise = (async () => {
    const candidates = getCandidateEndpoints()

    for (let i = 0; i < candidates.length; i++) {
      const baseUrl = candidates[i]
      const isPrimary = baseUrl === ENDPOINTS[0]
      const timeoutMs = customTimeoutMs || (isPrimary ? 9000 : 7000)

      try {
        if (i > 0) {
          await sleep(30 + Math.floor(Math.random() * 50))
        }

        const endpoint = `${baseUrl.replace(/\/+$/, '')}/${cleanTarget}`
        const res = await fetch(endpoint, {
          headers: {
            Accept: 'text/markdown, text/plain, */*',
            'User-Agent': 'stockbot/2.0'
          },
          signal: AbortSignal.timeout(timeoutMs),
          next: { revalidate: 300 }
        })

        if (res.ok) {
          const text = await res.text()
          if (text && text.length > 20) {
            recordEndpointSuccess(baseUrl)
            readCache.set(cacheKey, {
              data: text,
              expiresAt: Date.now() + READ_CACHE_TTL_MS
            })
            return text
          }
        }

        recordEndpointFailure(baseUrl)
      } catch (err: any) {
        recordEndpointFailure(baseUrl)
        console.warn(`[2MD ReadUrl] Failed on ${baseUrl}:`, err?.message || err)
      }
    }

    return ''
  })()

  inFlightRead.set(cacheKey, fetchPromise)
  try {
    return await fetchPromise
  } finally {
    inFlightRead.delete(cacheKey)
  }
}

/**
 * Parse an uploaded document file (PDF, DOCX, XLSX, CSV, PPT, TXT) into clean LLM-friendly Markdown.
 */
export async function parseDocument2MD(
  fileBuffer: Buffer | Uint8Array | Blob,
  filename = 'financial_report.pdf'
): Promise<ParsedDocumentResult> {
  for (const baseUrl of ENDPOINTS) {
    try {
      const formData = new FormData()
      const blob =
        fileBuffer instanceof Blob
          ? fileBuffer
          : new Blob([fileBuffer], { type: 'application/octet-stream' })
      formData.append('file', blob, filename)

      const endpoint = `${baseUrl.replace(/\/+$/, '')}/`
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'text/markdown, text/plain, */*',
          'User-Agent': 'stockbot/2.0'
        },
        signal: AbortSignal.timeout(20000)
      })

      if (res.ok) {
        const text = await res.text()
        if (text && text.trim().length > 0) {
          const pagesMatch = text.match(/Number of Pages:\s*(\d+)/i)
          const titleMatch = text.match(/Title:\s*(.+)/i)
          const pages = pagesMatch ? parseInt(pagesMatch[1], 10) : undefined
          const title = titleMatch ? titleMatch[1].trim() : filename

          recordEndpointSuccess(baseUrl)
          return {
            success: true,
            filename,
            title: title || filename,
            pages,
            content: text
          }
        }
      }

      recordEndpointFailure(baseUrl)
    } catch (err: any) {
      recordEndpointFailure(baseUrl)
      console.warn(`[2MD ParseDocument] Failed on ${baseUrl}:`, err?.message || err)
      continue
    }
  }

  return {
    success: false,
    filename,
    content: '',
    error: '2MD AnyDoc 引擎暫時無法解析此文件。請確認檔案格式是否支援（PDF, DOCX, XLSX, CSV, TXT）。'
  }
}

/**
 * Batch crawl and extract multiple financial report or web URLs.
 */
export async function batchReadUrls2MD(urls: string[]): Promise<{ url: string; content: string }[]> {
  if (!urls || urls.length === 0) return []
  for (const baseUrl of ENDPOINTS) {
    try {
      const endpoint = `${baseUrl.replace(/\/+$/, '')}/v1/batch`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'stockbot/2.0'
        },
        body: JSON.stringify({ urls }),
        signal: AbortSignal.timeout(12000)
      })

      if (res.ok) {
        const json = await res.json()
        if (json?.data && Array.isArray(json.data)) {
          recordEndpointSuccess(baseUrl)
          return json.data.map((item: any) => ({
            url: item.url,
            content: item.content || item.markdown || ''
          }))
        }
      }

      recordEndpointFailure(baseUrl)
    } catch (err) {
      recordEndpointFailure(baseUrl)
      console.warn(`[2MD Batch] Failed on ${baseUrl}:`, err)
      continue
    }
  }

  // Fallback: fetch sequentially
  const fallbackResults: { url: string; content: string }[] = []
  for (const url of urls) {
    const text = await readUrl2MD(url)
    fallbackResults.push({ url, content: text })
  }
  return fallbackResults
}

const SYMBOL_NAMES: Record<string, string> = {
  '2330': '台積電 TSMC 2330',
  '1216': '統一 1216',
  '2317': '鴻海 Foxconn 2317',
  '2454': '聯發科 MediaTek 2454',
  '2308': '台達電 Delta 2308',
  '2382': '廣達 Quanta 2382',
  '3008': '大立光 Largan 3008',
  '2303': '聯電 UMC 2303',
  '2603': '長榮 Evergreen 2603',
  '1810': '小米集團 1810 港股 HKEX',
  '01810': '小米集團 1810 港股 HKEX',
  '700': '騰訊控股 700 港股 HKEX',
  '0700': '騰訊控股 700 港股 HKEX',
  '9988': '阿里巴巴 9988 港股 HKEX',
  '3690': '美團 3690 港股 HKEX',
  '1211': '比亞迪股份 1211 港股 HKEX',
  '9999': '網易 9999 港股 HKEX',
  '9888': '百度集團 9888 港股 HKEX',
  '600519': '貴州茅台 600519 上證',
  '300750': '寧德時代 300750 創業板',
  'AAPL': 'Apple 蘋果 AAPL',
  'NVDA': 'NVIDIA 輝達 NVDA',
  'TSLA': 'Tesla 特斯拉 TSLA',
  'MSFT': 'Microsoft 微軟 MSFT',
  'GOOGL': 'Google 谷歌 GOOGL',
  'META': 'Meta 臉書 META',
  'AMZN': 'Amazon 亞馬遜 AMZN',
  'AMD': 'AMD 超微半導體 AMD',
  'TSM': '台積電 ADR TSMC TSM'
}

/**
 * Fetch live stock context or financial search summary from 2MD search.
 */
export async function fetchLiveStockContext(query: string): Promise<string> {
  if (!query || !query.trim()) return ''
  try {
    const rawClean = query
      .replace(/^(TWSE:|TPEX:|NASDAQ:|NYSE:|HKEX:|HKG:|SSE:|SZSE:|TSE:|KRX:)/i, '')
      .replace(/\s+/g, '')
      .trim()
    const cleanQuery = SYMBOL_NAMES[rawClean.toUpperCase()] || query
    const results = await searchWeb2MD(cleanQuery, 4)
    if (!results || results.length === 0) return ''
    return results
      .map((r, i) => `[${i + 1}] ${r.title}: ${r.description}`)
      .join('\n')
  } catch (err) {
    console.warn('[fetchLiveStockContext] Failed:', err)
    return ''
  }
}

// Backward-compatible alias
export const fetchLiveFinancialIntelligence = fetchLiveStockContext
