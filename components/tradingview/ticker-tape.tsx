'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'

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

const INDEX_SYMBOLS = [
  { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500' },
  { proName: 'FOREXCOM:NSXUSD', title: 'Nasdaq 100' },
  { proName: 'BITSTAMP:BTCUSD', title: 'Bitcoin' }
]

export function TickerTape() {
  const tradingViewContainer = useRef<HTMLDivElement>(null)
  const [quotes, setQuotes] = useState<TickerQuote[]>([])
  const { resolvedTheme } = useTheme()

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
      }
    }

    fetchQuotes()
    const refreshTimer = window.setInterval(fetchQuotes, 5 * 60 * 1000)

    return () => {
      isMounted = false
      window.clearInterval(refreshTimer)
    }
  }, [])

  useEffect(() => {
    const currentContainer = tradingViewContainer.current
    if (!currentContainer) return

    currentContainer.innerHTML = ''
    const widget = document.createElement('div')
    widget.className = 'tradingview-widget-container__widget'
    currentContainer.appendChild(widget)

    const script = document.createElement('script')
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbols: INDEX_SYMBOLS,
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: 'adaptive',
      colorTheme: resolvedTheme === 'dark' ? 'dark' : 'light',
      locale: 'zh_TW'
    })
    currentContainer.appendChild(script)

    return () => {
      currentContainer.innerHTML = ''
    }
  }, [resolvedTheme])

  return (
    <div className="mb-2 min-h-16 w-full min-w-0 max-w-full overflow-hidden border-y border-border bg-background">
      <div
        ref={tradingViewContainer}
        className="h-20 min-w-0 overflow-hidden border-b border-border bg-background"
      />

      {quotes.length > 0 && (
        <div className="ticker-viewport flex min-h-12 items-center overflow-hidden py-2">
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
                <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {quote.market === 'TW' ? 'NT$' : '$'}
                  {quote.price ?? '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
