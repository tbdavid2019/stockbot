export interface PeerMultiples {
  name: string
  pe?: number
  evToEbitda?: number
  evToSales?: number
}

export interface ValuationInput {
  price: number
  sharesOutstanding: number
  revenue: number
  ebitda?: number
  eps?: number
  freeCashFlow: number
  cash?: number
  debt?: number
  beta?: number
  taxRate?: number
  riskFreeRate?: number
  marketRiskPremium?: number
  costOfDebt?: number
  revenueGrowth?: number
  fcfGrowth?: number
  terminalGrowth?: number
  wacc?: number
  peerMultiples?: PeerMultiples[]
}

export interface SensitivityCell {
  wacc: number
  terminalGrowth: number
  sharePrice?: number
  upsideDownside?: number
}

export interface ValuationResult {
  dcf?: {
    enterpriseValue: number
    equityValue: number
    sharePrice?: number
    projectedFcff: number[]
    discountFactors: number[]
  }
  capm: {
    beta: number
    riskFreeRate: number
    marketRiskPremium: number
    costOfEquity: number
    costOfDebt: number
    taxRate: number
    wacc: number
    usedDefaultBeta: boolean
  }
  peers: {
    medianPe?: number
    medianEvToEbitda?: number
    medianEvToSales?: number
    peValue?: number
    evToEbitdaValue?: number
    evToSalesValue?: number
    blendedValue?: number
    multiplesUsed: string[]
  }
  blendedFairValue?: number
  impliedUpsideDownside?: number
  sensitivity: SensitivityCell[][]
}

const DEFAULT_BETA = 1.1
const DEFAULT_RISK_FREE_RATE = 0.042
const DEFAULT_MARKET_RISK_PREMIUM = 0.055
const DEFAULT_COST_OF_DEBT = 0.05
const DEFAULT_TAX_RATE = 0.21

const finitePositive = (value: number | undefined): value is number =>
  value !== undefined && Number.isFinite(value) && value > 0

const median = (values: number[]): number | undefined => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (sorted.length === 0) return undefined
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}

function dcfSharePrice(
  input: ValuationInput,
  wacc: number,
  terminalGrowth: number
): number | undefined {
  if (!finitePositive(input.sharesOutstanding)) return undefined
  if (!Number.isFinite(input.freeCashFlow)) return undefined
  if (!(wacc > terminalGrowth && wacc > 0)) return undefined

  const growth = Number.isFinite(input.fcfGrowth)
    ? Math.max(-0.5, Math.min(1, input.fcfGrowth!))
    : Number.isFinite(input.revenueGrowth)
      ? Math.max(-0.5, Math.min(1, input.revenueGrowth!))
      : 0.08
  const projected = Array.from(
    { length: 5 },
    (_, index) => input.freeCashFlow * Math.pow(1 + growth, index + 1)
  )
  const presentValue = projected.reduce(
    (sum, cashFlow, index) => sum + cashFlow / Math.pow(1 + wacc, index + 1),
    0
  )
  const terminalValue =
    (projected[4] * (1 + terminalGrowth)) / (wacc - terminalGrowth)
  const enterpriseValue = presentValue + terminalValue / Math.pow(1 + wacc, 5)
  const equityValue = enterpriseValue + (input.cash || 0) - (input.debt || 0)
  return equityValue / input.sharesOutstanding
}

export function calculateCapmWacc(
  input: ValuationInput
): ValuationResult['capm'] {
  const beta = finitePositive(input.beta) ? input.beta! : DEFAULT_BETA
  const riskFreeRate = Number.isFinite(input.riskFreeRate)
    ? input.riskFreeRate!
    : DEFAULT_RISK_FREE_RATE
  const marketRiskPremium = Number.isFinite(input.marketRiskPremium)
    ? input.marketRiskPremium!
    : DEFAULT_MARKET_RISK_PREMIUM
  const taxRate = Number.isFinite(input.taxRate)
    ? Math.max(0, Math.min(0.6, input.taxRate!))
    : DEFAULT_TAX_RATE
  const costOfDebt = Number.isFinite(input.costOfDebt)
    ? Math.max(0, input.costOfDebt!)
    : DEFAULT_COST_OF_DEBT
  const costOfEquity = riskFreeRate + beta * marketRiskPremium
  const equityValue = Math.max(0, input.price * input.sharesOutstanding)
  const debtValue = Math.max(0, input.debt || 0)
  const capital = equityValue + debtValue
  const wacc =
    Number.isFinite(input.wacc) && input.wacc! > 0
      ? input.wacc!
      : capital > 0
        ? (equityValue / capital) * costOfEquity +
          (debtValue / capital) * costOfDebt * (1 - taxRate)
        : costOfEquity

  return {
    beta,
    riskFreeRate,
    marketRiskPremium,
    costOfEquity,
    costOfDebt,
    taxRate,
    wacc,
    usedDefaultBeta: !finitePositive(input.beta)
  }
}

export function calculateValuation(input: ValuationInput): ValuationResult {
  const capm = calculateCapmWacc(input)
  const terminalGrowth = Number.isFinite(input.terminalGrowth)
    ? Math.max(0, Math.min(0.06, input.terminalGrowth!))
    : 0.025
  const dcfPrice = dcfSharePrice(input, capm.wacc, terminalGrowth)
  const dcf =
    dcfPrice === undefined
      ? undefined
      : {
          enterpriseValue:
            dcfPrice * input.sharesOutstanding -
            (input.cash || 0) +
            (input.debt || 0),
          equityValue: dcfPrice * input.sharesOutstanding,
          sharePrice: dcfPrice,
          projectedFcff: Array.from(
            { length: 5 },
            (_, index) =>
              input.freeCashFlow *
              Math.pow(
                1 + (input.fcfGrowth ?? input.revenueGrowth ?? 0.08),
                index + 1
              )
          ),
          discountFactors: Array.from(
            { length: 5 },
            (_, index) => 1 / Math.pow(1 + capm.wacc, index + 1)
          )
        }

  const peers = input.peerMultiples || []
  const medianPe = median(peers.map(peer => peer.pe || NaN))
  const medianEvToEbitda = median(peers.map(peer => peer.evToEbitda || NaN))
  const medianEvToSales = median(peers.map(peer => peer.evToSales || NaN))
  const peValue =
    finitePositive(input.eps) && finitePositive(medianPe)
      ? input.eps! * medianPe!
      : undefined
  const evToEbitdaValue =
    finitePositive(input.ebitda) &&
    finitePositive(medianEvToEbitda) &&
    finitePositive(input.sharesOutstanding)
      ? (input.ebitda! * medianEvToEbitda! -
          (input.debt || 0) +
          (input.cash || 0)) /
        input.sharesOutstanding
      : undefined
  const evToSalesValue =
    finitePositive(input.revenue) &&
    finitePositive(medianEvToSales) &&
    finitePositive(input.sharesOutstanding)
      ? (input.revenue * medianEvToSales! -
          (input.debt || 0) +
          (input.cash || 0)) /
        input.sharesOutstanding
      : undefined
  const peerValues = [peValue, evToEbitdaValue, evToSalesValue].filter(
    (value): value is number => value !== undefined && Number.isFinite(value)
  )
  const peerBlended =
    peerValues.length > 0
      ? peerValues.reduce((sum, value) => sum + value, 0) / peerValues.length
      : undefined
  const blendedFairValue =
    dcfPrice !== undefined && peerBlended !== undefined
      ? dcfPrice * 0.6 + peerBlended * 0.4
      : dcfPrice ?? peerBlended

  const waccOffsets = [-0.01, -0.005, 0, 0.005, 0.01]
  const growthRates = [0.015, 0.02, 0.025, 0.03, 0.035]
  const sensitivity = waccOffsets.map(offset =>
    growthRates.map(growth => {
      const sharePrice = dcfSharePrice(input, capm.wacc + offset, growth)
      return {
        wacc: capm.wacc + offset,
        terminalGrowth: growth,
        sharePrice,
        upsideDownside:
          sharePrice !== undefined && input.price > 0
            ? (sharePrice / input.price - 1) * 100
            : undefined
      }
    })
  )

  return {
    dcf,
    capm,
    peers: {
      medianPe,
      medianEvToEbitda,
      medianEvToSales,
      peValue,
      evToEbitdaValue,
      evToSalesValue,
      blendedValue: peerBlended,
      multiplesUsed: [
        peValue !== undefined ? 'P/E' : '',
        evToEbitdaValue !== undefined ? 'EV/EBITDA' : '',
        evToSalesValue !== undefined ? 'EV/Sales' : ''
      ].filter(Boolean)
    },
    blendedFairValue,
    impliedUpsideDownside:
      blendedFairValue !== undefined && input.price > 0
        ? (blendedFairValue / input.price - 1) * 100
        : undefined,
    sensitivity
  }
}
