import {
  fetchFinancialFundamentals,
  toYahooSymbol,
  type FinancialFundamentalsResult
} from '@/lib/financial-fundamentals'
import type { OHLCVPoint } from '@/lib/quant/sepa'

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

  const revenueFacts = (fundamentals?.facts || [])
    .filter(fact => fact.key === 'TotalRevenue' && fact.frequency === 'annual')
    .sort((a, b) => a.date.localeCompare(b.date))
  const latestRevenue = revenueFacts.at(-1)?.value
  const priorRevenue = revenueFacts.at(-2)?.value
  const revenueGrowth =
    latestRevenue !== undefined && priorRevenue !== undefined && priorRevenue !== 0
      ? latestRevenue / priorRevenue - 1
      : undefined

  return {
    symbol,
    yahooSymbol,
    price,
    previousClose,
    nav,
    bidAskSpreadBps,
    sharesOutstanding:
      sharesOutstanding ||
      latest(fundamentals, 'DilutedAverageShares', 'annual') ||
      latest(fundamentals, 'OrdinarySharesNumber', 'annual'),
    floatShares,
    beta,
    cash: latest(
      fundamentals,
      'CashCashEquivalentsAndShortTermInvestments',
      'quarterly'
    ),
    debt:
      latest(fundamentals, 'TotalDebt', 'quarterly') ||
      latest(fundamentals, 'TotalLiabilitiesNetMinorityInterest', 'quarterly'),
    revenue:
      latest(fundamentals, 'TotalRevenue', 'annual') ||
      latest(fundamentals, 'TotalRevenue', 'quarterly'),
    ebitda:
      latest(fundamentals, 'EBITDA', 'annual') ||
      latest(fundamentals, 'EBITDA', 'quarterly'),
    eps:
      latest(fundamentals, 'DilutedEPS', 'trailing') ||
      latest(fundamentals, 'DilutedEPS', 'annual') ||
      latest(fundamentals, 'BasicEPS', 'annual'),
    freeCashFlow:
      latest(fundamentals, 'FreeCashFlow', 'annual') ||
      latest(fundamentals, 'FreeCashFlow', 'quarterly'),
    revenueGrowth,
    prices,
    fundamentals
  }
}
