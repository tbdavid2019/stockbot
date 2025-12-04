'use client'

import React, { useEffect, useMemo, useRef, useState, memo } from 'react'

type MarketPreset = {
  id: string
  label: string
  dataSource: string
  locale: string
}

const MARKET_PRESETS: MarketPreset[] = [
  // 美國
  {
    id: 'us_spx',
    label: '美國 (S&P 500)',
    dataSource: 'SPX500',
    locale: 'en'
  },
  {
    id: 'us_nasdaq100',
    label: '美國 (Nasdaq 100)',
    dataSource: 'NASDAQ100',
    locale: 'en'
  },
  {
    id: 'us_nasdaq',
    label: '美國 (納斯達克綜合)',
    dataSource: 'NASDAQCOMP',
    locale: 'en'
  },
  {
    id: 'us_djia',
    label: '美國 (道瓊工業)',
    dataSource: 'DJIA',
    locale: 'en'
  },
  {
    id: 'us_russell2000',
    label: '美國 (Russell 2000)',
    dataSource: 'RUA2000',
    locale: 'en'
  },
  {
    id: 'us_all',
    label: '美國 (全部)',
    dataSource: 'AllUS',
    locale: 'en'
  },
  // 德國
  {
    id: 'de_dax',
    label: '德國 (DAX)',
    dataSource: 'DAX',
    locale: 'de_DE'
  },
  {
    id: 'de_all',
    label: '德國 (全市場)',
    dataSource: 'AllDE',
    locale: 'de_DE'
  },
  // 澳洲
  {
    id: 'au_asx200',
    label: '澳洲 (ASX 200)',
    dataSource: 'ASX200',
    locale: 'en'
  },
  {
    id: 'au_all',
    label: '澳洲 (全市場)',
    dataSource: 'AllAU',
    locale: 'en'
  },
  // 巴西
  {
    id: 'br_bovespa',
    label: '巴西 (Bovespa)',
    dataSource: 'IBOV',
    locale: 'pt'
  },
  {
    id: 'br_all',
    label: '巴西 (全市場)',
    dataSource: 'AllBR',
    locale: 'pt'
  },
  // 加拿大
  {
    id: 'ca_tsx',
    label: '加拿大 (TSX)',
    dataSource: 'TSX',
    locale: 'en'
  },
  {
    id: 'ca_all',
    label: '加拿大 (全市場)',
    dataSource: 'AllCA',
    locale: 'en'
  },
  // 以色列
  {
    id: 'il_ta35',
    label: '以色列 (TA-35)',
    dataSource: 'TA35',
    locale: 'he_IL'
  },
  {
    id: 'il_all',
    label: '以色列 (全市場)',
    dataSource: 'AllIL',
    locale: 'he_IL'
  },
  // 南韓
  {
    id: 'kr_kospi',
    label: '南韓 (KOSPI)',
    dataSource: 'KOSPI',
    locale: 'ko'
  },
  {
    id: 'kr_kosdaq',
    label: '南韓 (KOSDAQ)',
    dataSource: 'KOSDAQ',
    locale: 'ko'
  },
  {
    id: 'kr_all',
    label: '南韓 (全市場)',
    dataSource: 'AllKR',
    locale: 'ko'
  },
  // 印度
  {
    id: 'in_sensex',
    label: '印度 (Sensex)',
    dataSource: 'SENSEX',
    locale: 'en'
  },
  // 印尼
  {
    id: 'id_idx30',
    label: '印尼 (IDX 30)',
    dataSource: 'IDX30',
    locale: 'en'
  },
  {
    id: 'id_all',
    label: '印尼 (全市場)',
    dataSource: 'AllID',
    locale: 'en'
  },
  // 瑞士
  {
    id: 'ch_smi',
    label: '瑞士 (SMI)',
    dataSource: 'SMI',
    locale: 'en'
  },
  {
    id: 'ch_all',
    label: '瑞士 (全市場)',
    dataSource: 'AllCH',
    locale: 'en'
  },
  // 西班牙
  {
    id: 'es_ibex',
    label: '西班牙 (IBEX 35)',
    dataSource: 'IBEX35',
    locale: 'es'
  },
  {
    id: 'es_all',
    label: '西班牙 (全市場)',
    dataSource: 'AllES',
    locale: 'es'
  },
  // 義大利
  {
    id: 'it_mib',
    label: '義大利 (FTSE MIB)',
    dataSource: 'FTSEMIB',
    locale: 'it'
  },
  {
    id: 'it_all',
    label: '義大利 (全市場)',
    dataSource: 'AllIT',
    locale: 'it'
  },
  // 瑞典
  {
    id: 'se_omx30',
    label: '瑞典 (OMX30)',
    dataSource: 'OMX30',
    locale: 'sv_SE'
  },
  {
    id: 'se_all',
    label: '瑞典 (全市場)',
    dataSource: 'AllSE',
    locale: 'sv_SE'
  },
  // 芬蘭
  {
    id: 'fi_omx25',
    label: '芬蘭 (OMX25)',
    dataSource: 'OMXH25',
    locale: 'en'
  },
  {
    id: 'fi_all',
    label: '芬蘭 (全市場)',
    dataSource: 'AllFI',
    locale: 'en'
  },
  // 丹麥
  {
    id: 'dk_omx25',
    label: '丹麥 (OMX25)',
    dataSource: 'OMXC25',
    locale: 'en'
  },
  {
    id: 'dk_all',
    label: '丹麥 (全市場)',
    dataSource: 'AllDK',
    locale: 'en'
  },
  // 波蘭
  {
    id: 'pl_wig20',
    label: '波蘭 (WIG20)',
    dataSource: 'WIG20',
    locale: 'pl'
  },
  {
    id: 'pl_all',
    label: '波蘭 (全市場)',
    dataSource: 'AllPL',
    locale: 'pl'
  },
  // 希臘
  {
    id: 'gr_athex',
    label: '希臘 (ATHEX)',
    dataSource: 'ATHEX',
    locale: 'en'
  },
  {
    id: 'gr_all',
    label: '希臘 (全市場)',
    dataSource: 'AllGR',
    locale: 'en'
  },
  // 匈牙利
  {
    id: 'hu_bux',
    label: '匈牙利 (BUX)',
    dataSource: 'BUX',
    locale: 'en'
  },
  {
    id: 'hu_all',
    label: '匈牙利 (全市場)',
    dataSource: 'AllHU',
    locale: 'en'
  },
  // 阿根廷
  {
    id: 'ar_merval',
    label: '阿根廷 (MERVAL)',
    dataSource: 'MERVAL',
    locale: 'es'
  },
  {
    id: 'ar_all',
    label: '阿根廷 (全市場)',
    dataSource: 'AllAR',
    locale: 'es'
  },
  // 墨西哥
  {
    id: 'mx_biva',
    label: '墨西哥 (BIVA)',
    dataSource: 'BIVA',
    locale: 'es'
  },
  // 埃及
  {
    id: 'eg_egx30',
    label: '埃及 (EGX 30)',
    dataSource: 'EGX30',
    locale: 'en'
  },
  {
    id: 'eg_all',
    label: '埃及 (全市場)',
    dataSource: 'AllEG',
    locale: 'en'
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
      hasTopBar: false,
      isDataSetEnabled: false,
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
