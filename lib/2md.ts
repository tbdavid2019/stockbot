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

/**
 * Perform live web search for financial news, tickers, IPOs, or market data.
 */
export async function searchWeb2MD(
  query: string,
  limit = 5
): Promise<TwoMDResultItem[]> {
  if (!query || !query.trim()) return []

  for (const baseUrl of ENDPOINTS) {
    try {
      const searchUrl = `${baseUrl.replace(/\/+$/, '')}/search?q=${encodeURIComponent(query.trim())}`
      const res = await fetch(searchUrl, {
        headers: {
          Accept: 'application/json, text/plain, */*',
          'User-Agent': 'stockbot/2.0'
        },
        signal: AbortSignal.timeout(1500),
        next: { revalidate: 60 }
      })

      if (res.ok) {
        const text = await res.text()
        if (text && text.trim().length > 0) {
          // Attempt 1: Parse JSON
          try {
            const data = JSON.parse(text)
            const items = data?.data
            if (Array.isArray(items) && items.length > 0) {
              const results: TwoMDResultItem[] = []
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
              if (results.length > 0) {
                return results
              }
            }
          } catch {
            // Attempt 2: Parse plain text format "[1] Title: ... \n[1] URL Source: ... \n[1] Description: ..."
            const regex =
              /\[\d+\]\s*Title:\s*([^\n]+)\s*\n\[\d+\]\s*URL Source:\s*([^\n]+)\s*\n\[\d+\]\s*Description:\s*([^\n]+)/g
            const results: TwoMDResultItem[] = []
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
            if (results.length > 0) {
              return results
            }
          }
        }
      }
    } catch (err: any) {
      console.warn(`[2MD Search] Failed on ${baseUrl}:`, err?.message || err)
      continue
    }
  }

  return []
}

/**
 * Read any web page, online financial article, or remote PDF URL and convert to Markdown.
 */
export async function readUrl2MD(targetUrl: string): Promise<string> {
  if (!targetUrl || !targetUrl.trim()) return ''
  const cleanTarget = targetUrl.replace(/^https?:\/\//, '').trim()
  for (const baseUrl of ENDPOINTS) {
    try {
      const endpoint = `${baseUrl.replace(/\/+$/, '')}/${cleanTarget}`
      const res = await fetch(endpoint, {
        headers: {
          Accept: 'text/markdown, text/plain, */*',
          'User-Agent': 'stockbot/2.0'
        },
        signal: AbortSignal.timeout(4500),
        next: { revalidate: 300 }
      })

      if (res.ok) {
        const text = await res.text()
        if (text && text.length > 20) {
          return text
        }
      }
    } catch (err: any) {
      console.warn(`[2MD ReadUrl] Failed on ${baseUrl}:`, err?.message || err)
      continue
    }
  }

  return ''
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
        }
      })

      if (res.ok) {
        const text = await res.text()
        if (text && text.trim().length > 0) {
          const pagesMatch = text.match(/Number of Pages:\s*(\d+)/i)
          const titleMatch = text.match(/Title:\s*(.+)/i)
          const pages = pagesMatch ? parseInt(pagesMatch[1], 10) : undefined
          const title = titleMatch ? titleMatch[1].trim() : filename

          return {
            success: true,
            filename,
            title: title || filename,
            pages,
            content: text
          }
        }
      }
    } catch (err: any) {
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
        body: JSON.stringify({ urls })
      })

      if (res.ok) {
        const json = await res.json()
        if (json?.data && Array.isArray(json.data)) {
          return json.data.map((item: any) => ({
            url: item.url,
            content: item.content || item.markdown || ''
          }))
        }
      }
    } catch (err) {
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
  '2317': '鴻海 Foxconn 2317',
  '2454': '聯發科 MediaTek 2454',
  '2308': '台達電 Delta 2308',
  '2382': '廣達 Quanta 2382',
  '3008': '大立光 Largan 3008',
  '2303': '聯電 UMC 2303',
  '2603': '長榮 Evergreen 2603',
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
    const rawClean = query.replace(/^(TWSE:|TPEX:|NASDAQ:|NYSE:)/i, '').trim()
    const cleanQuery = SYMBOL_NAMES[rawClean.toUpperCase()] || rawClean
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
