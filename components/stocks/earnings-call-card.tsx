'use client'

import * as React from 'react'
import type { EarningsCallDashboardResult, EarningsCallItem } from '@/lib/quant/earnings-call'
import { useUserApiKey } from '@/lib/hooks/use-user-api-key'
import {
  Search,
  X,
  Globe,
  Building2,
  Landmark,
  Radio,
  Play,
  Calendar,
  History,
  FileText,
  Download,
  Sparkles,
  Compass,
  ExternalLink
} from 'lucide-react'

interface DeckAnalysisState {
  loading: boolean
  summary?: string
  error?: string
  isOpen: boolean
}

const DEFAULT_CARD_DATA: EarningsCallDashboardResult = {
  asOfDate: '即時',
  marketFilter: 'ALL',
  totalCount: 0,
  liveAndToday: [],
  upcoming: [],
  replays: [],
  all: [],
  source: 'MOPS / TWSE / Corporate IR'
}

export function EarningsCallCard({ data }: { data?: EarningsCallDashboardResult }) {
  const safeData = data || DEFAULT_CARD_DATA
  const { config: userKeyConfig } = useUserApiKey()
  const [marketFilter, setMarketFilter] = React.useState<'ALL' | 'TW' | 'US'>(safeData.marketFilter || 'ALL')
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'live' | 'upcoming' | 'replay'>('all')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [analyses, setAnalyses] = React.useState<Record<string, DeckAnalysisState>>({})

  // Filter items dynamically
  const filteredItems = React.useMemo(() => {
    let items = safeData.all || []

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

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      items = items.filter(
        i =>
          i.symbol.toLowerCase().includes(q) ||
          i.companyName.toLowerCase().includes(q) ||
          i.title.toLowerCase().includes(q)
      )
    }

    return items
  }, [safeData.all, marketFilter, statusFilter, searchQuery])

  // Count badges
  const counts = React.useMemo(() => {
    let pool = safeData.all || []
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
  }, [safeData.all, marketFilter])

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
    <section className="w-full rounded-2xl border border-border/80 bg-card p-5 shadow-xs sm:p-6 text-card-foreground my-3">
      {/* Header */}
      <header className="mb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
              <Radio className="size-3" />
              <span>法人說明會 & Earnings Calls</span>
            </span>
            <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-mono border border-border/60">
              基準日期: {safeData.asOfDate}
            </span>
            {safeData.symbol && (
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                目標標的: {safeData.symbol}
              </span>
            )}
          </div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>{safeData.companyName ? `${safeData.companyName} 法說會時程與指引` : '全球法人說明會與業績展望一覽'}</span>
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            整合公開資訊觀測站 (MOPS)、TWSE/TPEX 官方 Webcast 與美股 Earnings Call，提供法說會日程、影音回放、簡報下載與 2MD AI 指引萃取。
          </p>
        </div>

        {/* Source attribution */}
        <div className="rounded-xl border border-border/80 p-2.5 text-xs shrink-0 bg-muted/30">
          <div className="text-muted-foreground font-medium">數據渠道</div>
          <div className="font-semibold text-foreground/80 mt-0.5">{safeData.source}</div>
        </div>
      </header>

      {/* Instant Search Bar */}
      <div className="relative mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="搜尋股票代號或公司名稱（例如：2330、台積電、NVDA、廣達、聯發科）..."
          className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 pl-10 pr-9 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:bg-card focus:outline-none transition-colors shadow-2xs"
        />
        <Search className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-2.5 rounded-full p-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="清除搜尋"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Filter Tabs & Segment Controls */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {/* Market Filter */}
        <div className="inline-flex rounded-xl bg-muted/60 p-1 border border-border/80 text-xs shadow-2xs">
          <button
            type="button"
            onClick={() => setMarketFilter('ALL')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              marketFilter === 'ALL'
                ? 'bg-card shadow-xs text-foreground font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Globe className="size-3.5" />
            <span>全部市場</span>
          </button>
          <button
            type="button"
            onClick={() => setMarketFilter('TW')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              marketFilter === 'TW'
                ? 'bg-card shadow-xs text-foreground font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="size-3.5" />
            <span>台灣市場 (MOPS/TWSE)</span>
          </button>
          <button
            type="button"
            onClick={() => setMarketFilter('US')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              marketFilter === 'US'
                ? 'bg-card shadow-xs text-foreground font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Landmark className="size-3.5" />
            <span>美國市場 (Earnings Calls)</span>
          </button>
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-full border transition-all ${
              statusFilter === 'all'
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold shadow-2xs'
                : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            全部 ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('live')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${
              statusFilter === 'live'
                ? 'border-rose-600 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-bold shadow-2xs'
                : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <span className="size-1.5 rounded-full bg-rose-500" />
            <span>今日/進行中 ({counts.live})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('upcoming')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${
              statusFilter === 'upcoming'
                ? 'border-sky-600 bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 font-bold shadow-2xs'
                : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <span className="size-1.5 rounded-full bg-sky-500" />
            <span>即將舉行 ({counts.upcoming})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('replay')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all ${
              statusFilter === 'replay'
                ? 'border-foreground/40 bg-muted text-foreground font-bold shadow-2xs'
                : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <span className="size-1.5 rounded-full bg-slate-400" />
            <span>歷史回放 ({counts.replay})</span>
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
                className="rounded-xl border border-border/80 bg-muted/20 p-4 transition-all hover:border-foreground/30 shadow-2xs"
              >
                {/* Top line: Symbol, Company, Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border/60">
                      {item.market}:{item.symbol}
                    </span>
                    <h4 className="text-base font-bold text-foreground">
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
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                        <span className="relative flex size-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex size-2 rounded-full bg-rose-500"></span>
                        </span>
                        <span>會議進行中 (Live)</span>
                      </span>
                    )}
                    {isToday && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                        <span className="size-2 rounded-full bg-amber-500" />
                        <span>今日召開</span>
                      </span>
                    )}
                    {isUpcoming && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/30">
                        <span className="size-2 rounded-full bg-sky-500" />
                        <span>即將舉行</span>
                      </span>
                    )}
                    {!isLive && !isToday && !isUpcoming && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border/60">
                        <span className="size-2 rounded-full bg-slate-400" />
                        <span>會議已結束 (可查回放)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Title */}
                <div className="text-sm font-semibold text-foreground mb-2">
                  {item.title}
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-muted-foreground mb-3 bg-card p-3 rounded-xl border border-border/80">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-foreground/80">開會時間：</span>
                    <span className="font-mono font-semibold text-foreground">
                      {item.conferenceDate} {item.conferenceTime || ''}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({item.timezone === 'Asia/Taipei' ? '台北時區' : '美東時區'})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-medium text-foreground/80">形式/地點：</span>
                    <span className="truncate text-foreground/90">{item.locationOrPlatform || '線上會議 / Webcast'}</span>
                  </div>
                </div>

                {/* Guidance Highlights preview if present */}
                {item.guidanceHighlights && (
                  <div className="mb-3 rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3.5 text-xs sm:text-sm space-y-2">
                    <div className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 text-sm">
                      <Compass className="size-4" />
                      <span>官方指引重點摘要</span>
                    </div>
                    {item.guidanceHighlights.revenueOutlook && (
                      <div className="text-foreground/90 leading-snug">
                        <strong className="text-foreground">營收展望：</strong>
                        {item.guidanceHighlights.revenueOutlook}
                      </div>
                    )}
                    {item.guidanceHighlights.marginOutlook && (
                      <div className="text-foreground/90 leading-snug">
                        <strong className="text-foreground">毛利展望：</strong>
                        {item.guidanceHighlights.marginOutlook}
                      </div>
                    )}
                    {item.guidanceHighlights.capexOutlook && (
                      <div className="text-foreground/90 leading-snug">
                        <strong className="text-foreground">資本支出：</strong>
                        {item.guidanceHighlights.capexOutlook}
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons Row */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
                  {item.webcastUrl && (
                    <a
                      href={item.webcastUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors shadow-2xs ${
                        isLive
                          ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700 animate-pulse'
                          : isToday
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/25'
                          : isUpcoming
                          ? 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30 hover:bg-sky-500/25'
                          : 'bg-card text-foreground border-border hover:bg-muted'
                      }`}
                    >
                      {isLive ? (
                        <>
                          <Radio className="size-3.5" />
                          <span>觀看線上直播</span>
                        </>
                      ) : isToday ? (
                        <>
                          <Play className="size-3.5" />
                          <span>今日會議直播</span>
                        </>
                      ) : isUpcoming ? (
                        <>
                          <ExternalLink className="size-3.5" />
                          <span>官方會議直播/議程</span>
                        </>
                      ) : (
                        <>
                          <History className="size-3.5" />
                          <span>歷史影音回放</span>
                        </>
                      )}
                    </a>
                  )}

                  {item.presentationDeckUrl ? (
                    <>
                      <a
                        href={item.presentationDeckUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-card text-foreground hover:bg-muted border border-border transition-colors shadow-2xs"
                      >
                        <Download className="size-3.5" />
                        <span>下載簡報 (PDF)</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleAnalyzeDeck(item)}
                        disabled={analysis?.loading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 shadow-xs transition-all disabled:opacity-50"
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
                            <Sparkles className="size-3.5" />
                            <span>{analysis?.isOpen ? '收起 AI 指引' : 'AI 深度解析簡報'}</span>
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground bg-muted/60 border border-border/60">
                      <FileText className="size-3.5" />
                      <span>{isUpcoming ? '簡報於法說會當日公布' : '簡報請洽官網 IR 專區'}</span>
                    </span>
                  )}

                  <a
                    href={`/?q=${encodeURIComponent(`${item.companyName} (${item.symbol}) 最新法說會重點與投資展望分析`)}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/80 transition-colors shadow-2xs"
                    title="在對話中分析此法說會與投資價值"
                  >
                    <span>💬</span>
                    <span>在 StockBot 分析</span>
                  </a>

                  {(item.market === 'TWSE' || item.market === 'TPEX') && (
                    <a
                      href="https://mops.twse.com.tw/mops/web/t100sb02_1"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors ml-auto"
                      title="公開資訊觀測站 (MOPS) 官方日程公告"
                    >
                      <span>MOPS 官方公告</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="10" y1="14" y2="3"/></svg>
                    </a>
                  )}

                  {item.irUrl && (
                    <a
                      href={item.irUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors ${
                        item.market === 'TWSE' || item.market === 'TPEX' ? '' : 'ml-auto'
                      }`}
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
                      <div className="rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-b from-indigo-50/30 to-white dark:from-indigo-950/20 dark:to-zinc-950 p-4 text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-indigo-100 dark:border-indigo-900/40">
                          <span className="font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5 text-sm sm:text-base">
                            <span>⚡ 2MD AI 法說會簡報深度萃取報告</span>
                          </span>
                          <span className="text-xs text-muted-foreground">
                            由 2MD AnyDoc 原生解析
                          </span>
                        </div>
                        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed">
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
