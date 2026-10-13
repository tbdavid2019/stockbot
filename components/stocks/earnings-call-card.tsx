'use client'

import * as React from 'react'
import type { EarningsCallDashboardResult, EarningsCallItem } from '@/lib/quant/earnings-call'
import { useUserApiKey } from '@/lib/hooks/use-user-api-key'

interface DeckAnalysisState {
  loading: boolean
  summary?: string
  error?: string
  isOpen: boolean
}

export function EarningsCallCard({ data }: { data: EarningsCallDashboardResult }) {
  const { config: userKeyConfig } = useUserApiKey()
  const [marketFilter, setMarketFilter] = React.useState<'ALL' | 'TW' | 'US'>(data.marketFilter || 'ALL')
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'live' | 'upcoming' | 'replay'>('all')
  const [analyses, setAnalyses] = React.useState<Record<string, DeckAnalysisState>>({})

  // Filter items dynamically
  const filteredItems = React.useMemo(() => {
    let items = data.all || []

    if (marketFilter === 'TW') {
      items = items.filter(i => i.market === 'TWSE' || i.market === 'TPEX')
    } else if (marketFilter === 'US') {
      items = items.filter(i => i.market === 'US')
    }

    if (statusFilter === 'live') {
      items = items.filter(i => i.status === 'live' || i.status === 'today')
    } else if (statusFilter === 'upcoming') {
      items = items.filter(i => i.status === 'upcoming')
    } else if (statusFilter === 'replay') {
      items = items.filter(i => i.status === 'replay')
    }

    return items
  }, [data.all, marketFilter, statusFilter])

  // Count badges
  const counts = React.useMemo(() => {
    let pool = data.all || []
    if (marketFilter === 'TW') {
      pool = pool.filter(i => i.market === 'TWSE' || i.market === 'TPEX')
    } else if (marketFilter === 'US') {
      pool = pool.filter(i => i.market === 'US')
    }
    return {
      all: pool.length,
      live: pool.filter(i => i.status === 'live' || i.status === 'today').length,
      upcoming: pool.filter(i => i.status === 'upcoming').length,
      replay: pool.filter(i => i.status === 'replay').length
    }
  }, [data.all, marketFilter])

  // Trigger one-click AI presentation analysis
  const handleAnalyzeDeck = async (item: EarningsCallItem) => {
    const current = analyses[item.id]
    if (current?.summary && !current.error) {
      // Toggle visibility if already loaded
      setAnalyses(prev => ({
        ...prev,
        [item.id]: { ...prev[item.id], isOpen: !prev[item.id].isOpen }
      }))
      return
    }

    if (!item.presentationDeckUrl) return

    setAnalyses(prev => ({
      ...prev,
      [item.id]: { loading: true, isOpen: true, error: undefined }
    }))

    try {
      const res = await fetch('/api/parse-earnings-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckUrl: item.presentationDeckUrl,
          symbol: item.symbol,
          companyName: item.companyName,
          userKeyConfig: userKeyConfig || undefined
        })
      })

      let json: any = null
      try {
        json = await res.json()
      } catch {
        throw new Error(`伺服器回應異常 (HTTP ${res.status})`)
      }

      if (!res.ok || !json?.success) {
        throw new Error(json?.error || '解析法說會簡報失敗')
      }

      setAnalyses(prev => ({
        ...prev,
        [item.id]: {
          loading: false,
          summary: json.aiSummary,
          isOpen: true
        }
      }))
    } catch (err: any) {
      setAnalyses(prev => ({
        ...prev,
        [item.id]: {
          loading: false,
          error: err?.message || '簡報解析連線中斷，請重試或點擊下載連結查閱。',
          isOpen: true
        }
      }))
    }
  }

  return (
    <section className="w-full rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-zinc-950 sm:p-6 text-slate-800 dark:text-slate-100 my-3">
      {/* Header */}
      <header className="mb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
              法人說明會 & Earnings Calls
            </span>
            <span className="text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full font-mono">
              基準日期: {data.asOfDate}
            </span>
            {data.symbol && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                目標標的: {data.symbol}
              </span>
            )}
          </div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <span>{data.companyName ? `${data.companyName} 法說會時程與指引` : '全球法人說明會與業績展望一覽'}</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
            整合公開資訊觀測站 (MOPS)、TWSE/TPEX 官方 Webcast 與美股 Earnings Call，提供法說會日程、影音回放、簡報下載與 2MD AI 指引萃取。
          </p>
        </div>

        {/* Source attribution */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 text-xs shrink-0 bg-slate-50/50 dark:bg-zinc-900/50">
          <div className="text-muted-foreground font-medium">數據渠道</div>
          <div className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{data.source}</div>
        </div>
      </header>

      {/* Filter Tabs & Segment Controls */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {/* Market Filter */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-zinc-900 border border-slate-200 dark:border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setMarketFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              marketFilter === 'ALL'
                ? 'bg-white shadow-sm text-slate-900 dark:bg-zinc-800 dark:text-slate-100 font-semibold'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            🌐 全部市場
          </button>
          <button
            type="button"
            onClick={() => setMarketFilter('TW')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              marketFilter === 'TW'
                ? 'bg-white shadow-sm text-slate-900 dark:bg-zinc-800 dark:text-slate-100 font-semibold'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            🇹🇼 台灣市場 (MOPS/TWSE)
          </button>
          <button
            type="button"
            onClick={() => setMarketFilter('US')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              marketFilter === 'US'
                ? 'bg-white shadow-sm text-slate-900 dark:bg-zinc-800 dark:text-slate-100 font-semibold'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            🇺🇸 美國市場 (Earnings Call)
          </button>
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-full border transition-all ${
              statusFilter === 'all'
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-900'
            }`}
          >
            全部 ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('live')}
            className={`px-2.5 py-1 rounded-full border transition-all ${
              statusFilter === 'live'
                ? 'border-rose-600 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-semibold'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-900'
            }`}
          >
            🔴 今日/進行中 ({counts.live})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('upcoming')}
            className={`px-2.5 py-1 rounded-full border transition-all ${
              statusFilter === 'upcoming'
                ? 'border-sky-600 bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 font-semibold'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-900'
            }`}
          >
            🔵 即將舉行 ({counts.upcoming})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('replay')}
            className={`px-2.5 py-1 rounded-full border transition-all ${
              statusFilter === 'replay'
                ? 'border-slate-600 bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-slate-200 font-semibold'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-900'
            }`}
          >
            ⚪ 歷史回放 ({counts.replay})
          </button>
        </div>
      </div>

      {/* Conference Cards List */}
      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-sm text-muted-foreground">
          查無符合篩選條件的法人說明會或財報電話會議記錄。
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map(item => {
            const analysis = analyses[item.id]
            const isLive = item.status === 'live'
            const isToday = item.status === 'today'
            const isUpcoming = item.status === 'upcoming'

            return (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-zinc-900/40 p-4 transition-all hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Top line: Symbol, Company, Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-200/80 dark:bg-zinc-800 text-slate-800 dark:text-slate-200">
                      {item.market}:{item.symbol}
                    </span>
                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {item.companyName}
                    </h4>
                    {item.financialPeriod && (
                      <span className="text-xs text-muted-foreground font-medium">
                        · {item.financialPeriod}
                      </span>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isLive && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
                        <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping" />
                        🔴 會議進行中 (Live)
                      </span>
                    )}
                    {isToday && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                        🟡 今日召開
                      </span>
                    )}
                    {isUpcoming && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800">
                        🔵 即將舉行
                      </span>
                    )}
                    {!isLive && !isToday && !isUpcoming && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 dark:bg-zinc-800 dark:text-slate-400 dark:border-slate-700">
                        ⚪ 會議已結束 (可查回放)
                      </span>
                    )}
                  </div>
                </div>

                {/* Title */}
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  {item.title}
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 mb-3 bg-white dark:bg-zinc-950/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-slate-500">開會時間：</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {item.conferenceDate} {item.conferenceTime || ''}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      ({item.timezone === 'Asia/Taipei' ? '台北時區' : '美東時區'})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-medium text-slate-500">形式/地點：</span>
                    <span className="truncate">{item.locationOrPlatform || '線上會議 / Webcast'}</span>
                  </div>
                </div>

                {/* Guidance Highlights preview if present */}
                {item.guidanceHighlights && (
                  <div className="mb-3 rounded-lg border border-indigo-100 dark:border-indigo-950/50 bg-indigo-50/30 dark:bg-indigo-950/20 p-2.5 text-xs space-y-1.5">
                    <div className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1">
                      <span>🧭 官方指引重點摘要</span>
                    </div>
                    {item.guidanceHighlights.revenueOutlook && (
                      <div className="text-slate-700 dark:text-slate-300 leading-snug">
                        <strong className="text-slate-900 dark:text-slate-100">營收展望：</strong>
                        {item.guidanceHighlights.revenueOutlook}
                      </div>
                    )}
                    {item.guidanceHighlights.marginOutlook && (
                      <div className="text-slate-700 dark:text-slate-300 leading-snug">
                        <strong className="text-slate-900 dark:text-slate-100">毛利展望：</strong>
                        {item.guidanceHighlights.marginOutlook}
                      </div>
                    )}
                    {item.guidanceHighlights.capexOutlook && (
                      <div className="text-slate-700 dark:text-slate-300 leading-snug">
                        <strong className="text-slate-900 dark:text-slate-100">資本支出：</strong>
                        {item.guidanceHighlights.capexOutlook}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons Row */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                  {item.webcastUrl && (
                    <a
                      href={item.webcastUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/80 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>
                      {isLive ? '觀看線上直播' : '影音/錄音回放'}
                    </a>
                  )}

                  {item.presentationDeckUrl && (
                    <a
                      href={item.presentationDeckUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-slate-700 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                      下載簡報 (PDF)
                    </a>
                  )}

                  {item.presentationDeckUrl && (
                    <button
                      type="button"
                      onClick={() => handleAnalyzeDeck(item)}
                      disabled={analysis?.loading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 shadow-sm transition-all disabled:opacity-50"
                    >
                      {analysis?.loading ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>2MD 解析簡報中...</span>
                        </>
                      ) : (
                        <>
                          <span>⚡</span>
                          <span>{analysis?.isOpen ? '收起 AI 指引' : 'AI 深度解析簡報'}</span>
                        </>
                      )}
                    </button>
                  )}

                  {item.irUrl && (
                    <a
                      href={item.irUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors ml-auto"
                    >
                      <span>官網 IR 專區</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="10" y1="14" y2="3"/></svg>
                    </a>
                  )}
                </div>

                {/* Inline Expandable AI Briefing Drawer */}
                {analysis?.isOpen && (
                  <div className="mt-3.5 pt-3 border-t border-indigo-100 dark:border-indigo-950/80">
                    {analysis.loading && (
                      <div className="flex items-center gap-2.5 py-4 px-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 text-xs text-indigo-700 dark:text-indigo-300">
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>正在透過 2MD AnyDoc 秒級解析 PDF 簡報並由 AI 萃取指引...</span>
                      </div>
                    )}

                    {analysis.error && (
                      <div className="py-2.5 px-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                        ⚠️ {analysis.error}
                      </div>
                    )}

                    {analysis.summary && !analysis.loading && (
                      <div className="rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-b from-indigo-50/30 to-white dark:from-indigo-950/20 dark:to-zinc-950 p-4 text-xs text-slate-800 dark:text-slate-200">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-indigo-100 dark:border-indigo-900/40">
                          <span className="font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5 text-sm">
                            <span>⚡ 2MD AI 法說會簡報深度萃取報告</span>
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            由 2MD AnyDoc 原生解析
                          </span>
                        </div>
                        <div className="prose prose-xs dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed">
                          {analysis.summary}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
