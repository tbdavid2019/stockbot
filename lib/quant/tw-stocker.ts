/**
 * tw_stocker integration - voidful/tw_stocker Taiwan Market Historical Data Adapter
 * Provides zero-key, high-availability fallback for Taiwan stock & ETF OHLCV history.
 */

import type { OHLCVPoint } from '@/lib/quant/sepa'

const TW_STOCKER_RAW_BASE =
  'https://raw.githubusercontent.com/voidful/tw_stocker/main/data'

export function extractTaiwanStockCode(symbol: string): string | null {
  const match = symbol.match(/(?:TWSE:|TPEX:|^)(\d{4,6})(?:\.TW|\.TWO)?$/i)
  return match ? match[1] : null
}

export async function fetchTwStockerDailyPrices(
  symbol: string
): Promise<OHLCVPoint[]> {
  const code = extractTaiwanStockCode(symbol)
  if (!code) return []

  try {
    const res = await fetch(`${TW_STOCKER_RAW_BASE}/${code}.csv`, {
      headers: {
        Accept: 'text/plain',
        'User-Agent': 'stockbot-tw-stocker/2.0'
      },
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 3600 }
    })

    if (!res.ok) return []

    const text = await res.text()
    const lines = text.trim().split('\n')
    if (lines.length < 2) return []

    const header = lines[0].toLowerCase().split(',')
    const dateIdx = header.findIndex(h => h.includes('date'))
    const openIdx = header.findIndex(h => h.trim() === 'open')
    const highIdx = header.findIndex(h => h.trim() === 'high')
    const lowIdx = header.findIndex(h => h.trim() === 'low')
    const closeIdx = header.findIndex(h => h.trim() === 'close' || h.trim() === 'adj close')
    const volIdx = header.findIndex(h => h.trim() === 'volume')

    if (dateIdx === -1 || closeIdx === -1) return []

    // Map aggregated daily bars
    const dailyMap = new Map<string, { open: number; high: number; low: number; close: number; volume: number }>()

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',')
      if (parts.length < 5) continue

      const rawDate = parts[dateIdx].trim()
      const dateStr = rawDate.slice(0, 10)
      const open = Number(parts[openIdx])
      const high = Number(parts[highIdx])
      const low = Number(parts[lowIdx])
      const close = Number(parts[closeIdx])
      const vol = Number(parts[volIdx]) || 0

      if (!Number.isFinite(close) || !Number.isFinite(high) || !Number.isFinite(low)) continue

      const existing = dailyMap.get(dateStr)
      if (!existing) {
        dailyMap.set(dateStr, {
          open: Number.isFinite(open) ? open : close,
          high,
          low,
          close,
          volume: vol
        })
      } else {
        existing.high = Math.max(existing.high, high)
        existing.low = Math.min(existing.low, low)
        existing.close = close
        existing.volume += vol
      }
    }

    const points: OHLCVPoint[] = Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, d]) => ({
        date,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume
      }))

    return points
  } catch (err) {
    console.warn(`[tw_stocker] Failed to fetch data for ${symbol}:`, err)
    return []
  }
}
