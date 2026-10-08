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

const DEFAULT_QUOTES: MarketQuote[] = [
  { symbol: '2330', name: '台積電', market: 'TW' },
  { symbol: 'NVDA', name: 'NVIDIA', market: 'US' },
  { symbol: '2317', name: '鴻海', market: 'TW' },
  { symbol: 'AAPL', name: 'Apple', market: 'US' },
  { symbol: '2454', name: '聯發科', market: 'TW' },
  { symbol: 'MSFT', name: 'Microsoft', market: 'US' },
  { symbol: '2382', name: '廣達', market: 'TW' },
  { symbol: 'TSLA', name: 'Tesla', market: 'US' },
  { symbol: '2881', name: '富邦金', market: 'TW' },
  { symbol: 'GOOGL', name: 'Alphabet', market: 'US' },
  { symbol: '2603', name: '長榮', market: 'TW' },
  { symbol: 'META', name: 'Meta', market: 'US' }
]

function shuffleQuotes(quotes: MarketQuote[]) {
  const shuffled = [...quotes]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const currentQuote = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = currentQuote
  }
  return shuffled
}

function pickRandomQuotes(quotes: MarketQuote[], limit: number) {
  return shuffleQuotes(quotes).slice(0, limit)
}

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
        const res = await fetch('/api/dynamic-prompts', { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const data: DynamicPromptsResponse = await res.json()
        if (!isMounted) return

        const twQuotes = Array.isArray(data.twStocks)
          ? data.twStocks
              .filter(stock => stock.price)
              .map(stock => ({ ...stock, market: 'TW' as const }))
          : []
        const usQuotes = Array.isArray(data.usStocks)
          ? data.usStocks
              .filter(stock => stock.price)
              .map(stock => ({ ...stock, market: 'US' as const }))
          : []

        const nextQuotes = [
          ...pickRandomQuotes(twQuotes, 12),
          ...pickRandomQuotes(usQuotes, 12)
        ]
        if (nextQuotes.length > 0) {
          setQuotes(nextQuotes)
        }
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
    <div className="w-full overflow-hidden border-t border-border">
      <div className="ticker-track flex min-w-max shrink-0 items-center hover:[animation-play-state:paused]">
        {[...quotes, ...quotes].map((quote, index) => (
          <button
            type="button"
            key={`${quote.market}-${quote.symbol}-${index}`}
            className="flex shrink-0 items-center gap-1.5 border-r border-border px-3 text-left text-xs transition-colors hover:bg-muted/60 sm:gap-2 sm:px-4 sm:text-sm"
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
              {quote.price
                ? `${quote.market === 'TW' ? 'NT$' : '$'}${quote.price}`
                : '—'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
