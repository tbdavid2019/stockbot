'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'

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
    <div className="min-h-14 w-full min-w-0 max-w-full overflow-hidden border-b border-border bg-background">
      <div
        ref={tradingViewContainer}
        className="h-14 min-w-0 overflow-hidden bg-background"
      />
    </div>
  )
}
