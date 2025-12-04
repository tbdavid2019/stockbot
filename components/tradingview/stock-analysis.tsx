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

interface AnalysisResult {
  analyst_signals: {
    [analyst: string]: {
      [ticker: string]: AnalystSignal
    }
  }
  decisions: {
    [ticker: string]: Decision
  }
}

interface StockAnalysisProps {
  symbol: string
}

const ANALYST_DISPLAY_NAMES: { [key: string]: string } = {
  ben_graham_agent: '📚 班傑明·葛拉漢 (價值投資之父)',
  warren_buffett_agent: '🎯 華倫·巴菲特 (股神)',
  charlie_munger_agent: '🧠 查理·蒙格 (巴菲特夥伴)',
  peter_lynch_agent: '📈 彼得·林區 (成長投資)',
  michael_burry_agent: '🔍 麥可·乾 (大空頭)',
  cathie_wood_agent: '🚀 凱西·乾德 (創新投資)',
  bill_ackman_agent: '💼 比爾·乾克曼 (激進價值)',
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

const getSignalColor = (signal: string) => {
  switch (signal) {
    case 'bullish':
      return 'text-green-600 bg-green-50 border-green-200'
    case 'bearish':
      return 'text-red-600 bg-red-50 border-red-200'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

const getSignalEmoji = (signal: string) => {
  switch (signal) {
    case 'bullish':
      return '🟢 看漲'
    case 'bearish':
      return '🔴 看跌'
    default:
      return '⚪ 中性'
  }
}

const getActionColor = (action: string) => {
  switch (action) {
    case 'buy':
      return 'text-green-700 bg-green-100 border-green-300'
    case 'sell':
    case 'short':
      return 'text-red-700 bg-red-100 border-red-300'
    default:
      return 'text-yellow-700 bg-yellow-100 border-yellow-300'
  }
}

const getActionText = (action: string) => {
  switch (action) {
    case 'buy':
      return '✅ 買入'
    case 'sell':
      return '❌ 賣出'
    case 'short':
      return '📉 做空'
    default:
      return '⏸️ 持有'
  }
}

export function StockAnalysis({ symbol }: StockAnalysisProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)

  useEffect(() => {
    const fetchAnalysis = async () => {
      setLoading(true)
      setError(null)

      try {
        // 使用預設分析師列表 (與 Python 範例一致)
        const defaultAnalysts = [
          'ben_graham',
          'bill_ackman', 
          'cathie_wood',
          'charlie_munger',
          'michael_burry',
          'peter_lynch',
          'phil_fisher',
          'warren_buffett',
          'nancy_pelosi',
          'wsb',
          'technical_analyst',
          'fundamentals_analyst',
          'sentiment_analyst',
          'valuation_analyst'
        ]

        const response = await fetch('/api/stock-analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tickers: symbol.toUpperCase(),
            selectedAnalysts: defaultAnalysts,
            modelName: 'gpt-4o-mini'
          })
        })

        if (!response.ok) {
          throw new Error(`API 錯誤: ${response.status}`)
        }

        const data = await response.json()
        setResult(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : '分析失敗，請稍後再試')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalysis()
  }, [symbol])

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-center space-x-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
          <span className="text-slate-600">
            🤖 AI 分析師正在分析 {symbol}...（這可能需要 30-60 秒）
          </span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 space-y-4">
        <div className="text-amber-800">
          <p className="font-semibold mb-2">⚠️ AI 分析服務暫時無法連線</p>
          <p className="text-sm">目前 API 服務正在調整中，請移駕至以下連結使用 AI 投資分析：</p>
        </div>
        <a 
          href="https://huggingface.co/spaces/tbdavid2019/ai-hedge-fund"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-yellow-400 to-orange-500 px-4 py-2 text-white font-medium hover:from-yellow-500 hover:to-orange-600 transition-all"
        >
          🤗 前往 Hugging Face AI 投資分析
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        <p className="text-xs text-amber-600">
          💡 提示：在 Hugging Face 頁面輸入股票代碼（如 {symbol}）並選擇分析師即可獲得專業 AI 投資建議
        </p>
      </div>
    )
  }

  if (!result) {
    return null
  }

  const ticker = symbol.toUpperCase()
  const decision = result.decisions?.[ticker.toLowerCase()] || result.decisions?.[ticker]

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      {/* 標題 */}
      <div className="border-b border-slate-100 pb-3">
        <h3 className="text-lg font-semibold text-slate-800">
          🤖 AI 投資分析報告：{ticker}
        </h3>
        <p className="text-sm text-slate-500">由多位 AI 投資大師共同分析</p>
      </div>

      {/* 最終決策 */}
      {decision && (
        <div className={`rounded-lg border-2 p-4 ${getActionColor(decision.action)}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xl font-bold">{getActionText(decision.action)}</div>
              <div className="text-sm opacity-80">
                信心度：{decision.confidence}% | 建議數量：{decision.quantity} 股
              </div>
            </div>
          </div>
          <div className="mt-2 text-sm">{decision.reasoning}</div>
        </div>
      )}

      {/* 各分析師信號 */}
      <div className="space-y-3">
        <h4 className="font-medium text-slate-700">📊 各分析師觀點</h4>
        <div className="grid gap-2">
          {Object.entries(result.analyst_signals || {}).map(([analyst, signals]) => {
            const tickerSignal = signals[ticker.toLowerCase()] || signals[ticker]
            if (!tickerSignal || analyst === 'risk_management_agent') return null

            const displayName = ANALYST_DISPLAY_NAMES[analyst] || analyst

            return (
              <div
                key={analyst}
                className={`rounded-lg border p-3 ${getSignalColor(tickerSignal.signal)}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{displayName}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{getSignalEmoji(tickerSignal.signal)}</span>
                    <span className="text-sm opacity-70">
                      {tickerSignal.confidence}%
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-xs opacity-80 line-clamp-2">
                  {tickerSignal.reasoning}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* 免責聲明 */}
      <div className="border-t border-slate-100 pt-3 text-xs text-slate-400">
        ⚠️ 此分析僅供參考，不構成投資建議。投資有風險，請謹慎評估。
      </div>
    </div>
  )
}

export default StockAnalysis
