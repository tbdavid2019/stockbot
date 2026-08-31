import {
  fetchFinancialFundamentals,
  toYahooSymbol,
  type FinancialFundamentalsResult
} from '@/lib/financial-fundamentals'
import type { OHLCVPoint } from '@/lib/quant/sepa'
import { fetchTwStockerDailyPrices } from '@/lib/quant/tw-stocker'

export interface QuantMarketSnapshot {
  symbol: string
  yahooSymbol: string
  price?: number
  previousClose?: number
  nav?: number
  bidAskSpreadBps?: number
  beta?: number
  sharesOutstanding?: number
  floatShares?: number
  cash?: number
  debt?: number
  revenue?: number
  ebitda?: number
  eps?: number
  freeCashFlow?: number
  revenueGrowth?: number
  prices: OHLCVPoint[]
  fundamentals?: FinancialFundamentalsResult
}

function latest(
  facts: FinancialFundamentalsResult | undefined,
  key: string,
  frequency: string
): number | undefined {
  return facts?.facts
    .filter(fact => fact.key === key && fact.frequency === frequency)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1)?.value
}

function toNumber(value: any): number | undefined {
  const number = Number(value?.raw ?? value)
  return Number.isFinite(number) ? number : undefined
}

export async function fetchQuantMarketSnapshot(
  symbol: string
): Promise<QuantMarketSnapshot> {
  const yahooSymbol = toYahooSymbol(symbol)
  const [chartResponse, fundamentals, summaryResponse] = await Promise.all([
    fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=1y&interval=1d&events=div%2Csplits`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 stockbot/2.0'
        },
        signal: AbortSignal.timeout(5000),
        next: { revalidate: 300 }
      }
    ).catch(() => undefined),
    fetchFinancialFundamentals(symbol, '最新財務數據與估值').catch(
      () => undefined
    ),
    fetch(
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol)}?modules=summaryDetail,defaultKeyStatistics`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 stockbot/2.0'
        },
        signal: AbortSignal.timeout(4000),
        next: { revalidate: 300 }
      }
    ).catch(() => undefined)
  ])

  let prices: OHLCVPoint[] = []
  let price: number | undefined
  let previousClose: number | undefined
  if (chartResponse?.ok) {
    try {
      const chart = (await chartResponse.json())?.chart?.result?.[0]
      const timestamps = chart?.timestamp || []
      const quote = chart?.indicators?.quote?.[0] || {}
      prices = timestamps
        .map((timestamp: number, index: number) => ({
          date: new Date(timestamp * 1000).toISOString().slice(0, 10),
          open: toNumber(quote.open?.[index]),
          high: toNumber(quote.high?.[index]),
          low: toNumber(quote.low?.[index]),
          close: toNumber(quote.close?.[index]),
          volume: toNumber(quote.volume?.[index]) || 0
        }))
        .filter(
          (point: OHLCVPoint) =>
            Number.isFinite(point.close) &&
            Number.isFinite(point.high) &&
            Number.isFinite(point.low)
        )
      price = toNumber(chart?.meta?.regularMarketPrice) ?? prices.at(-1)?.close
      previousClose =
        toNumber(chart?.meta?.previousClose) ?? prices.at(-2)?.close
    } catch {
      prices = []
    }
  }

  if (prices.length === 0) {
    try {
      const twPrices = await fetchTwStockerDailyPrices(symbol)
      if (twPrices.length > 0) {
        prices = twPrices
        price = price ?? prices.at(-1)?.close
        previousClose = previousClose ?? prices.at(-2)?.close
      }
    } catch {
      // ignore tw_stocker fallback failure
    }
  }

  let nav: number | undefined
  let bidAskSpreadBps: number | undefined
  let beta: number | undefined
  let floatShares: number | undefined
  let sharesOutstanding: number | undefined
  if (summaryResponse?.ok) {
    try {
      const summary = (await summaryResponse.json())?.quoteSummary?.result?.[0]
      nav = toNumber(summary?.summaryDetail?.navPrice)
      beta = toNumber(summary?.defaultKeyStatistics?.beta)
      floatShares = toNumber(summary?.defaultKeyStatistics?.floatShares)
      sharesOutstanding = toNumber(
        summary?.defaultKeyStatistics?.sharesOutstanding
      )
      const bid = toNumber(summary?.summaryDetail?.bid)
      const ask = toNumber(summary?.summaryDetail?.ask)
      const midpoint = bid && ask ? (bid + ask) / 2 : undefined
      bidAskSpreadBps =
        midpoint && ask && bid ? ((ask - bid) / midpoint) * 10000 : undefined
    } catch {
      nav = undefined
    }
  }

  const revenueAnnual = (fundamentals?.facts || [])
    .filter(fact => fact.key === 'TotalRevenue' && fact.frequency === 'annual')
    .sort((a, b) => a.date.localeCompare(b.date))
  const revenueQuarterly = (fundamentals?.facts || [])
    .filter(fact => fact.key === 'TotalRevenue' && fact.frequency === 'quarterly')
    .sort((a, b) => a.date.localeCompare(b.date))

  let revenueGrowth: number | undefined
  if (revenueAnnual.length >= 2) {
    const curr = revenueAnnual.at(-1)?.value
    const prev = revenueAnnual.at(-2)?.value
    if (curr !== undefined && prev && prev > 0) {
      revenueGrowth = curr / prev - 1
    }
  }
  if (revenueGrowth === undefined && revenueQuarterly.length >= 5) {
    const curr = revenueQuarterly.at(-1)?.value
    const prev = revenueQuarterly.at(-5)?.value
    if (curr !== undefined && prev && prev > 0) {
      revenueGrowth = curr / prev - 1
    }
  }

  const netIncome =
    latest(fundamentals, 'NetIncome', 'annual') ||
    latest(fundamentals, 'NetIncome', 'quarterly')
  const eps =
    latest(fundamentals, 'DilutedEPS', 'trailing') ||
    latest(fundamentals, 'DilutedEPS', 'annual') ||
    latest(fundamentals, 'BasicEPS', 'annual') ||
    latest(fundamentals, 'DilutedEPS', 'quarterly')
  const marketCap = latest(fundamentals, 'MarketCap', 'trailing')

  const resolvedSharesOutstanding =
    sharesOutstanding ||
    latest(fundamentals, 'DilutedAverageShares', 'annual') ||
    latest(fundamentals, 'OrdinarySharesNumber', 'annual') ||
    latest(fundamentals, 'BasicAverageShares', 'annual') ||
    latest(fundamentals, 'DilutedAverageShares', 'quarterly') ||
    latest(fundamentals, 'OrdinarySharesNumber', 'quarterly') ||
    latest(fundamentals, 'BasicAverageShares', 'quarterly') ||
    latest(fundamentals, 'ShareIssued', 'annual') ||
    latest(fundamentals, 'ShareIssued', 'quarterly') ||
    (price && marketCap && price > 0 ? marketCap / price : undefined) ||
    (netIncome && eps && eps > 0 ? netIncome / eps : undefined)

  const reportedFcf =
    latest(fundamentals, 'FreeCashFlow', 'annual') ||
    latest(fundamentals, 'FreeCashFlow', 'quarterly')
  const ocf =
    latest(fundamentals, 'OperatingCashFlow', 'annual') ||
    latest(fundamentals, 'OperatingCashFlow', 'quarterly')
  const capex =
    latest(fundamentals, 'CapitalExpenditure', 'annual') ||
    latest(fundamentals, 'CapitalExpenditure', 'quarterly')
  const derivedFcf =
    ocf !== undefined && capex !== undefined ? ocf - Math.abs(capex) : undefined
  const resolvedFcf =
    reportedFcf ??
    derivedFcf ??
    (netIncome !== undefined ? netIncome * 0.9 : undefined)

  return {
    symbol,
    yahooSymbol,
    price,
    previousClose,
    nav: nav ?? (price ? price * 0.998 : undefined),
    bidAskSpreadBps,
    sharesOutstanding: resolvedSharesOutstanding,
    floatShares: floatShares || resolvedSharesOutstanding,
    beta,
    cash:
      latest(
        fundamentals,
        'CashCashEquivalentsAndShortTermInvestments',
        'quarterly'
      ) ||
      latest(
        fundamentals,
        'CashCashEquivalentsAndShortTermInvestments',
        'annual'
      ),
    debt:
      latest(fundamentals, 'TotalDebt', 'quarterly') ||
      latest(fundamentals, 'TotalDebt', 'annual') ||
      latest(fundamentals, 'TotalLiabilitiesNetMinorityInterest', 'quarterly'),
    revenue:
      latest(fundamentals, 'TotalRevenue', 'annual') ||
      latest(fundamentals, 'TotalRevenue', 'quarterly'),
    ebitda:
      latest(fundamentals, 'EBITDA', 'annual') ||
      latest(fundamentals, 'EBITDA', 'quarterly'),
    eps,
    freeCashFlow: resolvedFcf,
    revenueGrowth,
    prices,
    fundamentals
  }
}

const PEER_MAP: Record<string, string[]> = {
  NVDA: ['AMD', 'AVGO', 'QCOM'],
  AMD: ['NVDA', 'INTC', 'AVGO'],
  INTC: ['AMD', 'NVDA', 'QCOM'],
  AVGO: ['NVDA', 'QCOM', 'AMD'],
  QCOM: ['NVDA', 'AVGO', 'AMD'],
  AAPL: ['MSFT', 'GOOGL', 'AMZN'],
  MSFT: ['AAPL', 'GOOGL', 'AMZN'],
  GOOGL: ['MSFT', 'META', 'AMZN'],
  GOOG: ['MSFT', 'META', 'AMZN'],
  META: ['GOOGL', 'SNAP', 'PINS'],
  AMZN: ['MSFT', 'WMT', 'GOOGL'],
  TSLA: ['RIVN', 'GM', 'F'],
  NFLX: ['DIS', 'WBD', 'CMCSA'],
  '2330.TW': ['2454.TW', '2303.TW', 'TSM'],
  '2330': ['2454.TW', '2303.TW', 'TSM'],
  TSM: ['NVDA', 'AMD', 'INTC']
}

export async function fetchPeerMultiples(
  symbol: string
): Promise<Array<{ name: string; pe?: number; evToEbitda?: number; evToSales?: number }>> {
  const clean = symbol
    .replace(/^(TWSE|TPEX|HKEX|NASDAQ|NYSE):/i, '')
    .toUpperCase()
  const peerList =
    PEER_MAP[clean] || PEER_MAP[toYahooSymbol(clean)] || PEER_MAP[symbol] || []
  if (peerList.length === 0) return []

  const results = await Promise.all(
    peerList.map(async peerTicker => {
      try {
        const fundamentals = await fetchFinancialFundamentals(
          peerTicker,
          '最新財務數據與估值'
        )
        const pe = fundamentals?.facts.find(
          f => f.key === 'PeRatio' && f.frequency === 'trailing'
        )?.value
        const evEbitda = fundamentals?.facts.find(
          f =>
            f.key === 'EnterprisesValueEBITDARatio' &&
            f.frequency === 'trailing'
        )?.value
        const evSales = fundamentals?.facts.find(
          f =>
            f.key === 'EnterprisesValueRevenueRatio' &&
            f.frequency === 'trailing'
        )?.value
        return {
          name: peerTicker,
          pe,
          evToEbitda: evEbitda && evEbitda > 0 ? evEbitda : undefined,
          evToSales: evSales && evSales > 0 ? evSales : undefined
        }
      } catch {
        return null
      }
    })
  )
  return results.filter((item): item is NonNullable<typeof item> => Boolean(item))
}
