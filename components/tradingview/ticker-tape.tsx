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

type QuoteMarket = 'TW' | 'US' | 'INDEX' | 'CRYPTO'

interface TickerQuote extends StockItem {
  market: QuoteMarket
}

const DEFAULT_MARKET_QUOTES: TickerQuote[] = [
  { symbol: 'SPX500', name: 'S&P 500', market: 'INDEX' },
  { symbol: 'NASDAQ100', name: 'Nasdaq 100', market: 'INDEX' },
  { symbol: 'BTCUSD', name: 'Bitcoin', market: 'CRYPTO' }
]

function quotePrefix(market: QuoteMarket) {
  if (market === 'TW') return 'NT$'
  if (market === 'US') return '$'
  return ''
}

export function TickerTape() {
  const [quotes, setQuotes] = useState<TickerQuote[]>(DEFAULT_MARKET_QUOTES)

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

        setQuotes([...DEFAULT_MARKET_QUOTES, ...twQuotes, ...usQuotes])
      } catch (error) {
        console.warn('[TickerTape] Failed to load live quotes:', error)
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
    <div className="mb-2 min-h-16 w-full min-w-0 max-w-full overflow-hidden border-y border-slate-100 bg-white dark:border-zinc-800 dark:bg-background">
      <div className="ticker-viewport flex items-center overflow-hidden py-2">
        <div className="ticker-track flex min-w-max shrink-0 items-center hover:[animation-play-state:paused]">
          {[...quotes, ...quotes].map((quote, index) => (
            <div
              key={`${quote.market}-${quote.symbol}-${index}`}
              className="flex shrink-0 items-center gap-2 border-r border-slate-200 px-4 text-sm dark:border-zinc-700"
              aria-hidden={index >= quotes.length}
            >
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {quote.name} ({quote.symbol})
              </span>
              {quote.price ? (
                <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {quotePrefix(quote.market)}
                  {quote.price}
                </span>
              ) : (
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  指數
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
