export interface OHLCVPoint {
  date?: string
  open?: number
  high: number
  low: number
  close: number
  volume: number
}

export interface TrendCondition {
  id: number
  label: string
  passed: boolean
  actual: string
}

export type MarketStage = 1 | 2 | 3 | 4

export interface PositionSizing {
  accountEquity: number
  riskPercent: number
  riskAmount: number
  entryPivot: number
  buyZoneHigh: number
  stopPrice: number
  breakevenTrigger: number
  shares: number
}

export interface SepaAnalysis {
  price: number
  movingAverages: { ma50: number; ma150: number; ma200: number }
  conditions: TrendCondition[]
  score: number
  stage: MarketStage
  stageLabel: string
  rsRating: number
  vcp: {
    detected: boolean
    contractions: number[]
    pivot: number
    explanation: string
  }
  positionSizing: PositionSizing
}

function average(values: number[]): number {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0
}

function movingAverage(prices: OHLCVPoint[], length: number): number {
  return average(prices.slice(-length).map(point => point.close))
}

function pct(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

function slope(prices: OHLCVPoint[], length: number): number {
  const sample = prices.slice(-(length + 20))
  if (sample.length < 21) return 0
  const recent = average(sample.slice(-20).map(point => point.close))
  const prior = average(sample.slice(-40, -20).map(point => point.close))
  return prior ? (recent / prior - 1) * 100 : 0
}

function classifyStage(
  price: number,
  ma50: number,
  ma150: number,
  ma200: number,
  ma200Slope: number
): MarketStage {
  if (price < ma200 && ma50 < ma150 && ma200Slope < 0) return 4
  if (price > ma150 && ma150 > ma200 && ma50 > ma150 && ma200Slope > 0) return 2
  if (price >= ma200 && (ma50 < ma150 || ma200Slope <= 0)) return 3
  return 1
}

function detectVcp(prices: OHLCVPoint[]): SepaAnalysis['vcp'] {
  const recent = prices.slice(-120)
  if (recent.length < 30) {
    return {
      detected: false,
      contractions: [],
      pivot: recent.at(-1)?.high || 0,
      explanation: '歷史資料不足，無法確認 VCP。'
    }
  }
  const windowSize = Math.max(10, Math.floor(recent.length / 4))
  const contractions: number[] = []
  for (let index = 0; index < 4; index++) {
    const window = recent.slice(index * windowSize, (index + 1) * windowSize)
    const high = Math.max(...window.map(point => point.high))
    const low = Math.min(...window.map(point => point.low))
    if (high > 0) contractions.push(((high - low) / high) * 100)
  }
  const decreasing =
    contractions.length >= 3 &&
    contractions.every(
      (value, index) => index === 0 || value <= contractions[index - 1] * 1.05
    )
  const pivot = Math.max(...recent.slice(-30).map(point => point.high))
  return {
    detected: decreasing && contractions[0] > contractions.at(-1)!,
    contractions,
    pivot,
    explanation: decreasing
      ? '波動幅度逐步收窄，接近 VCP 型態；仍需觀察突破量能。'
      : '波動幅度未呈現連續收窄，VCP 訊號不足。'
  }
}

export function calculatePositionSizing(input: {
  accountEquity: number
  riskPercent?: number
  entryPivot: number
  stopPercent?: number
}): PositionSizing {
  const riskPercent = Math.max(0.1, Math.min(5, input.riskPercent ?? 1))
  const entryPivot = Math.max(0, input.entryPivot)
  const stopPercent = Math.max(0.03, Math.min(0.2, input.stopPercent ?? 0.075))
  const stopPrice = entryPivot * (1 - stopPercent)
  const riskAmount = Math.max(0, input.accountEquity) * (riskPercent / 100)
  return {
    accountEquity: Math.max(0, input.accountEquity),
    riskPercent,
    riskAmount,
    entryPivot,
    buyZoneHigh: entryPivot * 1.05,
    stopPrice,
    breakevenTrigger: entryPivot * 1.08,
    shares:
      stopPrice < entryPivot
        ? Math.floor(riskAmount / (entryPivot - stopPrice))
        : 0
  }
}

export function analyzeSepa(
  prices: OHLCVPoint[],
  options: {
    rsRating?: number
    benchmark?: OHLCVPoint[]
    accountEquity?: number
    riskPercent?: number
    stopPercent?: number
  } = {}
): SepaAnalysis {
  const clean = prices.filter(
    point => Number.isFinite(point.close) && point.close > 0
  )
  const price = clean.at(-1)?.close || 0
  const ma50 = movingAverage(clean, 50)
  const ma150 = movingAverage(clean, 150)
  const ma200 = movingAverage(clean, 200)
  const ma200Slope = slope(clean, 200)
  const low52 = Math.min(...clean.slice(-252).map(point => point.low))
  const high52 = Math.max(...clean.slice(-252).map(point => point.high))
  const benchmark = options.benchmark || []
  const stockReturn =
    clean.length > 63 ? clean.at(-1)!.close / clean.at(-64)!.close - 1 : 0
  const benchmarkReturn =
    benchmark.length > 63
      ? benchmark.at(-1)!.close / benchmark.at(-64)!.close - 1
      : 0
  const computedRs = Math.max(
    0,
    Math.min(99, 50 + (stockReturn - benchmarkReturn) * 1000)
  )
  const rsRating = Math.max(0, Math.min(99, options.rsRating ?? computedRs))
  const maValues = [ma50, ma150, ma200]
  const conditions: TrendCondition[] = [
    {
      id: 1,
      label: '股價高於 150MA 與 200MA',
      passed: price > ma150 && price > ma200,
      actual: `${price.toFixed(2)} vs ${ma150.toFixed(2)} / ${ma200.toFixed(2)}`
    },
    {
      id: 2,
      label: '150MA 高於 200MA',
      passed: ma150 > ma200,
      actual: `${ma150.toFixed(2)} > ${ma200.toFixed(2)}`
    },
    {
      id: 3,
      label: '200MA 至少一個月上升',
      passed: ma200Slope > 0,
      actual: `20 日斜率 ${pct(ma200Slope)}`
    },
    {
      id: 4,
      label: '50MA 高於 150MA 與 200MA',
      passed: ma50 > ma150 && ma50 > ma200,
      actual: `${ma50.toFixed(2)} vs ${ma150.toFixed(2)} / ${ma200.toFixed(2)}`
    },
    {
      id: 5,
      label: '股價高於 50MA',
      passed: price > ma50,
      actual: `${price.toFixed(2)} vs ${ma50.toFixed(2)}`
    },
    {
      id: 6,
      label: '股價高於 52 週低點至少 30%',
      passed: low52 > 0 && price >= low52 * 1.3,
      actual: `距低點 ${low52 > 0 ? pct(price / low52 - 1) : '—'}`
    },
    {
      id: 7,
      label: '股價在 52 週高點 25% 以內',
      passed: high52 > 0 && price >= high52 * 0.75,
      actual: `距高點 ${high52 > 0 ? pct(price / high52 - 1) : '—'}`
    },
    {
      id: 8,
      label: 'RS rating 高於 70',
      passed: rsRating > 70,
      actual: `${rsRating.toFixed(0)}`
    }
  ]
  const stage = classifyStage(price, ma50, ma150, ma200, ma200Slope)
  const vcp = detectVcp(clean)
  const entryPivot = vcp.pivot || price
  const stageLabel = {
    1: 'Stage 1 築底',
    2: 'Stage 2 上升',
    3: 'Stage 3 反轉築頂',
    4: 'Stage 4 下跌'
  }[stage]
  return {
    price,
    movingAverages: { ma50, ma150, ma200 },
    conditions,
    score: conditions.filter(condition => condition.passed).length,
    stage,
    stageLabel,
    rsRating,
    vcp,
    positionSizing: calculatePositionSizing({
      accountEquity: options.accountEquity ?? 100000,
      riskPercent: options.riskPercent,
      entryPivot,
      stopPercent: options.stopPercent
    })
  }
}
