'use client'

import * as React from 'react'
import type { EarningsCallDashboardResult } from '@/lib/quant/earnings-call'
import { computeConferenceStatus } from '@/lib/quant/earnings-call'
import { EarningsCallCard } from '@/components/stocks/earnings-call-card'
import Link from 'next/link'
import { ArrowLeft, Radio, Calendar, History } from 'lucide-react'

const DEFAULT_DASHBOARD: EarningsCallDashboardResult = {
  asOfDate: '即時',
  marketFilter: 'ALL',
  totalCount: 0,
  liveAndToday: [],
  upcoming: [],
  replays: [],
  all: [],
  source: 'MOPS / TWSE / TPEX / Yahoo Finance / Corporate IR'
}

export function EarningsCallOverview({ initialData }: { initialData?: EarningsCallDashboardResult }) {
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
    <div className="min-h-screen bg-muted/30 pb-20 pt-4 sm:pt-6">
      <div className="mx-auto max-w-6xl px-3 sm:px-6">
        {/* Navigation & Breadcrumb */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs sm:text-sm font-semibold text-foreground shadow-2xs hover:bg-muted transition-colors"
          >
            <ArrowLeft className="size-3.5 text-muted-foreground" />
            <span>返回智慧聊天室</span>
          </Link>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link href="/" className="hover:underline">888 StockBot</Link>
            <span>/</span>
            <span className="font-semibold text-foreground">法人說明會總覽</span>
          </div>
        </div>

        {/* Hero Section */}
        <div className="mb-6 rounded-2xl border border-border/80 bg-card p-5 sm:p-7 shadow-xs">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
              <Radio className="size-3.5" />
              <span>MOPS · TWSE · TPEX · US Earnings Calls</span>
            </span>
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground border border-border/60">
              基準日：{safeData.asOfDate}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            全球法人說明會與業績展望總覽
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">
            即時彙整公開資訊觀測站 (MOPS) 重大訊息、台灣證券交易所 (TWSE/TPEX) 官方影音 Webcast、各公司投資人關係 (IR) 簡報與美股重大財報電話會議。支援 2MD AnyDoc 引擎秒級萃取經營層指引 (Guidance) 與資本支出展望。
          </p>

          {/* Quick Metrics Bar */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-border/60 text-xs sm:text-sm">
            <div className="rounded-xl border border-border/80 bg-muted/40 p-3">
              <div className="text-muted-foreground text-xs font-medium flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground" />
                <span>總追蹤會議</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-foreground mt-0.5 font-mono">
                {totalCount} 場
              </div>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3">
              <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 text-xs font-semibold">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex size-2 rounded-full bg-rose-500"></span>
                </span>
                <span>今日與進行中</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-rose-700 dark:text-rose-300 mt-0.5 font-mono">
                {liveCount} 場
              </div>
            </div>
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3">
              <div className="flex items-center gap-1.5 text-sky-700 dark:text-sky-400 text-xs font-semibold">
                <span className="size-2 rounded-full bg-sky-500"></span>
                <span>即將舉行</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-sky-700 dark:text-sky-300 mt-0.5 font-mono">
                {upcomingCount} 場
              </div>
            </div>
            <div className="rounded-xl border border-border/80 bg-muted/40 p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
                <History className="size-3.5 text-muted-foreground" />
                <span>歷史回放</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-foreground/80 mt-0.5 font-mono">
                {replayCount} 場
              </div>
            </div>
          </div>
        </div>

        {/* Main Earnings Call Card Component */}
        <EarningsCallCard data={safeData} />
      </div>
    </div>
  )
}
