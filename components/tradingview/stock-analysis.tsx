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
  warren_buffett_agent: '🎯 華倫·巴菲特 (股神)',
  charlie_munger_agent: '🧠 查理·蒙格 (巴菲特夥伴)',
  peter_lynch_agent: '📈 彼得·林區 (成長投資)',
  michael_burry_agent: '🔍 麥可·貝瑞 (大空頭)',
  cathie_wood_agent: '🚀 凱西·伍德 (創新投資)',
  bill_ackman_agent: '💼 比爾·艾克曼 (激進價值)',
  phil_fisher_agent: '🔬 菲利普·費雪 (成長分析)',
  technical_analyst_agent: '📊 技術分析師',
  sentiment_analyst_agent: '💭 情緒分析師',
  fundamentals_analyst_agent: '📋 基本面分析師',
  valuation_analyst_agent: '💰 估值分析師',
  nancy_pelosi_agent: '🏛️ 國會交易追蹤',
  wsb_agent: '🎰 WSB 散戶動能',
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
  'Sentiment Analyst': '💭 情緒分析師',
  'Fundamentals Analyst': '📋 基本面分析師',
  'WSB': '🎰 WSB 散戶',
  'Bill Ackman': '💼 比爾·艾克曼',
  'Peter Lynch': '📈 彼得·林區',
  'Ben Graham': '📚 班傑明·葛拉漢',
  'Nancy Pelosi': '🏛️ 國會代表'
}

function parseTranscript(raw: string | undefined): TranscriptTurn[] {
  if (!raw) return []

  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.map((item: string) => parseSpeakerLine(item)).filter(Boolean) as TranscriptTurn[]
      }
    } catch {
      // ignore
    }
  }

  const lines = raw.split(/\n+/).map(l => l.trim()).filter(Boolean)
  return lines.map(l => parseSpeakerLine(l)).filter(Boolean) as TranscriptTurn[]
}

function parseSpeakerLine(line: string): TranscriptTurn | null {
  if (!line) return null
  const cleaned = line.replace(/^['"\s\[]+|['"\s\]]+$/g, '').trim()
  const match = cleaned.match(/^\[([^\]]+)\]:\s*(.+)$/)
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

export function StockAnalysis({ symbol }: StockAnalysisProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [showTranscript, setShowTranscript] = useState(true)

  const fetchAnalysis = async () => {
    setLoading(true)
    setError(null)

    try {
      const defaultAnalysts = [
        'warren_buffett',
        'cathie_wood',
        'michael_burry',
        'technical_analyst',
        'valuation_analyst',
        'sentiment_analyst',
        'fundamentals_analyst',
        'wsb'
      ]

      const response = await fetch('/api/stock-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tickers: symbol.toUpperCase(),
          selectedAnalysts: defaultAnalysts,
          modelName: 'gpt-4o',
          enableRoundTable: true,
          roundTableRounds: 1
        })
      })

      if (!response.ok) {
        throw new Error(`API 連線錯誤 (${response.status})`)
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析失敗，請稍後再試')
    } finally {
      setLoading(false)
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
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            🤖 AI 投資大師團隊正在進行多輪委員會分析 {symbol}...
          </span>
          <span className="text-xs text-slate-400">
            （多位大師正在交叉辯論與計算估值，預計需 10-25 秒）
          </span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-5 space-y-3 shadow-sm">
        <div className="text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-2">
          <span>⚠️ AI 分析服務暫時無法取得回應</span>
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-400">
          後端分析服務正在繁忙或連線逾時（{error}）。
        </p>
        <button
          onClick={() => fetchAnalysis()}
          className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-all shadow-sm"
        >
          🔄 重新嘗試分析
        </button>
      </div>
    )
  }

  if (!result) {
    return null
  }

  const ticker = symbol.toUpperCase()
  const decision = result.decisions?.[ticker.toLowerCase()] || result.decisions?.[ticker]
  const roundTable = result.round_table?.[ticker.toLowerCase()] || result.round_table?.[ticker] || (result.analyst_signals?.round_table as any)?.[ticker]
  const transcriptTurns = parseTranscript(roundTable?.conversation_transcript)

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-950 p-5 shadow-sm">
      {/* 標題 */}
      <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            🤖 AI 投資大師多輪分析報告：{ticker}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            由多位傳奇投資大師進行獨立研判與多輪圓桌委員會辯論
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
          <div className="mt-2 text-xs md:text-sm leading-relaxed">{decision.reasoning}</div>
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
            const tickerSignal = signals[ticker.toLowerCase()] || signals[ticker]
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
                    {typeof tickerSignal.reasoning === 'string'
                      ? tickerSignal.reasoning
                      : JSON.stringify(tickerSignal.reasoning)}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 免責聲明 */}
      <div className="border-t border-slate-100 dark:border-slate-800 pt-2.5 text-[11px] text-slate-400">
        ⚠️ 此分析由 AI 大師模型生成，僅供研究參考，不構成投資建議。市場有風險，投資需謹慎。
      </div>
    </div>
  )
}

export default StockAnalysis
