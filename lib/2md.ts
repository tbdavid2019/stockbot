/**
 * 2MD Live Financial & Web Search Helper for stockbot
 * Prioritizes Primary (https://2md.aiurl.tw) and falls back to Backups (2md.glsoft.ai, create360.ai).
 */

export interface TwoMDResultItem {
  title: string
  url: string
  description: string
  publisher?: string
}

const ENDPOINTS = [
  process.env.TWOMD_PRIMARY_URL || 'https://2md.aiurl.tw',
  process.env.TWOMD_BACKUP1_URL || 'https://2md.glsoft.ai',
  process.env.TWOMD_BACKUP2_URL || 'https://create360.ai'
]

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
