'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'
import { MarketQuotes } from '@/components/tradingview/market-quotes'

const INDEX_SYMBOLS = [
  { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500' },
  { proName: 'FOREXCOM:NSXUSD', title: 'Nasdaq 100' },
  { proName: 'BITSTAMP:BTCUSD', title: 'Bitcoin' }
]

export function TickerTape() {
  const tradingViewContainer = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()

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
      displayMode: 'compact',
      colorTheme: resolvedTheme === 'dark' ? 'dark' : 'light',
      locale: 'zh_TW'
    })
    currentContainer.appendChild(script)

    return () => {
      currentContainer.innerHTML = ''
    }
  }, [resolvedTheme])

  return (
    <div className="sticky top-0 z-40 w-full min-w-0 max-w-full overflow-hidden border-b border-border bg-background/95 shadow-sm backdrop-blur-xl">
      <div
        ref={tradingViewContainer}
        className="min-h-14 min-w-0 overflow-hidden bg-background sm:min-h-20"
      />
      <MarketQuotes />
    </div>
  )
}
