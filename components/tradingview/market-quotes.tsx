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

export interface MarketQuote extends StockItem {
  market: 'TW' | 'US'
}

export function MarketQuotes({
  onSelect
}: {
  onSelect: (quote: MarketQuote) => void
}) {
  const [quotes, setQuotes] = useState<MarketQuote[]>([])

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
        console.warn('[MarketQuotes] Failed to load live quotes:', error)
      }
    }

    fetchQuotes()
    const refreshTimer = window.setInterval(fetchQuotes, 5 * 60 * 1000)

    return () => {
      isMounted = false
      window.clearInterval(refreshTimer)
    }
  }, [])

  if (quotes.length === 0) return null

  return (
    <div className="w-full overflow-hidden border-t border-border pt-2">
      <div className="ticker-track flex min-w-max shrink-0 items-center hover:[animation-play-state:paused]">
        {[...quotes, ...quotes].map((quote, index) => (
          <button
            type="button"
            key={`${quote.market}-${quote.symbol}-${index}`}
            className="flex shrink-0 items-center gap-2 border-r border-border px-4 text-left text-sm transition-colors hover:bg-muted/60"
            aria-hidden={index >= quotes.length}
            onClick={() => onSelect(quote)}
            title={`${quote.name} (${quote.symbol}) 最新財務數據`}
          >
            <span className="font-medium text-muted-foreground">
              {quote.name} ({quote.symbol})
            </span>
            <span className="font-mono font-semibold tabular-nums text-foreground">
              {quote.market === 'TW' ? 'NT$' : '$'}
              {quote.price ?? '—'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
