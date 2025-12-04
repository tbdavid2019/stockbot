'use client'

import React, { useEffect, useMemo, useRef, useState, memo } from 'react'

type MarketPreset = {
  id: string
  label: string
  dataSource: string
  locale: string
}

// 只保留已確認在 widget 中可用的市場
const MARKET_PRESETS: MarketPreset[] = [
  // 美國 - 已確認可用
  {
    id: 'us_spx',
    label: '美國 (S&P 500)',
    dataSource: 'SPX500',
    locale: 'en'
  },
  // 德國 - 已確認可用
  {
    id: 'de_all',
    label: '德國 (全市場)',
    dataSource: 'AllDE',
    locale: 'de_DE'
  },
  // 澳洲 - 已確認可用
  {
    id: 'au_all',
    label: '澳洲 (全市場)',
    dataSource: 'AllAU',
    locale: 'en'
  },
  // 巴西 - 已確認可用
  {
    id: 'br_all',
    label: '巴西 (全市場)',
    dataSource: 'AllBR',
    locale: 'pt'
  },
  // 加拿大 - 已確認可用
  {
    id: 'ca_all',
    label: '加拿大 (全市場)',
    dataSource: 'AllCA',
    locale: 'en'
  },
  // 以色列 - 已確認可用
  {
    id: 'il_all',
    label: '以色列 (全市場)',
    dataSource: 'AllIL',
    locale: 'he_IL'
  }
]

export function MarketHeatmap({}) {
  const container = useRef<HTMLDivElement>(null)
  const [selectedMarketId, setSelectedMarketId] = useState<string>('us_spx')

  const selectedMarket = useMemo(
    () => MARKET_PRESETS.find((preset) => preset.id === selectedMarketId) ?? MARKET_PRESETS[0],
    [selectedMarketId]
  )

  useEffect(() => {
    if (!container.current || !selectedMarket) return

    const parent = container.current
    parent.innerHTML = ''

    const widget = document.createElement('div')
    widget.className = 'tradingview-widget-container__widget'
    widget.style.height = 'calc(100% - 32px)'
    widget.style.width = '100%'
    parent.appendChild(widget)

    const copyright = document.createElement('div')
    copyright.className = 'tradingview-widget-copyright'
    copyright.innerHTML =
      '<a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank"><span>Track all markets on TradingView</span></a>'
    parent.appendChild(copyright)

    const script = document.createElement('script')
    script.src =
      'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      exchanges: [],
      dataSource: selectedMarket.dataSource,
      grouping: 'sector',
      blockSize: 'market_cap_basic',
      blockColor: 'change',
      locale: selectedMarket.locale,
      symbolUrl: '',
      colorTheme: 'light',
      hasTopBar: true,
      isDataSetEnabled: true,
      isZoomEnabled: true,
      hasSymbolTooltip: true,
      isMonoSize: false,
      width: '100%',
      height: '100%'
    })

    parent.appendChild(script)

    return () => {
      script.remove()
      parent.innerHTML = ''
    }
  }, [selectedMarket])

  return (
    <div style={{ height: '540px' }} className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {MARKET_PRESETS.map((preset) => {
          const isActive = preset.id === selectedMarketId
          return (
            <button
              key={preset.id}
              onClick={() => setSelectedMarketId(preset.id)}
              className={`rounded border px-3 py-1 text-sm transition ${
                isActive
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-slate-50'
              }`}
            >
              {preset.label}
            </button>
          )
        })}
      </div>

      <div
        className="tradingview-widget-container"
        key={selectedMarket.id}
        ref={container}
        style={{ height: '500px', width: '100%' }}
      >
      </div>
    </div>
  )
}

export default memo(MarketHeatmap)
