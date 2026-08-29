const DEFAULT_ANSWERBOOK_BASE_URL = 'https://answerbook.david888.com'

const TAIWAN_CATALOGS = ['TW0050', 'TW0051']
const US_CATALOGS = ['SP500', 'nasdaq100', 'dowjones']

function parseCatalog(payload: unknown): Map<string, string> {
  const stocks = new Map<string, string>()
  if (!payload || typeof payload !== 'object') return stocks

  for (const value of Object.values(payload as Record<string, unknown>)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue
    for (const [symbol, name] of Object.entries(
      value as Record<string, unknown>
    )) {
      if (typeof name === 'string' && name.trim()) {
        stocks.set(symbol.replace('.', '-').toUpperCase(), name.trim())
      }
    }
  }

  return stocks
}

export async function resolveMarketCatalogName(
  symbol: string
): Promise<string | undefined> {
  const code = symbol.split(':').pop()?.replace('.TW', '').toUpperCase()
  if (!code) return undefined

  const catalogs = /^\d{4}$/.test(code) ? TAIWAN_CATALOGS : US_CATALOGS
  const baseUrl = (
    process.env.ANSWERBOOK_BASE_URL || DEFAULT_ANSWERBOOK_BASE_URL
  ).replace(/\/+$/, '')

  const responses = await Promise.allSettled(
    catalogs.map(async catalog => {
      const response = await fetch(`${baseUrl}/${catalog}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(1800),
        next: { revalidate: 3600 }
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return parseCatalog(await response.json())
    })
  )

  for (const response of responses) {
    if (response.status !== 'fulfilled') continue
    const name = response.value.get(code)
    if (name) return name
  }

  return undefined
}
