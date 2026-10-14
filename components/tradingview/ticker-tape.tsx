'use client'

import { useEffect, useRef, useState } from 'react'
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
  const [widgetReady, setWidgetReady] = useState(false)

  useEffect(() => {
    const currentContainer = tradingViewContainer.current
    if (!currentContainer) return

    setWidgetReady(false)
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
      // Let TradingView paint its own themed surface. A transparent iframe
      // can fall back to a white canvas in dark mode.
      isTransparent: false,
      displayMode: 'compact',
      colorTheme: resolvedTheme === 'dark' ? 'dark' : 'light',
      locale: 'zh_TW'
    })
    const readyTimer = window.setInterval(() => {
      if (currentContainer.querySelector('iframe')) {
        setWidgetReady(true)
        window.clearInterval(readyTimer)
      }
    }, 100)
    currentContainer.appendChild(script)

    return () => {
      window.clearInterval(readyTimer)
      currentContainer.innerHTML = ''
    }
  }, [resolvedTheme])

  return (
    <div className="sticky top-0 z-40 w-full min-w-0 max-w-full overflow-hidden border-b border-border bg-background/95 shadow-sm backdrop-blur-xl">
      <div
        ref={tradingViewContainer}
        aria-hidden={!widgetReady}
        className={`min-h-14 min-w-0 overflow-hidden bg-background sm:min-h-20 transition-opacity duration-150 ${widgetReady ? 'opacity-100' : 'opacity-0'}`}
      />
      <MarketQuotes />
    </div>
  )
}
