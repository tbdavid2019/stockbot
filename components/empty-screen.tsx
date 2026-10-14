'use client'

import * as React from 'react'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import { useActions, useUIState } from 'ai/rsc'
import type { AI } from '@/lib/chat/actions'
import { nanoid } from 'nanoid'
import { UserMessage } from './stocks/message'
import { useUserApiKey } from '@/lib/hooks/use-user-api-key'
import Link from 'next/link'

import { TrendingUp, Radio, Calendar, BarChart3, ArrowRight, MessageSquare } from 'lucide-react'

export function EmptyScreen({ wide = false }: { wide?: boolean }) {
  const [lang] = useLocalStorage<'zh' | 'en'>('stockbot_lang', 'zh')
  const { submitUserMessage } = useActions()
  const [_, setMessages] = useUIState<typeof AI>()
  const { serializedConfig } = useUserApiKey()

  const handlePromptClick = async (prompt: string) => {
    try {
      setMessages(currentMessages => [
        ...currentMessages,
        {
          id: nanoid(),
          display: <UserMessage>{prompt}</UserMessage>
        }
      ])

      const responseMessage = await submitUserMessage(prompt, serializedConfig)
      setMessages(currentMessages => [...currentMessages, responseMessage])
    } catch (err) {
      console.error('Failed to submit message:', err)
    }
  }

  return (
    <div
      className={`mx-auto w-full px-3 sm:px-4 py-4 sm:py-6 ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}
    >
      {/* Editorial Header - Pure and unnested, eliminating patchwork and card-in-card clutter */}
      <div className="mb-6 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/60 px-3 py-1 text-xs font-semibold text-foreground">
            <TrendingUp className="size-3.5 text-orange-600 dark:text-orange-400" />
            <span>888 StockBot · AI 智慧投資情報</span>
          </span>
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Live v4.5
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          {lang === 'zh'
            ? '深入剖析台美股 · 即時連網情報與法人展望'
            : 'Institutional-Grade Market Intelligence & Analysis'}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">
          {lang === 'zh'
            ? '整合公開資訊觀測站 (MOPS) 重訊、TWSE/TPEX 官方 Webcast、美股 Earnings Call、TradingView 即時圖表、Yahoo Finance 原生財報與 13 位投資大師多空量化模型。'
            : 'Integrating MOPS earnings calls, TWSE/TPEX official webcasts, US corporate earnings, interactive TradingView charts, Yahoo Fundamentals, and multi-analyst consensus models.'}
        </p>
      </div>

      {/* Primary Feature Bar - High visibility for 法說會總覽 and quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Feature 1: 法說會總覽 */}
        <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 shadow-2xs hover:border-foreground/30 hover:shadow-sm transition-all">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-1">
              <span className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  <Radio className="size-4" />
                </span>
                <span>{lang === 'zh' ? '法人說明會總覽' : 'Earnings Calls'}</span>
              </span>
              <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                MOPS
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1">
              {lang === 'zh'
                ? '台美股法說會日程、官方影音直播、簡報 PDF 下載與 2MD AI 秒級指引萃取。'
                : 'Corporate earnings call dates, live webcasts, PDF decks & AI guidance extraction.'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-border/60 flex flex-col gap-2">
            <Link
              href="/earnings-call"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90 transition-opacity"
            >
              <span>{lang === 'zh' ? '開啟法說會總覽頁' : 'Open Earnings Dashboard'}</span>
              <ArrowRight className="size-3.5" />
            </Link>
            <button
              type="button"
              onClick={() =>
                handlePromptClick(
                  lang === 'zh'
                    ? '近期台股與美股有哪些法人說明會？'
                    : 'Show me upcoming corporate earnings calls and investor conferences'
                )
              }
              className="inline-flex items-center gap-1 text-left text-xs font-medium text-muted-foreground hover:text-foreground hover:underline truncate"
            >
              <MessageSquare className="size-3 shrink-0" />
              <span className="truncate">{lang === 'zh' ? '在對話中列出近期法說會' : 'List recent calls in chat'}</span>
            </button>
          </div>
        </div>

        {/* Feature 2: 全球重大總經日曆 */}
        <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 shadow-2xs hover:border-foreground/30 hover:shadow-sm transition-all">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-1">
              <span className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                  <Calendar className="size-4" />
                </span>
                <span>{lang === 'zh' ? '全球重大總經日曆' : 'Macro Calendar'}</span>
              </span>
              <span className="rounded bg-sky-500/10 px-2 py-0.5 text-xs font-semibold text-sky-600 dark:text-sky-400 border border-sky-500/20">
                Investing
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1">
              {lang === 'zh'
                ? '即時追蹤美股盤前期指、恐慌指數 VIX、非農 NFP、CPI 與各國央行利率決策。'
                : 'Live US pre-market futures, VIX index, NFP, CPI & central bank interest decisions.'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-border/60 flex flex-col gap-2">
            <button
              type="button"
              onClick={() =>
                handlePromptClick(
                  lang === 'zh'
                    ? '今晚有什麼重大總經數據？'
                    : 'What are the key global economic events and data releases tonight?'
                )
              }
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted transition-colors"
            >
              <span>{lang === 'zh' ? '查詢今晚總經數據' : "Check Tonight's Events"}</span>
              <ArrowRight className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                handlePromptClick(
                  lang === 'zh'
                    ? '美股盤前期貨與經濟日曆'
                    : 'Show me US pre-market futures and economic calendar'
                )
              }
              className="inline-flex items-center gap-1 text-left text-xs font-medium text-muted-foreground hover:text-foreground hover:underline truncate"
            >
              <MessageSquare className="size-3 shrink-0" />
              <span className="truncate">{lang === 'zh' ? '美股盤前期指與風向' : 'US pre-market futures'}</span>
            </button>
          </div>
        </div>

        {/* Feature 3: 原生財報與大師分析 */}
        <div className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 shadow-2xs hover:border-foreground/30 hover:shadow-sm transition-all">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-1">
              <span className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <BarChart3 className="size-4" />
                </span>
                <span>{lang === 'zh' ? '原生財報與大師觀點' : 'Financials & Masters'}</span>
              </span>
              <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                2MD AI
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1">
              {lang === 'zh'
                ? '查詢台美股營收、毛利、本益比與估值，或點擊下方 📎 附件上傳任意財報 PDF 秒級剖析。'
                : 'Yahoo Fundamentals, balance sheets, DCF valuation and multi-analyst consensus.'}
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-border/60 flex flex-col gap-2">
            <button
              type="button"
              onClick={() =>
                handlePromptClick(
                  lang === 'zh'
                    ? '請整理台積電 (2330) 最新財務數據與估值'
                    : 'Summarize the latest financials and valuation for TSMC (2330)'
                )
              }
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted transition-colors"
            >
              <span>{lang === 'zh' ? '台積電最新財務數據' : 'TSMC Financials'}</span>
              <ArrowRight className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                handlePromptClick(
                  lang === 'zh'
                    ? '請用多位投資大師分析股票代號 AAPL（Apple）的投資價值'
                    : 'Give me a multi-analyst investment view of ticker AAPL (Apple)'
                )
              }
              className="inline-flex items-center gap-1 text-left text-xs font-medium text-muted-foreground hover:text-foreground hover:underline truncate"
            >
              <MessageSquare className="size-3 shrink-0" />
              <span className="truncate">{lang === 'zh' ? 'Apple 13 位大師圓桌評價' : 'Apple multi-analyst evaluation'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
