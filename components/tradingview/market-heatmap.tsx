'use client'

import React, { useEffect, useMemo, useRef, useState, memo } from 'react'

type MarketPreset = {
  id: string
  label: string
  dataSource: string
  locale: string
  region: string
}

type MarketTuple = [
  id: string,
  label: string,
  dataSource: string,
  locale?: string
]

const MARKET_GROUPS: Array<[string, MarketTuple[]]> = [
  [
    '精選指數',
    [
      ['us_spx', '美國 (S&P 500)', 'SPX500'],
      ['us_nasdaq100', '美國 (NASDAQ 100)', 'NASDAQ100'],
      ['us_nasdaq_composite', '美國 (NASDAQ 綜合)', 'NASDAQCOMPOSITE'],
      ['us_dow', '美國 (道瓊)', 'DJDJI'],
      ['tw_50', '台灣 50', 'TW50'],
      ['au_200', '澳洲 (ASX 200)', 'ASX200']
    ]
  ],
  [
    '北美',
    [
      ['us_all', '美國 (全市場)', 'AllUSA'],
      ['ca_all', '加拿大 (全市場)', 'AllCA'],
      ['mx_all', '墨西哥 (全市場)', 'AllMX']
    ]
  ],
  [
    '南美',
    [
      ['ar_all', '阿根廷 (全市場)', 'AllAR', 'es'],
      ['br_all', '巴西 (全市場)', 'AllBR', 'pt'],
      ['cl_all', '智利 (全市場)', 'AllCL', 'es'],
      ['co_all', '哥倫比亞 (全市場)', 'AllCO', 'es'],
      ['pe_all', '秘魯 (全市場)', 'AllPE', 'es'],
      ['ve_all', '委內瑞拉 (全市場)', 'AllVE', 'es']
    ]
  ],
  [
    '歐洲',
    [
      ['eu_all', '歐洲 (全市場)', 'AllEU'],
      ['eu_north', '歐洲北部 (全市場)', 'AllEUN'],
      ['be_all', '比利時 (全市場)', 'AllBE'],
      ['cy_all', '塞浦路斯 (全市場)', 'AllCY'],
      ['de_all', '德國 (全市場)', 'AllDE', 'de_DE'],
      ['dk_all', '丹麥 (全市場)', 'AllDK'],
      ['ee_all', '愛沙尼亞 (全市場)', 'AllEE'],
      ['es_all', '西班牙 (全市場)', 'AllES', 'es'],
      ['fi_all', '芬蘭 (全市場)', 'AllFI'],
      ['fr_all', '法國 (全市場)', 'AllFR', 'fr'],
      ['gr_all', '希臘 (全市場)', 'AllGRC'],
      ['hu_all', '匈牙利 (全市場)', 'AllHU'],
      ['ie_all', '愛爾蘭 (全市場)', 'AllIE'],
      ['is_all', '冰島 (全市場)', 'AllIS'],
      ['it_all', '義大利 (全市場)', 'AllIT', 'it'],
      ['lt_all', '立陶宛 (全市場)', 'AllLT'],
      ['lu_all', '盧森堡 (全市場)', 'AllLU'],
      ['lv_all', '拉脫維亞 (全市場)', 'AllLV'],
      ['nl_all', '荷蘭 (全市場)', 'AllNL'],
      ['no_all', '挪威 (全市場)', 'AllNO'],
      ['pl_all', '波蘭 (全市場)', 'AllPO'],
      ['pt_all', '葡萄牙 (全市場)', 'AllPRT'],
      ['ro_all', '羅馬尼亞 (全市場)', 'AllRO'],
      ['rs_all', '塞爾維亞 (全市場)', 'AllRS'],
      ['ru_all', '俄羅斯 (全市場)', 'AllRU'],
      ['sk_all', '斯洛伐克 (全市場)', 'AllSK'],
      ['ch_all', '瑞士 (全市場)', 'AllCHE'],
      ['se_all', '瑞典 (全市場)', 'AllSWE'],
      ['tr_all', '土耳其 (全市場)', 'ALLTR'],
      ['uk_all', '英國 (全市場)', 'AllUK']
    ]
  ],
  [
    '中東與非洲',
    [
      ['ae_all', '阿聯 (全市場)', 'AllARE'],
      ['eg_all', '埃及 (全市場)', 'AllEG'],
      ['il_all', '以色列 (全市場)', 'AllIL', 'he_IL'],
      ['ke_all', '肯亞 (全市場)', 'AllKE'],
      ['kw_all', '科威特 (全市場)', 'AllKW'],
      ['ma_all', '摩洛哥 (全市場)', 'AllMA'],
      ['ng_all', '奈及利亞 (全市場)', 'AllNGA'],
      ['qa_all', '卡達 (全市場)', 'AllQA'],
      ['sa_all', '沙烏地阿拉伯 (全市場)', 'AllSA'],
      ['za_all', '南非 (全市場)', 'AllZA']
    ]
  ],
  [
    '亞洲與太平洋',
    [
      ['au_all', '澳洲 (全市場)', 'AllAU'],
      ['cn_all', '中國 (全市場)', 'AllCN'],
      ['hk_all', '香港 (全市場)', 'AllHK'],
      ['id_all', '印尼 (全市場)', 'AllID'],
      ['in_all', '印度 (全市場)', 'AllIN'],
      ['jp_all', '日本 (全市場)', 'AllJP'],
      ['kr_all', '南韓 (全市場)', 'AllKR'],
      ['lk_all', '斯里蘭卡 (全市場)', 'AllLKA'],
      ['my_all', '馬來西亞 (全市場)', 'AllMY'],
      ['nz_all', '紐西蘭 (全市場)', 'AllNZ'],
      ['ph_all', '菲律賓 (全市場)', 'AllPH'],
      ['pk_all', '巴基斯坦 (全市場)', 'AllPK'],
      ['sg_all', '新加坡 (全市場)', 'AllSGP'],
      ['th_all', '泰國 (全市場)', 'AllTH'],
      ['tw_all', '台灣 (全市場)', 'AllTW'],
      ['vn_all', '越南 (全市場)', 'AllVN']
    ]
  ]
]

const MARKET_PRESETS: MarketPreset[] = MARKET_GROUPS.flatMap(
  ([region, markets]) =>
    markets.map(([id, label, dataSource, locale = 'en']) => ({
      id,
      label,
      dataSource,
      locale,
      region
    }))
)

export function MarketHeatmap({}) {
  const container = useRef<HTMLDivElement>(null)
  const [selectedMarketId, setSelectedMarketId] = useState<string>('us_spx')

  const selectedMarket = useMemo(
    () =>
      MARKET_PRESETS.find(preset => preset.id === selectedMarketId) ??
      MARKET_PRESETS[0],
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
      <label className="flex min-w-0 items-center gap-2 text-sm text-slate-600">
        <span className="shrink-0">市場</span>
        <select
          value={selectedMarketId}
          onChange={event => setSelectedMarketId(event.target.value)}
          className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          aria-label="選擇熱力圖市場"
        >
          {MARKET_GROUPS.map(([region, markets]) => (
            <optgroup key={region} label={region}>
              {markets.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <span className="hidden shrink-0 text-xs text-slate-400 sm:inline">
          {MARKET_PRESETS.length} 個市場
        </span>
      </label>

      <div
        className="tradingview-widget-container"
        key={selectedMarket.id}
        ref={container}
        style={{ height: '500px', width: '100%' }}
      ></div>
    </div>
  )
}

export default memo(MarketHeatmap)
