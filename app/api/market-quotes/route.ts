import { NextResponse } from 'next/server'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

export interface MarketQuoteItem {
  symbol: string
  name: string
  market: 'TW' | 'US'
  yahoo: string
  price: string
  change?: number
  changePercent?: number
}

const DEFAULT_QUOTES: MarketQuoteItem[] = [
  { symbol: '2330', name: '台積電', market: 'TW', yahoo: '2330.TW', price: '2390', change: -30, changePercent: -1.24 },
  { symbol: 'NVDA', name: 'NVIDIA', market: 'US', yahoo: 'NVDA', price: '221.97', change: 5.5, changePercent: 2.54 },
  { symbol: '2317', name: '鴻海', market: 'TW', yahoo: '2317.TW', price: '245.5', change: -4.5, changePercent: -1.8 },
  { symbol: 'AAPL', name: 'Apple', market: 'US', yahoo: 'AAPL', price: '343.99', change: 4.49, changePercent: 1.32 },
  { symbol: '2454', name: '聯發科', market: 'TW', yahoo: '2454.TW', price: '4035', change: -105, changePercent: -2.54 },
  { symbol: 'MSFT', name: 'Microsoft', market: 'US', yahoo: 'MSFT', price: '532.95', change: 1.08, changePercent: 0.2 },
  { symbol: '2382', name: '廣達', market: 'TW', yahoo: '2382.TW', price: '322.5', change: -6, changePercent: -1.83 },
  { symbol: 'TSLA', name: 'Tesla', market: 'US', yahoo: 'TSLA', price: '386.47', change: 12.76, changePercent: 3.41 },
  { symbol: '2881', name: '富邦金', market: 'TW', yahoo: '2881.TW', price: '159', change: 0.5, changePercent: 0.32 },
  { symbol: 'GOOGL', name: 'Alphabet', market: 'US', yahoo: 'GOOGL', price: '334.76', change: -5.51, changePercent: -1.62 },
  { symbol: '2603', name: '長榮', market: 'TW', yahoo: '2603.TW', price: '258.5', change: 1, changePercent: 0.39 },
  { symbol: 'META', name: 'Meta', market: 'US', yahoo: 'META', price: '697.52', change: 3.27, changePercent: 0.47 },
]

let cache = {
  timestamp: 0,
  quotes: DEFAULT_QUOTES
}

const CACHE_TTL_MS = 60 * 1000 // 1 minute cache

export async function GET() {
  const now = Date.now()

  if (cache.timestamp > 0 && now - cache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ quotes: cache.quotes, cached: true }, {
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=120' }
    })
  }

  try {
    const results = await Promise.allSettled(
      DEFAULT_QUOTES.map(async item => {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(item.yahoo)}?range=1d&interval=1d`
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
          },
          signal: AbortSignal.timeout(3000),
          next: { revalidate: 60 }
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const meta = data?.chart?.result?.[0]?.meta
        const rawPrice = meta?.regularMarketPrice
        const prev = meta?.chartPreviousClose || meta?.previousClose
        if (typeof rawPrice !== 'number') return item

        const change = prev ? +(rawPrice - prev).toFixed(2) : undefined
        const changePercent = prev && prev !== 0 && change !== undefined ? +((change / prev) * 100).toFixed(2) : undefined

        return {
          ...item,
          price: String(rawPrice),
          change,
          changePercent
        }
      })
    )

    const updatedQuotes = results.map((result, index) =>
      result.status === 'fulfilled' ? result.value : cache.quotes[index] || DEFAULT_QUOTES[index]
    )

    cache = {
      timestamp: now,
      quotes: updatedQuotes
    }

    return NextResponse.json({ quotes: updatedQuotes, cached: false }, {
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=120' }
    })
  } catch (error) {
    console.warn('[market-quotes] Failed to fetch live quotes, returning cached fallback:', error)
    return NextResponse.json({ quotes: cache.quotes, cached: true, error: true }, {
      headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' }
    })
  }
}
