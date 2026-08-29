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

const FALLBACK_QUOTES: MarketQuote[] = [
  { market: 'TW', symbol: '2330', name: '台積電', price: '2400' },
  { market: 'TW', symbol: '1216', name: '統一', price: '77.4' },
  { market: 'TW', symbol: '2882', name: '國泰金', price: '103' },
  { market: 'TW', symbol: '2344', name: '華邦電', price: '179' },
  { market: 'US', symbol: 'AAPL', name: 'AAPL', price: '309.90' },
  { market: 'US', symbol: 'NVDA', name: 'NVDA', price: '213.05' },
  { market: 'US', symbol: 'MSFT', name: 'MSFT', price: '450.00' },
  { market: 'US', symbol: 'TSLA', name: 'TSLA', price: '220.00' }
]

export function MarketQuotes({
  onSelect
}: {
  onSelect?: (quote: MarketQuote) => void
}) {
  const [quotes, setQuotes] = useState<MarketQuote[]>(FALLBACK_QUOTES)

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

        const nextQuotes = [...twQuotes, ...usQuotes]
        setQuotes(nextQuotes.length > 0 ? nextQuotes : FALLBACK_QUOTES)
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

  return (
    <div className="w-full overflow-hidden border-t border-border">
      <div className="ticker-track flex min-w-max shrink-0 items-center hover:[animation-play-state:paused]">
        {[...quotes, ...quotes].map((quote, index) => (
          <button
            type="button"
            key={`${quote.market}-${quote.symbol}-${index}`}
            className="flex shrink-0 items-center gap-2 border-r border-border px-4 text-left text-sm transition-colors hover:bg-muted/60"
            aria-hidden={index >= quotes.length}
            tabIndex={index >= quotes.length ? -1 : 0}
            onClick={() => {
              if (onSelect) {
                onSelect(quote)
              } else {
                window.dispatchEvent(
                  new CustomEvent<MarketQuote>('stockbot-market-quote', {
                    detail: quote
                  })
                )
              }
            }}
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
