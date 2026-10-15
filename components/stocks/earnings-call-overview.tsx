'use client'

import * as React from 'react'
import type { EarningsCallDashboardResult } from '@/lib/quant/earnings-call'
import { computeConferenceStatus } from '@/lib/quant/earnings-call'
import { EarningsCallCard } from '@/components/stocks/earnings-call-card'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import Link from 'next/link'
import { ArrowLeft, Radio, Calendar, CheckCircle2 } from 'lucide-react'

const DEFAULT_DASHBOARD: EarningsCallDashboardResult = {
  asOfDate: '即時',
  marketFilter: 'ALL',
  totalCount: 0,
  liveAndToday: [],
  upcoming: [],
  replays: [],
  all: [],
  source: 'BigGo Finance / MOPS / TWSE / TPEX / Yahoo Finance / Corporate IR'
}

export function EarningsCallOverview({ initialData }: { initialData?: EarningsCallDashboardResult }) {
  const [lang] = useLocalStorage<'zh' | 'en'>('stockbot_lang', 'zh')
  const safeData: EarningsCallDashboardResult = initialData || DEFAULT_DASHBOARD

  const [userTimezone, setUserTimezone] = React.useState<string>('Asia/Taipei')
  const [nowTime, setNowTime] = React.useState<number>(Date.now())

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

  const { totalCount, liveCount, upcomingCount, replayCount } = React.useMemo(() => {
    const pool = safeData.all || []
    const nowDate = new Date(nowTime)
    let live = 0
    let upcoming = 0
    let replay = 0
    for (const item of pool) {
      const st = computeConferenceStatus(
        item.conferenceDate,
        item.timezone,
        item.conferenceTime,
        nowDate,
        userTimezone
      )
      if (st === 'live' || st === 'today') live++
      else if (st === 'upcoming') upcoming++
      else if (st === 'replay') replay++
    }
    return {
      totalCount: pool.length,
      liveCount: live,
      upcomingCount: upcoming,
      replayCount: replay
    }
  }, [safeData.all, nowTime, userTimezone])

  return (
    <div className="min-h-screen bg-muted/20 pb-20 pt-4 sm:pt-6">
      <div className="mx-auto max-w-7xl px-3 sm:px-6">
        {/* Navigation & Breadcrumb */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs sm:text-sm font-semibold text-foreground shadow-2xs hover:bg-muted transition-colors"
          >
            <ArrowLeft className="size-3.5 text-muted-foreground" />
            <span>{lang === 'zh' ? '返回智慧聊天室' : 'Back to Chat'}</span>
          </Link>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link href="/" className="hover:underline">888 StockBot</Link>
            <span>/</span>
            <span className="font-semibold text-foreground">
              {lang === 'zh' ? '法人說明會總覽' : 'Earnings Calls Dashboard'}
            </span>
          </div>
        </div>

        {/* Streamlined Craft Header */}
        <div className="mb-5 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
                  <Radio className="size-3 text-indigo-500" />
                  <span>BigGo Finance · MOPS · TWSE · US · JPX · KRX</span>
                </span>
                <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-mono text-muted-foreground border border-border/60">
                  {lang === 'zh' ? `基準日：${safeData.asOfDate}` : `As of: ${safeData.asOfDate}`}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {lang === 'zh' ? '全球法人說明會與業績展望總覽' : 'Global Corporate Earnings Calls & Outlook'}
              </h1>
              <p className="mt-1 text-sm sm:text-base text-muted-foreground leading-relaxed max-w-3xl">
                {lang === 'zh'
                  ? '一站式聚合 BigGo Finance 全球數據、公開資訊觀測站 (MOPS)、證交所 (TWSE/TPEX) 官方影音、美股財報電話會議、日本 (JPX) 決算說明會與韓國 (KRX) 業績說明會。支援 2MD AnyDoc 引擎秒級萃取經營層指引與資本支出展望。'
                  : 'Live aggregation of BigGo Finance global directory, MOPS filings, TWSE/TPEX official webcasts, US corporate earnings calls, Japan (JPX), and Korea (KRX). Powered by 2MD AnyDoc for instant management guidance extraction.'}
              </p>
            </div>

            {/* Sleek Integrated Summary Bar */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{lang === 'zh' ? `今日召開 ${liveCount} 場` : `Today ${liveCount}`}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3.5 py-1.5 text-sm font-bold text-sky-700 dark:text-sky-300">
                <span className="size-2 rounded-full bg-sky-500" />
                <span>{lang === 'zh' ? `即將舉行 ${upcomingCount} 場` : `Upcoming ${upcomingCount}`}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/50 px-3.5 py-1.5 text-sm font-semibold text-muted-foreground">
                <Calendar className="size-3.5" />
                <span>{lang === 'zh' ? `歷史回放 ${replayCount} 場` : `Replays ${replayCount}`}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-1.5 text-sm font-bold text-foreground">
                <CheckCircle2 className="size-3.5 text-indigo-500" />
                <span>{lang === 'zh' ? `總追蹤 ${totalCount} 場` : `Total ${totalCount}`}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Earnings Call Card Component (Rendered Standalone) */}
        <EarningsCallCard data={safeData} standalone />
      </div>
    </div>
  )
}
