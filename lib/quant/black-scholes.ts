export type OptionType = 'call' | 'put'
export type LegSide = 'buy' | 'sell'

export interface OptionLeg {
  type: OptionType
  side: LegSide
  strike: number
  premium: number
  quantity?: number
}

export type OptionStrategy =
  | 'straddle'
  | 'vertical-call'
  | 'vertical-put'
  | 'butterfly'
  | 'iron-condor'
  | 'covered-call'

export interface OptionGreeks {
  price: number
  delta: number
  gamma: number
  theta: number
  vega: number
  rho: number
}

export interface PayoffPoint {
  spot: number
  expiry: number
  theoretical: number
}

const normalPdf = (value: number) =>
  Math.exp(-0.5 * value * value) / Math.sqrt(2 * Math.PI)

function normalCdf(value: number): number {
  const sign = value < 0 ? -1 : 1
  const x = Math.abs(value) / Math.sqrt(2)
  const t = 1 / (1 + 0.3275911 * x)
  const polynomial =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-x * x)
  return 0.5 * (1 + sign * polynomial)
}

export function blackScholes(
  spot: number,
  strike: number,
  timeYears: number,
  volatility: number,
  riskFreeRate = 0.042,
  dividendYield = 0
): OptionGreeks {
  const safeSpot = Math.max(0.000001, spot)
  const safeStrike = Math.max(0.000001, strike)
  const time = Math.max(1 / 3650, timeYears)
  const sigma = Math.max(0.0001, volatility)
  const sqrtTime = Math.sqrt(time)
  const d1 =
    (Math.log(safeSpot / safeStrike) +
      (riskFreeRate - dividendYield + 0.5 * sigma * sigma) * time) /
    (sigma * sqrtTime)
  const d2 = d1 - sigma * sqrtTime
  const discount = Math.exp(-riskFreeRate * time)
  const dividendDiscount = Math.exp(-dividendYield * time)
  const call =
    safeSpot * dividendDiscount * normalCdf(d1) -
    safeStrike * discount * normalCdf(d2)
  const put =
    safeStrike * discount * normalCdf(-d2) -
    safeSpot * dividendDiscount * normalCdf(-d1)
  const gamma =
    (dividendDiscount * normalPdf(d1)) / (safeSpot * sigma * sqrtTime)
  const vega = (safeSpot * dividendDiscount * normalPdf(d1) * sqrtTime) / 100
  return {
    price: call,
    delta: dividendDiscount * normalCdf(d1),
    gamma,
    theta:
      (-(safeSpot * dividendDiscount * normalPdf(d1) * sigma) / (2 * sqrtTime) -
        riskFreeRate * safeStrike * discount * normalCdf(d2) +
        dividendYield * safeSpot * dividendDiscount * normalCdf(d1)) /
      365,
    vega,
    rho: (safeStrike * time * discount * normalCdf(d2)) / 100
  }
}

export function optionGreeks(
  type: OptionType,
  spot: number,
  strike: number,
  timeYears: number,
  volatility: number,
  riskFreeRate = 0.042,
  dividendYield = 0
): OptionGreeks {
  const call = blackScholes(
    spot,
    strike,
    timeYears,
    volatility,
    riskFreeRate,
    dividendYield
  )
  if (type === 'call') return call
  const discount = Math.exp(-riskFreeRate * Math.max(1 / 3650, timeYears))
  const dividendDiscount = Math.exp(
    -dividendYield * Math.max(1 / 3650, timeYears)
  )
  return {
    price: call.price - spot * dividendDiscount + strike * discount,
    delta: call.delta - dividendDiscount,
    gamma: call.gamma,
    theta:
      call.theta +
      (dividendYield * spot * dividendDiscount) / 365 -
      (riskFreeRate * strike * discount) / 365,
    vega: call.vega,
    rho: call.rho - (strike * Math.max(1 / 3650, timeYears) * discount) / 100
  }
}

export function createStrategyLegs(
  strategy: OptionStrategy,
  strike: number,
  width = Math.max(1, strike * 0.05),
  premium = 0
): OptionLeg[] {
  const center = Math.max(0.01, strike)
  const wing = Math.max(0.01, width)
  switch (strategy) {
    case 'vertical-call':
      return [
        { type: 'call', side: 'buy', strike: center, premium },
        { type: 'call', side: 'sell', strike: center + wing, premium }
      ]
    case 'vertical-put':
      return [
        { type: 'put', side: 'buy', strike: center, premium },
        { type: 'put', side: 'sell', strike: center - wing, premium }
      ]
    case 'butterfly':
      return [
        { type: 'call', side: 'buy', strike: center - wing, premium },
        { type: 'call', side: 'sell', strike: center, premium, quantity: 2 },
        { type: 'call', side: 'buy', strike: center + wing, premium }
      ]
    case 'iron-condor':
      return [
        { type: 'put', side: 'buy', strike: center - wing * 2, premium },
        { type: 'put', side: 'sell', strike: center - wing, premium },
        { type: 'call', side: 'sell', strike: center + wing, premium },
        { type: 'call', side: 'buy', strike: center + wing * 2, premium }
      ]
    case 'covered-call':
      return [{ type: 'call', side: 'sell', strike: center, premium }]
    case 'straddle':
    default:
      return [
        { type: 'call', side: 'buy', strike: center, premium },
        { type: 'put', side: 'buy', strike: center, premium }
      ]
  }
}

function intrinsic(type: OptionType, spot: number, strike: number): number {
  return type === 'call'
    ? Math.max(spot - strike, 0)
    : Math.max(strike - spot, 0)
}

export function payoffAtExpiry(spot: number, legs: OptionLeg[]): number {
  return legs.reduce((total, leg) => {
    const quantity = leg.quantity ?? 1
    const direction = leg.side === 'buy' ? 1 : -1
    return (
      total +
      direction *
        quantity *
        (intrinsic(leg.type, spot, leg.strike) - leg.premium)
    )
  }, 0)
}

export function theoreticalPayoff(
  spot: number,
  legs: OptionLeg[],
  dte: number,
  volatility: number,
  riskFreeRate = 0.042
): number {
  return legs.reduce((total, leg) => {
    const quantity = leg.quantity ?? 1
    const direction = leg.side === 'buy' ? 1 : -1
    const theoretical = optionGreeks(
      leg.type,
      spot,
      leg.strike,
      dte / 365,
      volatility,
      riskFreeRate
    ).price
    return total + direction * quantity * (theoretical - leg.premium)
  }, 0)
}

export function generatePayoffCurve(
  legs: OptionLeg[],
  spot: number,
  dte: number,
  volatility: number,
  points = 61
): PayoffPoint[] {
  const low = Math.max(0.01, spot * 0.5)
  const high = spot * 1.5
  return Array.from({ length: Math.max(2, points) }, (_, index) => {
    const currentSpot = low + ((high - low) * index) / (Math.max(2, points) - 1)
    return {
      spot: currentSpot,
      expiry: payoffAtExpiry(currentSpot, legs),
      theoretical: theoreticalPayoff(currentSpot, legs, dte, volatility)
    }
  })
}

export function summarizePayoff(curve: PayoffPoint[]): {
  maxProfit: number
  maxLoss: number
  breakevens: number[]
} {
  const maxProfit = Math.max(...curve.map(point => point.expiry))
  const maxLoss = Math.min(...curve.map(point => point.expiry))
  const breakevens: number[] = []
  for (let index = 1; index < curve.length; index++) {
    if (
      curve[index - 1].expiry === 0 ||
      curve[index].expiry === 0 ||
      curve[index - 1].expiry * curve[index].expiry < 0
    )
      breakevens.push(curve[index].spot)
  }
  return { maxProfit, maxLoss, breakevens }
}
