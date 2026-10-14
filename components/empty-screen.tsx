'use client'

import * as React from 'react'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import { useActions, useUIState } from 'ai/rsc'
import type { AI } from '@/lib/chat/actions'
import { nanoid } from 'nanoid'
import { UserMessage } from './stocks/message'
import { useUserApiKey } from '@/lib/hooks/use-user-api-key'

export function EmptyScreen({ wide = false }: { wide?: boolean }) {
  const [lang] = useLocalStorage<'zh' | 'en'>('stockbot_lang', 'zh')
  const { submitUserMessage } = useActions()
  const [_, setMessages] = useUIState<typeof AI>()
  const { serializedConfig } = useUserApiKey()

  const handlePromptClick = async (prompt: string) => {
    setMessages(currentMessages => [
      ...currentMessages,
      {
        id: nanoid(),
        display: <UserMessage>{prompt}</UserMessage>
      }
    ])

    const responseMessage = await submitUserMessage(prompt, serializedConfig)
    setMessages(currentMessages => [...currentMessages, responseMessage])
  }

  return (
    <div
      className={`mx-auto w-full px-3 sm:px-4 ${wide ? 'max-w-6xl' : 'max-w-2xl'}`}
    >
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-zinc-950 sm:p-7">
        {/* Hero Title & Description */}
        <div className="border-b border-slate-100 pb-4 dark:border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50/80 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300">
              <span>📈</span>
              <span>888 StockBot · 全方位 AI 智慧投資助理</span>
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300">
              Live v4.5
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {lang === 'zh'
              ? '深入剖析台美股 · 即時連網情報與法人展望'
              : 'Institutional-Grade Market Intelligence & Analysis'}
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
            {lang === 'zh'
              ? '整合 TradingView 互動圖表、台灣公開資訊觀測站 (MOPS) 法說會重訊、美股 Earnings Call、2MD 全網情報大腦與 13 位投資大師多空量化模型。'
              : 'Interactive TradingView charts, MOPS corporate earnings calls, 2MD live web intelligence, and multi-analyst consensus models.'}
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
          {/* Feature 1: 法說會總覽 (Earnings Calls) */}
          <div className="flex flex-col justify-between rounded-xl border border-indigo-200/80 bg-indigo-50/30 p-4 transition-all hover:border-indigo-300 hover:bg-indigo-50/60 dark:border-indigo-900/60 dark:bg-indigo-950/20 dark:hover:border-indigo-800">
            <div>
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className="text-base font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <span>🎙️</span>
                  <span>{lang === 'zh' ? '法人說明會總覽' : 'Earnings Calls'}</span>
                </span>
                <span className="rounded bg-indigo-100 dark:bg-indigo-900/70 px-1.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                  MOPS/TWSE
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {lang === 'zh'
                  ? '掌握台美股法說會日程、官方影音直播、簡報 PDF 下載，並支援 2MD AI 秒級萃取管理層指引與資本支出。'
                  : 'Track corporate earnings calls, live webcasts, PDF decks & AI guidance extraction.'}
              </p>
            </div>

            <div className="mt-3.5 pt-2 border-t border-indigo-100 dark:border-indigo-900/40 flex flex-col gap-2">
              <a
                href="/earnings-call"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors"
              >
                <span>{lang === 'zh' ? '開啟法說會總覽頁' : 'Open Earnings Dashboard'}</span>
                <span>➔</span>
              </a>
              <button
                type="button"
                onClick={() =>
                  handlePromptClick(
                    lang === 'zh'
                      ? '近期台股與美股有哪些法人說明會？'
                      : 'Show me upcoming corporate earnings calls and investor conferences'
                  )
                }
                className="text-left text-xs font-medium text-indigo-700 dark:text-indigo-400 hover:underline truncate"
              >
                💬 {lang === 'zh' ? '在對話中列出近期法說會' : 'List recent calls in chat'}
              </button>
            </div>
          </div>

          {/* Feature 2: 總經日曆 (Macro Calendar) */}
          <div className="flex flex-col justify-between rounded-xl border border-sky-200/80 bg-sky-50/30 p-4 transition-all hover:border-sky-300 hover:bg-sky-50/60 dark:border-sky-900/60 dark:bg-sky-950/20 dark:hover:border-sky-800">
            <div>
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className="text-base font-bold text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                  <span>📅</span>
                  <span>{lang === 'zh' ? '全球重大總經日曆' : 'Macro Calendar'}</span>
                </span>
                <span className="rounded bg-sky-100 dark:bg-sky-900/70 px-1.5 py-0.5 text-xs font-semibold text-sky-700 dark:text-sky-300">
                  Live
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {lang === 'zh'
                  ? '實時追蹤美股盤前期指、恐慌指數 VIX、非農 NFP、CPI 通膨率與全球央行利率決策時程。'
                  : 'Live economic events, US pre-market futures, VIX index & central bank announcements.'}
              </p>
            </div>

            <div className="mt-3.5 pt-2 border-t border-sky-100 dark:border-sky-900/40 flex flex-col gap-2">
              <button
                type="button"
                onClick={() =>
                  handlePromptClick(
                    lang === 'zh'
                      ? '今晚有什麼重大總經數據？'
                      : 'What are the key global economic events and data releases tonight?'
                  )
                }
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 transition-colors"
              >
                <span>{lang === 'zh' ? '查詢今晚總經數據' : 'Check Tonight\'s Events'}</span>
                <span>➔</span>
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
                className="text-left text-xs font-medium text-sky-700 dark:text-sky-400 hover:underline truncate"
              >
                💬 {lang === 'zh' ? '美股盤前期指與風向' : 'US pre-market futures'}
              </button>
            </div>
          </div>

          {/* Feature 3: 原生財報與大師分析 (Financials & AI) */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-zinc-900/40 dark:hover:border-slate-700">
            <div>
              <div className="flex items-center justify-between gap-1 mb-2">
                <span className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span>📊</span>
                  <span>{lang === 'zh' ? '原生財報與大師觀點' : 'Financials & Masters'}</span>
                </span>
                <span className="rounded bg-slate-200/70 dark:bg-zinc-800 px-1.5 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  2MD AI
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {lang === 'zh'
                  ? '查詢台美股營收、毛利、本益比與估值，或點擊下方 📎 附件上傳任意財報 PDF 秒級深度剖析。'
                  : 'Yahoo Fundamentals, balance sheets, DCF valuation and multi-analyst consensus.'}
              </p>
            </div>

            <div className="mt-3.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col gap-2">
              <button
                type="button"
                onClick={() =>
                  handlePromptClick(
                    lang === 'zh'
                      ? '請整理台積電 (2330) 最新財務數據與估值'
                      : 'Summarize the latest financials and valuation for TSMC (2330)'
                  )
                }
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-900 dark:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors"
              >
                <span>{lang === 'zh' ? '台積電最新財務數據' : 'TSMC Financials'}</span>
                <span>➔</span>
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
                className="text-left text-xs font-medium text-slate-600 dark:text-slate-400 hover:underline truncate"
              >
                💬 {lang === 'zh' ? 'Apple 13 位大師圓桌評價' : 'Apple multi-analyst evaluation'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
