/**
 * DeepEar Lite & Financial Transmission Chain & Signal Tracker Engine
 * Inspired by HKUST Dial / DeepEar / Awesome-finance-skills
 */

import {
  evaluateSystemOne,
  type ChoiceAnswer,
  type ScoreAnswer,
  type NoulAnswer
} from './clef'
import { searchResearchEvidence } from './research-search'

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
  evidence?: string[]
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
  // Unverified user queries evaluate market sentiment and transmission impact,
  // while non-neutral thesis statuses (Strengthened / Weakened) strictly require verified evidence.
  const targetName = symbol || query

  // Attempt to gather contextual evidence via live financial search
  let evidenceArticles: Array<{ title: string; snippet?: string; url?: string; publisher?: string }> = []
  try {
    const research = await searchResearchEvidence({
      question: query,
      symbol,
      limit: 3
    })
    if (research?.results && research.results.length > 0) {
      evidenceArticles = research.results.map(r => {
        let publisher = ''
        try {
          if (r.url) publisher = new URL(r.url).hostname.replace(/^www\./, '')
        } catch {}
        return {
          title: r.title,
          url: r.url,
          publisher,
          snippet: r.description?.slice(0, 200)
        }
      })
    }
  } catch (err) {
    console.warn('[DeepEar] Evidence search skipped or timed out:', err)
  }

  const hasCandidates = evidenceArticles.length > 0

  // Evaluate market sentiment and transmission flow with Clef-Flash System One (190ms)
  let clefEval: {
    sentimentScore: number
    confidence: number
    transmissionDirection: 'positive' | 'negative' | 'neutral'
  } | null = null

  if (hasCandidates) {
    try {
      const res = await evaluateSystemOne(
        {
          model: 'clef-flash',
          state: {
            target: targetName,
            userQuery: query,
            articles: evidenceArticles.map(a => ({
              title: a.title,
              publisher: a.publisher || 'web',
              url: a.url,
              snippet: a.snippet
            }))
          },
          questions: {
            transmission_direction: {
              type: 'choice',
              instructions:
                '依據檢索到的市場新聞與研調資訊，該主題對標的與產業鏈的傳導傾向偏向為何？',
              criteria: {
                bullish_catalyst: '偏多催化，傳導利好產業鏈與營運預期',
                bearish_headwind: '偏空承壓，傳導逆風挑戰與成本估值壓力',
                neutral_balanced: '中性平衡或多空拉鋸，傳導效應不明顯'
              }
            },
            sentiment_level: {
              type: 'score',
              instructions:
                '該主題對標的市場情緒的整體衝擊程度（1最悲觀到5最樂觀）：',
              criteria: [
                '極度利空重挫',
                '偏空承壓',
                '中性平衡',
                '偏多利好',
                '強烈催化爆發'
              ]
            }
          }
        },
        { timeoutMs: 600, totalTimeoutMs: 1200 }
      )

      if (res?.answers) {
        const dirAns = res.answers.transmission_direction as ChoiceAnswer | undefined
        const scoreAns = res.answers.sentiment_level as ScoreAnswer | undefined

        const rawScore = typeof scoreAns?.score === 'number' ? scoreAns.score : 3
        const sentimentScore = Math.max(-1, Math.min(1, Number(((rawScore - 3) * 0.4).toFixed(2))))
        const dirChoice = dirAns?.type === 'choice' ? dirAns.choice : undefined
        const transmissionDirection =
          dirChoice === 'bullish_catalyst'
            ? 'positive'
            : dirChoice === 'bearish_headwind'
              ? 'negative'
              : 'neutral'

        clefEval = {
          sentimentScore,
          confidence: typeof dirAns?.confidence === 'number' ? dirAns.confidence : 0.8,
          transmissionDirection
        }
      }
    } catch (err) {
      console.warn('[DeepEar] Clef sentiment evaluation skipped:', err)
    }
  }

  // Strict Safety Policy:
  // Directional investment thesis changes (Strengthened / Weakened / Falsified) strictly
  // require pre-verified, curated signals from institutional feeds (Branch 1).
  // Dynamic free-form search results over web snippets lack full-audit publisher verification;
  // therefore, dynamic topic signalStatus STRICTLY remains 'Unchanged' (under observation)
  // to prevent unverified web snippets from generating actionable buy/sell recommendations.
  const signalStatus: 'Strengthened' | 'Weakened' | 'Falsified' | 'Unchanged' = 'Unchanged'
  const sentimentScore = clefEval ? clefEval.sentimentScore : 0.0
  const confidence = clefEval ? clefEval.confidence : 0.5
  const stepImpact: 'positive' | 'negative' | 'neutral' =
    clefEval ? clefEval.transmissionDirection : 'neutral'

  const chain: TransmissionStep[] = [
    {
      step: 1,
      node: '一階：總經/事件直接衝擊 (Trigger Layer)',
      impact: stepImpact,
      impactLabel:
        stepImpact === 'positive'
          ? '利好 (Positive)'
          : stepImpact === 'negative'
            ? '利空 (Negative)'
            : '中性平衡 (Neutral)',
      logic:
        stepImpact === 'positive'
          ? `檢索資訊顯示「${query}」呈現正向催化氛圍；若流動性或政策支持持續，市場風險偏好有望獲得提振。`
          : stepImpact === 'negative'
            ? `檢索資訊顯示「${query}」偏向謹慎或逆風；若外部壓力擴散，需提防市場避險情緒升溫與估值折價。`
            : `檢索資訊顯示「${query}」市場觀點多空拉鋸或衝擊有限，總體定價錨點暫未形成單向突破。`,
      affectedSectors: ['大宗商品 / 總體流動性 / 利率環境']
    },
    {
      step: 2,
      node: '二階：產業鏈上下游傳導假設 (Supply Chain Transmission)',
      impact: stepImpact,
      impactLabel:
        stepImpact === 'positive'
          ? '潛在受惠 (條件假設)'
          : stepImpact === 'negative'
            ? '潛在承壓 (條件假設)'
            : '動態平衡 (待數據驗證)',
      logic:
        stepImpact === 'positive'
          ? '若終端需求與訂單動能如期擴散，產業鏈中具備定價權與技術護城河的廠商相對具備吸收與轉嫁優勢。'
          : stepImpact === 'negative'
            ? '若上游成本上升或下游客戶排期調整，產業鏈中下游廠商之毛利率與庫存去化節奏可能面臨考驗。'
            : '目前產業鏈上下游傳導路徑尚未明朗，各環節供需格局維持動態平衡，需持續追蹤月度營收與交期變動。',
      affectedSectors: ['上游原物料', '中游模組製造', '下游終端應用']
    },
    {
      step: 3,
      node: '三階：企業營運與估值敏感度推演 (Corporate Valuation)',
      impact: stepImpact,
      impactLabel:
        stepImpact === 'positive'
          ? '營運偏多預期 (需財報印證)'
          : stepImpact === 'negative'
            ? '估值考驗預期 (需財報印證)'
            : '中性觀察態 (維持基線)',
      logic:
        stepImpact === 'positive'
          ? `若上述產業鏈傳導實質兌現於財報，標的「${targetName}」之獲利彈性有望獲得支撐；惟實際營運表現仍須以官方季報與法說會數據為準。`
          : stepImpact === 'negative'
            ? `若外部逆風實質壓抑獲利斜率，市場對標的「${targetName}」之本益比與自由現金流估值可能趨於保守；需密切關注最新季報獲利指標。`
            : `在缺乏官方審計財報或明確業績指引變更前，標的「${targetName}」維持既有基線假設，暫不做方向性超額預測。`,
      affectedSectors: [targetName]
    }
  ]

  const statusLabel = '⚪ 論點維持 (Unchanged)'
  const statusColor = 'text-slate-600 bg-slate-50 border-slate-200'

  const actionableInsights =
    '針對自定義主題進行多層級邏輯傳導推演。非官方已核實之傳聞或未經審計之市場片段討論，維持中性觀察部位，切勿依單一片段假設任意調整部位。'

  return {
    topic: query,
    title: `${targetName} 產業邏輯傳導與投資訊號追蹤`,
    summary: `針對「${query}」進行多層級金融邏輯傳導分析，評估從一階總經觸發、二階產業鏈分流到三階企業現金流之連鎖反應。`,
    sentimentScore,
    confidence,
    signalStatus,
    statusLabel,
    statusColor,
    chain,
    falsificationCriteria: [
      `【關鍵證偽指標 1】：季報毛利率跌破近四季均值或營業利益率出現結構性下滑。`,
      `【關鍵證偽指標 2】：技術面跌破關鍵長期均線（如 150MA / 200MA）且量能無法回補。`,
      `【關鍵證偽指標 3】：終端客戶下修年度資本支出 (CapEx) 或主要競爭對手發動價格戰。`
    ],
    actionableInsights,
    sources: [
      'DeepEar Lite Intelligence',
      ...(clefEval ? ['Clef-Flash System One Decision Engine'] : []),
      ...(hasCandidates ? ['2MD Market Feed'] : []),
      'Quantitative Transmission Engine'
    ],
    evidence: hasCandidates
      ? evidenceArticles
          .slice(0, 3)
          .map(
            a =>
              `${a.publisher ? `[${a.publisher}] ` : ''}${a.title}${a.snippet ? `：${a.snippet.replace(/\s+/g, ' ').trim().slice(0, 120)}` : ''}`
          )
      : undefined
  }
}
