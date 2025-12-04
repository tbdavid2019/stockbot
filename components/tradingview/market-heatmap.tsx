'use client'

import React, { useEffect, useMemo, useRef, useState, memo } from 'react'

type MarketPreset = {
  id: string
  label: string
  dataSource: string
  locale: string
}

const MARKET_PRESETS: MarketPreset[] = [
  {
    id: 'us',
    label: '美國 (S&P 500)',
    dataSource: 'SPX500',
    locale: 'en'
  },
  {
    id: 'tw',
    label: '台灣 (全市場)',
    dataSource: 'AllTW',
    locale: 'zh_TW'
  },
  {
    id: 'jp',
    label: '日本 (全市場)',
    dataSource: 'AllJP',
    locale: 'ja'
  },
  {
    id: 'hk',
    label: '香港 (全市場)',
    dataSource: 'AllHK',
    locale: 'zh_HK'
  },
  {
    id: 'tw50',
    label: '台灣50 (FTSE TWSE Taiwan 50)',
    dataSource: 'TW50',
    locale: 'zh_TW'
  },
  {
    id: 'uk',
    label: '英國 (全市場)',
    dataSource: 'AllUK',
    locale: 'en'
  },
  {
    id: 'de',
    label: '德國 (全市場)',
    dataSource: 'AllDE',
    locale: 'de_DE'
  },
  {
    id: 'fr',
    label: '法國 (全市場)',
    dataSource: 'AllFR',
    locale: 'fr'
  },
  {
    id: 'il',
    label: '以色列 (全市場)',
    dataSource: 'AllIL',
    locale: 'he_IL'
  },
  {
    id: 'kr',
    label: '韓國 (全市場)',
    dataSource: 'AllKR',
    locale: 'ko'
  },
  {
    id: 'cn',
    label: '中國 (全市場)',
    dataSource: 'AllCN',
    locale: 'zh_CN'
  },
  {
    id: 'au',
    label: '澳洲 (全市場)',
    dataSource: 'AllAU',
    locale: 'en'
  },
  {
    id: 'in',
    label: '印度 (全市場)',
    dataSource: 'AllIN',
    locale: 'en'
  },
  {
    id: 'br',
    label: '巴西 (全市場)',
    dataSource: 'AllBR',
    locale: 'pt'
  },
  {
    id: 'ca',
    label: '加拿大 (全市場)',
    dataSource: 'AllCA',
    locale: 'en'
  }
]

export function MarketHeatmap({}) {
  const container = useRef<HTMLDivElement>(null)
  const [selectedMarketId, setSelectedMarketId] = useState<string>('us')

  const selectedMarket = useMemo(
    () => MARKET_PRESETS.find((preset) => preset.id === selectedMarketId) ?? MARKET_PRESETS[0],
    [selectedMarketId]
  )

  useEffect(() => {
    if (!container.current || !selectedMarket) return

    const widgetContainer = container.current.querySelector<HTMLElement>(
      '.tradingview-widget-container__widget'
    )
    if (widgetContainer) {
      widgetContainer.innerHTML = ''
    }

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
      hasTopBar: false,
      isDataSetEnabled: false,
      isZoomEnabled: true,
      hasSymbolTooltip: true,
      isMonoSize: false,
      width: '100%',
      height: '100%'
    })

    container.current.appendChild(script)

    return () => {
      script.remove()
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
        ref={container}
        style={{ height: '500px', width: '100%' }}
      >
        <div
          className="tradingview-widget-container__widget"
          style={{ height: 'calc(100% - 32px)', width: '100%' }}
        ></div>
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

export default memo(MarketHeatmap)
