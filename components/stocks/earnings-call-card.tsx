'use client'

import * as React from 'react'
import type { EarningsCallDashboardResult, EarningsCallItem } from '@/lib/quant/earnings-call'
import { computeConferenceStatus, formatDualTimezone } from '@/lib/quant/earnings-call'
import { useUserApiKey } from '@/lib/hooks/use-user-api-key'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
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
  ExternalLink,
  MessageSquare,
  AlertCircle,
  Clock,
  Loader2
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
  const [lang] = useLocalStorage<'zh' | 'en'>('stockbot_lang', 'zh')
  const safeData = data || DEFAULT_CARD_DATA
  const { config: userKeyConfig } = useUserApiKey()
  const [marketFilter, setMarketFilter] = React.useState<'ALL' | 'TW' | 'US' | 'JP' | 'KR' | 'OTHER'>(
    safeData.marketFilter || 'ALL'
  )
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'live' | 'upcoming' | 'replay'>('all')
  const [timezoneMode, setTimezoneMode] = React.useState<'local' | 'market'>('local')
  const [userTimezone, setUserTimezone] = React.useState<string>('Asia/Taipei')
  const [nowTime, setNowTime] = React.useState<number>(Date.now())
  const [searchQuery, setSearchQuery] = React.useState('')
  const [analyses, setAnalyses] = React.useState<Record<string, DeckAnalysisState>>({})
  const [extraItems, setExtraItems] = React.useState<EarningsCallItem[]>([])
  const [isSearchingServer, setIsSearchingServer] = React.useState(false)

  // Dynamically search server when user queries a ticker not in the initial set
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const q = searchQuery.trim()
    if (!q) return
    setIsSearchingServer(true)
    try {
      const res = await fetch(`/api/earnings-calls?q=${encodeURIComponent(q)}&market=${marketFilter}`)
      const json = await res.json()
      if (json?.success && Array.isArray(json?.data?.all) && json.data.all.length > 0) {
        setExtraItems(json.data.all)
      }
    } catch (err) {
      console.error('Failed to search earnings calls:', err)
    } finally {
      setIsSearchingServer(false)
    }
  }

  // Combine initial items and extra searched items
  const combinedItems = React.useMemo(() => {
    const map = new Map<string, EarningsCallItem>()
    for (const item of safeData.all || []) {
      map.set(item.id, item)
    }
    for (const item of extraItems) {
      map.set(item.id, item)
    }
    return Array.from(map.values())
  }, [safeData.all, extraItems])

  // Detect user local timezone and run dynamic 30-second live status clock
  React.useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (tz) setUserTimezone(tz)
    } catch {
      // fallback
    }

    const timer = setInterval(() => {
      setNowTime(Date.now())
    }, 30_000)
    return () => clearInterval(timer)
  }, [])

  // Dynamically compute liveStatus for all items relative to exact clock and user timezone
  const itemsWithLiveStatus = React.useMemo(() => {
    const nowDate = new Date(nowTime)
    return combinedItems.map(item => ({
      ...item,
      liveStatus: computeConferenceStatus(
        item.conferenceDate,
        item.timezone,
        item.conferenceTime,
        nowDate,
        userTimezone
      )
    }))
  }, [combinedItems, nowTime, userTimezone])

  // Filter items dynamically
  const filteredItems = React.useMemo(() => {
    let items = itemsWithLiveStatus

    if (marketFilter === 'TW') {
      items = items.filter(i => i.market === 'TWSE' || i.market === 'TPEX')
    } else if (marketFilter === 'US') {
      items = items.filter(i => i.market === 'US')
    } else if (marketFilter === 'JP') {
      items = items.filter(i => i.market === 'JP')
    } else if (marketFilter === 'KR') {
      items = items.filter(i => i.market === 'KR')
    } else if (marketFilter === 'OTHER') {
      items = items.filter(i => i.market === 'OTHER')
    }

    if (statusFilter === 'live') {
      items = items.filter(i => i.liveStatus === 'live' || i.liveStatus === 'today')
    } else if (statusFilter === 'upcoming') {
      items = items.filter(i => i.liveStatus === 'upcoming')
    } else if (statusFilter === 'replay') {
      items = items.filter(i => i.liveStatus === 'replay')
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
  }, [itemsWithLiveStatus, marketFilter, statusFilter, searchQuery])

  // Count badges
  const counts = React.useMemo(() => {
    let pool = itemsWithLiveStatus
    if (marketFilter === 'TW') {
      pool = pool.filter(i => i.market === 'TWSE' || i.market === 'TPEX')
    } else if (marketFilter === 'US') {
      pool = pool.filter(i => i.market === 'US')
    } else if (marketFilter === 'JP') {
      pool = pool.filter(i => i.market === 'JP')
    } else if (marketFilter === 'KR') {
      pool = pool.filter(i => i.market === 'KR')
    } else if (marketFilter === 'OTHER') {
      pool = pool.filter(i => i.market === 'OTHER')
    }
    return {
      all: pool.length,
      live: pool.filter(i => i.liveStatus === 'live' || i.liveStatus === 'today').length,
      upcoming: pool.filter(i => i.liveStatus === 'upcoming').length,
      replay: pool.filter(i => i.liveStatus === 'replay').length
    }
  }, [itemsWithLiveStatus, marketFilter])

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
        throw new Error(lang === 'zh' ? `伺服器回應異常 (HTTP ${res.status})` : `Server response error (HTTP ${res.status})`)
      }

      if (!res.ok || !json?.success) {
        throw new Error(json?.error || (lang === 'zh' ? '解析法說會簡報失敗' : 'Failed to parse earnings presentation deck'))
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
          error: err?.message || (lang === 'zh' ? '簡報解析連線中斷，請重試或點擊下載連結查閱。' : 'Deck parsing connection interrupted. Please retry or click the download link.'),
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
              <span>{lang === 'zh' ? '法人說明會 & Earnings Calls' : 'Corporate Earnings Calls & Webcasts'}</span>
            </span>
            <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-mono border border-border/60">
              {lang === 'zh' ? `基準日期: ${safeData.asOfDate}` : `As of: ${safeData.asOfDate}`}
            </span>
            {safeData.symbol && (
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                {lang === 'zh' ? `目標標的: ${safeData.symbol}` : `Target: ${safeData.symbol}`}
              </span>
            )}
          </div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>
              {safeData.companyName
                ? lang === 'zh'
                  ? `${safeData.companyName} 法說會時程與指引`
                  : `${safeData.companyName} Earnings Call & Guidance`
                : lang === 'zh'
                  ? '全球法人說明會與業績展望一覽'
                  : 'Corporate Earnings Calls & Outlook'}
            </span>
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            {lang === 'zh'
              ? '整合公開資訊觀測站 (MOPS)、TWSE/TPEX 官方 Webcast 與美股 Earnings Call，提供法說會日程、影音回放、簡報下載與 2MD AI 指引萃取。'
              : 'Aggregating MOPS filings, TWSE/TPEX official webcasts, and US corporate earnings calls. Providing event schedules, webcast replays, slide deck downloads, and 2MD AI guidance extraction.'}
          </p>
        </div>

        {/* Source attribution */}
        <div className="rounded-xl border border-border/80 p-2.5 text-xs shrink-0 bg-muted/30">
          <div className="text-muted-foreground font-medium">
            {lang === 'zh' ? '數據渠道' : 'Data Sources'}
          </div>
          <div className="font-semibold text-foreground/80 mt-0.5">{safeData.source}</div>
        </div>
      </header>

      {/* Instant Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={
            lang === 'zh'
              ? '搜尋股票代號或公司名稱（例如：2330、台積電、NVDA、SPCX、聯發科），按 Enter 進行深度檢索...'
              : 'Search ticker or company name (e.g. 2330, TSMC, NVDA, SPCX), press Enter to deep search...'
          }
          className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 pl-10 pr-16 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:bg-card focus:outline-none transition-colors shadow-2xs"
        />
        {isSearchingServer ? (
          <Loader2 className="absolute left-3.5 top-3 size-4 text-indigo-500 animate-spin" />
        ) : (
          <Search className="absolute left-3.5 top-3 size-4 text-muted-foreground" />
        )}
        <div className="absolute right-2 top-2 flex items-center gap-1">
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="rounded-full p-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              title={lang === 'zh' ? '清除搜尋' : 'Clear search'}
            >
              <X className="size-3.5" />
            </button>
          )}
          <button
            type="submit"
            disabled={isSearchingServer || !searchQuery.trim()}
            className="px-2 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 disabled:opacity-40 transition-colors cursor-pointer"
          >
            {lang === 'zh' ? '檢索' : 'Search'}
          </button>
        </div>
      </form>

      {/* Filter Tabs & Segment Controls */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {/* Market Filter */}
        <div className="flex flex-wrap items-center rounded-xl bg-muted/60 p-1 border border-border/80 text-xs shadow-2xs gap-1">
          <button
            type="button"
            onClick={() => setMarketFilter('ALL')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              marketFilter === 'ALL'
                ? 'bg-card shadow-xs text-foreground font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Globe className="size-3.5" />
            <span>{lang === 'zh' ? '全部市場' : 'All Markets'}</span>
          </button>
          <button
            type="button"
            onClick={() => setMarketFilter('TW')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              marketFilter === 'TW'
                ? 'bg-card shadow-xs text-foreground font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="size-3.5" />
            <span>{lang === 'zh' ? '台灣 (TWSE)' : 'Taiwan (TWSE)'}</span>
          </button>
          <button
            type="button"
            onClick={() => setMarketFilter('US')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              marketFilter === 'US'
                ? 'bg-card shadow-xs text-foreground font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Landmark className="size-3.5" />
            <span>{lang === 'zh' ? '美國 (US)' : 'US'}</span>
          </button>
          <button
            type="button"
            onClick={() => setMarketFilter('JP')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              marketFilter === 'JP'
                ? 'bg-card shadow-xs text-foreground font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="text-xs">🇯🇵</span>
            <span>{lang === 'zh' ? '日本 (JPX)' : 'Japan (JPX)'}</span>
          </button>
          <button
            type="button"
            onClick={() => setMarketFilter('KR')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              marketFilter === 'KR'
                ? 'bg-card shadow-xs text-foreground font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="text-xs">🇰🇷</span>
            <span>{lang === 'zh' ? '韓國 (KRX)' : 'Korea (KRX)'}</span>
          </button>
          <button
            type="button"
            onClick={() => setMarketFilter('OTHER')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              marketFilter === 'OTHER'
                ? 'bg-card shadow-xs text-foreground font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Compass className="size-3.5" />
            <span>{lang === 'zh' ? '其他市場' : 'Other Markets'}</span>
          </button>
        </div>

        {/* Timezone Mode Selector */}
        <div className="inline-flex items-center gap-1 rounded-xl bg-muted/60 p-1 border border-border/80 text-xs shadow-2xs">
          <Clock className="size-3.5 text-muted-foreground ml-1.5 shrink-0" />
          <span className="text-muted-foreground mr-1 hidden sm:inline">
            {lang === 'zh' ? '時區顯示：' : 'Timezone:'}
          </span>
          <button
            type="button"
            onClick={() => setTimezoneMode('local')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              timezoneMode === 'local'
                ? 'bg-card shadow-xs text-foreground font-bold border border-border/80'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title={
              lang === 'zh'
                ? `以您的所在地時區 (${userTimezone}) 顯示`
                : `Display in your local timezone (${userTimezone})`
            }
          >
            <span>
              {lang === 'zh'
                ? `當地時間 (${userTimezone === 'Asia/Taipei' ? '台北 UTC+8' : userTimezone})`
                : `Local (${userTimezone === 'Asia/Taipei' ? 'Taipei UTC+8' : userTimezone})`}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTimezoneMode('market')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              timezoneMode === 'market'
                ? 'bg-card shadow-xs text-foreground font-bold border border-border/80'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title={
              lang === 'zh'
                ? '以美東時區 (ET) 或台北時區 (CST) 原始開會時間顯示'
                : 'Display in original market time (ET or Taipei CST)'
            }
          >
            <span>{lang === 'zh' ? '市場原始 (美東/台北)' : 'Market Time (ET/Taipei)'}</span>
          </button>
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-full border transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold shadow-2xs'
                : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {lang === 'zh' ? '全部' : 'All'} ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('live')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all cursor-pointer ${
              statusFilter === 'live'
                ? 'border-rose-600 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-bold shadow-2xs'
                : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <span className="size-1.5 rounded-full bg-rose-500" />
            <span>{lang === 'zh' ? '今日/進行中' : 'Live & Today'} ({counts.live})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('upcoming')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all cursor-pointer ${
              statusFilter === 'upcoming'
                ? 'border-sky-600 bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 font-bold shadow-2xs'
                : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <span className="size-1.5 rounded-full bg-sky-500" />
            <span>{lang === 'zh' ? '即將舉行' : 'Upcoming'} ({counts.upcoming})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('replay')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all cursor-pointer ${
              statusFilter === 'replay'
                ? 'border-foreground/40 bg-muted text-foreground font-bold shadow-2xs'
                : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <span className="size-1.5 rounded-full bg-slate-400" />
            <span>{lang === 'zh' ? '歷史回放' : 'Past Replays'} ({counts.replay})</span>
          </button>
        </div>
      </div>

      {/* Conference Cards List */}
      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-sm text-muted-foreground">
          {lang === 'zh'
            ? '查無符合篩選條件的法人說明會或財報電話會議記錄。'
            : 'No earnings calls found matching the current filters.'}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map(item => {
            const analysis = analyses[item.id]
            const isLive = item.liveStatus === 'live'
            const isToday = item.liveStatus === 'today'
            const isUpcoming = item.liveStatus === 'upcoming'
            const dualTz = formatDualTimezone(item.conferenceDate, item.conferenceTime, item.timezone, userTimezone)

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
                      <span className="text-xs text-muted-foreground font-medium font-mono">
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
                        <span>{lang === 'zh' ? '會議進行中 (Live)' : 'Live Webcast'}</span>
                      </span>
                    )}
                    {isToday && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                        <span className="size-2 rounded-full bg-amber-500" />
                        <span>{lang === 'zh' ? '今日召開' : 'Today'}</span>
                      </span>
                    )}
                    {isUpcoming && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/30">
                        <span className="size-2 rounded-full bg-sky-500" />
                        <span>{lang === 'zh' ? '即將舉行' : 'Upcoming'}</span>
                      </span>
                    )}
                    {!isLive && !isToday && !isUpcoming && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border/60">
                        <span className="size-2 rounded-full bg-slate-400" />
                        <span>{lang === 'zh' ? '會議已結束 (可查回放)' : 'Completed (Replay)'}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Title */}
                <div className="text-sm font-semibold text-foreground mb-2">
                  {item.title}
                </div>

                {/* Info Grid with Dual Timezone Support */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-muted-foreground mb-3 bg-card p-3 rounded-xl border border-border/80">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-foreground/80 shrink-0">
                        {lang === 'zh' ? '開會時間：' : 'Time: '}
                      </span>
                      <span className="font-mono font-bold text-foreground text-sm">
                        {timezoneMode === 'local'
                          ? `${dualTz.localDate} ${dualTz.localTime}`
                          : `${item.conferenceDate} ${item.conferenceTime || ''}`}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-muted border border-border/60 text-foreground/80 font-mono">
                        {timezoneMode === 'local' ? dualTz.localTzName : dualTz.marketTzName}
                      </span>
                    </div>

                    {/* Secondary time comparison subtext */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      {timezoneMode === 'local' ? (
                        item.timezone === 'America/New_York' ? (
                          <>
                            <span className="text-muted-foreground/80">
                              {lang === 'zh' ? '美東原始：' : 'Market ET: '}
                            </span>
                            <span className="font-mono font-medium text-foreground/80">
                              {dualTz.marketDate} {dualTz.marketTime} ET
                            </span>
                            {dualTz.isCrossDay && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/30">
                                {lang === 'zh' ? `跨日${dualTz.dayDiffLabel}` : `Next Day ${dualTz.dayDiffLabel}`}
                              </span>
                            )}
                          </>
                        ) : item.timezone === 'Asia/Tokyo' ? (
                          <>
                            <span className="text-muted-foreground/80">
                              {lang === 'zh' ? '東京原始：' : 'Market JST: '}
                            </span>
                            <span className="font-mono font-medium text-foreground/80">
                              {dualTz.marketDate} {dualTz.marketTime} JST
                            </span>
                          </>
                        ) : item.timezone === 'Asia/Seoul' ? (
                          <>
                            <span className="text-muted-foreground/80">
                              {lang === 'zh' ? '首爾原始：' : 'Market KST: '}
                            </span>
                            <span className="font-mono font-medium text-foreground/80">
                              {dualTz.marketDate} {dualTz.marketTime} KST
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground/80">
                            {lang === 'zh' ? '台北市場會議 (無時差)' : 'Taipei Market (No Time Diff)'}
                          </span>
                        )
                      ) : (
                        item.timezone === 'America/New_York' ? (
                          <>
                            <span className="text-muted-foreground/80">
                              {lang === 'zh' ? '換算當地：' : 'Local: '}
                            </span>
                            <span className="font-mono font-medium text-foreground/80">
                              {dualTz.localDate} {dualTz.localTime} ({dualTz.localTzName})
                            </span>
                            {dualTz.isCrossDay && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/30">
                                {lang === 'zh' ? `跨日${dualTz.dayDiffLabel}` : `Next Day ${dualTz.dayDiffLabel}`}
                              </span>
                            )}
                          </>
                        ) : item.timezone === 'Asia/Tokyo' || item.timezone === 'Asia/Seoul' ? (
                          <>
                            <span className="text-muted-foreground/80">
                              {lang === 'zh' ? '換算當地：' : 'Local: '}
                            </span>
                            <span className="font-mono font-medium text-foreground/80">
                              {dualTz.localDate} {dualTz.localTime} ({dualTz.localTzName})
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground/80">
                            {lang === 'zh' ? '台北市場會議 (無時差)' : 'Taipei Market (No Time Diff)'}
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 truncate sm:self-center">
                    <span className="font-medium text-foreground/80 shrink-0">
                      {lang === 'zh' ? '形式/地點：' : 'Venue/Format: '}
                    </span>
                    <span className="truncate text-foreground/90">
                      {item.locationOrPlatform || (lang === 'zh' ? '線上會議 / Webcast' : 'Online Webcast')}
                    </span>
                  </div>
                </div>

                {/* Guidance Highlights preview if present */}
                {item.guidanceHighlights && (
                  <div className="mb-3 rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3.5 text-xs sm:text-sm space-y-2">
                    <div className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 text-sm">
                      <Compass className="size-4" />
                      <span>{lang === 'zh' ? '官方指引重點摘要' : 'Management Guidance Highlights'}</span>
                    </div>
                    {item.guidanceHighlights.revenueOutlook && (
                      <div className="text-foreground/90 leading-snug">
                        <strong className="text-foreground">
                          {lang === 'zh' ? '營收展望：' : 'Revenue Outlook: '}
                        </strong>
                        {item.guidanceHighlights.revenueOutlook}
                      </div>
                    )}
                    {item.guidanceHighlights.marginOutlook && (
                      <div className="text-foreground/90 leading-snug">
                        <strong className="text-foreground">
                          {lang === 'zh' ? '毛利展望：' : 'Margin Outlook: '}
                        </strong>
                        {item.guidanceHighlights.marginOutlook}
                      </div>
                    )}
                    {item.guidanceHighlights.capexOutlook && (
                      <div className="text-foreground/90 leading-snug">
                        <strong className="text-foreground">
                          {lang === 'zh' ? '資本支出：' : 'CapEx: '}
                        </strong>
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
                          <span>{lang === 'zh' ? '觀看線上直播' : 'Watch Live Webcast'}</span>
                        </>
                      ) : isToday ? (
                        <>
                          <Play className="size-3.5" />
                          <span>{lang === 'zh' ? '今日會議直播' : 'Join Live Stream'}</span>
                        </>
                      ) : isUpcoming ? (
                        <>
                          <ExternalLink className="size-3.5" />
                          <span>{lang === 'zh' ? '官方會議直播/議程' : 'Official Webcast / Agenda'}</span>
                        </>
                      ) : (
                        <>
                          <History className="size-3.5" />
                          <span>{lang === 'zh' ? '歷史影音回放' : 'Replay Recording'}</span>
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
                        <span>{lang === 'zh' ? '下載簡報 (PDF)' : 'Deck (PDF)'}</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleAnalyzeDeck(item)}
                        disabled={analysis?.loading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {analysis?.loading ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>{lang === 'zh' ? '2MD 解析簡報中...' : 'Analyzing Deck (2MD)...'}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="size-3.5" />
                            <span>
                              {analysis?.isOpen
                                ? lang === 'zh' ? '收起 AI 指引' : 'Hide Guidance'
                                : lang === 'zh' ? 'AI 深度解析簡報' : 'AI Guidance Summary'}
                            </span>
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground bg-muted/60 border border-border/60">
                      <FileText className="size-3.5" />
                      <span>
                        {isUpcoming
                          ? lang === 'zh' ? '簡報於法說會當日公布' : 'Deck releases on event day'
                          : lang === 'zh' ? '簡報請洽官網 IR 專區' : 'Check Corporate IR for deck'}
                      </span>
                    </span>
                  )}

                  <a
                    href={`/?q=${encodeURIComponent(
                      lang === 'zh'
                        ? `${item.companyName} (${item.symbol}) 最新法說會重點與投資展望分析`
                        : `Analyze latest earnings call and investment outlook for ${item.companyName} (${item.symbol})`
                    )}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/80 transition-colors shadow-2xs"
                    title={lang === 'zh' ? '在對話中分析此法說會與投資價值' : 'Analyze this earnings call in StockBot chat'}
                  >
                    <MessageSquare className="size-3.5" />
                    <span>{lang === 'zh' ? '在 StockBot 分析' : 'Ask StockBot'}</span>
                  </a>

                  {(item.market === 'TWSE' || item.market === 'TPEX') && (
                    <a
                      href="https://mops.twse.com.tw/mops/web/t100sb02_1"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors ml-auto"
                      title={lang === 'zh' ? '公開資訊觀測站 (MOPS) 官方日程公告' : 'MOPS Official Calendar Notice'}
                    >
                      <span>{lang === 'zh' ? 'MOPS 官方公告' : 'MOPS Filing'}</span>
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
                      title={lang === 'zh' ? '公司官方投資人關係網站' : 'Official Investor Relations Website'}
                    >
                      <span>{lang === 'zh' ? '官網 IR 專區' : 'Corporate IR'}</span>
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
                        <span>
                          {lang === 'zh'
                            ? '正在透過 2MD AnyDoc 秒級解析 PDF 簡報並由 AI 萃取指引...'
                            : 'Parsing PDF presentation deck with 2MD AnyDoc and extracting guidance with AI...'}
                        </span>
                      </div>
                    )}

                    {analysis.error && (
                      <div className="flex items-center gap-1.5 py-2.5 px-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                        <AlertCircle className="size-4 shrink-0" />
                        <span>{analysis.error}</span>
                      </div>
                    )}

                    {analysis.summary && !analysis.loading && (
                      <div className="rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-b from-indigo-50/30 to-white dark:from-indigo-950/20 dark:to-zinc-950 p-4 text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-indigo-100 dark:border-indigo-900/40">
                          <span className="font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5 text-sm sm:text-base">
                            <Sparkles className="size-4 text-amber-500 shrink-0" />
                            <span>
                              {lang === 'zh'
                                ? '2MD AI 法說會簡報深度萃取報告'
                                : '2MD AI Earnings Deck Intelligence Report'}
                            </span>
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {lang === 'zh' ? '由 2MD AnyDoc 原生解析' : 'Parsed by 2MD AnyDoc'}
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
