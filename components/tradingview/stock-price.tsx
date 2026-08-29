'use client'

import React, { useEffect, useRef, memo } from 'react'
import { useTheme } from 'next-themes'
import { formatStockSymbol } from '@/lib/utils'

export function StockPrice({ props: symbol }: { props: string }) {
  const container = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    if (!container.current) return
    // 格式化股票代號，特別處理台灣股票代號
    const formattedSymbol = formatStockSymbol(symbol)

    const script = document.createElement('script')
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: formattedSymbol,
      interval: 'D',
      timezone: 'Asia/Taipei',
      theme: resolvedTheme === 'dark' ? 'dark' : 'light',
      style: '1',
      locale: 'zh_TW',
      backgroundColor:
        resolvedTheme === 'dark'
          ? 'rgba(19, 23, 34, 1)'
          : 'rgba(255, 255, 255, 1)',
      gridColor:
        resolvedTheme === 'dark'
          ? 'rgba(42, 46, 57, 0.6)'
          : 'rgba(247, 247, 247, 1)',
      withdateranges: true,
      hide_side_toolbar: true,
      allow_symbol_change: true,
      calendar: false,
      hide_top_toolbar: false,
      support_host: 'https://www.tradingview.com'
    })

    container.current.appendChild(script)

    return () => {
      if (container.current && script.parentNode === container.current) {
        container.current.removeChild(script)
      }
    }
  }, [symbol, resolvedTheme])

  return (
    <div style={{ height: '500px' }}>
      <div className="tradingview-widget-container" ref={container}>
        <div className="tradingview-widget-container__widget"></div>
        <div className="tradingview-widget-copyright">
          <a
            href="https://www.tradingview.com/"
            rel="noopener nofollow"
            target="_blank"
          >
            <span className="">Track all markets on TradingView</span>
          </a>
        </div>
      </div>
    </div>
  )
}

export default memo(StockPrice)
