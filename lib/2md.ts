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
  for (const baseUrl of ENDPOINTS) {
    try {
      const searchUrl = `${baseUrl.replace(/\/+$/, '')}/search?q=${encodeURIComponent(query)}`
      const res = await fetch(searchUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'stockbot/2.0'
        },
        next: { revalidate: 60 }
      })

      if (res.ok) {
        const data = await res.json()
        const items = data?.data
        if (Array.isArray(items) && items.length > 0) {
          const results: TwoMDResultItem[] = []
          for (const it of items) {
            const title = String(it.title || '').trim()
            const url = String(it.url || '').trim()
            const description = String(it.description || '').trim()
            if (title && url && title.length > 3) {
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
      }
    } catch (err) {
      console.warn(`[2MD Search] Failed on ${baseUrl}:`, err)
      continue
    }
  }

  return []
}

/**
 * Read any web page, online financial article, or remote PDF URL and convert to Markdown.
 */
export async function readUrl2MD(targetUrl: string): Promise<string> {
  const cleanTarget = targetUrl.replace(/^https?:\/\//, '')
  for (const baseUrl of ENDPOINTS) {
    try {
      const endpoint = `${baseUrl.replace(/\/+$/, '')}/${cleanTarget}`
      const res = await fetch(endpoint, {
        headers: {
          Accept: 'text/markdown, text/plain, */*',
          'User-Agent': 'stockbot/2.0'
        },
        next: { revalidate: 300 }
      })

      if (res.ok) {
        const text = await res.text()
        if (text && text.length > 20) {
          return text
        }
      }
    } catch (err) {
      console.warn(`[2MD ReadUrl] Failed on ${baseUrl}:`, err)
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

/**
 * Multi-dimensional Live Financial Intelligence Search (Macro, Bonds, Peers, Breaking News & Quotes)
 * Automatically adapts search queries and report structures for English and Traditional Chinese.
 */
export async function fetchLiveFinancialIntelligence(
  query: string,
  options?: {
    lang?: 'zh' | 'en'
    includePeers?: boolean
    includeMacro?: boolean
    includeNews?: boolean
  }
): Promise<string> {
  if (!query) return ''
  try {
    const cleanQuery = query.replace(/^(TWSE:|TPEX:|NASDAQ:|NYSE:)/i, '').trim()
    const isChinese =
      options?.lang === 'zh' ||
      (/[\u4e00-\u9fa5]/.test(query) && options?.lang !== 'en')

    // Prepare bilingual search queries
    const quoteSearchQuery = isChinese
      ? `${cleanQuery} 即時股價 漲跌 營收 本益比 殖利率`
      : `${cleanQuery} stock price quote live valuation PE ratio dividend revenue`

    const peerSearchQuery = isChinese
      ? `${cleanQuery} 相關概念股 供應鏈 同業比較 競爭對手`
      : `${cleanQuery} supply chain peer comparison competitors related stocks`

    const macroSearchQuery = isChinese
      ? `${cleanQuery} 總體經濟 聯準會 美債殖利率 降息 產業趨勢`
      : `${cleanQuery} macroeconomic 10Y treasury yield fed interest rate inflation outlook`

    const newsSearchQuery = isChinese
      ? `${cleanQuery} 最新財經新聞 法人外資買賣超 法說會`
      : `${cleanQuery} breaking financial news institutional flow earnings guidance catalysts`

    // Dispatch concurrent multi-dimensional intelligence searches via 2MD
    const searches = [
      // 1. Core Quotes & Financial Metrics
      searchWeb2MD(quoteSearchQuery, 3),
      // 2. Related Peers & Supply Chain
      options?.includePeers !== false
        ? searchWeb2MD(peerSearchQuery, 3)
        : Promise.resolve([]),
      // 3. Macro, Bonds & Interest Rates
      options?.includeMacro !== false
        ? searchWeb2MD(macroSearchQuery, 3)
        : Promise.resolve([]),
      // 4. Breaking Financial News & Institutional Flows
      options?.includeNews !== false
        ? searchWeb2MD(newsSearchQuery, 3)
        : Promise.resolve([])
    ]

    const [quotes, peers, macro, news] = await Promise.all(searches)
    const sections: string[] = []

    if (quotes && quotes.length > 0) {
      sections.push(
        isChinese
          ? `【📊 即時行情與核心財務指標】:\n` +
              quotes.map((r, i) => `  - [${r.title}] ${r.description}`).join('\n')
          : `[📊 Live Market Quotes & Key Valuation Metrics]:\n` +
              quotes.map((r, i) => `  - [${r.title}] ${r.description}`).join('\n')
      )
    }

    if (peers && peers.length > 0) {
      sections.push(
        isChinese
          ? `【⛓️ 相關個股、供應鏈與同業比較】:\n` +
              peers.map((r, i) => `  - [${r.title}] ${r.description}`).join('\n')
          : `[⛓️ Supply Chain, Peer Comparison & Competitors]:\n` +
              peers.map((r, i) => `  - [${r.title}] ${r.description}`).join('\n')
      )
    }

    if (macro && macro.length > 0) {
      sections.push(
        isChinese
          ? `【🏦 總體經濟、美債利率與產業環境】:\n` +
              macro.map((r, i) => `  - [${r.title}] ${r.description}`).join('\n')
          : `[🏦 Macroeconomics, Treasury Yields & Monetary Policy]:\n` +
              macro.map((r, i) => `  - [${r.title}] ${r.description}`).join('\n')
      )
    }

    if (news && news.length > 0) {
      sections.push(
        isChinese
          ? `【📰 最新新聞、法人籌碼與重大事件】:\n` +
              news.map((r, i) => `  - [${r.title}] ${r.description}`).join('\n')
          : `[📰 Breaking Financial News & Institutional Flows]:\n` +
              news.map((r, i) => `  - [${r.title}] ${r.description}`).join('\n')
      )
    }

    if (sections.length > 0) {
      return sections.join('\n\n')
    }
  } catch (err) {
    console.warn('[fetchLiveFinancialIntelligence] Failed:', err)
  }

  return ''
}

// Backward-compatible alias for existing callers
export const fetchLiveStockContext = fetchLiveFinancialIntelligence
