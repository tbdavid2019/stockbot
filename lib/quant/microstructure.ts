export interface LiquiditySample {
  close: number
  volume: number
}

export interface MarketImpactResult {
  impactFraction: number
  impactBps: number
  slippagePerShare?: number
  estimatedCost?: number
}

export interface EtfPremiumResult {
  price: number
  nav: number
  divergencePercent: number
  divergenceBps: number
  direction: 'premium' | 'discount' | 'at-nav'
  peerMedianDivergence?: number
  bidAskSpreadBps?: number
  gex?: number
  gammaCondition: 'positive' | 'negative' | 'neutral' | 'unknown'
}

export function calculateAmihudIlliquidity(
  samples: LiquiditySample[]
): number | undefined {
  const values: number[] = []
  for (let index = 1; index < samples.length; index++) {
    const previous = samples[index - 1]
    const current = samples[index]
    const dollarVolume = current.close * current.volume
    if (previous.close > 0 && dollarVolume > 0)
      values.push(Math.abs(current.close / previous.close - 1) / dollarVolume)
  }
  if (!values.length) return undefined
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function calculateFloatTurnover(
  volume: number[],
  floatShares: number,
  tradingDays = 252
): number | undefined {
  if (!Number.isFinite(floatShares) || floatShares <= 0 || !volume.length)
    return undefined
  const averageDailyVolume =
    volume.reduce((sum, value) => sum + Math.max(0, value), 0) / volume.length
  return (averageDailyVolume * tradingDays) / floatShares
}

export function calculateMarketImpact(
  volatility: number,
  orderSize: number,
  averageVolume: number,
  price?: number
): MarketImpactResult {
  const impactFraction =
    averageVolume > 0
      ? Math.max(0, volatility) *
        Math.sqrt(Math.max(0, orderSize) / averageVolume)
      : 0
  return {
    impactFraction,
    impactBps: impactFraction * 10000,
    slippagePerShare: price !== undefined ? price * impactFraction : undefined,
    estimatedCost:
      price !== undefined
        ? price * Math.max(0, orderSize) * impactFraction
        : undefined
  }
}

export function calculateEtfPremium(
  price: number,
  nav: number,
  options: {
    peerMedianDivergence?: number
    bidAskSpreadBps?: number
    gex?: number
  } = {}
): EtfPremiumResult {
  const divergencePercent = nav > 0 ? (price / nav - 1) * 100 : 0
  const tolerance = 0.01
  return {
    price,
    nav,
    divergencePercent,
    divergenceBps: divergencePercent * 100,
    direction:
      divergencePercent > tolerance
        ? 'premium'
        : divergencePercent < -tolerance
          ? 'discount'
          : 'at-nav',
    peerMedianDivergence: options.peerMedianDivergence,
    bidAskSpreadBps: options.bidAskSpreadBps,
    gex: options.gex,
    gammaCondition:
      options.gex === undefined
        ? 'unknown'
        : options.gex > 0
          ? 'positive'
          : options.gex < 0
            ? 'negative'
            : 'neutral'
  }
}
