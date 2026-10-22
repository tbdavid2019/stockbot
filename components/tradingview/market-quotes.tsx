'use client'

import { useEffect, useState } from 'react'

export interface MarketQuote {
  symbol: string
  name: string
  market: 'TW' | 'US'
  price?: string
  change?: number
  changePercent?: number
}

const DEFAULT_QUOTES: MarketQuote[] = [
  { symbol: '2330', name: '台積電', market: 'TW', price: '2390', change: -30, changePercent: -1.24 },
  { symbol: 'NVDA', name: 'NVIDIA', market: 'US', price: '221.97', change: 5.5, changePercent: 2.54 },
  { symbol: '2317', name: '鴻海', market: 'TW', price: '245.5', change: -4.5, changePercent: -1.8 },
  { symbol: 'AAPL', name: 'Apple', market: 'US', price: '343.99', change: 4.49, changePercent: 1.32 },
  { symbol: '2454', name: '聯發科', market: 'TW', price: '4035', change: -105, changePercent: -2.54 },
  { symbol: 'MSFT', name: 'Microsoft', market: 'US', price: '532.95', change: 1.08, changePercent: 0.2 },
  { symbol: '2382', name: '廣達', market: 'TW', price: '322.5', change: -6, changePercent: -1.83 },
  { symbol: 'TSLA', name: 'Tesla', market: 'US', price: '386.47', change: 12.76, changePercent: 3.41 },
  { symbol: '2881', name: '富邦金', market: 'TW', price: '159', change: 0.5, changePercent: 0.32 },
  { symbol: 'GOOGL', name: 'Alphabet', market: 'US', price: '334.76', change: -5.51, changePercent: -1.62 },
  { symbol: '2603', name: '長榮', market: 'TW', price: '258.5', change: 1, changePercent: 0.39 },
  { symbol: 'META', name: 'Meta', market: 'US', price: '697.52', change: 3.27, changePercent: 0.47 }
]

export function MarketQuotes({
  onSelect
}: {
  onSelect?: (quote: MarketQuote) => void
}) {
  const [quotes, setQuotes] = useState<MarketQuote[]>(DEFAULT_QUOTES)

  useEffect(() => {
    let isMounted = true

    async function fetchQuotes() {
      try {
        const res = await fetch('/api/market-quotes')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data = await res.json()
        if (!isMounted) return

        if (Array.isArray(data.quotes) && data.quotes.length > 0) {
          setQuotes(data.quotes)
        }
      } catch (error) {
        console.warn('[MarketQuotes] Failed to load live quotes from /api/market-quotes:', error)
      }
    }

    fetchQuotes()
    const refreshTimer = window.setInterval(fetchQuotes, 60 * 1000)

    return () => {
      isMounted = false
      window.clearInterval(refreshTimer)
    }
  }, [])

  if (quotes.length === 0) return null

  return (
    <div className="w-full overflow-hidden border-t border-border/70 bg-card/50 py-1 sm:py-1.5">
      <div className="ticker-track flex min-w-max shrink-0 items-center hover:[animation-play-state:paused]">
        {[...quotes, ...quotes].map((quote, index) => {
          const isPositive = typeof quote.changePercent === 'number' && quote.changePercent >= 0
          const hasChange = typeof quote.changePercent === 'number'

          return (
            <button
              type="button"
              key={`${quote.market}-${quote.symbol}-${index}`}
              className="flex shrink-0 items-center gap-1.5 border-r border-border/60 px-3 text-left text-xs transition-colors hover:bg-muted/60 sm:gap-2 sm:px-3.5"
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
              title={`${quote.name} (${quote.symbol}) 最新行情與財務情報`}
            >
              <span className="font-semibold text-foreground">
                {quote.name}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                ({quote.symbol})
              </span>
              <span className="font-mono font-bold tabular-nums text-foreground">
                {quote.price
                  ? `${quote.market === 'TW' ? 'NT$' : '$'}${Number(quote.price).toLocaleString('en-US', { minimumFractionDigits: quote.market === 'TW' ? 0 : 2, maximumFractionDigits: 2 })}`
                  : '—'}
              </span>
              {hasChange && (
                <span
                  className={`font-mono text-[11px] font-semibold tabular-nums ${
                    isPositive
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-[#A9471D] dark:text-[#E07A5F]'
                  }`}
                >
                  {isPositive ? '+' : ''}
                  {quote.changePercent?.toFixed(2)}%
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
