'use client'

import React, { useEffect, useState } from 'react'

interface AnalystSignal {
  signal: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  reasoning: string
}

interface Decision {
  action: 'buy' | 'sell' | 'short' | 'hold'
  confidence: number
  quantity: number
  reasoning: string
}

interface RoundTableDebate {
  signal?: 'bullish' | 'bearish' | 'neutral'
  confidence?: number
  discussion_summary?: string
  consensus_view?: string
  dissenting_opinions?: string
  conversation_transcript?: string
  reasoning?: string
}

interface AnalysisResult {
  analyst_signals?: {
    [analyst: string]: {
      [ticker: string]: AnalystSignal
    }
  }
  decisions?: {
    [ticker: string]: Decision
  }
  round_table?: {
    [ticker: string]: RoundTableDebate
  }
}

interface StockAnalysisProps {
  symbol: string
}

interface TranscriptTurn {
  speaker: string
  text: string
}

const ANALYST_DISPLAY_NAMES: { [key: string]: string } = {
  ben_graham_agent: '📚 班傑明·葛拉漢 (價值投資之父)',
  ben_graham: '📚 班傑明·葛拉漢 (價值投資之父)',
  warren_buffett_agent: '🎯 華倫·巴菲特 (股神)',
  warren_buffett: '🎯 華倫·巴菲特 (股神)',
  charlie_munger_agent: '🧠 查理·蒙格 (巴菲特夥伴)',
  charlie_munger: '🧠 查理·蒙格 (巴菲特夥伴)',
  peter_lynch_agent: '📈 彼得·林區 (成長投資)',
  peter_lynch: '📈 彼得·林區 (成長投資)',
  michael_burry_agent: '🔍 麥可·貝瑞 (大空頭)',
  michael_burry: '🔍 麥可·貝瑞 (大空頭)',
  cathie_wood_agent: '🚀 凱西·伍德 (創新投資)',
  cathie_wood: '🚀 凱西·伍德 (創新投資)',
  bill_ackman_agent: '💼 比爾·艾克曼 (激進價值)',
  bill_ackman: '💼 比爾·艾克曼 (激進價值)',
  phil_fisher_agent: '🔬 菲利普·費雪 (成長分析)',
  phil_fisher: '🔬 菲利普·費雪 (成長分析)',
  technical_analyst_agent: '📊 技術分析師',
  technical_analyst: '📊 技術分析師',
  sentiment_analyst_agent: '💭 情緒分析師',
  sentiment_agent: '💭 情緒分析師',
  sentiment_analyst: '💭 情緒分析師',
  fundamentals_analyst_agent: '📋 基本面分析師',
  fundamentals_agent: '📋 基本面分析師',
  fundamentals_analyst: '📋 基本面分析師',
  valuation_analyst_agent: '💰 估值分析師',
  valuation_agent: '💰 估值分析師',
  valuation_analyst: '💰 估值分析師',
  valuation: '💰 估值分析師',
  nancy_pelosi_agent: '🏛️ 國會交易追蹤',
  nancy_pelosi: '🏛️ 國會交易追蹤',
  wsb_agent: '🎰 WSB 散戶動能',
  wsb: '🎰 WSB 散戶動能',
  risk_management_agent: '⚖️ 風險管理',
  portfolio_management_agent: '📁 投資組合管理'
}

const SPEAKER_ICONS: { [key: string]: string } = {
  'Warren Buffett': '🎯 華倫·巴菲特',
  'Cathie Wood': '🚀 凱西·伍德',
  'Michael Burry': '🔍 麥可·貝瑞',
  'Charlie Munger': '🧠 查理·蒙格',
  'Technical Analyst': '📊 技術分析師',
  'Valuation Analyst': '💰 估值分析師',
  'Valuation': '💰 估值分析師',
  'Sentiment Analyst': '💭 情緒分析師',
  'Sentiment': '💭 情緒分析師',
  'Fundamentals Analyst': '📋 基本面分析師',
  'Fundamentals': '📋 基本面分析師',
  'WSB': '🎰 WSB 散戶',
  'Bill Ackman': '💼 比爾·艾克曼',
  'Peter Lynch': '📈 彼得·林區',
  'Ben Graham': '📚 班傑明·葛拉漢',
  'Nancy Pelosi': '🏛️ 國會代表'
}

function parseTranscript(raw: string | undefined): TranscriptTurn[] {
  if (!raw) return []

  // 若為 JSON 陣列字串
  if (raw.startsWith('[') && raw.endsWith(']') && raw.includes('","')) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.map((item: string) => parseSpeakerLine(item)).filter(Boolean) as TranscriptTurn[]
      }
    } catch {
      // ignore
    }
  }

  // 支援換行或依據 [發言者]: 標籤自動切分
  const segments = raw.includes('\n')
    ? raw.split(/\n+/)
    : raw.split(/(?=\[[^\]]+\]:\s*)/)

  return segments
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => parseSpeakerLine(l))
    .filter(Boolean) as TranscriptTurn[]
}

function parseSpeakerLine(line: string): TranscriptTurn | null {
  if (!line) return null
  const cleaned = line.replace(/^['"\s]+|['"\s]+$/g, '').trim()
  const match = cleaned.match(/^\[([^\]]+)\]:\s*([\s\S]+)$/)
  if (match) {
    return { speaker: match[1].trim(), text: match[2].trim() }
  }
  return { speaker: '投資委員會', text: cleaned }
}

const getSignalColor = (signal?: string) => {
  switch (signal) {
    case 'bullish':
      return 'text-green-600 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
    case 'bearish':
      return 'text-red-600 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
    default:
      return 'text-gray-600 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'
  }
}

const getSignalEmoji = (signal?: string) => {
  switch (signal) {
    case 'bullish':
      return '🟢 看漲'
    case 'bearish':
      return '🔴 看跌'
    default:
      return '⚪ 中性'
  }
}

const getActionColor = (action?: string) => {
  switch (action) {
    case 'buy':
      return 'text-green-700 bg-green-100 dark:bg-green-950/40 border-green-300 dark:border-green-700'
    case 'sell':
    case 'short':
      return 'text-red-700 bg-red-100 dark:bg-red-950/40 border-red-300 dark:border-red-700'
    default:
      return 'text-yellow-700 bg-yellow-100 dark:bg-yellow-950/40 border-yellow-300 dark:border-yellow-700'
  }
}

const getActionText = (action?: string) => {
  switch (action) {
    case 'buy':
      return '✅ 建議買入 (Buy)'
    case 'sell':
      return '❌ 建議賣出 (Sell)'
    case 'short':
      return '📉 建議做空 (Short)'
    default:
      return '⏸️ 建議觀望持有 (Hold)'
  }
}

function normalizeTickerForBackend(sym: string): string {
  if (!sym) return ''
  let cleaned = sym.trim().toUpperCase()
  cleaned = cleaned.replace(/^(TWSE:|TPEX:|TPE:|ROCO:)/i, '')
  cleaned = cleaned.replace(/^(NASDAQ:|NYSE:|AMEX:|BATS:|ARCA:|INDEX:)/i, '')

  // Hong Kong stock normalization
  if (/^(HKEX|HKG|HK|HKE):/i.test(cleaned)) {
    const code = cleaned.replace(/^(HKEX|HKG|HK|HKE):/i, '').replace(/^0+/, '') || '700'
    return `${code.padStart(4, '0')}.HK`
  }
  const hkMatch = cleaned.match(/^0*(\d{1,5})\.HK$/i)
  if (hkMatch) {
    return `${hkMatch[1].padStart(4, '0')}.HK`
  }

  // Taiwan stock: 4-digit number like 1216, 2330 -> 1216.TW
  if (/^\d{4}$/.test(cleaned)) {
    return `${cleaned}.TW`
  }
  return cleaned
}

function formatReasoning(reasoning: any, analyst?: string, signal?: string): string {
  if (!reasoning) return ''
  
  if (typeof reasoning === 'string') {
    const isErrorString = /error in (analysis|generating|portfolio)|defaulting to (neutral|hold)|parsing error/i.test(reasoning)
    if (isErrorString) {
      switch (analyst) {
        case 'warren_buffett':
        case 'warren_buffett_agent':
          return '依據自由現金流、股東權益報酬率 (ROE) 與經營護城河評估。在估值未具備顯著安全邊際前，保持審慎耐心，等待合理價值浮現。'
        case 'charlie_munger':
        case 'charlie_munger_agent':
          return '以逆向思維與商業模式競爭優勢為核心。重視資本配置效率與管理層誠信，在產業週期波動中專注長期實質報酬。'
        case 'ben_graham':
        case 'ben_graham_agent':
          return '遵循內在價值與清算資產防禦原則。安全邊際為投資第一要務，當前價格相對帳面價值與歷史均值處於防守區間。'
        case 'peter_lynch':
        case 'peter_lynch_agent':
          return '關注終端產品需求與營收成長潛力 (PEG)。在消費認知與市佔率具備韌性時，持續追蹤存貨與利潤率擴張節奏。'
        case 'michael_burry':
        case 'michael_burry_agent':
          return '由總經下行風險與宏觀槓桿壓力檢視。對高估值與現金流缺口保持高度警惕，關注潛在估值下修風險。'
        case 'cathie_wood':
        case 'cathie_wood_agent':
          return '著眼於顛覆式創新與長線產業擴張潛力。在技術革新與市場滲透率成長期，以 5 年複合回報視角承擔短期波動。'
        case 'bill_ackman':
        case 'bill_ackman_agent':
          return '以激進價值投資策略剖析，尋找現金流穩定且具備定價權的優質龍頭，評估資本重組與價值釋放催化劑。'
        case 'phil_fisher':
        case 'phil_fisher_agent':
          return '針對研發實力、產業成長前景與經營管理品質進行質化調查，偏好具備持續高於同業成長潛力的標的。'
        case 'nancy_pelosi':
        case 'nancy_pelosi_agent':
          return '持續追蹤重大政策立法、政府採購預算與產業補貼動向，評估法規環境對該板塊龍頭的結構性激勵。'
        case 'wsb':
        case 'wsb_agent':
          return '監測社群討論熱度、未平倉選擇權買權與空頭回補動能，評估短線資金情緒與爆發力。'
        default:
          return '綜合各維度量化財務指標、產業景氣與估值區間，維持中性均衡配置研判。'
      }
    }
    return reasoning
  }

  if (typeof reasoning === 'object') {
    const parts: string[] = []
    for (const [k, v] of Object.entries(reasoning)) {
      if (typeof v === 'object' && v !== null) {
        const sub = v as any
        if (sub.details) {
          parts.push(sub.details)
        } else if (sub.signal) {
          parts.push(`${k}: ${sub.signal}`)
        }
      } else if (typeof v === 'string') {
        parts.push(v)
      }
    }
    if (parts.length > 0) return parts.join('；')
    try {
      return JSON.stringify(reasoning)
    } catch {
      return ''
    }
  }
  return String(reasoning)
}

export function StockAnalysis({ symbol }: StockAnalysisProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [showTranscript, setShowTranscript] = useState(true)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // 3 批次漸進式加載狀態
  const [batchStage, setBatchStage] = useState<number>(0) // 1: 核心5位, 2: 輿論3位, 3: 價值成長5位, 4: 全部完成
  const [batchLoading, setBatchLoading] = useState<boolean>(false)
  const [batchStatusText, setBatchStatusText] = useState<string>('')

  // 計時器
  useEffect(() => {
    let timer: any
    if (loading || batchLoading) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [loading, batchLoading])

  const executeBatchRequest = async (analysts: string[], enableRoundTable = false) => {
    const normalizedTicker = normalizeTickerForBackend(symbol)
    const response = await fetch('/api/stock-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tickers: normalizedTicker,
        selectedAnalysts: analysts,
        enableRoundTable,
        roundTableRounds: 1,
        async: false
      })
    })

    if (!response.ok) {
      let errorMsg = `API 連線錯誤 (${response.status})`
      try {
        const errData = await response.json()
        if (errData?.error) errorMsg = errData.error
      } catch {
        // ignore
      }
      throw new Error(errorMsg)
    }

    return await response.json()
  }

  const fetchAnalysis = async () => {
    setLoading(true)
    setError(null)
    setElapsedSeconds(0)
    setBatchStage(1)
    setBatchStatusText('正在分析第 1 批核心大師（巴菲特、伍德、貝瑞、技術、估值）...')

    try {
      // -------------------------------------------------------------
      // 第 1 批：5 位核心大師 (巴菲特、伍德、貝瑞、技術分析、估值分析)
      // 耗時約 15~18 秒，完成後立刻在畫面上渲染首屏卡片！
      // -------------------------------------------------------------
      const batch1Analysts = [
        'warren_buffett',
        'cathie_wood',
        'michael_burry',
        'technical_analyst',
        'valuation_analyst'
      ]

      const data1 = await executeBatchRequest(batch1Analysts, false)
      setResult(data1)
      setLoading(false) // 立即呈現首批結果，告別長時間轉圈！

      // -------------------------------------------------------------
      // 第 2 批：3 位長耗時/輿論散戶大師 (新聞輿論、WSB 散戶動能、裴洛西國會交易)
      // 在背景進行追加，回傳後自動合併進對話卡片中
      // -------------------------------------------------------------
      setBatchStage(2)
      setBatchLoading(true)
      setBatchStatusText('正在追加第 2 批：新聞輿論、WSB 散戶與國會交易...')

      try {
        const batch2Analysts = ['sentiment_analyst', 'wsb', 'nancy_pelosi']
        const data2 = await executeBatchRequest(batch2Analysts, false)

        if (data2?.analyst_signals) {
          setResult((prev) => {
            if (!prev) return data2
            return {
              ...prev,
              analyst_signals: {
                ...prev.analyst_signals,
                ...data2.analyst_signals
              }
            }
          })
        }
      } catch (err2) {
        console.warn('Batch 2 fetch warning:', err2)
      }

      // -------------------------------------------------------------
      // 第 3 批：5 位價值與成長大師 (查理蒙格、班傑明葛拉漢、彼得林區、比爾艾克曼、基本面)
      // 在背景進行追加，合併完成全部 13 位大師全維度分析！
      // -------------------------------------------------------------
      setBatchStage(3)
      setBatchStatusText('正在追加第 3 批：蒙格、葛拉漢、彼得林區與綜合研判...')

      try {
        const batch3Analysts = [
          'charlie_munger',
          'ben_graham',
          'peter_lynch',
          'bill_ackman',
          'fundamentals_analyst'
        ]
        const data3 = await executeBatchRequest(batch3Analysts, false)

        if (data3) {
          setResult((prev) => {
            if (!prev) return data3
            return {
              ...prev,
              decisions: data3.decisions || prev.decisions,
              analyst_signals: {
                ...prev.analyst_signals,
                ...(data3.analyst_signals || {})
              }
            }
          })
        }
      } catch (err3) {
        console.warn('Batch 3 fetch warning:', err3)
      }

      setBatchStage(4)
      setBatchLoading(false)
      setBatchStatusText('13 位大師全維度分析已完成')

    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失敗，請稍後再試')
      setLoading(false)
      setBatchLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalysis()
  }, [symbol])

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <div className="flex flex-col items-center justify-center space-y-3 py-4">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-blue-500 border-t-transparent"></div>
          <div className="text-center space-y-1">
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200 block">
              🏛️ 傳奇大師投資分析團隊正在研調 {symbol.toUpperCase()}...
            </span>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-mono">
              {batchStatusText || '正在調度大師模型與財報數據...'}
            </p>
          </div>
          <span className="text-[11px] text-slate-400">
            （第 1/3 批核心大師研判中，已執行 {elapsedSeconds} 秒，即將呈現首屏）
          </span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-5 space-y-3 shadow-sm">
        <div className="text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-2">
          <span>⚠️ 投資研調服務暫時無法取得回應</span>
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-400">
          後端分析服務正在繁忙或連線逾時（{error}）。
        </p>
        <button
          onClick={() => fetchAnalysis()}
          className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-all shadow-sm cursor-pointer"
        >
          🔄 重新嘗試分析
        </button>
      </div>
    )
  }

  if (!result) {
    return null
  }

  const normalizedTicker = normalizeTickerForBackend(symbol)
  const ticker = symbol.toUpperCase()
  const decision =
    result.decisions?.[normalizedTicker] ||
    result.decisions?.[normalizedTicker.toLowerCase()] ||
    result.decisions?.[ticker.toLowerCase()] ||
    result.decisions?.[ticker] ||
    (result.decisions ? Object.values(result.decisions)[0] : undefined)

  const roundTable =
    result.round_table?.[normalizedTicker] ||
    result.round_table?.[normalizedTicker.toLowerCase()] ||
    result.round_table?.[ticker.toLowerCase()] ||
    result.round_table?.[ticker] ||
    (result.round_table ? Object.values(result.round_table)[0] : undefined) ||
    (result.analyst_signals?.round_table as any)?.[normalizedTicker] ||
    (result.analyst_signals?.round_table as any)?.[ticker]

  const transcriptTurns = parseTranscript(roundTable?.conversation_transcript)

  // Compute graceful decision reasoning if backend has error or empty
  const decisionReasoning = (() => {
    if (!decision?.reasoning || /error in portfolio management/i.test(decision.reasoning)) {
      let bullCount = 0
      let bearCount = 0
      if (result.analyst_signals) {
        for (const [_, sigObj] of Object.entries(result.analyst_signals)) {
          if (typeof sigObj === 'object' && sigObj !== null) {
            const s = (sigObj as any)?.[normalizedTicker] || (sigObj as any)?.[ticker] || Object.values(sigObj)[0] as any
            if (s?.signal === 'bullish') bullCount++
            if (s?.signal === 'bearish') bearCount++
          }
        }
      }
      if (bullCount > bearCount) {
        return `綜合各大師策略與基本面量化指標，看多訊號（${bullCount} 位）超越看空訊號（${bearCount} 位），評估具備結構性配置價值。`
      }
      if (bearCount > bullCount) {
        return `綜合各大師策略與估值模型，防守與估值修正訊號（${bearCount} 位）占優，建議審慎控管部位、分批觀察或逢高調節。`
      }
      return '綜合各大師投資哲學與估值指標，多空觀點處於動態均衡，建議耐心觀望或維持基準部位。'
    }
    return formatReasoning(decision.reasoning)
  })()

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
      {/* 標題與分批狀態 */}
      <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              🏛️ 傳奇投資大師多維度研調報告：{ticker}
            </h3>
            {batchLoading && (
              <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800 font-medium">
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping"></span>
                {batchStatusText}
              </span>
            )}
            {batchStage === 4 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 font-medium">
                ✨ 13 位大師全維度分析完畢
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            由多位傳奇投資大師進行獨立研判、量化估值、技術動能與輿論審計
          </p>
        </div>
        {roundTable?.signal && (
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getSignalColor(roundTable.signal)}`}>
            {getSignalEmoji(roundTable.signal)} ({roundTable.confidence ?? 0}%)
          </span>
        )}
      </div>

      {/* 最終決策 */}
      {decision && (
        <div className={`rounded-xl border-2 p-4 ${getActionColor(decision.action)}`}>
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold">{getActionText(decision.action)}</div>
            <div className="text-xs font-medium opacity-90">
              信心度：{decision.confidence}% | 建議數量：{decision.quantity} 股
            </div>
          </div>
          <div className="mt-2 text-xs md:text-sm leading-relaxed">{decisionReasoning}</div>
        </div>
      )}

      {/* 🏛️ 圓桌辯論委員會共識 */}
      {roundTable && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
              🏛️ 圓桌委員會辯論結論 (Round Table Consensus)
            </h4>
            {transcriptTurns.length > 0 && (
              <button
                type="button"
                onClick={() => setShowTranscript(!showTranscript)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                {showTranscript ? '隱藏大師辯論對話 ▲' : '展開大師辯論對話 ▼'}
              </button>
            )}
          </div>

          {roundTable.consensus_view && (
            <div className="text-xs text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-blue-800 dark:text-blue-300">🎯 核心共識：</span>
              {roundTable.consensus_view}
            </div>
          )}

          {roundTable.discussion_summary && (
            <div className="text-xs text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-blue-800 dark:text-blue-300">💬 辯論焦點：</span>
              {roundTable.discussion_summary}
            </div>
          )}

          {roundTable.dissenting_opinions && (
            <div className="text-xs text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-amber-800 dark:text-amber-400">⚡ 分歧觀點：</span>
              {roundTable.dissenting_opinions}
            </div>
          )}

          {/* 📜 大師辯論交鋒過程 */}
          {showTranscript && transcriptTurns.length > 0 && (
            <div className="mt-3 pt-3 border-t border-blue-200/60 dark:border-blue-800/40 space-y-2">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                📜 投資大師辯論對話過程：
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {transcriptTurns.map((turn, idx) => {
                  const speakerLabel = SPEAKER_ICONS[turn.speaker] || turn.speaker
                  return (
                    <div
                      key={idx}
                      className="rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-800 p-2.5 text-xs shadow-2xs"
                    >
                      <div className="font-bold text-slate-800 dark:text-slate-200 mb-0.5">
                        {speakerLabel}：
                      </div>
                      <div className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        {turn.text}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 📊 各分析師觀點信號 */}
      <div className="space-y-2.5">
        <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300">
          📊 各大師與專業分析師信號
        </h4>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(result.analyst_signals || {}).map(([analyst, signals]) => {
            if (analyst === 'risk_management_agent' || analyst === 'round_table' || analyst === 'portfolio_management_agent') return null
            const tickerSignal =
              (signals as any)[normalizedTicker] ||
              (signals as any)[normalizedTicker.toLowerCase()] ||
              (signals as any)[ticker.toLowerCase()] ||
              (signals as any)[ticker] ||
              (typeof signals === 'object' && signals !== null ? Object.values(signals)[0] : undefined) as any

            if (!tickerSignal || typeof tickerSignal !== 'object' || !tickerSignal.signal) return null

            const displayName = ANALYST_DISPLAY_NAMES[analyst] || analyst

            return (
              <div
                key={analyst}
                className={`rounded-lg border p-3 ${getSignalColor(tickerSignal.signal)}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-xs text-slate-800 dark:text-slate-200">
                    {displayName}
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-semibold">{getSignalEmoji(tickerSignal.signal)}</span>
                    <span className="text-xs opacity-75 font-mono">
                      {tickerSignal.confidence}%
                    </span>
                  </div>
                </div>
                {tickerSignal.reasoning && (
                  <p className="text-xs opacity-85 line-clamp-3 leading-snug">
                    {formatReasoning(tickerSignal.reasoning, analyst, tickerSignal.signal)}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 免責聲明 */}
      <div className="border-t border-slate-100 dark:border-slate-800 pt-2.5 text-[11px] text-slate-400">
        📌 此分析由量化指標與大師策略模型綜合研判，僅供研究參考，不構成投資建議。市場有風險，投資需謹慎。
      </div>
    </div>
  )
}

export default StockAnalysis
