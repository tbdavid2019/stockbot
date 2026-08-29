'use client'

import * as React from 'react'
import { useRef, useEffect, useState } from 'react'
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

interface TradingViewSymbol {
  proName: string
  title?: string
  description?: string
}

const DEFAULT_SYMBOLS: TradingViewSymbol[] = [
  { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500' },
  { proName: 'FOREXCOM:NSXUSD', title: 'Nasdaq 100' },
  { proName: 'BITSTAMP:BTCUSD', title: 'Bitcoin' },
  { title: '台積電 (2330)', proName: 'TWSE:2330' },
  { title: '鴻海 (2317)', proName: 'TWSE:2317' },
  { title: '聯發科 (2454)', proName: 'TWSE:2454' },
  { title: 'Apple (AAPL)', proName: 'NASDAQ:AAPL' },
  { title: 'NVIDIA (NVDA)', proName: 'NASDAQ:NVDA' },
  { title: 'Tesla (TSLA)', proName: 'NASDAQ:TSLA' }
]

function formatProName(symbol: string): string {
  const clean = symbol.trim().toUpperCase()

  // 保留已經完整指定的台股交易所，並支援上市櫃代碼後綴。
  if (/^(TWSE|TPEX):\d{4}$/.test(clean)) {
    return clean
  }
  if (/^\d{4}\.TWO$/.test(clean)) {
    return `TPEX:${clean.slice(0, 4)}`
  }
  if (/^\d{4}(?:\.TW)?$/.test(clean)) {
    return `TWSE:${clean.slice(0, 4)}`
  }
  // 美股特殊代碼
  if (clean === 'BRK-B' || clean === 'BRK/B' || clean === 'BRK.B') {
    return 'NYSE:BRK.B'
  }
  const nasdaqList = [
    'AAPL',
    'MSFT',
    'GOOGL',
    'GOOG',
    'NVDA',
    'TSLA',
    'AMZN',
    'META',
    'AMD',
    'INTC',
    'NFLX',
    'QCOM',
    'AVGO',
    'COST',
    'ASML'
  ]
  if (nasdaqList.includes(clean)) {
    return `NASDAQ:${clean}`
  }
  const nyseList = [
    'LLY',
    'JPM',
    'XOM',
    'V',
    'UNH',
    'WMT',
    'PG',
    'JNJ',
    'MA',
    'HD',
    'CVX',
    'MRK',
    'ABBV',
    'KO',
    'PEP',
    'BAC',
    'DIS'
  ]
  if (nyseList.includes(clean)) {
    return `NYSE:${clean}`
  }
  return clean
}

export function TickerTape() {
  const container = useRef<HTMLDivElement>(null)
  const { theme, resolvedTheme } = useTheme()
  const [symbols, setSymbols] = useState<TradingViewSymbol[]>(DEFAULT_SYMBOLS)

  // 1. 抓取 stock.david888.com 每日最新精選標的
  useEffect(() => {
    let isMounted = true

    async function fetchDailyStocks() {
      try {
        const res = await fetch('/api/dynamic-prompts')
        if (res.ok) {
          const data: DynamicPromptsResponse = await res.json()
          if (!isMounted) return

          const dynamicList: TradingViewSymbol[] = [
            { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500' },
            { proName: 'FOREXCOM:NSXUSD', title: 'Nasdaq 100' },
            { proName: 'BITSTAMP:BTCUSD', title: 'Bitcoin' }
          ]

          // 加入台股當日精選 (前 5 檔)
          if (Array.isArray(data.twStocks) && data.twStocks.length > 0) {
            data.twStocks.slice(0, 6).forEach(stk => {
              dynamicList.push({
                title: `${stk.name} (${stk.symbol})`,
                description: `${stk.name} (${stk.symbol})${stk.price ? ` · NT$${stk.price}` : ''}`,
                proName: formatProName(stk.symbol)
              })
            })
          }

          // 加入美股當日精選 (前 6 檔)
          if (Array.isArray(data.usStocks) && data.usStocks.length > 0) {
            data.usStocks.slice(0, 6).forEach(stk => {
              dynamicList.push({
                title: stk.symbol,
                description: stk.symbol,
                proName: formatProName(stk.symbol)
              })
            })
          }

          if (dynamicList.length > 3) {
            setSymbols(dynamicList)
          }
        }
      } catch (err) {
        console.warn('[TickerTape] Failed to load dynamic tickers:', err)
      }
    }

    fetchDailyStocks()

    return () => {
      isMounted = false
    }
  }, [])

  // 2. 渲染 / 更新 TradingView 跑馬燈小工具
  useEffect(() => {
    const currentContainer = container.current
    if (!currentContainer) return

    // 清空舊組件與 script
    currentContainer.innerHTML = ''

    const widgetDiv = document.createElement('div')
    widgetDiv.className = 'tradingview-widget-container__widget'
    currentContainer.appendChild(widgetDiv)

    const colorTheme =
      resolvedTheme === 'dark' || theme === 'dark' ? 'dark' : 'light'

    const script = document.createElement('script')
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbols,
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: 'adaptive',
      colorTheme,
      locale: 'zh_TW'
    })

    currentContainer.appendChild(script)

    return () => {
      if (currentContainer) {
        currentContainer.innerHTML = ''
      }
    }
  }, [symbols, theme, resolvedTheme])

  return (
    <div
      className="tradingview-widget-container mb-2 md:min-h-20 min-h-28 w-full"
      ref={container}
    >
      <div className="tradingview-widget-container__widget"></div>
    </div>
  )
}
