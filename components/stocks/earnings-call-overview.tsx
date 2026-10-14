'use client'

import * as React from 'react'
import type { EarningsCallDashboardResult } from '@/lib/quant/earnings-call'
import { EarningsCallCard } from '@/components/stocks/earnings-call-card'
import Link from 'next/link'

export function EarningsCallOverview({ initialData }: { initialData: EarningsCallDashboardResult }) {
  return (
    <div className="min-h-screen bg-muted/30 pb-20 pt-4 sm:pt-6">
      <div className="mx-auto max-w-6xl px-3 sm:px-6">
        {/* Navigation & Breadcrumb */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-background px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs hover:bg-muted dark:border-slate-800 dark:text-slate-200 transition-colors"
          >
            <span>←</span>
            <span>返回智慧聊天室</span>
          </Link>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link href="/" className="hover:underline">888 StockBot</Link>
            <span>/</span>
            <span className="font-semibold text-foreground">法人說明會總覽</span>
          </div>
        </div>

        {/* Hero Section */}
        <div className="mb-6 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-sm dark:border-slate-800 dark:bg-zinc-950">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
              <span>🎙️</span>
              <span>MOPS · TWSE · TPEX · US Earnings Calls</span>
            </span>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-600 dark:bg-zinc-800 dark:text-slate-300">
              基準日：{initialData.asOfDate}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            全球法人說明會與業績展望總覽
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
            即時彙整公開資訊觀測站 (MOPS) 重大訊息、台灣證券交易所 (TWSE/TPEX) 官方影音 Webcast、各公司投資人關係 (IR) 簡報與美股重大財報電話會議。支援 2MD AnyDoc 引擎秒級萃取經營層指引 (Guidance) 與資本支出展望。
          </p>

          {/* Quick Metrics Bar */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs sm:text-sm">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-zinc-900/50">
              <div className="text-muted-foreground text-xs font-medium">總追蹤會議</div>
              <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5 font-mono">
                {initialData.totalCount || initialData.all.length} 場
              </div>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-3 dark:border-rose-950/40 dark:bg-rose-950/20">
              <div className="text-rose-700 dark:text-rose-400 text-xs font-semibold">🔴 今日與進行中</div>
              <div className="text-lg sm:text-xl font-bold text-rose-700 dark:text-rose-300 mt-0.5 font-mono">
                {initialData.liveAndToday.length} 場
              </div>
            </div>
            <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-3 dark:border-sky-950/40 dark:bg-sky-950/20">
              <div className="text-sky-700 dark:text-sky-400 text-xs font-semibold">🔵 即將舉行</div>
              <div className="text-lg sm:text-xl font-bold text-sky-700 dark:text-sky-300 mt-0.5 font-mono">
                {initialData.upcoming.length} 場
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-zinc-900/50">
              <div className="text-muted-foreground text-xs font-medium">⚪ 歷史回放</div>
              <div className="text-lg sm:text-xl font-bold text-slate-700 dark:text-slate-300 mt-0.5 font-mono">
                {initialData.replays.length} 場
              </div>
            </div>
          </div>
        </div>

        {/* Main Earnings Call Card Component */}
        <EarningsCallCard data={initialData} />
      </div>
    </div>
  )
}
