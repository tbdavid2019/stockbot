'use client'

import * as React from 'react'
import type { EarningsCallDashboardResult, EarningsCallItem } from '@/lib/quant/earnings-call'
import { computeConferenceStatus, formatDualTimezone, getNowDateString } from '@/lib/quant/earnings-call'
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
  Loader2,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Video,
  Mic,
  TrendingUp,
  DollarSign
} from 'lucide-react'

interface DeckAnalysisState {
  loading: boolean
  summary?: string
  error?: string
  isOpen: boolean
}

export interface EarningsCallCardProps {
  data?: EarningsCallDashboardResult
  standalone?: boolean
}

const DEFAULT_CARD_DATA: EarningsCallDashboardResult = {
  asOfDate: '即時',
  marketFilter: 'ALL',
  totalCount: 0,
  liveAndToday: [],
  upcoming: [],
  replays: [],
  all: [],
  source: 'BigGo Finance / MOPS / TWSE / Corporate IR'
}

interface DateGroup {
  date: string
  label: string
  weekdayLabel: string
  relativeBadge?: string
  relativeBadgeColor?: string
  isToday: boolean
  isTomorrow: boolean
  isYesterday: boolean
  isUpcoming: boolean
  isPast: boolean
  items: (EarningsCallItem & { liveStatus: 'live' | 'today' | 'upcoming' | 'replay' })[]
}

export function EarningsCallCard({ data, standalone = false }: EarningsCallCardProps) {
  const [lang] = useLocalStorage<'zh' | 'en'>('stockbot_lang', 'zh')
  const safeData = data || DEFAULT_CARD_DATA
  const { config: userKeyConfig } = useUserApiKey()

  const [marketFilter, setMarketFilter] = React.useState<'ALL' | 'TW' | 'US' | 'JP' | 'KR' | 'OTHER'>(
    safeData.marketFilter || 'ALL'
  )
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'live' | 'upcoming' | 'replay'>('all')
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid')
  const [timezoneMode, setTimezoneMode] = React.useState<'local' | 'market'>('local')
  const [userTimezone, setUserTimezone] = React.useState<string>('Asia/Taipei')
  const [nowTime, setNowTime] = React.useState<number>(Date.now())
  const [searchQuery, setSearchQuery] = React.useState('')
  const [analyses, setAnalyses] = React.useState<Record<string, DeckAnalysisState>>({})
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set())
  const [extraItems, setExtraItems] = React.useState<EarningsCallItem[]>([])
  const [isSearchingServer, setIsSearchingServer] = React.useState(false)

  // Toggle row accordion
  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Deep search server when user queries a ticker not in the initial set
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

  // Group items by conferenceDate into organized date cards (Two-Column BigGo Style)
  const dateGroups: DateGroup[] = React.useMemo(() => {
    const todayStr = getNowDateString('Asia/Taipei')
    const map = new Map<string, (EarningsCallItem & { liveStatus: 'live' | 'today' | 'upcoming' | 'replay' })[]>()

    for (const item of filteredItems) {
      const dateKey = item.conferenceDate || '待確認'
      const existing = map.get(dateKey) || []
      existing.push(item)
      map.set(dateKey, existing)
    }

    const weekdaysZh = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
    const weekdaysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    const groups: DateGroup[] = []

    for (const [date, items] of Array.from(map.entries())) {
      let label = date
      let weekdayLabel = ''
      let isToday = false
      let isTomorrow = false
      let isYesterday = false
      let isUpcoming = false
      let isPast = false
      let relativeBadge: string | undefined
      let relativeBadgeColor: string | undefined

      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [y, m, d] = date.split('-').map(Number)
        const dt = new Date(y, m - 1, d)
        const wIdx = dt.getDay()
        weekdayLabel = lang === 'zh' ? weekdaysZh[wIdx] : weekdaysEn[wIdx]
        label = lang === 'zh' ? `${y}年${m}月${d}日 ${weekdayLabel}` : `${date} (${weekdayLabel})`

        if (date === todayStr) {
          isToday = true
          relativeBadge = lang === 'zh' ? '今日召開' : 'Today'
          relativeBadgeColor = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
        } else {
          const nowDt = new Date()
          const todayMid = new Date(nowDt.getFullYear(), nowDt.getMonth(), nowDt.getDate()).getTime()
          const diffDays = Math.round((dt.getTime() - todayMid) / 86400000)

          if (diffDays === 1) {
            isTomorrow = true
            isUpcoming = true
            relativeBadge = lang === 'zh' ? '明日召開' : 'Tomorrow'
            relativeBadgeColor = 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30'
          } else if (diffDays === -1) {
            isYesterday = true
            isPast = true
            relativeBadge = lang === 'zh' ? '昨日會議' : 'Yesterday'
            relativeBadgeColor = 'bg-muted text-muted-foreground border-border/80'
          } else if (diffDays > 1) {
            isUpcoming = true
            relativeBadge = lang === 'zh' ? `即將舉行 (+${diffDays}天)` : `In ${diffDays} days`
            relativeBadgeColor = 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30'
          } else {
            isPast = true
            relativeBadge = lang === 'zh' ? `${Math.abs(diffDays)}天前` : `${Math.abs(diffDays)}d ago`
            relativeBadgeColor = 'bg-muted text-muted-foreground border-border/60'
          }
        }
      }

      groups.push({
        date,
        label,
        weekdayLabel,
        relativeBadge,
        relativeBadgeColor,
        isToday,
        isTomorrow,
        isYesterday,
        isUpcoming,
        isPast,
        items
      })
    }

    // Sort date groups:
    // When statusFilter is 'all': Today is #1, followed by Tomorrow/Upcoming, then Yesterday and past dates descending
    // When statusFilter is 'upcoming': Ascending by date
    // When statusFilter is 'replay': Descending by date
    return groups.sort((a, b) => {
      if (statusFilter === 'upcoming') {
        return a.date.localeCompare(b.date)
      }
      if (statusFilter === 'replay') {
        return b.date.localeCompare(a.date)
      }

      // 'all' or 'live':
      if (a.isToday && !b.isToday) return -1
      if (!a.isToday && b.isToday) return 1
      if (a.isTomorrow && !b.isTomorrow) return -1
      if (!a.isTomorrow && b.isTomorrow) return 1
      if (a.isYesterday && !b.isYesterday) return -1
      if (!a.isYesterday && b.isYesterday) return 1

      // Past dates: descending
      if (a.isPast && b.isPast) {
        return b.date.localeCompare(a.date)
      }
      // Future dates: ascending
      if (a.isUpcoming && b.isUpcoming) {
        return a.date.localeCompare(b.date)
      }
      return b.date.localeCompare(a.date)
    })
  }, [filteredItems, lang, statusFilter])

  // Trigger one-click AI presentation analysis
  const handleAnalyzeDeck = async (item: EarningsCallItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const current = analyses[item.id]
    if (current?.summary && !current.error) {
      setAnalyses(prev => ({
        ...prev,
        [item.id]: { ...prev[item.id], isOpen: !prev[item.id].isOpen }
      }))
      // Ensure row is expanded
      setExpandedIds(prev => new Set(prev).add(item.id))
      return
    }

    if (!item.presentationDeckUrl) return

    setAnalyses(prev => ({
      ...prev,
      [item.id]: { loading: true, isOpen: true, error: undefined }
    }))
    setExpandedIds(prev => new Set(prev).add(item.id))

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
        throw new Error(lang === 'zh' ? `伺服器回應異常 (HTTP ${res.status})` : `Server error (HTTP ${res.status})`)
      }

      if (!res.ok || !json?.success) {
        throw new Error(json?.error || (lang === 'zh' ? '解析簡報失敗' : 'Failed to parse deck'))
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
          error: err?.message || (lang === 'zh' ? '簡報解析連線中斷，請重試。' : 'Deck parsing failed. Please retry.'),
          isOpen: true
        }
      }))
    }
  }

  // Get Market badge color
  const getMarketBadge = (market: string) => {
    switch (market) {
      case 'TWSE':
      case 'TPEX':
        return 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800'
      case 'US':
        return 'text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800'
      case 'JP':
        return 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800'
      case 'KR':
        return 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800'
      default:
        return 'text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 border-violet-200 dark:border-violet-800'
    }
  }

  return (
    <section className="w-full text-card-foreground">
      {/* Optional Standalone Header (only shown if not inside EarningsCallOverview) */}
      {!standalone && (
        <header className="mb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                <Radio className="size-3" />
                <span>{lang === 'zh' ? '法人說明會 & Earnings Calls' : 'Corporate Earnings Calls & Webcasts'}</span>
              </span>
              <span className="text-xs text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full font-mono border border-border/60">
                {lang === 'zh' ? `基準日: ${safeData.asOfDate}` : `As of: ${safeData.asOfDate}`}
              </span>
              {safeData.symbol && (
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  {lang === 'zh' ? `標的: ${safeData.symbol}` : `Target: ${safeData.symbol}`}
                </span>
              )}
            </div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {safeData.companyName
                ? lang === 'zh'
                  ? `${safeData.companyName} 法說會時程與指引`
                  : `${safeData.companyName} Earnings Call & Guidance`
                : lang === 'zh'
                  ? '全球法人說明會與業績展望一覽'
                  : 'Corporate Earnings Calls & Outlook'}
            </h3>
          </div>
          <div className="rounded-xl border border-border/80 p-2 text-xs shrink-0 bg-muted/40">
            <div className="text-muted-foreground font-medium">
              {lang === 'zh' ? '數據渠道' : 'Sources'}
            </div>
            <div className="font-semibold text-foreground/80 mt-0.5">{safeData.source}</div>
          </div>
        </header>
      )}

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative mb-3.5">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={
            lang === 'zh'
              ? '搜尋代號或公司（如：2330、東陽、ASML、SPCX、NVDA），按 Enter 深度檢索...'
              : 'Search ticker or company (e.g. 2330, ASML, NVDA, SPCX), press Enter to deep search...'
          }
          className="w-full rounded-xl border border-border bg-card px-4 py-2.5 pl-10 pr-20 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none transition-colors shadow-2xs"
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
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 disabled:opacity-40 transition-colors cursor-pointer"
          >
            {lang === 'zh' ? '檢索' : 'Search'}
          </button>
        </div>
      </form>

      {/* Filter Toolbar: Market + Status + Timezone + View Switcher */}
      <div className="mb-4 flex flex-col gap-2.5">
        {/* Market Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center rounded-xl bg-card p-1 border border-border text-xs shadow-2xs gap-1">
            <button
              type="button"
              onClick={() => setMarketFilter('ALL')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                marketFilter === 'ALL'
                  ? 'bg-muted text-foreground font-bold shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Globe className="size-3.5" />
              <span>{lang === 'zh' ? '全部市場' : 'All'}</span>
            </button>
            <button
              type="button"
              onClick={() => setMarketFilter('TW')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                marketFilter === 'TW'
                  ? 'bg-muted text-foreground font-bold shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Building2 className="size-3.5" />
              <span>{lang === 'zh' ? '台灣市場' : 'Taiwan'}</span>
            </button>
            <button
              type="button"
              onClick={() => setMarketFilter('US')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                marketFilter === 'US'
                  ? 'bg-muted text-foreground font-bold shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Landmark className="size-3.5" />
              <span>{lang === 'zh' ? '美國市場' : 'US'}</span>
            </button>
            <button
              type="button"
              onClick={() => setMarketFilter('JP')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                marketFilter === 'JP'
                  ? 'bg-muted text-foreground font-bold shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>🇯🇵</span>
              <span>{lang === 'zh' ? '日本市場' : 'Japan'}</span>
            </button>
            <button
              type="button"
              onClick={() => setMarketFilter('KR')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                marketFilter === 'KR'
                  ? 'bg-muted text-foreground font-bold shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>🇰🇷</span>
              <span>{lang === 'zh' ? '韓國市場' : 'Korea'}</span>
            </button>
            <button
              type="button"
              onClick={() => setMarketFilter('OTHER')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                marketFilter === 'OTHER'
                  ? 'bg-muted text-foreground font-bold shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Compass className="size-3.5" />
              <span>{lang === 'zh' ? '其他市場' : 'Other'}</span>
            </button>
          </div>

          {/* Right Toolbar: View Mode & Timezone */}
          <div className="flex items-center gap-2">
            {/* View Switcher: 2-Col Calendar vs List */}
            <div className="inline-flex items-center rounded-xl bg-card p-1 border border-border text-xs shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-muted text-foreground font-bold shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title={lang === 'zh' ? '兩欄日曆檢視 (BigGo 風格)' : 'Two-column calendar view'}
              >
                <LayoutGrid className="size-3.5" />
                <span className="hidden sm:inline">{lang === 'zh' ? '兩欄日曆' : '2-Col'}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-muted text-foreground font-bold shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title={lang === 'zh' ? '時序清單檢視' : 'Timeline list view'}
              >
                <List className="size-3.5" />
                <span className="hidden sm:inline">{lang === 'zh' ? '時序清單' : 'List'}</span>
              </button>
            </div>

            {/* Timezone Toggle */}
            <div className="inline-flex items-center rounded-xl bg-card p-1 border border-border text-xs shadow-2xs">
              <Clock className="size-3.5 text-muted-foreground ml-1.5 shrink-0 hidden sm:inline" />
              <button
                type="button"
                onClick={() => setTimezoneMode('local')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  timezoneMode === 'local'
                    ? 'bg-muted text-foreground font-bold shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title={`當地時區: ${userTimezone}`}
              >
                <span>{lang === 'zh' ? '台北/當地' : 'Local'}</span>
              </button>
              <button
                type="button"
                onClick={() => setTimezoneMode('market')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  timezoneMode === 'market'
                    ? 'bg-muted text-foreground font-bold shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="美東 ET / 台北 CST 原始時間"
              >
                <span>{lang === 'zh' ? '市場原始' : 'Market'}</span>
              </button>
            </div>
          </div>
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
                ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold shadow-2xs'
                : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{lang === 'zh' ? '今日召開' : 'Today & Live'} ({counts.live})</span>
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
            <span>{lang === 'zh' ? '歷史回放' : 'Replays'} ({counts.replay})</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {dateGroups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
          <Calendar className="mx-auto size-8 text-muted-foreground/50 mb-2" />
          <p>{lang === 'zh' ? '查無符合條件的法人說明會記錄。' : 'No earnings calls found matching criteria.'}</p>
          {searchQuery && (
            <button
              type="button"
              onClick={handleSearchSubmit}
              disabled={isSearchingServer}
              className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer"
            >
              {isSearchingServer ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
              <span>{lang === 'zh' ? `深度聯網檢索「${searchQuery}」` : `Deep search for "${searchQuery}"`}</span>
            </button>
          )}
        </div>
      ) : (
        /* Responsive Calendar Grid: 2 Columns on Desktop, 1 Column on Mobile */
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-start'
              : 'flex flex-col gap-4'
          }
        >
          {dateGroups.map(group => (
            <div
              key={group.date}
              className={`rounded-2xl border bg-card p-4 sm:p-5 shadow-xs transition-shadow hover:shadow-md ${
                group.isToday
                  ? 'border-emerald-500/40 dark:border-emerald-500/30 ring-1 ring-emerald-500/20'
                  : 'border-border/80'
              }`}
            >
              {/* Date Card Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Calendar className={`size-4 ${group.isToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`} />
                  <h4 className="font-bold text-sm sm:text-base text-foreground tracking-tight">
                    {group.label}
                  </h4>
                </div>
                <div className="flex items-center gap-1.5">
                  {group.relativeBadge && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${group.relativeBadgeColor}`}>
                      {group.relativeBadge}
                    </span>
                  )}
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60">
                    {group.items.length} {lang === 'zh' ? '場' : 'calls'}
                  </span>
                </div>
              </div>

              {/* Rows List */}
              <div className="divide-y divide-border/40">
                {group.items.map(item => {
                  const analysis = analyses[item.id]
                  const isExpanded = expandedIds.has(item.id)
                  const isLive = item.liveStatus === 'live'
                  const isToday = item.liveStatus === 'today'
                  const isUpcoming = item.liveStatus === 'upcoming'
                  const dualTz = formatDualTimezone(item.conferenceDate, item.conferenceTime, item.timezone, userTimezone)

                  // Format ticker display: e.g. 1319.TW, 2330.TW, ASML, 2685.T
                  const displayTicker =
                    item.market === 'TWSE' && !item.symbol.includes('.')
                      ? `${item.symbol}.TW`
                      : item.market === 'TPEX' && !item.symbol.includes('.')
                      ? `${item.symbol}.TWO`
                      : item.symbol

                  return (
                    <div
                      key={item.id}
                      className="py-3 transition-colors hover:bg-muted/30 rounded-xl px-2 -mx-2"
                    >
                      {/* Main Compact Row */}
                      <div
                        onClick={() => toggleExpand(item.id)}
                        className="flex items-start justify-between gap-3 cursor-pointer select-none"
                      >
                        {/* Left: Logo & Company Identity */}
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Circular Logo Avatar */}
                          <div className="size-9 sm:size-10 rounded-full border border-border/80 bg-white dark:bg-zinc-900 p-0.5 shadow-2xs flex items-center justify-center overflow-hidden shrink-0">
                            {item.logoUrl ? (
                              <img
                                src={item.logoUrl}
                                alt={item.symbol}
                                className="size-full object-contain"
                                loading="lazy"
                                onError={e => {
                                  // Fallback to initials if image link breaks
                                  const el = e.currentTarget
                                  el.style.display = 'none'
                                  const sibling = el.nextElementSibling as HTMLElement | null
                                  if (sibling) sibling.style.display = 'flex'
                                }}
                              />
                            ) : null}
                            <span
                              className={`size-full items-center justify-center text-[11px] font-bold font-mono uppercase ${item.logoUrl ? 'hidden' : 'flex'} ${getMarketBadge(item.market)}`}
                            >
                              {item.symbol.slice(0, 3)}
                            </span>
                          </div>

                          {/* Symbol & Name */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-xs sm:text-sm font-bold text-foreground">
                                {displayTicker}
                              </span>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${getMarketBadge(item.market)}`}>
                                {item.market}
                              </span>
                              {isLive && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-500/30">
                                  <span className="size-1.5 rounded-full bg-rose-500 animate-ping" />
                                  <span>LIVE</span>
                                </span>
                              )}
                            </div>
                            <div className="text-xs sm:text-sm font-medium text-foreground truncate max-w-[180px] sm:max-w-[240px]">
                              {item.companyName}
                            </div>
                          </div>
                        </div>

                        {/* Right: Quick Action Buttons & Expand Toggle */}
                        <div className="flex items-center gap-1.5 shrink-0 self-center">
                          {/* 📄 Slide Deck / AI */}
                          {item.presentationDeckUrl ? (
                            <a
                              href={item.presentationDeckUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground/80 transition-colors shadow-2xs"
                              title={lang === 'zh' ? '下載簡報 (PDF)' : 'Download PDF Deck'}
                            >
                              <FileText className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                            </a>
                          ) : null}

                          {/* 🎙️ Webcast Video/Audio Stream */}
                          {item.webcastUrl && (
                            <a
                              href={item.webcastUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className={`p-1.5 rounded-lg border transition-colors shadow-2xs ${
                                isLive
                                  ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700 animate-pulse'
                                  : 'border-border bg-card hover:bg-muted text-foreground/80'
                              }`}
                              title={isLive ? (lang === 'zh' ? '觀看線上直播' : 'Live Stream') : (lang === 'zh' ? '影音回放' : 'Webcast Replay')}
                            >
                              {item.hasVideo ? <Video className="size-3.5 text-emerald-600" /> : <Mic className="size-3.5 text-sky-600" />}
                            </a>
                          )}

                          {/* 💡 Guidance Badge indicator */}
                          {item.guidanceHighlights && (
                            <span
                              className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                              title={lang === 'zh' ? '具官方營運指引' : 'Official Guidance Available'}
                            >
                              <TrendingUp className="size-3" />
                              <span>{lang === 'zh' ? '指引' : 'Guidance'}</span>
                            </span>
                          )}

                          {/* Chevron Expand Indicator */}
                          <div className="p-1 text-muted-foreground hover:text-foreground">
                            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Sub-row: Title & Time */}
                      <div
                        onClick={() => toggleExpand(item.id)}
                        className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground cursor-pointer pl-12"
                      >
                        <span className="truncate pr-2 text-foreground/80">
                          {item.title}
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                          {timezoneMode === 'local' ? `${dualTz.localTime}` : `${item.conferenceTime || '14:00'}`}
                          {timezoneMode === 'local' && dualTz.isCrossDay && (
                            <span className="ml-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                              ({dualTz.dayDiffLabel})
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Expandable Inline Drawer */}
                      {isExpanded && (
                        <div className="mt-3.5 pt-3 border-t border-border/60 pl-2 sm:pl-12 space-y-3">
                          {/* Time & Venue Detail */}
                          <div className="rounded-xl border border-border/60 bg-muted/40 p-3 text-xs space-y-1.5">
                            <div className="flex flex-wrap items-center justify-between gap-1.5">
                              <span className="font-semibold text-foreground">
                                {lang === 'zh' ? '開會時間' : 'Scheduled Time'}:
                              </span>
                              <span className="font-mono font-bold text-foreground">
                                {timezoneMode === 'local'
                                  ? `${dualTz.localDate} ${dualTz.localTime} (${dualTz.localTzName})`
                                  : `${item.conferenceDate} ${item.conferenceTime || '14:00'} (${dualTz.marketTzName})`}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-1.5 text-muted-foreground">
                              <span>{lang === 'zh' ? '時區對照' : 'Dual Timezone'}:</span>
                              <span className="font-mono">
                                {timezoneMode === 'local'
                                  ? `市場原始: ${dualTz.marketDate} ${dualTz.marketTime} (${dualTz.marketTzName})`
                                  : `當地換算: ${dualTz.localDate} ${dualTz.localTime} (${dualTz.localTzName})`}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-1.5 text-muted-foreground">
                              <span>{lang === 'zh' ? '形式 / 地點' : 'Format / Venue'}:</span>
                              <span className="truncate max-w-[260px] text-foreground/80">
                                {item.locationOrPlatform || (lang === 'zh' ? '線上會議 (Webcast)' : 'Online Webcast')}
                              </span>
                            </div>
                          </div>

                          {/* Guidance Highlights preview if available */}
                          {item.guidanceHighlights && (
                            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 text-xs space-y-1.5">
                              <div className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 text-xs">
                                <Compass className="size-3.5" />
                                <span>{lang === 'zh' ? '經營層展望與指引摘要' : 'Management Guidance'}</span>
                              </div>
                              {item.guidanceHighlights.revenueOutlook && (
                                <div className="text-foreground/90 leading-snug">
                                  <strong>{lang === 'zh' ? '營收展望：' : 'Revenue: '}</strong>
                                  {item.guidanceHighlights.revenueOutlook}
                                </div>
                              )}
                              {item.guidanceHighlights.marginOutlook && (
                                <div className="text-foreground/90 leading-snug">
                                  <strong>{lang === 'zh' ? '毛利率目標：' : 'Margin: '}</strong>
                                  {item.guidanceHighlights.marginOutlook}
                                </div>
                              )}
                              {item.guidanceHighlights.capexOutlook && (
                                <div className="text-foreground/90 leading-snug">
                                  <strong>{lang === 'zh' ? '資本支出：' : 'CapEx: '}</strong>
                                  {item.guidanceHighlights.capexOutlook}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Action Buttons Row */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {/* Ask StockBot */}
                            <a
                              href={`/?q=${encodeURIComponent(
                                lang === 'zh'
                                  ? `${item.companyName} (${item.symbol}) 最新法說會重點與投資展望分析`
                                  : `Analyze latest earnings call and outlook for ${item.companyName} (${item.symbol})`
                              )}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors shadow-2xs"
                              title={lang === 'zh' ? '在對話中分析此法說會' : 'Analyze in StockBot'}
                            >
                              <MessageSquare className="size-3.5" />
                              <span>{lang === 'zh' ? '問 StockBot' : 'Ask Bot'}</span>
                            </a>

                            {/* 2MD AI Presentation Deck Analysis */}
                            {item.presentationDeckUrl && (
                              <button
                                type="button"
                                onClick={e => handleAnalyzeDeck(item, e)}
                                disabled={analysis?.loading}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                              >
                                {analysis?.loading ? (
                                  <>
                                    <Loader2 className="size-3.5 animate-spin" />
                                    <span>{lang === 'zh' ? '2MD 解析中...' : 'Analyzing...'}</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="size-3.5" />
                                    <span>
                                      {analysis?.isOpen
                                        ? lang === 'zh' ? '收起 AI 報告' : 'Hide AI Report'
                                        : lang === 'zh' ? '2MD AI 簡報解析' : 'AI Deck Report'}
                                    </span>
                                  </>
                                )}
                              </button>
                            )}

                            {/* Presentation PDF Direct Link */}
                            {item.presentationDeckUrl && (
                              <a
                                href={item.presentationDeckUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-card text-foreground hover:bg-muted border border-border transition-colors shadow-2xs"
                              >
                                <Download className="size-3.5" />
                                <span>{lang === 'zh' ? '簡報下載 (PDF)' : 'Deck PDF'}</span>
                              </a>
                            )}

                            {/* MOPS / TWSE Filing Link */}
                            {(item.market === 'TWSE' || item.market === 'TPEX') && (
                              <a
                                href="https://mops.twse.com.tw/mops/web/t100sb02_1"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors ml-auto"
                              >
                                <span>MOPS</span>
                                <ExternalLink className="size-3" />
                              </a>
                            )}

                            {/* IR Link */}
                            {item.irUrl && (
                              <a
                                href={item.irUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors ${
                                  item.market === 'TWSE' || item.market === 'TPEX' ? '' : 'ml-auto'
                                }`}
                              >
                                <span>{lang === 'zh' ? '官網/詳情' : 'IR / Details'}</span>
                                <ExternalLink className="size-3" />
                              </a>
                            )}
                          </div>

                          {/* AI Analysis Result Card */}
                          {analysis?.isOpen && (
                            <div className="pt-2">
                              {analysis.error && (
                                <div className="flex items-center gap-1.5 py-2 px-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                                  <AlertCircle className="size-4 shrink-0" />
                                  <span>{analysis.error}</span>
                                </div>
                              )}
                              {analysis.summary && !analysis.loading && (
                                <div className="rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-b from-indigo-50/30 to-card dark:from-indigo-950/20 dark:to-card p-3.5 text-xs sm:text-sm text-foreground">
                                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-indigo-100 dark:border-indigo-900/40">
                                    <span className="font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5 text-xs sm:text-sm">
                                      <Sparkles className="size-3.5 text-amber-500 shrink-0" />
                                      <span>{lang === 'zh' ? '2MD AI 法說簡報重點萃取' : '2MD AI Guidance Summary'}</span>
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">
                                      {lang === 'zh' ? 'AnyDoc 原生解析' : '2MD AnyDoc'}
                                    </span>
                                  </div>
                                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed text-xs sm:text-sm">
                                    {analysis.summary}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
