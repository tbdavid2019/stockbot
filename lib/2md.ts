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
