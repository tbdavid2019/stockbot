export interface DailyInstitutionalRecord {
  date: string // e.g. "2026-08-31"
  foreignNet: number // 張數 (lots) or shares for US
  trustNet: number // 投信買賣超張數
  dealerNet: number // 自營商買賣超張數
  dealerProprietary?: number // 自行買賣
  dealerHedge?: number // 避險
  totalNet: number // 三大法人合計
  closePrice?: number
  priceChangePercent?: number
}

export interface InstitutionalFlowResult {
  symbol: string
  companyName: string
  market: 'TWSE' | 'TPEX' | 'US' | 'HKEX' | 'OTHER'
  latestDate: string
  today: {
    foreignNet: number // 張數 (lots)
    trustNet: number
    dealerNet: number
    totalNet: number
  }
  fiveDayCumulative: {
    foreignNet: number
    trustNet: number
    dealerNet: number
    totalNet: number
  }
  twentyDayCumulative?: {
    foreignNet: number
    trustNet: number
    dealerNet: number
    totalNet: number
  }
  streaks: {
    foreign: { days: number; type: 'buy' | 'sell' | 'neutral' }
    trust: { days: number; type: 'buy' | 'sell' | 'neutral' }
    total: { days: number; type: 'buy' | 'sell' | 'neutral' }
  }
  ownership?: {
    foreignPercent?: number // 外資持股比 %
    institutionalPercent?: number // 機構法人持股比 %
    insiderPercent?: number // 內部人持股比 %
  }
  signals: {
    tag: string
    sentiment: 'bullish' | 'bearish' | 'neutral'
    description: string
  }
  history: DailyInstitutionalRecord[]
}

// In-memory cache for recent TWSE and TPEX datasets
const twseCache = new Map<string, { stat: string; data: string[][] }>()
const tpexCache = new Map<string, Array<Record<string, string>>>()

function getRecentTradingDates(count: number = 8): string[] {
  const dates: string[] = []
  const now = new Date()
  let offset = 0
  while (dates.length < count && offset < 20) {
    const d = new Date()
    d.setDate(now.getDate() - offset)
    offset++
    const dayOfWeek = d.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) continue // skip weekends
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    dates.push(`${y}${m}${day}`)
  }
  return dates
}

async function fetchTwseT86(dateStr: string): Promise<string[][] | null> {
  if (twseCache.has(dateStr)) {
    return twseCache.get(dateStr)!.data
  }
  try {
    const res = await fetch(
      `https://www.twse.com.tw/rwd/zh/fund/T86?date=${dateStr}&selectType=ALLBUT0999&response=json`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      }
    )
    if (!res.ok) return null
    const json = await res.json()
    if (json.stat === 'OK' && Array.isArray(json.data) && json.data.length > 0) {
      twseCache.set(dateStr, { stat: json.stat, data: json.data })
      return json.data
    }
  } catch (err) {
    console.warn(`[fetchTwseT86] Failed for ${dateStr}:`, err)
  }
  return null
}

async function fetchTpex3Insti(dateStr: string): Promise<Array<Record<string, string>> | null> {
  if (tpexCache.has(dateStr)) {
    return tpexCache.get(dateStr)!
  }
  try {
    // Try OpenAPI endpoint
    const res = await fetch(
      'https://www.tpex.org.tw/openapi/v1/tpex_3insti_daily_trading',
      {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }
    )
    if (res.ok) {
      const json = await res.json()
      if (Array.isArray(json) && json.length > 0) {
        tpexCache.set(dateStr, json)
        return json
      }
    }
  } catch (err) {
    console.warn(`[fetchTpex3Insti] Failed for ${dateStr}:`, err)
  }
  return null
}

function parseTwseRow(row: string[]): {
  foreignNet: number
  trustNet: number
  dealerNet: number
  dealerProprietary: number
  dealerHedge: number
  totalNet: number
  name: string
} {
  const parseNum = (idx: number) => {
    if (!row[idx]) return 0
    const clean = String(row[idx]).replace(/,/g, '').trim()
    return Math.round((parseInt(clean, 10) || 0) / 1000)
  }
  return {
    name: row[1]?.trim() || '',
    foreignNet: parseNum(4), // 外陸資買賣超
    trustNet: parseNum(10), // 投信買賣超
    dealerNet: parseNum(11), // 自營商買賣超
    dealerProprietary: parseNum(14), // 自行買賣
    dealerHedge: parseNum(17), // 避險
    totalNet: parseNum(18) // 三大法人合計
  }
}

function parseTpexItem(item: Record<string, string>): {
  foreignNet: number
  trustNet: number
  dealerNet: number
  totalNet: number
  name: string
} {
  const parseNum = (val?: string) => {
    if (!val) return 0
    const clean = String(val).replace(/,/g, '').trim()
    return Math.round((parseInt(clean, 10) || 0) / 1000)
  }
  const foreign = parseNum(
    item['Foreign Investors include Mainland Area Investors (Foreign Dealers excluded)-Difference'] ||
    item['ForeignInvestorsInclude MainlandAreaInvestors-Difference']
  )
  const trust = parseNum(
    item['SecuritiesInvestmentTrustCompanies-Difference']
  )
  const dealer = parseNum(
    item['Dealers-Difference']
  )
  const total = parseNum(
    item['TotalDifference']
  )
  return {
    name: item.CompanyName || '',
    foreignNet: foreign,
    trustNet: trust,
    dealerNet: dealer,
    totalNet: total || (foreign + trust + dealer)
  }
}

function computeStreak(records: DailyInstitutionalRecord[], key: 'foreignNet' | 'trustNet' | 'totalNet'): { days: number; type: 'buy' | 'sell' | 'neutral' } {
  if (records.length === 0) return { days: 0, type: 'neutral' }
  const firstVal = records[0][key]
  if (firstVal === 0) return { days: 0, type: 'neutral' }
  const type: 'buy' | 'sell' = firstVal > 0 ? 'buy' : 'sell'
  let count = 0
  for (const rec of records) {
    if (type === 'buy' && rec[key] > 0) count++
    else if (type === 'sell' && rec[key] < 0) count++
    else break
  }
  return { days: count, type }
}

function deriveSignals(
  today: { foreignNet: number; trustNet: number; dealerNet: number; totalNet: number },
  streaks: { foreign: { days: number; type: 'buy' | 'sell' | 'neutral' }; trust: { days: number; type: 'buy' | 'sell' | 'neutral' } },
  fiveDayTotal: number
): { tag: string; sentiment: 'bullish' | 'bearish' | 'neutral'; description: string } {
  const { foreignNet, trustNet, dealerNet, totalNet } = today

  if (foreignNet > 0 && trustNet > 0) {
    return {
      tag: '土洋同買',
      sentiment: 'bullish',
      description: '外資與投信法人同步大幅加碼，法人買盤共識強烈，具備強勁波段動能。'
    }
  }

  if (trustNet > 0 && streaks.trust.type === 'buy' && streaks.trust.days >= 3) {
    return {
      tag: `投信連買 ${streaks.trust.days} 日`,
      sentiment: 'bullish',
      description: `投信連續 ${streaks.trust.days} 個交易日持續買超認養，內資季底作帳或基本面鎖碼力道顯著。`
    }
  }

  if (foreignNet < 0 && trustNet > 0) {
    return {
      tag: '土洋對作',
      sentiment: 'neutral',
      description: '外資逢高提款賣超，投信內資逆勢承接支撐，短期呈現籌碼換手整理格局。'
    }
  }

  if (foreignNet > 0 && trustNet < 0) {
    return {
      tag: '外資買投信調節',
      sentiment: 'neutral',
      description: '外資單邊回補買超，但國內投信逢高獲利結清，留意上檔均線套牢反壓。'
    }
  }

  if (foreignNet < 0 && trustNet < 0 && dealerNet < 0) {
    return {
      tag: '三大法人同步賣超',
      sentiment: 'bearish',
      description: '三大法人全數站於賣方提款，短期資金呈現淨流出，建議防範回檔修正風險。'
    }
  }

  if (foreignNet < 0 && streaks.foreign.type === 'sell' && streaks.foreign.days >= 3) {
    return {
      tag: `外資連賣 ${streaks.foreign.days} 日`,
      sentiment: 'bearish',
      description: `外資連續 ${streaks.foreign.days} 個交易日持續調節提款，權值承壓，宜留意下檔支撐力道。`
    }
  }

  if (totalNet > 0 || fiveDayTotal > 0) {
    return {
      tag: '法人偏多佈局',
      sentiment: 'bullish',
      description: '法人整體籌碼呈現偏多淨買超，資金面維持穩健支撐。'
    }
  }

  return {
    tag: '籌碼中立震盪',
    sentiment: 'neutral',
    description: '三大法人買賣互見，籌碼方向尚未明確發散，維持區間震盪整理。'
  }
}

export async function fetchInstitutionalFlow(symbol: string): Promise<InstitutionalFlowResult> {
  const cleanSymbol = symbol.trim().toUpperCase()
  const rawCode = cleanSymbol.replace(/^(TWSE|TPEX|NASDAQ|NYSE|HKEX):/i, '').replace(/(\.TW|\.TWO)$/i, '')
  const isTaiwanCode = /^\d{4,6}$/.test(rawCode)

  const candidateDates = getRecentTradingDates(8)
  const history: DailyInstitutionalRecord[] = []
  let companyName = cleanSymbol
  let market: 'TWSE' | 'TPEX' | 'US' | 'HKEX' | 'OTHER' = isTaiwanCode ? 'TWSE' : 'US'

  if (isTaiwanCode) {
    // 1. Check TWSE T86
    for (const dateStr of candidateDates) {
      const data = await fetchTwseT86(dateStr)
      if (data && data.length > 0) {
        const row = data.find(r => r[0]?.trim() === rawCode)
        if (row) {
          const parsed = parseTwseRow(row)
          if (!companyName || companyName === cleanSymbol) {
            companyName = parsed.name
          }
          market = 'TWSE'
          const formattedDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`
          history.push({
            date: formattedDate,
            foreignNet: parsed.foreignNet,
            trustNet: parsed.trustNet,
            dealerNet: parsed.dealerNet,
            dealerProprietary: parsed.dealerProprietary,
            dealerHedge: parsed.dealerHedge,
            totalNet: parsed.totalNet
          })
        }
      }
    }

    // 2. If not found in TWSE, check TPEX
    if (history.length === 0) {
      const tpexData = await fetchTpex3Insti(candidateDates[0])
      if (tpexData && tpexData.length > 0) {
        const item = tpexData.find(d => d.SecuritiesCompanyCode === rawCode)
        if (item) {
          const parsed = parseTpexItem(item)
          companyName = parsed.name || rawCode
          market = 'TPEX'
          const formattedDate = `${candidateDates[0].slice(0, 4)}-${candidateDates[0].slice(4, 6)}-${candidateDates[0].slice(6, 8)}`
          history.push({
            date: formattedDate,
            foreignNet: parsed.foreignNet,
            trustNet: parsed.trustNet,
            dealerNet: parsed.dealerNet,
            totalNet: parsed.totalNet
          })
        }
      }
    }
  }

  // Also query quantitative snapshot for foreign holdings % and price
  let foreignPercent: number | undefined
  let institutionalPercent: number | undefined
  let insiderPercent: number | undefined

  // If no history found from TWSE/TPEX (e.g. US stock or offline), construct fallback flow
  if (history.length === 0) {
    const todayStr = new Date().toISOString().slice(0, 10)
    history.push({
      date: todayStr,
      foreignNet: 0,
      trustNet: 0,
      dealerNet: 0,
      totalNet: 0
    })
  }

  const todayRecord = history[0]
  const fiveDayRecords = history.slice(0, 5)

  const fiveDayCumulative = {
    foreignNet: fiveDayRecords.reduce((s, r) => s + r.foreignNet, 0),
    trustNet: fiveDayRecords.reduce((s, r) => s + r.trustNet, 0),
    dealerNet: fiveDayRecords.reduce((s, r) => s + r.dealerNet, 0),
    totalNet: fiveDayRecords.reduce((s, r) => s + r.totalNet, 0)
  }

  const streaks = {
    foreign: computeStreak(history, 'foreignNet'),
    trust: computeStreak(history, 'trustNet'),
    total: computeStreak(history, 'totalNet')
  }

  const signals = deriveSignals(todayRecord, streaks, fiveDayCumulative.totalNet)

  return {
    symbol: cleanSymbol,
    companyName,
    market,
    latestDate: todayRecord.date,
    today: {
      foreignNet: todayRecord.foreignNet,
      trustNet: todayRecord.trustNet,
      dealerNet: todayRecord.dealerNet,
      totalNet: todayRecord.totalNet
    },
    fiveDayCumulative,
    streaks,
    ownership: {
      foreignPercent,
      institutionalPercent,
      insiderPercent
    },
    signals,
    history
  }
}
