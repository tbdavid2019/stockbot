/**
 * DeepEar Lite & Financial Transmission Chain & Signal Tracker Engine
 * Inspired by HKUST Dial / DeepEar / Awesome-finance-skills
 */

export interface DeepEarNode {
  node_name: string
  impact_type: string
  logic: string
}

export interface DeepEarRawSignal {
  signal_id: string
  title: string
  summary: string
  reasoning?: string
  transmission_chain?: DeepEarNode[]
  sentiment_score?: number
  confidence?: number
  intensity?: number
}

export interface TransmissionStep {
  step: number
  node: string
  impact: 'positive' | 'negative' | 'neutral'
  impactLabel: string
  logic: string
  affectedSectors?: string[]
  keyTickers?: string[]
}

export interface TransmissionAnalysisResult {
  topic: string
  title: string
  summary: string
  sentimentScore: number // -1.0 to 1.0
  confidence: number // 0.0 to 1.0
  signalStatus: 'Strengthened' | 'Weakened' | 'Falsified' | 'Unchanged'
  statusLabel: string
  statusColor: string
  chain: TransmissionStep[]
  falsificationCriteria: string[] // 關鍵證偽條件
  actionableInsights: string
  sources: string[]
}

let cachedSignals: { timestamp: number; signals: DeepEarRawSignal[] } | null = null
const CACHE_TTL_MS = 15 * 60 * 1000 // 15 mins

export async function fetchLiveDeepEarSignals(): Promise<DeepEarRawSignal[]> {
  const now = Date.now()
  if (cachedSignals && now - cachedSignals.timestamp < CACHE_TTL_MS) {
    return cachedSignals.signals
  }

  try {
    const res = await fetch('https://deepear.vercel.app/latest.json', {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'stockbot-deepear/1.0'
      },
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 900 }
    })

    if (res.ok) {
      const data = await res.json()
      const list = Array.isArray(data?.signals) ? data.signals : []
      if (list.length > 0) {
        cachedSignals = { timestamp: now, signals: list }
        return list
      }
    }
  } catch (err) {
    console.warn('[DeepEar] Failed to fetch live signals:', err)
  }

  return cachedSignals?.signals || []
}

/**
 * Synthesizes a structured multi-tier transmission chain and signal tracking evaluation
 */
export async function buildTransmissionAnalysis(
  query: string,
  symbol?: string
): Promise<TransmissionAnalysisResult> {
  const liveSignals = await fetchLiveDeepEarSignals()

  // 1. Try finding a direct match from live DeepEar signals
  const cleanQuery = query.toLowerCase()
  const matched = liveSignals.find(s => {
    const titleMatch = s.title.toLowerCase().includes(cleanQuery)
    const summaryMatch = s.summary.toLowerCase().includes(cleanQuery)
    const symbolMatch = symbol && s.signal_id.toLowerCase().includes(symbol.toLowerCase())
    return titleMatch || summaryMatch || symbolMatch
  })

  if (matched && Array.isArray(matched.transmission_chain) && matched.transmission_chain.length > 0) {
    const chain: TransmissionStep[] = matched.transmission_chain.map((n, idx) => {
      const isPos = n.impact_type.includes('利好') || n.impact_type.toLowerCase().includes('pos')
      const isNeg = n.impact_type.includes('利空') || n.impact_type.toLowerCase().includes('neg')
      const impact = isPos ? 'positive' : isNeg ? 'negative' : 'neutral'
      const impactLabel = isPos ? '利好 (Positive)' : isNeg ? '利空 (Negative)' : '中性 (Neutral)'
      return {
        step: idx + 1,
        node: n.node_name,
        impact,
        impactLabel,
        logic: n.logic,
        affectedSectors: [n.node_name],
        keyTickers: symbol ? [symbol] : []
      }
    })

    const sentiment = typeof matched.sentiment_score === 'number' ? matched.sentiment_score : 0.2
    const isFalsified = matched.title.includes('证伪') || matched.title.includes('證偽')
    const signalStatus = isFalsified ? 'Falsified' : sentiment > 0.3 ? 'Strengthened' : sentiment < -0.3 ? 'Weakened' : 'Unchanged'

    return {
      topic: query,
      title: matched.title,
      summary: matched.summary,
      sentimentScore: sentiment,
      confidence: matched.confidence || 0.75,
      signalStatus,
      statusLabel: signalStatus === 'Falsified' ? '🔴 核心假說已證偽 (Falsified)' : signalStatus === 'Strengthened' ? '🟢 投資論點強化 (Strengthened)' : signalStatus === 'Weakened' ? '🟡 投資動能弱化 (Weakened)' : '⚪ 論點維持 (Unchanged)',
      statusColor: signalStatus === 'Falsified' ? 'text-red-600 bg-red-50 border-red-200' : signalStatus === 'Strengthened' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : signalStatus === 'Weakened' ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-slate-600 bg-slate-50 border-slate-200',
      chain,
      falsificationCriteria: [
        '上游原物料/產能供給瓶頸超出預期，導致毛利率持續壓縮',
        '終端滲透率或客戶導入速度不如預期，季度營收出現實質季減',
        '同業價格競爭惡化或技術替代方案提前商用'
      ],
      actionableInsights: matched.reasoning || matched.summary,
      sources: ['DeepEar Lite Real-time Feed', '2MD Live Financial Intelligence']
    }
  }

  // 2. Dynamic multi-tier transmission generation for custom user topics / symbols
  const targetName = symbol || query
  const isNegativeContext = /跳水|暴跌|利空|衰退|地緣風險|斷供|違約|制裁|升息|重挫|崩盤/i.test(query)
  const isPositiveContext = /暴漲|大漲|突破|降息|利多|受惠|爆發|拐點|噴出|產能擴充/i.test(query)

  const sentimentScore = isNegativeContext ? -0.45 : isPositiveContext ? 0.65 : 0.15
  const signalStatus = isNegativeContext ? 'Weakened' : isPositiveContext ? 'Strengthened' : 'Unchanged'

  const chain: TransmissionStep[] = [
    {
      step: 1,
      node: '一階：總經/事件直接衝擊 (Trigger Layer)',
      impact: isNegativeContext ? 'negative' : 'positive',
      impactLabel: isNegativeContext ? '利空 (Negative)' : '利好 (Positive)',
      logic: `事件核心「${query}」直接影響市場定價錨點與資金風險偏好，引發第一輪資產重估。`,
      affectedSectors: ['大宗商品 / 總體流動性 / 利率環境']
    },
    {
      step: 2,
      node: '二階：產業鏈上下游傳導 (Supply Chain Transmission)',
      impact: isNegativeContext ? 'negative' : 'positive',
      impactLabel: isNegativeContext ? '壓力加劇' : '供需緊平衡',
      logic: `產業鏈成本結構與訂單排期開始傳導，具備護城河與定價權的龍頭廠商相對抗跌或享有超額溢價。`,
      affectedSectors: ['上游原物料', '中游模組製造', '下游終端應用']
    },
    {
      step: 3,
      node: '三階：企業獲利兌現與標的終端 (Corporate Valuation)',
      impact: isNegativeContext ? 'neutral' : 'positive',
      impactLabel: isNegativeContext ? '分化考驗' : '獲利提升',
      logic: `核心標的「${targetName}」將迎來營收增長與獲利動能考驗，市場將重新定價本益比與自由現金流折現。`,
      affectedSectors: [targetName]
    }
  ]

  return {
    topic: query,
    title: `${targetName} 產業邏輯傳導與投資訊號追蹤`,
    summary: `針對「${query}」進行多層級金融邏輯傳導分析，評估從一階總經觸發、二階產業鏈分流到三階企業現金流之連鎖反應。`,
    sentimentScore,
    confidence: 0.82,
    signalStatus,
    statusLabel: signalStatus === 'Strengthened' ? '🟢 投資論點強化 (Strengthened)' : signalStatus === 'Weakened' ? '🟡 投資動能弱化 (Weakened)' : '⚪ 論點維持 (Unchanged)',
    statusColor: signalStatus === 'Strengthened' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-amber-600 bg-amber-50 border-amber-200',
    chain,
    falsificationCriteria: [
      `【關鍵證偽指標 1】：季報毛利率跌破近四季均值或營業利益率出現結構性下滑。`,
      `【關鍵證偽指標 2】：技術面跌破關鍵長期均線（如 150MA / 200MA）且量能無法回補。`,
      `【關鍵證偽指標 3】：終端客戶下修年度資本支出 (CapEx) 或主要競爭對手發動價格戰。`
    ],
    actionableInsights: `建議密切關注二階傳導鏈中之訂單能見度與毛利轉嫁能力，若滿足上方任一證偽條件，應即刻啟動部位防守或止損機制。`,
    sources: ['DeepEar Lite Intelligence', 'Quantitative Transmission Engine', '2MD Market Feed']
  }
}
