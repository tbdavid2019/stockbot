'use client'

import { useEffect, useState } from 'react'

interface StockItem {
  symbol: string
  name: string
  price?: string
}

interface DynamicPromptsResponse {
  usStocks?: StockItem[]
  twStocks?: StockItem[]
}

interface TickerQuote extends StockItem {
  market: 'TW' | 'US'
}

export function TickerTape() {
  const [quotes, setQuotes] = useState<TickerQuote[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function fetchQuotes() {
      try {
        const res = await fetch('/api/dynamic-prompts', { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data: DynamicPromptsResponse = await res.json()
        if (!isMounted) return

        const twQuotes = Array.isArray(data.twStocks)
          ? data.twStocks
              .slice(0, 6)
              .map(stock => ({ ...stock, market: 'TW' as const }))
          : []
        const usQuotes = Array.isArray(data.usStocks)
          ? data.usStocks
              .slice(0, 6)
              .map(stock => ({ ...stock, market: 'US' as const }))
          : []

        setQuotes([...twQuotes, ...usQuotes])
      } catch (error) {
        console.warn('[TickerTape] Failed to load live quotes:', error)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    fetchQuotes()
    const refreshTimer = window.setInterval(fetchQuotes, 5 * 60 * 1000)

    return () => {
      isMounted = false
      window.clearInterval(refreshTimer)
    }
  }, [])

  return (
    <div className="mb-2 min-h-16 w-full min-w-0 max-w-full overflow-hidden border-y border-slate-100 bg-white">
      <div className="flex min-w-max items-center gap-2 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {isLoading && (
          <span className="px-2 text-sm text-slate-400">載入即時股價…</span>
        )}

        {!isLoading && quotes.length === 0 && (
          <span className="px-2 text-sm text-slate-400">目前暫無即時報價</span>
        )}

        {quotes.map((quote, index) => (
          <div
            key={`${quote.market}-${quote.symbol}-${index}`}
            className="flex shrink-0 items-center gap-2 border-r border-slate-200 px-3 text-sm last:border-r-0"
          >
            <span className="font-medium text-slate-700">
              {quote.name} ({quote.symbol})
            </span>
            <span className="font-semibold tabular-nums text-slate-900">
              {quote.market === 'TW' ? 'NT$' : '$'}
              {quote.price ?? '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
