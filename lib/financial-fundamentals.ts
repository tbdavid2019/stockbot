import type { TwoMDResultItem } from '@/lib/2md'

export interface FinancialFact {
  key: string
  label: string
  frequency: 'annual' | 'quarterly' | 'trailing'
  date: string
  periodType: string
  currency: string
  value: number
  formatted: string
}

export interface FinancialFundamentalsResult {
  yahooSymbol: string
  facts: FinancialFact[]
  evidence: string
  directAnswer?: string
  source: TwoMDResultItem
}

const METRICS: Array<{
  key: string
  label: string
  pattern: RegExp
}> = [
  {
    key: 'EnterprisesValueEBITDARatio',
    label: 'EV/EBITDA',
    pattern: /EV\s*\/\s*EBITDA|企業價值.*EBITDA/i
  },
  {
    key: 'EnterprisesValueRevenueRatio',
    label: 'EV/Sales',
    pattern: /EV\s*\/\s*(?:Sales|Revenue)|企業價值.*營收/i
  },
  {
    key: 'ForwardPeRatio',
    label: '預估本益比',
    pattern: /forward\s*P\s*\/?\s*E|預估本益比/i
  },
  { key: 'PeRatio', label: '本益比', pattern: /\bP\s*\/?\s*E\b|本益比/i },
  { key: 'PbRatio', label: '股價淨值比', pattern: /\bP\s*\/?\s*B\b|股價淨值比/i },
  { key: 'PsRatio', label: '股價營收比', pattern: /\bP\s*\/?\s*S\b|股價營收比/i },
  { key: 'PegRatio', label: 'PEG', pattern: /\bPEG\b/i },
  { key: 'MarketCap', label: '市值', pattern: /市值|market cap/i },
  {
    key: 'EnterpriseValue',
    label: '企業價值',
    pattern: /企業價值|enterprise value/i
  },
  { key: 'EBITDA', label: 'EBITDA', pattern: /\bEBITDA\b/i },
  { key: 'EBIT', label: 'EBIT', pattern: /\bEBIT\b/i },
  {
    key: 'TotalRevenue',
    label: '營收',
    pattern: /營收|收入|revenue|sales/i
  },
  { key: 'GrossProfit', label: '毛利', pattern: /毛利|gross profit/i },
  {
    key: 'OperatingIncome',
    label: '營業利益',
    pattern: /營業利益|營業利潤|operating income/i
  },
  {
    key: 'NetIncome',
    label: '淨利',
    pattern: /淨利|純益|net income|net profit/i
  },
  { key: 'DilutedEPS', label: '稀釋 EPS', pattern: /EPS|每股盈餘/i },
  {
    key: 'OperatingCashFlow',
    label: '營業現金流',
    pattern: /營業現金流|operating cash flow/i
  },
  {
    key: 'FreeCashFlow',
    label: '自由現金流',
    pattern: /FCF|自由現金流|free cash flow/i
  },
  {
    key: 'CapitalExpenditure',
    label: '資本支出',
    pattern: /CAPEX|資本支出|capital expenditure/i
  },
  { key: 'TotalDebt', label: '總負債／有息債務', pattern: /總負債|債務|debt/i },
  {
    key: 'StockholdersEquity',
    label: '股東權益',
    pattern: /股東權益|淨值|equity|book value/i
  },
  { key: 'TotalAssets', label: '總資產', pattern: /總資產|total assets/i },
  {
    key: 'CurrentAssets',
    label: '流動資產',
    pattern: /流動資產|current assets/i
  },
  {
    key: 'CurrentLiabilities',
    label: '流動負債',
    pattern: /流動負債|current liabilities/i
  }
]

const TRAILING_KEYS = new Set([
  'EnterprisesValueEBITDARatio',
  'EnterprisesValueRevenueRatio',
  'ForwardPeRatio',
  'PeRatio',
  'PbRatio',
  'PsRatio',
  'PegRatio',
  'MarketCap',
  'EnterpriseValue'
])

const FUNDAMENTAL_KEYS = Array.from(
  new Set([
    ...METRICS.filter(metric => !TRAILING_KEYS.has(metric.key)).map(
      metric => metric.key
    ),
    'BasicEPS',
    'CostOfRevenue',
    'PretaxIncome',
    'TaxProvision',
    'InterestExpense',
    'ResearchAndDevelopment',
    'SellingGeneralAndAdministration',
    'CashCashEquivalentsAndShortTermInvestments',
    'Inventory',
    'AccountsReceivable',
    'TotalLiabilitiesNetMinorityInterest'
  ])
)

function toYahooSymbol(symbol: string): string {
  const normalized = symbol.trim().toUpperCase()
  const parts = normalized.split(':')
  if (parts.length === 2) {
    const [exchange, ticker] = parts
    if (exchange === 'TWSE') return `${ticker}.TW`
    if (exchange === 'TPEX') return `${ticker}.TWO`
    if (exchange === 'HKEX') return `${ticker.padStart(4, '0')}.HK`
    return ticker
  }
  if (/^\d{4}$/.test(normalized)) return `${normalized}.TW`
  return normalized
}

function formatValue(value: number, currency: string): string {
  const absolute = Math.abs(value)
  const prefix = currency === 'USD' ? 'US$' : currency ? `${currency} ` : ''
  const sign = value < 0 ? '-' : ''
  if (absolute >= 1e12) return `${sign}${prefix}${(absolute / 1e12).toFixed(2)}T`
  if (absolute >= 1e9) return `${sign}${prefix}${(absolute / 1e9).toFixed(2)}B`
  if (absolute >= 1e6) return `${sign}${prefix}${(absolute / 1e6).toFixed(2)}M`
  return `${sign}${prefix}${absolute.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

function formatFactValue(fact: FinancialFact): string {
  if (/Ratio$/.test(fact.key)) return `${fact.value.toFixed(2)} 倍`
  return formatValue(fact.value, fact.currency)
}

function metricLabel(key: string): string {
  return METRICS.find(metric => metric.key === key)?.label || key
}

function selectRequestedMetric(question: string): string | undefined {
  return METRICS.find(metric => metric.pattern.test(question))?.key
}

function sortFacts(facts: FinancialFact[]): FinancialFact[] {
  return [...facts].sort((a, b) => a.date.localeCompare(b.date))
}

function percentChange(current: number, previous: number): number | undefined {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return undefined
  }
  return ((current / previous) - 1) * 100
}

function signedPercent(value: number | undefined): string {
  if (value === undefined) return '無法計算'
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

function latestFact(
  facts: FinancialFact[],
  key: string,
  frequency: FinancialFact['frequency']
): FinancialFact | undefined {
  return sortFacts(
    facts.filter(fact => fact.key === key && fact.frequency === frequency)
  ).at(-1)
}

function buildBroadSummaryAnswer(
  question: string,
  symbol: string,
  facts: FinancialFact[]
): string | undefined {
  if (
    !/最新財務|財務數據|財務概覽|財務狀況|財務.*估值|financials?|financial.*valuation|earnings.*valuation/i.test(
      question
    )
  ) {
    return undefined
  }

  const revenue = latestFact(facts, 'TotalRevenue', 'quarterly')
  const grossProfit = latestFact(facts, 'GrossProfit', 'quarterly')
  const operatingIncome = latestFact(facts, 'OperatingIncome', 'quarterly')
  const netIncome = latestFact(facts, 'NetIncome', 'quarterly')
  const eps = latestFact(facts, 'DilutedEPS', 'quarterly')
  const operatingCashFlow = latestFact(
    facts,
    'OperatingCashFlow',
    'annual'
  )
  const freeCashFlow = latestFact(facts, 'FreeCashFlow', 'annual')
  const totalDebt = latestFact(facts, 'TotalDebt', 'quarterly')
  const marketCap = latestFact(facts, 'MarketCap', 'trailing')
  const pe = latestFact(facts, 'PeRatio', 'trailing')
  const forwardPe = latestFact(facts, 'ForwardPeRatio', 'trailing')
  const pb = latestFact(facts, 'PbRatio', 'trailing')
  const ps = latestFact(facts, 'PsRatio', 'trailing')
  const evEbitda = latestFact(
    facts,
    'EnterprisesValueEBITDARatio',
    'trailing'
  )

  if (!revenue && !marketCap && !pe) return undefined

  const incomeLines: string[] = []
  if (revenue) {
    incomeLines.push(`- 營收：${formatFactValue(revenue)}`)
  }
  if (grossProfit) {
    const margin = revenue
      ? (grossProfit.value / revenue.value) * 100
      : undefined
    incomeLines.push(
      `- 毛利：${formatFactValue(grossProfit)}${margin === undefined ? '' : `（毛利率 ${margin.toFixed(1)}%）`}`
    )
  }
  if (operatingIncome) {
    const margin = revenue
      ? (operatingIncome.value / revenue.value) * 100
      : undefined
    incomeLines.push(
      `- 營業利益：${formatFactValue(operatingIncome)}${margin === undefined ? '' : `（營業利益率 ${margin.toFixed(1)}%）`}`
    )
  }
  if (netIncome) {
    const margin = revenue ? (netIncome.value / revenue.value) * 100 : undefined
    incomeLines.push(
      `- 淨利：${formatFactValue(netIncome)}${margin === undefined ? '' : `（淨利率 ${margin.toFixed(1)}%）`}`
    )
  }
  if (eps) incomeLines.push(`- 稀釋 EPS：${formatFactValue(eps)}`)

  const cashLines: string[] = []
  if (operatingCashFlow) {
    cashLines.push(
      `- ${operatingCashFlow.date.slice(0, 4)} 營業現金流：${formatFactValue(operatingCashFlow)}`
    )
  }
  if (freeCashFlow) {
    cashLines.push(
      `- ${freeCashFlow.date.slice(0, 4)} 自由現金流：${formatFactValue(freeCashFlow)}`
    )
  }
  if (totalDebt) cashLines.push(`- 總債務：${formatFactValue(totalDebt)}`)

  const valuationLines: string[] = []
  if (marketCap) valuationLines.push(`- 市值：${formatFactValue(marketCap)}`)
  if (pe) valuationLines.push(`- 本益比：${formatFactValue(pe)}`)
  if (forwardPe) {
    valuationLines.push(`- 預估本益比：${formatFactValue(forwardPe)}`)
  }
  if (pb) valuationLines.push(`- 股價淨值比：${formatFactValue(pb)}`)
  if (ps) valuationLines.push(`- 股價營收比：${formatFactValue(ps)}`)
  if (evEbitda) {
    valuationLines.push(`- EV/EBITDA：${formatFactValue(evEbitda)}`)
  }

  const sections = [
    incomeLines.length
      ? `**最新季度損益（截至 ${revenue?.date || netIncome?.date || eps?.date}）**\n${incomeLines.join('\n')}`
      : '',
    cashLines.length ? `**現金流與財務結構**\n${cashLines.join('\n')}` : '',
    valuationLines.length
      ? `**最新估值（市場資料截至 ${marketCap?.date || pe?.date || evEbitda?.date}）**\n${valuationLines.join('\n')}`
      : ''
  ].filter(Boolean)

  return `${symbol} 的近期財務與估值概覽：\n\n${sections.join('\n\n')}\n\n資料來自 Yahoo Finance Fundamentals 的標準化財務序列。季度損益、年度現金流與即時估值的基準日不同，已分別標示，避免混用。`
}

function buildDirectAnswer(
  question: string,
  symbol: string,
  facts: FinancialFact[]
): string | undefined {
  const requestedKey = selectRequestedMetric(question)
  if (!requestedKey) return buildBroadSummaryAnswer(question, symbol, facts)

  const relevant = facts.filter(fact => fact.key === requestedKey)
  const annual = sortFacts(
    relevant.filter(fact => fact.frequency === 'annual')
  )
  const quarterly = sortFacts(
    relevant.filter(fact => fact.frequency === 'quarterly')
  )
  const trailing = sortFacts(
    relevant.filter(fact => fact.frequency === 'trailing')
  )
  if (annual.length === 0 && quarterly.length === 0 && trailing.length === 0) {
    return undefined
  }

  const latestTrailing = trailing.at(-1)
  if (latestTrailing) {
    return `${symbol} 的${metricLabel(requestedKey)}最新可得數據為 **${formatFactValue(latestTrailing)}**（截至 ${latestTrailing.date}）。\n\n資料為 Yahoo Finance Fundamentals 的 TTM／市場標準化指標；估值倍數會隨股價與財報更新而變動。`
  }

  if (
    requestedKey === 'TotalRevenue' &&
    /近\s*[三3]\s*年|過去\s*[三3]\s*年|three\s+years?/i.test(question)
  ) {
    const periods = annual.slice(-3)
    if (periods.length >= 3) {
      const rows = periods.map((fact, index) => {
        const prior = index > 0 ? periods[index - 1] : undefined
        const growth = prior ? percentChange(fact.value, prior.value) : undefined
        return `- ${fact.date.slice(0, 4)}：${formatFactValue(fact)}${growth === undefined ? '' : `，YoY ${signedPercent(growth)}`}`
      })
      const first = periods[0]
      const last = periods[periods.length - 1]
      const years = periods.length - 1
      const cagr =
        first.value > 0 && last.value > 0
          ? (Math.pow(last.value / first.value, 1 / years) - 1) * 100
          : undefined
      return `${symbol} 最近三個完整年度的營收為：\n\n${rows.join('\n')}\n\n這段期間的營收 CAGR 為 ${signedPercent(cagr)}。資料為 Yahoo Finance Fundamentals 的標準化年度財務數據；最新年度截至 ${last.date}。`
    }
  }

  const latestQuarter = quarterly.at(-1)
  const latestAnnual = annual.at(-1)
  const lines: string[] = []

  if (latestQuarter) {
    const priorYearQuarter = quarterly.find(
      fact =>
        new Date(fact.date).getUTCFullYear() ===
          new Date(latestQuarter.date).getUTCFullYear() - 1 &&
        new Date(fact.date).getUTCMonth() ===
          new Date(latestQuarter.date).getUTCMonth()
    )
    const yoy = priorYearQuarter
      ? percentChange(latestQuarter.value, priorYearQuarter.value)
      : undefined
    lines.push(
      `- 最新季度（截至 ${latestQuarter.date}）：${formatFactValue(latestQuarter)}${yoy === undefined ? '' : `，YoY ${signedPercent(yoy)}`}`
    )

    const trailingFour = quarterly.slice(-4)
    if (trailingFour.length === 4) {
      const ttm = trailingFour.reduce((sum, fact) => sum + fact.value, 0)
      lines.push(
        `- TTM（最近四季合計）：${formatValue(ttm, latestQuarter.currency)}`
      )
    }
  }

  if (latestAnnual) {
    const previousAnnual = annual.at(-2)
    const annualChange = previousAnnual
      ? percentChange(latestAnnual.value, previousAnnual.value)
      : undefined
    lines.push(
      `- 最新完整年度（${latestAnnual.date.slice(0, 4)}）：${formatFactValue(latestAnnual)}${annualChange === undefined ? '' : `，YoY ${signedPercent(annualChange)}`}`
    )
  }

  if (lines.length === 0) return undefined
  return `${symbol} 的${metricLabel(requestedKey)}最新可得數據：\n\n${lines.join('\n')}\n\n資料為 Yahoo Finance Fundamentals 的標準化財務數據；其中 EBITDA 等非 GAAP 科目可能由資料供應商依財報欄位標準化計算，應與公司自行公布的 adjusted 指標分開看。`
}

function buildEvidence(question: string, facts: FinancialFact[]): string {
  const requestedKey = selectRequestedMetric(question)
  const selected = requestedKey
    ? facts.filter(fact => fact.key === requestedKey)
    : facts
  const grouped = new Map<string, FinancialFact[]>()
  for (const fact of selected) {
    const values = grouped.get(fact.key) || []
    values.push(fact)
    grouped.set(fact.key, values)
  }

  const lines: string[] = ['[結構化財務資料｜Yahoo Finance Fundamentals]']
  for (const [key, values] of Array.from(grouped.entries()).slice(0, 12)) {
    const annual = sortFacts(values.filter(value => value.frequency === 'annual')).slice(-4)
    const quarterly = sortFacts(
      values.filter(value => value.frequency === 'quarterly')
    ).slice(-5)
    const trailing = sortFacts(
      values.filter(value => value.frequency === 'trailing')
    ).slice(-1)
    for (const fact of [...annual, ...quarterly, ...trailing]) {
      lines.push(
        `- ${metricLabel(key)} | ${fact.date} | ${fact.periodType} | ${formatFactValue(fact)} | raw=${fact.value}`
      )
    }
  }
  return lines.join('\n')
}

export async function fetchFinancialFundamentals(
  symbol: string,
  question: string
): Promise<FinancialFundamentalsResult | undefined> {
  const yahooSymbol = toYahooSymbol(symbol)
  const types = FUNDAMENTAL_KEYS.flatMap(key => [
    `annual${key}`,
    `quarterly${key}`
  ])
    .concat(Array.from(TRAILING_KEYS).map(key => `trailing${key}`))
    .join(',')
  const period2 = Math.floor(Date.now() / 1000) + 86400
  const period1 = period2 - 8 * 365 * 86400
  const url = new URL(
    `https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(yahooSymbol)}`
  )
  url.searchParams.set('symbol', yahooSymbol)
  url.searchParams.set('type', types)
  url.searchParams.set('period1', String(period1))
  url.searchParams.set('period2', String(period2))

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 stockbot/2.0'
      },
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 300 }
    })
    if (!response.ok) return undefined
    const payload = await response.json()
    const series = payload?.timeseries?.result
    if (!Array.isArray(series)) return undefined

    const facts: FinancialFact[] = []
    for (const item of series) {
      const type = String(item?.meta?.type?.[0] || '')
      const match = type.match(/^(annual|quarterly|trailing)(.+)$/)
      if (!match || !Array.isArray(item[type])) continue
      const frequency = match[1] as 'annual' | 'quarterly' | 'trailing'
      const key = match[2]
      for (const point of item[type]) {
        const raw = Number(point?.reportedValue?.raw)
        if (!point?.asOfDate || !Number.isFinite(raw)) continue
        facts.push({
          key,
          label: metricLabel(key),
          frequency,
          date: String(point.asOfDate),
          periodType: String(
            point.periodType ||
              (frequency === 'annual'
                ? '12M'
                : frequency === 'quarterly'
                  ? '3M'
                  : 'TTM')
          ),
          currency: String(point.currencyCode || ''),
          value: raw,
          formatted: String(point?.reportedValue?.fmt || raw)
        })
      }
    }
    if (facts.length === 0) return undefined

    const sourceUrl = `https://finance.yahoo.com/quote/${encodeURIComponent(yahooSymbol)}/financials/`
    return {
      yahooSymbol,
      facts,
      evidence: buildEvidence(question, facts),
      directAnswer: buildDirectAnswer(question, symbol, facts),
      source: {
        title: `${yahooSymbol} 結構化財務報表與指標 - Yahoo Finance`,
        url: sourceUrl,
        description: `年度與季度標準化財務序列，共 ${facts.length} 筆可核實數據。`,
        publisher: 'Yahoo Finance Fundamentals'
      }
    }
  } catch (error: any) {
    console.warn(
      `[Financial Fundamentals] Failed for ${yahooSymbol}:`,
      error?.message || error
    )
    return undefined
  }
}
